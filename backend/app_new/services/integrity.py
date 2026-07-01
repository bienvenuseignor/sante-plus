import hashlib
import json
from datetime import datetime


class IntegrityService:
    @staticmethod
    def compute_invoice_payload(invoice: dict) -> str:
        payload = {
            "id": invoice["id"],
            "patient_id": invoice["patient_id"],
            "patient_name": invoice["patient_name"],
            "doctor_name": invoice.get("doctor_name"),
            "hospital_name": invoice.get("hospital_name"),
            "items": invoice["items"],
            "total_xof": str(invoice["total_xof"]),
            "status": invoice["status"],
            "created_at": str(invoice["created_at"]),
        }
        return json.dumps(payload, sort_keys=True)

    @staticmethod
    def compute_medical_record_payload(record_json: str) -> str:
        return record_json

    @staticmethod
    def hash_sha256_hex(payload: str) -> str:
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()


class BitcoinAnchorService:
    @staticmethod
    def simulate_anchor(payload_hash: str) -> dict:
        return {
            "status": "ANCHOR_PENDING",
            "simulated_txid": None,
            "simulated_timestamp": None,
            "note": "Simulation du futur ancrage Bitcoin sans stockage de données médicales sur la blockchain.",
        }

    @staticmethod
    def simulate_confirmed_anchor(payload_hash: str) -> dict:
        return {
            "status": "ANCHOR_SIMULATED",
            "simulated_txid": f"btc_sim_{payload_hash[:12]}",
            "simulated_timestamp": datetime.utcnow().isoformat(),
            "note": "Simulation d'une confirmation Bitcoin pour la démo.",
        }
