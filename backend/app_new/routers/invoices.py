from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session
from app_new.database.session import get_db
from app_new.models.invoice import Invoice
from app_new.models.patient import Patient
from app_new.schemas.invoices import InvoiceCreate, InvoiceOut, InvoiceVerifyResponse
from app_new.services.integrity import IntegrityService, BitcoinAnchorService
from app_new.services.qr import QRService
from uuid import uuid4

router = APIRouter(prefix="/api/invoices", tags=["invoices-new"])


def _invoice_dict(inv: Invoice) -> dict:
    return {
        "id": inv.id,
        "patient_id": inv.patient_id,
        "patient_name": inv.patient_name,
        "patient_phone": inv.patient_phone,
        "hospital_name": inv.hospital_name,
        "hospital_address": inv.hospital_address,
        "doctor_name": inv.doctor_name,
        "items": inv.items,
        "total_xof": float(inv.total_xof or 0),
        "total_sats": float(inv.total_sats or 0),
        "payment_method": inv.payment_method,
        "tx_hash": inv.tx_hash,
        "status": inv.status,
        "created_at": inv.created_at.isoformat() if inv.created_at else None,
    }


@router.post("/", response_model=InvoiceOut)
def create_invoice(payload: InvoiceCreate, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == payload.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient introuvable")
    invoice_id = f"INV-{uuid4().hex[:10].upper()}"
    raw = _invoice_dict(Invoice(
        id=invoice_id,
        patient_id=payload.patient_id,
        patient_name=payload.patient_name,
        patient_phone=payload.patient_phone,
        hospital_name=payload.hospital_name,
        hospital_address=payload.hospital_address,
        doctor_name=payload.doctor_name,
        items=[item.model_dump() for item in payload.items],
        total_xof=sum(item.price_xof * item.quantity for item in payload.items),
        payment_method=payload.payment_method,
        tx_hash=payload.tx_hash,
        status=payload.status,
        bitcoin_anchor_status="ANCHOR_PENDING",
        qr_payload=None,
    ))
    anchor = BitcoinAnchorService.simulate_anchor(IntegrityService.hash_sha256_hex(IntegrityService.compute_invoice_payload(raw)))
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        invoice = Invoice(
            id=invoice_id,
            patient_id=payload.patient_id,
            patient_name=payload.patient_name,
            patient_phone=payload.patient_phone,
            hospital_name=payload.hospital_name,
            hospital_address=payload.hospital_address,
            doctor_name=payload.doctor_name,
            items=[item.model_dump() for item in payload.items],
            total_xof=sum(item.price_xof * item.quantity for item in payload.items),
            payment_method=payload.payment_method,
            tx_hash=payload.tx_hash,
            status=payload.status,
            hash_sha256=IntegrityService.hash_sha256_hex(IntegrityService.compute_invoice_payload(raw)),
            bitcoin_anchor_status=anchor["status"],
        )
        db.add(invoice)
    else:
        invoice.bitcoin_anchor_status = anchor["status"]
    db.commit()
    db.refresh(invoice)
    return invoice


@router.get("/{invoice_id}", response_model=InvoiceOut)
def get_invoice(invoice_id: str, db: Session = Depends(get_db)):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Facture introuvable")
    return invoice


@router.get("/{invoice_id}/verify", response_model=InvoiceVerifyResponse)
def verify_invoice(invoice_id: str, db: Session = Depends(get_db)):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Facture introuvable")
    raw = _invoice_dict(invoice)
    recomputed = IntegrityService.hash_sha256_hex(IntegrityService.compute_invoice_payload(raw))
    status = "AUTHENTIC" if recomputed == invoice.hash_sha256 else "ALTERED"
    return InvoiceVerifyResponse(invoice=status)


@router.get("/{invoice_id}/anchor-simulate", response_model=InvoiceOut)
def simulate_invoice_anchor(invoice_id: str, db: Session = Depends(get_db)):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Facture introuvable")
    anchor = BitcoinAnchorService.simulate_confirmed_anchor(invoice.hash_sha256)
    invoice.bitcoin_anchor_status = anchor["status"]
    invoice.bitcoin_txid = anchor["simulated_txid"]
    invoice.qr_payload = QRService.build_invoice_qr(invoice_id, invoice.hash_sha256, invoice.bitcoin_txid)
    db.commit()
    db.refresh(invoice)
    return invoice


@router.get("/{invoice_id}/qr", response_class=PlainTextResponse)
def invoice_qr(invoice_id: str, db: Session = Depends(get_db)):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Facture introuvable")
    qr = invoice.qr_payload or QRService.build_invoice_qr(invoice_id, invoice.hash_sha256, invoice.bitcoin_txid)
    return qr
