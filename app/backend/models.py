import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, DateTime, Integer, Float, ForeignKey, Text, JSON, Boolean
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from database import Base


def now_utc():
    return datetime.now(timezone.utc)


def new_id():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=new_id)
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False, default="User")
    password_hash = Column(String, nullable=False)
    role = Column(String, default="user")
    created_at = Column(DateTime(timezone=True), default=now_utc)


class Customer(Base):
    __tablename__ = "customers"
    id = Column(String, primary_key=True, default=new_id)
    email = Column(String, nullable=False, index=True)
    name = Column(String)
    external_id = Column(String, index=True)
    source_system = Column(String)
    created_at = Column(DateTime(timezone=True), default=now_utc)


class Subscription(Base):
    __tablename__ = "subscriptions"
    id = Column(String, primary_key=True, default=new_id)
    customer_id = Column(String, ForeignKey("customers.id"), index=True)
    plan_name = Column(String)
    status = Column(String, default="active")
    start_date = Column(DateTime(timezone=True))
    end_date = Column(DateTime(timezone=True), nullable=True)


class Contract(Base):
    __tablename__ = "contracts"
    id = Column(String, primary_key=True, default=new_id)
    customer_id = Column(String, ForeignKey("customers.id"), index=True)
    amount = Column(Float)
    currency = Column(String, default="USD")
    billing_frequency = Column(String, default="monthly")


class DataSource(Base):
    __tablename__ = "data_sources"
    id = Column(String, primary_key=True, default=new_id)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # csv | stripe
    config = Column(JSON, default=dict)  # filename, columns inferred, etc
    raw_rows = Column(JSON, default=list)  # store parsed rows
    inferred_schema = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=now_utc)


class MappingTemplate(Base):
    __tablename__ = "mapping_templates"
    id = Column(String, primary_key=True, default=new_id)
    name = Column(String, nullable=False)
    description = Column(Text, default="")
    source_type = Column(String, default="csv")
    mappings = Column(JSON, default=dict)  # {source_field: canonical_field}
    created_at = Column(DateTime(timezone=True), default=now_utc)


class MigrationRun(Base):
    __tablename__ = "migration_runs"
    id = Column(String, primary_key=True, default=new_id)
    name = Column(String, default="Migration")
    source_id = Column(String, ForeignKey("data_sources.id"))
    source_type = Column(String)
    mapping_template_id = Column(String, ForeignKey("mapping_templates.id"), nullable=True)
    mappings = Column(JSON, default=dict)
    mode = Column(String, default="dry_run")  # dry_run | actual
    status = Column(String, default="pending")  # pending | running | completed | failed
    started_at = Column(DateTime(timezone=True), default=now_utc)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    total_records = Column(Integer, default=0)
    successful_records = Column(Integer, default=0)
    failed_records = Column(Integer, default=0)
    validation_errors = Column(Integer, default=0)
    summary = Column(JSON, default=dict)


class MigrationRecord(Base):
    __tablename__ = "migration_records"
    id = Column(String, primary_key=True, default=new_id)
    migration_run_id = Column(String, ForeignKey("migration_runs.id"), index=True)
    record_type = Column(String)  # customer | subscription | contract
    source_id = Column(String)
    target_id = Column(String, nullable=True)
    status = Column(String, default="pending")  # success | failed | skipped
    error_message = Column(Text, nullable=True)
    payload = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=now_utc)


class MigrationLog(Base):
    __tablename__ = "migration_logs"
    id = Column(String, primary_key=True, default=new_id)
    migration_run_id = Column(String, ForeignKey("migration_runs.id"), index=True)
    level = Column(String, default="info")  # info | warning | error
    message = Column(Text)
    created_at = Column(DateTime(timezone=True), default=now_utc)

class OnboardingProject(Base):
    __tablename__ = "onboarding_projects"
    id = Column(String, primary_key=True, default=new_id)
    name = Column(String, nullable=False)
    customer_name = Column(String, nullable=False)
    customer_logo_url = Column(String, nullable=True)
    description = Column(Text, default="")
    share_token = Column(String, unique=True, index=True, default=new_id)
    source_ids = Column(JSON, default=list)
    mapping_template_ids = Column(JSON, default=list)
    migration_run_ids = Column(JSON, default=list)
    go_live_date = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=now_utc)
