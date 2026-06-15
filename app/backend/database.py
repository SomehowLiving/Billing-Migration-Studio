import os
from urllib.parse import urlparse
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from sqlalchemy.exc import OperationalError

DATABASE_URL = os.environ.get("DATABASE_URL") or os.environ.get("POSTGRES_URL") or "sqlite:////tmp/billing_studio.db"
IS_VERCEL = os.environ.get("VERCEL") == "1"


def _engine_kwargs(url: str) -> dict:
    if url.startswith("sqlite"):
        return {"connect_args": {"check_same_thread": False}}
    if urlparse(url).scheme.startswith("postgres"):
        return {"pool_pre_ping": True, "future": True}
    return {"pool_pre_ping": True, "future": True}


def _create_db_engine(url: str):
    parsed = urlparse(url)
    if IS_VERCEL and parsed.scheme.startswith("postgres") and parsed.hostname in {"localhost", "127.0.0.1"}:
        url = "sqlite:////tmp/billing_studio.db"
    try:
        return create_engine(url, **_engine_kwargs(url))
    except ModuleNotFoundError:
        fallback = "sqlite:////tmp/billing_studio.db"
        return create_engine(fallback, connect_args={"check_same_thread": False})


engine = _create_db_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
Base = declarative_base()


def ensure_schema():
    try:
        Base.metadata.create_all(bind=engine)
    except OperationalError:
        if not str(engine.url).startswith("sqlite"):
            fallback = create_engine("sqlite:////tmp/billing_studio.db", connect_args={"check_same_thread": False})
            Base.metadata.create_all(bind=fallback)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
