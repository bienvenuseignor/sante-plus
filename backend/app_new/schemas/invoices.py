from pydantic import BaseModel
from typing import List


class InvoiceItem(BaseModel):
    name: str
    quantity: int = 1
    price_xof: float


class InvoiceCreate(BaseModel):
    patient_id: str
    patient_name: str
    patient_phone: str | None = None
    hospital_name: str | None = None
    hospital_address: str | None = None
    doctor_name: str | None = None
    items: List[InvoiceItem]
    payment_method: str | None = None
    tx_hash: str | None = None
    status: str = "PAID"


class InvoiceOut(BaseModel):
    id: str
    patient_id: str
    patient_name: str
    total_xof: float
    status: str
    hash_sha256: str
    bitcoin_anchor_status: str
    bitcoin_txid: str | None = None
    qr_payload: str | None = None
    created_at: str | None = None


class InvoiceVerifyResponse(BaseModel):
    invoice: str
