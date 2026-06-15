from datetime import datetime, timezone
from sqlalchemy.orm import Session
from models import (
    MigrationRun, MigrationRecord, MigrationLog,
    Customer, Subscription, Contract, DataSource
)
from services.transformation import transform_all
from services.validation import validate_all


def _log(db: Session, run_id: str, level: str, message: str):
    db.add(MigrationLog(migration_run_id=run_id, level=level, message=message))


def run_migration(db: Session, run_id: str) -> None:
    run = db.query(MigrationRun).filter(MigrationRun.id == run_id).first()
    if run is None:
        return
    run.status = "running"
    run.started_at = datetime.now(timezone.utc)
    db.commit()

    src = db.query(DataSource).filter(DataSource.id == run.source_id).first()
    if not src:
        run.status = "failed"
        run.completed_at = datetime.now(timezone.utc)
        _log(db, run.id, "error", "Source data not found")
        db.commit()
        return

    rows = src.raw_rows or []
    mappings = run.mappings or {}
    canonical = transform_all(rows, mappings)
    valid_count, invalid_count, detailed = validate_all(canonical)

    run.total_records = len(canonical)
    run.validation_errors = invalid_count
    _log(db, run.id, "info", f"Transformed {len(canonical)} rows. Valid={valid_count}, Invalid={invalid_count}")

    successful = 0
    failed = 0

    for item in detailed:
        rec = item["record"]
        idx = item["index"]
        errs = item["errors"]
        src_id = (rec.get("customer") or {}).get("external_id") or f"row-{idx}"

        if errs:
            failed += 1
            db.add(MigrationRecord(
                migration_run_id=run.id,
                record_type="customer",
                source_id=src_id,
                status="failed",
                error_message="; ".join(errs),
                payload=rec,
            ))
            continue

        if run.mode == "dry_run":
            successful += 1
            db.add(MigrationRecord(
                migration_run_id=run.id,
                record_type="customer",
                source_id=src_id,
                status="success",
                payload=rec,
            ))
            continue

        # Actual write
        try:
            cust_data = rec.get("customer", {})
            sub_data = rec.get("subscription", {})
            con_data = rec.get("contract", {})

            customer = Customer(
                email=(cust_data.get("email") or "").strip().lower(),
                name=cust_data.get("name") or "",
                external_id=cust_data.get("external_id"),
                source_system=run.source_type,
            )
            db.add(customer)
            db.flush()

            if sub_data.get("plan"):
                sub = Subscription(
                    customer_id=customer.id,
                    plan_name=sub_data.get("plan"),
                    status=sub_data.get("status", "active"),
                )
                db.add(sub)

            if con_data.get("amount") is not None:
                con = Contract(
                    customer_id=customer.id,
                    amount=float(con_data.get("amount", 0)),
                    currency=(con_data.get("currency") or "USD").upper(),
                    billing_frequency=con_data.get("billing_frequency") or "monthly",
                )
                db.add(con)

            successful += 1
            db.add(MigrationRecord(
                migration_run_id=run.id,
                record_type="customer",
                source_id=src_id,
                target_id=customer.id,
                status="success",
                payload=rec,
            ))
        except Exception as e:
            db.rollback()
            failed += 1
            db.add(MigrationRecord(
                migration_run_id=run.id,
                record_type="customer",
                source_id=src_id,
                status="failed",
                error_message=str(e),
                payload=rec,
            ))

    run.successful_records = successful
    run.failed_records = failed
    run.completed_at = datetime.now(timezone.utc)
    run.status = "completed"
    run.summary = {
        "valid": valid_count,
        "invalid": invalid_count,
        "successful": successful,
        "failed": failed,
        "total": len(canonical),
        "mode": run.mode,
    }
    _log(db, run.id, "info", f"Run completed. Success={successful}, Failed={failed}")
    db.commit()
