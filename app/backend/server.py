from dotenv import load_dotenv
from pathlib import Path
load_dotenv(Path(__file__).parent / '.env')

import os
import io
import csv
import json
import logging
import jwt
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, APIRouter, Depends, HTTPException, UploadFile, File, Response, BackgroundTasks, Request
from fastapi.responses import StreamingResponse, JSONResponse
from starlette.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from database import Base, engine, get_db, SessionLocal
from models import (
    User, DataSource, MappingTemplate, MigrationRun, MigrationRecord,
    MigrationLog, Customer, Subscription, Contract, OnboardingProject
)
from auth import (
    hash_password, verify_password, create_access_token, create_refresh_token,
    get_current_user, seed_admin
)
from services.csv_service import parse_csv, infer_schema
from services.stripe_service import fetch_stripe_or_mock
from services.connectors import chargebee_mock_import, internal_mock_import
from services.validation import validate_all
from services.transformation import transform_all, auto_suggest_mapping, CANONICAL_FIELDS
from services.migration_runner import run_migration

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

app = FastAPI(title="Billing Migration Studio")
api = APIRouter(prefix="/api")


# ---------- Schemas ----------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=4)
    name: Optional[str] = "User"


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: str
    name: str
    role: str

    class Config:
        from_attributes = True


class DataSourceOut(BaseModel):
    id: str
    name: str
    type: str
    config: Dict[str, Any]
    inferred_schema: Dict[str, Any]
    row_count: int
    created_at: datetime

    class Config:
        from_attributes = True


class MappingTemplateIn(BaseModel):
    name: str
    description: Optional[str] = ""
    source_type: Optional[str] = "csv"
    mappings: Dict[str, str]


class MappingTemplateOut(MappingTemplateIn):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


class MigrationRunIn(BaseModel):
    name: Optional[str] = "Migration"
    source_id: str
    mappings: Dict[str, str]
    mode: str = "dry_run"
    mapping_template_id: Optional[str] = None


class MigrationRunOut(BaseModel):
    id: str
    name: str
    source_id: Optional[str]
    source_type: Optional[str]
    mode: str
    status: str
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    total_records: int
    successful_records: int
    failed_records: int
    validation_errors: int
    summary: Dict[str, Any]

    class Config:
        from_attributes = True


