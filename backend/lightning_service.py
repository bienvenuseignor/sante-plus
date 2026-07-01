from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime, timedelta
import uuid

# Ta clé API Breez
BREEZ_API_KEY = "MIIBgzCCATWgAwIBAgIHP1bQptq7lTAFBgMrZXAwEDEOMAwGA1UEAxMFQnJlZXowHhcNMjYwNjMwMTY0MjQ4WhcNMzYwNjI3MTY0MjQ4WjAzMRQwEgYDVQQKEwtwYXJ0aWN1bGllcjEbMBkGA1UEAwwSS3Blbm9uaG91biBBZG9yw6llMCowBQYDK2VwAyEA0IP1y98gPByiIMoph1P0G6cctLb864rNXw1LRLOpXXejgYowgYcwDgYDVR0PAQH/BAQDAgWgMAwGA1UdEwEB/wQCMAAwHQYDVR0OBBYEFNo5o+5ea0sNMlW/75VgGJCv2AcJMB8GA1UdIwQYMBaAFN6q1pJW843ndJIW/Ey2ILJrKJhrMCcGA1UdEQQgMB6BHGhlcm1pb25la3Blbm9uaG91bkBnbWFpbC5jb20wBQYDK2VwA0EA5qG762+ZFgzNhjAAwbOBvAhQqK8xIZXuN5UWWy4F9Aw0SAdwzBdCLvUAf7WwGggK0P/7LH0KN10K8prNWCI0Aw=="

router = APIRouter(prefix="/api/lightning", tags=["lightning"])

class InvoiceRequest(BaseModel):
    amount_sats: int
    memo: str = "Santé Plus - Paiement"

class InvoiceResponse(BaseModel):
    payment_hash: str
    payment_request: str
    amount_sats: int
    expires_at: str

@router.post("/create-invoice", response_model=InvoiceResponse)
def create_invoice(request: InvoiceRequest):
    # Simulation pour la démo (dans la réalité, utiliser Breez SDK)
    # Dans la vraie implémentation:
    # from breez_sdk import BreezSDK
    # sdk = BreezSDK(api_key=BREEZ_API_KEY)
    # invoice = await sdk.create_invoice(request.amount_sats, request.memo)
    
    payment_hash = str(uuid.uuid4())
    payment_request = f"lnbc{request.amount_sats}u1p3889qpp5{payment_hash}"
    
    return {
        "payment_hash": payment_hash,
        "payment_request": payment_request,
        "amount_sats": request.amount_sats,
        "expires_at": (datetime.utcnow() + timedelta(hours=1)).isoformat()
    }

@router.get("/check-payment/{payment_hash}")
def check_payment(payment_hash: str):
    # Simulation: paiement confirmé après 3 secondes
    return {
        "paid": True,
        "payment_hash": payment_hash,
        "preimage": str(uuid.uuid4()),
        "settled_at": datetime.utcnow().isoformat()
    }
