from pydantic import BaseModel


class MedicalRecordCreate(BaseModel):
    patient_id: str
    record_json: str
    secret: str


class MedicalRecordOut(BaseModel):
    id: str
    patient_id: str
    encrypted_key: str
    hash_sha256: str
    bitcoin_anchor_status: str
    bitcoin_txid: str | None = None
    created_at: str | None = None


class VerifyResponse(BaseModel):
    status: str


class AccessGrantRequest(BaseModel):
    patient_id: str
    doctor_email: str
    doctor_name: str | None = None
    hospital_name: str | None = None
    motive: str | None = None


class AccessRevokeRequest(BaseModel):
    patient_id: str
    doctor_email: str


class AccessAuditOut(BaseModel):
    actor_email: str
    actor_role: str
    action: str
    detail: str | None = None
    created_at: str | None = None
