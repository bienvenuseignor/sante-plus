from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app_new.database.session import get_db
from app_new.models.medical_record import MedicalRecord, AccessRequest, AccessAuditLog
from app_new.models.patient import Patient
from app_new.schemas.medical_record import (
    MedicalRecordCreate,
    MedicalRecordOut,
    VerifyResponse,
    AccessGrantRequest,
    AccessRevokeRequest,
    AccessAuditOut,
)
from app_new.services.integrity import IntegrityService, BitcoinAnchorService
from app_new.services.encryption import EncryptionService
from datetime import datetime

router = APIRouter(prefix="/api/medical-records", tags=["medical-records"])


def _log_audit(db: Session, actor_email: str, actor_role: str, patient_id: str, action: str, detail: str | None = None):
    log = AccessAuditLog(actor_email=actor_email, actor_role=actor_role, patient_id=patient_id, action=action, detail=detail)
    db.add(log)


@router.post("/", response_model=MedicalRecordOut)
def create_medical_record(payload: MedicalRecordCreate, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == payload.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient introuvable")
    encrypted = EncryptionService.encrypt(payload.record_json, payload.secret)
    record_payload = IntegrityService.compute_medical_record_payload(payload.record_json)
    record_hash = IntegrityService.hash_sha256_hex(record_payload)
    anchor = BitcoinAnchorService.simulate_anchor(record_hash)
    record = MedicalRecord(
        patient_id=patient.id,
        record_json=payload.record_json,
        encrypted_key=encrypted,
        hash_sha256=record_hash,
        bitcoin_anchor_status=anchor["status"],
    )
    db.add(record)
    _log_audit(db, actor_email="system", actor_role="system", patient_id=patient.id, action="CREATE_RECORD", detail=f"record={record.id}")
    db.commit()
    db.refresh(record)
    return record


@router.get("/{record_id}/verify", response_model=VerifyResponse)
def verify_medical_record(record_id: str, secret: str, db: Session = Depends(get_db)):
    record = db.query(MedicalRecord).filter(MedicalRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Dossier introuvable")
    try:
        EncryptionService.decrypt(record.encrypted_key, secret)
    except Exception:
        return VerifyResponse(status="MODIFIED")
    recomputed = IntegrityService.hash_sha256_hex(IntegrityService.compute_medical_record_payload(record.record_json))
    status = "VALID" if recomputed == record.hash_sha256 else "MODIFIED"
    return VerifyResponse(status=status)


@router.post("/access/request", response_model=AccessRequest)
def request_access(payload: AccessGrantRequest, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == payload.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient introuvable")
    existing = db.query(AccessRequest).filter(AccessRequest.patient_id == payload.patient_id, AccessRequest.doctor_email == payload.doctor_email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Demande déjà existante")
    req = AccessRequest(
        patient_id=payload.patient_id,
        doctor_email=payload.doctor_email,
        doctor_name=payload.doctor_name,
        hospital_name=payload.hospital_name,
        status="pending",
        requested_at=datetime.utcnow().isoformat(),
    )
    db.add(req)
    _log_audit(db, actor_email=payload.doctor_email, actor_role="doctor", patient_id=payload.patient_id, action="REQUEST_ACCESS", detail=payload.motive)
    db.commit()
    db.refresh(req)
    return req


@router.patch("/access/{request_id}/approve")
def approve_access(request_id: str, db: Session = Depends(get_db)):
    req = db.query(AccessRequest).filter(AccessRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Demande introuvable")
    req.status = "approved"
    req.reviewed_at = datetime.utcnow().isoformat()
    _log_audit(db, actor_email="admin@sante.bj", actor_role="admin", patient_id=req.patient_id, action="APPROVE_ACCESS", detail=f"request={req.id}")
    db.commit()
    return {"success": True, "status": req.status}


@router.patch("/access/{request_id}/reject")
def reject_access(request_id: str, db: Session = Depends(get_db)):
    req = db.query(AccessRequest).filter(AccessRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Demande introuvable")
    req.status = "rejected"
    req.reviewed_at = datetime.utcnow().isoformat()
    _log_audit(db, actor_email="admin@sante.bj", actor_role="admin", patient_id=req.patient_id, action="REJECT_ACCESS", detail=f"request={req.id}")
    db.commit()
    return {"success": True, "status": req.status}


@router.post("/access/revoke")
def revoke_access(payload: AccessRevokeRequest, db: Session = Depends(get_db)):
    req = db.query(AccessRequest).filter(AccessRequest.patient_id == payload.patient_id, AccessRequest.doctor_email == payload.doctor_email, AccessRequest.status == "approved").first()
    if not req:
        raise HTTPException(status_code=404, detail="Accès approuvé introuvable")
    req.status = "revoked"
    req.reviewed_at = datetime.utcnow().isoformat()
    _log_audit(db, actor_email=payload.doctor_email, actor_role="doctor" if False else "patient", patient_id=payload.patient_id, action="REVOKE_ACCESS", detail=f"request={req.id}")
    db.commit()
    return {"success": True}


@router.get("/audit/{patient_id}", response_model=list[AccessAuditOut])
def list_access_audit(patient_id: str, db: Session = Depends(get_db)):
    logs = db.query(AccessAuditLog).filter(AccessAuditLog.patient_id == patient_id).order_by(AccessAuditLog.created_at.desc()).all()
    return [AccessAuditOut(**log.__dict__) for log in logs]