# ---------- Auth ----------
def _set_auth_cookies(response: Response, access: str, refresh: str):
    response.set_cookie("access_token", access, httponly=True, secure=False, samesite="lax", max_age=43200, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")


@api.post("/auth/register", response_model=UserOut)
def register(payload: RegisterIn, response: Response, db: Session = Depends(get_db)):
    email = payload.email.lower().strip()
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(email=email, name=payload.name or "User", password_hash=hash_password(payload.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    access = create_access_token(user.id, user.email)
    refresh = create_refresh_token(user.id)
    _set_auth_cookies(response, access, refresh)
    return user


@api.post("/auth/login", response_model=UserOut)
def login(payload: LoginIn, response: Response, db: Session = Depends(get_db)):
    email = payload.email.lower().strip()
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    access = create_access_token(user.id, user.email)
    refresh = create_refresh_token(user.id)
    _set_auth_cookies(response, access, refresh)
    return user


@api.post("/auth/logout")
def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"ok": True}


@api.get("/auth/session")
def session(request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get("access_token")
    if not token:
        return {"authenticated": False, "user": None}
    try:
        payload = jwt.decode(token, _secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            return {"authenticated": False, "user": None}
        user = db.query(User).filter(User.id == payload["sub"]).first()
        if not user:
            return {"authenticated": False, "user": None}
        return {"authenticated": True, "user": UserOut.model_validate(user)}
    except jwt.InvalidTokenError:
        return {"authenticated": False, "user": None}


@api.get("/auth/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


# ---------- Canonical schema ----------
@api.get("/schema/canonical")
def get_canonical_schema(user: User = Depends(get_current_user)):
    return {"fields": CANONICAL_FIELDS}


# ---------- Data Sources ----------
@api.post("/sources/csv", response_model=DataSourceOut)
async def upload_csv(file: UploadFile = File(...), db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if not file.filename.lower().endswith((".csv", ".tsv", ".txt")):
        raise HTTPException(status_code=400, detail="Only CSV/TSV files are supported")
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty file")
    rows, encoding, delimiter, headers = parse_csv(raw)
    schema = infer_schema(rows, headers)
    src = DataSource(
        name=file.filename,
        type="csv",
        config={
            "filename": file.filename,
            "encoding": encoding,
            "delimiter": delimiter,
            "headers": headers,
        },
        raw_rows=rows,
        inferred_schema=schema,
    )
    db.add(src)
    db.commit()
    db.refresh(src)
    return DataSourceOut(
        id=src.id, name=src.name, type=src.type, config=src.config,
        inferred_schema=src.inferred_schema, row_count=len(rows), created_at=src.created_at,
    )


@api.post("/sources/stripe", response_model=DataSourceOut)
def import_stripe(limit: int = 50, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows, mode = fetch_stripe_or_mock(limit=limit)
    headers = list(rows[0].keys()) if rows else []
    schema = infer_schema(rows, headers)
    src = DataSource(
        name=f"Stripe Import ({mode})",
        type="stripe",
        config={"mode": mode, "headers": headers, "limit": limit},
        raw_rows=rows,
        inferred_schema=schema,
    )
    db.add(src)
    db.commit()
    db.refresh(src)
    return DataSourceOut(
        id=src.id, name=src.name, type=src.type, config=src.config,
        inferred_schema=src.inferred_schema, row_count=len(rows), created_at=src.created_at,
    )

def _create_mock_source(db: Session, source_type: str, name: str, rows: List[Dict[str, Any]]) -> DataSource:
    headers = list(rows[0].keys()) if rows else []
    schema = infer_schema(rows, headers)
    src = DataSource(
        name=name, type=source_type,
        config={"mode": "mock", "headers": headers},
        raw_rows=rows, inferred_schema=schema,
    )
    db.add(src)
    db.commit()
    db.refresh(src)
    return src


@api.post("/sources/chargebee", response_model=DataSourceOut)
def import_chargebee(limit: int = 25, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = chargebee_mock_import(limit=limit)
    src = _create_mock_source(db, "chargebee", f"Chargebee Import (mock)", rows)
    return DataSourceOut(id=src.id, name=src.name, type=src.type, config=src.config,
                        inferred_schema=src.inferred_schema, row_count=len(rows), created_at=src.created_at)


@api.post("/sources/internal", response_model=DataSourceOut)
def import_internal(limit: int = 20, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = internal_mock_import(limit=limit)
    src = _create_mock_source(db, "internal", "Internal Billing (mock)", rows)
    return DataSourceOut(id=src.id, name=src.name, type=src.type, config=src.config,
                        inferred_schema=src.inferred_schema, row_count=len(rows), created_at=src.created_at)

@api.get("/sources", response_model=List[DataSourceOut])
def list_sources(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    items = db.query(DataSource).order_by(DataSource.created_at.desc()).all()
    return [DataSourceOut(
        id=s.id, name=s.name, type=s.type, config=s.config or {},
        inferred_schema=s.inferred_schema or {}, row_count=len(s.raw_rows or []),
        created_at=s.created_at,
    ) for s in items]


@api.get("/sources/{source_id}")
def get_source(source_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    s = db.query(DataSource).filter(DataSource.id == source_id).first()
    if not s:
        raise HTTPException(404, "Source not found")
    rows = s.raw_rows or []
    return {
        "id": s.id, "name": s.name, "type": s.type, "config": s.config or {},
        "inferred_schema": s.inferred_schema or {}, "row_count": len(rows),
        "preview": rows[:20], "headers": (s.config or {}).get("headers", []),
        "suggested_mapping": auto_suggest_mapping((s.config or {}).get("headers", [])),
        "created_at": s.created_at,
    }


@api.delete("/sources/{source_id}")
def delete_source(source_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    s = db.query(DataSource).filter(DataSource.id == source_id).first()
    if not s:
        raise HTTPException(404, "Source not found")
    db.delete(s)
    db.commit()
    return {"ok": True}


# ---------- Mapping Templates ----------
@api.get("/mappings", response_model=List[MappingTemplateOut])
def list_mappings(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(MappingTemplate).order_by(MappingTemplate.created_at.desc()).all()


@api.post("/mappings", response_model=MappingTemplateOut)
def create_mapping(payload: MappingTemplateIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    tpl = MappingTemplate(**payload.model_dump())
    db.add(tpl)
    db.commit()
    db.refresh(tpl)
    return tpl


@api.delete("/mappings/{tpl_id}")
def delete_mapping(tpl_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    tpl = db.query(MappingTemplate).filter(MappingTemplate.id == tpl_id).first()
    if not tpl:
        raise HTTPException(404, "Mapping not found")
    db.delete(tpl)
    db.commit()
    return {"ok": True}


# ---------- Validation preview ----------
@api.post("/validate")
def validate_preview(payload: Dict[str, Any], db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    source_id = payload.get("source_id")
    mappings = payload.get("mappings", {})
    s = db.query(DataSource).filter(DataSource.id == source_id).first()
    if not s:
        raise HTTPException(404, "Source not found")
    rows = s.raw_rows or []
    canonical = transform_all(rows, mappings)
    valid, invalid, detailed = validate_all(canonical)
    return {
        "valid": valid,
        "invalid": invalid,
        "total": len(canonical),
        "sample_errors": [d for d in detailed if d["errors"]][:25],
        "preview": canonical[:10],
    }


# ---------- Migration Runs ----------
def _run_in_background(run_id: str):
    db = SessionLocal()
    try:
        run_migration(db, run_id)
    finally:
        db.close()


@api.post("/migrations", response_model=MigrationRunOut)
def create_migration(payload: MigrationRunIn, bg: BackgroundTasks, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    s = db.query(DataSource).filter(DataSource.id == payload.source_id).first()
    if not s:
        raise HTTPException(404, "Source not found")
    if payload.mode not in ("dry_run", "actual"):
        raise HTTPException(400, "mode must be dry_run or actual")
    run = MigrationRun(
        name=payload.name or "Migration",
        source_id=payload.source_id,
        source_type=s.type,
        mapping_template_id=payload.mapping_template_id,
        mappings=payload.mappings,
        mode=payload.mode,
        status="pending",
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    bg.add_task(_run_in_background, run.id)
    return run


@api.get("/migrations", response_model=List[MigrationRunOut])
def list_migrations(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(MigrationRun).order_by(MigrationRun.started_at.desc()).all()


@api.get("/migrations/{run_id}", response_model=MigrationRunOut)
def get_migration(run_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    run = db.query(MigrationRun).filter(MigrationRun.id == run_id).first()
    if not run:
        raise HTTPException(404, "Migration not found")
    return run


@api.get("/migrations/{run_id}/records")
def get_migration_records(run_id: str, status: Optional[str] = None, limit: int = 200, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    q = db.query(MigrationRecord).filter(MigrationRecord.migration_run_id == run_id)
    if status:
        q = q.filter(MigrationRecord.status == status)
    items = q.order_by(MigrationRecord.created_at.desc()).limit(limit).all()
    return [{
        "id": r.id, "record_type": r.record_type, "source_id": r.source_id,
        "target_id": r.target_id, "status": r.status, "error_message": r.error_message,
        "payload": r.payload, "created_at": r.created_at,
    } for r in items]


@api.get("/migrations/{run_id}/logs")
def get_migration_logs(run_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    items = db.query(MigrationLog).filter(MigrationLog.migration_run_id == run_id).order_by(MigrationLog.created_at.asc()).all()
    return [{"id": l.id, "level": l.level, "message": l.message, "created_at": l.created_at} for l in items]


@api.post("/migrations/{run_id}/retry")
def retry_failed(run_id: str, bg: BackgroundTasks, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    run = db.query(MigrationRun).filter(MigrationRun.id == run_id).first()
    if not run:
        raise HTTPException(404, "Migration not found")
    # Clear previous records & logs, re-run
    db.query(MigrationRecord).filter(MigrationRecord.migration_run_id == run_id).delete()
    db.query(MigrationLog).filter(MigrationLog.migration_run_id == run_id).delete()
    run.status = "pending"
    run.successful_records = 0
    run.failed_records = 0
    run.validation_errors = 0
    run.summary = {}
    db.commit()
    bg.add_task(_run_in_background, run.id)
    return {"ok": True}


@api.post("/migrations/{run_id}/rollback")
def rollback_migration(run_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    run = db.query(MigrationRun).filter(MigrationRun.id == run_id).first()
    if not run:
        raise HTTPException(404, "Migration not found")
    if run.mode != "actual":
        raise HTTPException(400, "Only actual runs can be rolled back")
    recs = db.query(MigrationRecord).filter(MigrationRecord.migration_run_id == run_id, MigrationRecord.status == "success").all()
    deleted = 0
    for r in recs:
        if r.target_id:
            db.query(Subscription).filter(Subscription.customer_id == r.target_id).delete()
            db.query(Contract).filter(Contract.customer_id == r.target_id).delete()
            db.query(Customer).filter(Customer.id == r.target_id).delete()
            r.status = "rolled_back"
            deleted += 1
    run.status = "rolled_back"
    run.successful_records = max(0, (run.successful_records or 0) - deleted)
    db.commit()
    return {"ok": True, "rolled_back": deleted}


@api.get("/migrations/{run_id}/report")
def export_report(run_id: str, format: str = "json", db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    run = db.query(MigrationRun).filter(MigrationRun.id == run_id).first()
    if not run:
        raise HTTPException(404, "Migration not found")
    records = db.query(MigrationRecord).filter(MigrationRecord.migration_run_id == run_id).all()
    logs = db.query(MigrationLog).filter(MigrationLog.migration_run_id == run_id).all()
    duration_seconds = None
    if run.completed_at and run.started_at:
        duration_seconds = (run.completed_at - run.started_at).total_seconds()

    payload = {
        "migration": {
            "id": run.id, "name": run.name, "mode": run.mode, "status": run.status,
            "started_at": run.started_at.isoformat() if run.started_at else None,
            "completed_at": run.completed_at.isoformat() if run.completed_at else None,
            "duration_seconds": duration_seconds,
            "total_records": run.total_records, "successful_records": run.successful_records,
            "failed_records": run.failed_records, "validation_errors": run.validation_errors,
            "summary": run.summary or {},
        },
        "records": [{
            "source_id": r.source_id, "status": r.status, "error_message": r.error_message,
            "record_type": r.record_type,
        } for r in records],
        "logs": [{"level": l.level, "message": l.message, "created_at": l.created_at.isoformat()} for l in logs],
    }
    if format == "json":
        return payload
    elif format == "csv":
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow(["source_id", "record_type", "status", "error_message"])
        for r in records:
            writer.writerow([r.source_id, r.record_type, r.status, r.error_message or ""])
        return StreamingResponse(
            io.BytesIO(buf.getvalue().encode("utf-8")),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=migration_{run_id}.csv"},
        )
    else:
        raise HTTPException(400, "format must be json or csv")

# ---------- Onboarding Projects ----------
class OnboardingProjectIn(BaseModel):
    name: str
    customer_name: str
    customer_logo_url: Optional[str] = None
    description: Optional[str] = ""
    source_ids: List[str] = []
    mapping_template_ids: List[str] = []
    migration_run_ids: List[str] = []
    go_live_date: Optional[datetime] = None


def _build_project_payload(db: Session, project: OnboardingProject) -> Dict[str, Any]:
    src_ids = project.source_ids or []
    map_ids = project.mapping_template_ids or []
    run_ids = project.migration_run_ids or []

    sources = db.query(DataSource).filter(DataSource.id.in_(src_ids)).all() if src_ids else []
    mappings = db.query(MappingTemplate).filter(MappingTemplate.id.in_(map_ids)).all() if map_ids else []
    runs = db.query(MigrationRun).filter(MigrationRun.id.in_(run_ids)).all() if run_ids else []

    total_records = sum(r.total_records or 0 for r in runs)
    total_success = sum(r.successful_records or 0 for r in runs)
    total_failed = sum(r.failed_records or 0 for r in runs)
    success_rate = (total_success / total_records * 100) if total_records else 0
    all_completed = all(r.status in ("completed", "rolled_back") for r in runs) if runs else False

    checklist = [
        {"step": "Connect data sources", "done": len(sources) > 0, "count": len(sources)},
        {"step": "Define field mappings", "done": len(mappings) > 0, "count": len(mappings)},
        {"step": "Run validation (dry-run)", "done": any(r.mode == "dry_run" for r in runs), "count": sum(1 for r in runs if r.mode == "dry_run")},
        {"step": "Execute migration", "done": any(r.mode == "actual" and r.status == "completed" for r in runs), "count": sum(1 for r in runs if r.mode == "actual")},
        {"step": "Migration completed successfully", "done": all_completed and total_success > 0, "count": total_success},
    ]
    progress = round(sum(1 for c in checklist if c["done"]) / len(checklist) * 100)

    return {
        "id": project.id, "name": project.name, "customer_name": project.customer_name,
        "customer_logo_url": project.customer_logo_url, "description": project.description,
        "share_token": project.share_token,
        "go_live_date": project.go_live_date.isoformat() if project.go_live_date else None,
        "created_at": project.created_at.isoformat(),
        "sources": [{"id": s.id, "name": s.name, "type": s.type, "row_count": len(s.raw_rows or [])} for s in sources],
        "mappings": [{"id": m.id, "name": m.name, "fields_mapped": len(m.mappings or {})} for m in mappings],
        "runs": [{"id": r.id, "name": r.name, "mode": r.mode, "status": r.status,
                  "total_records": r.total_records, "successful_records": r.successful_records,
                  "failed_records": r.failed_records,
                  "started_at": r.started_at.isoformat() if r.started_at else None} for r in runs],
        "stats": {"total_records": total_records, "successful": total_success, "failed": total_failed,
                  "success_rate": round(success_rate, 1)},
        "checklist": checklist,
        "progress": progress,
        "is_complete": progress == 100,
    }


@api.post("/onboarding/projects")
def create_project(payload: OnboardingProjectIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    p = OnboardingProject(**payload.model_dump())
    db.add(p)
    db.commit()
    db.refresh(p)
    return _build_project_payload(db, p)


@api.get("/onboarding/projects")
def list_projects(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    items = db.query(OnboardingProject).order_by(OnboardingProject.created_at.desc()).all()
    return [_build_project_payload(db, p) for p in items]


@api.get("/onboarding/projects/{project_id}")
def get_project(project_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    p = db.query(OnboardingProject).filter(OnboardingProject.id == project_id).first()
    if not p:
        raise HTTPException(404, "Project not found")
    return _build_project_payload(db, p)


@api.put("/onboarding/projects/{project_id}")
def update_project(project_id: str, payload: OnboardingProjectIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    p = db.query(OnboardingProject).filter(OnboardingProject.id == project_id).first()
    if not p:
        raise HTTPException(404, "Project not found")
    for k, v in payload.model_dump().items():
        setattr(p, k, v)
    db.commit()
    db.refresh(p)
    return _build_project_payload(db, p)


@api.delete("/onboarding/projects/{project_id}")
def delete_project(project_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    p = db.query(OnboardingProject).filter(OnboardingProject.id == project_id).first()
    if not p:
        raise HTTPException(404, "Project not found")
    db.delete(p)
    db.commit()
    return {"ok": True}


@api.get("/onboarding/public/{share_token}")
def public_project(share_token: str, db: Session = Depends(get_db)):
    p = db.query(OnboardingProject).filter(OnboardingProject.share_token == share_token).first()
    if not p:
        raise HTTPException(404, "Project not found")
    return _build_project_payload(db, p)


# ---------- Dashboard ----------
@api.get("/dashboard/stats")
def dashboard_stats(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    total_runs = db.query(MigrationRun).count()
    completed = db.query(MigrationRun).filter(MigrationRun.status == "completed").count()
    failed = db.query(MigrationRun).filter(MigrationRun.status == "failed").count()
    running = db.query(MigrationRun).filter(MigrationRun.status.in_(["pending", "running"])).count()
    sources = db.query(DataSource).count()
    customers_migrated = db.query(Customer).count()
    subs = db.query(Subscription).count()
    contracts = db.query(Contract).count()
    recent = db.query(MigrationRun).order_by(MigrationRun.started_at.desc()).limit(5).all()
    return {
        "total_runs": total_runs,
        "completed": completed,
        "failed": failed,
        "running": running,
        "sources": sources,
        "customers_migrated": customers_migrated,
        "subscriptions": subs,
        "contracts": contracts,
        "recent_runs": [{
            "id": r.id, "name": r.name, "status": r.status, "mode": r.mode,
            "successful_records": r.successful_records, "failed_records": r.failed_records,
            "started_at": r.started_at.isoformat() if r.started_at else None,
        } for r in recent],
    }


@api.get("/customers")
def list_customers(limit: int = 100, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    items = db.query(Customer).order_by(Customer.created_at.desc()).limit(limit).all()
    return [{
        "id": c.id, "email": c.email, "name": c.name, "external_id": c.external_id,
        "source_system": c.source_system, "created_at": c.created_at,
    } for c in items]


@api.get("/")
def root():
    return {"name": "Billing Migration Studio", "version": "1.0.0"}


app.include_router(api)

cors_origins_raw = os.environ.get(
    "CORS_ORIGINS",
    "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001",
)
allow_origins = [origin.strip() for origin in cors_origins_raw.split(",") if origin.strip()]
allow_all_origins = "*" in allow_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if allow_all_origins else allow_origins,
    allow_credentials=not allow_all_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_admin(db)
    finally:
        db.close()
    logger.info("Billing Migration Studio started.")
