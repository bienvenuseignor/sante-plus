from urllib.parse import urlencode


class QRService:
    @staticmethod
    def build_invoice_qr(invoice_id: str, invoice_hash: str, txid: str | None = None) -> str:
        payload = {
            "app": "sante-plus",
            "invoice_id": invoice_id,
            "hash": invoice_hash,
            "txid": txid or "",
        }
        return "santeplus://invoice?" + urlencode(payload)
