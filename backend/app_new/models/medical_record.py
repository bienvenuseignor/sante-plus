from sqlalchemy import Column, String, Text, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import relationship
from app_new.database.session import Base
import uuid
from datetime import datetime


class MedicalRecord(Base):
    __tablename__ = "medical_records"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False, index=True)
    record_json = Column(Text, nullable=False)
    encrypted_key = Column(String, nullable=False)
    hash_sha256 = Column(String, nullable=False, index=True)
    bitcoin_anchor_status = Column(String, nullable=False, default="ANCHOR_PENDING")
    bitcoin_txid = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AccessRequest(Base):
    __tablename__ = "access_requests"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False, index=True)
    doctor_email = Column(String, nullable=False, index=True)
    doctor_name = Column(String, nullable=True)
    hospital_name = Column(String, nullable=True)
    status = Column(String, nullable=False, default="pending")
    requested_at = Column(String, nullable=True)
    reviewed_at = Column(String, nullable=True)


class AccessAuditLog(Base):
    __tablename__ = "access_audit_logs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    actor_email = Column(String, nullable=False, index=True)
    actor_role = Column(String, nullable=False)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False, index=True)
    action = Column(String, nullable=False)
    detail = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
