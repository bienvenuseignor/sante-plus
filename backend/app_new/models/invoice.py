from sqlalchemy import Column, String, Numeric, DateTime, String
from sqlalchemy.dialects.postgresql import JSON
from app_new.database.session import Base
import uuid
from datetime import datetime


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id = Column(String, nullable=False, index=True)
    patient_name = Column(String, nullable=False)
    patient_phone = Column(String, nullable=True)
    hospital_name = Column(String, nullable=True)
    hospital_address = Column(String, nullable=True)
    doctor_name = Column(String, nullable=True)
    items = Column(JSON, nullable=False)
    total_xof = Column(Numeric(12, 2), nullable=False)
    total_sats = Column(Numeric(12, 2), nullable=True)
    payment_method = Column(String, nullable=True)
    tx_hash = Column(String, nullable=True)
    status = Column(String, nullable=False, default="DRAFT")
    hash_sha256 = Column(String, nullable=False, index=True)
    bitcoin_txid = Column(String, nullable=True)
    bitcoin_anchor_status = Column(String, nullable=False, default="ANCHOR_PENDING")
    qr_payload = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
