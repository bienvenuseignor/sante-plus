# Santé+ Bénin — Nouveau Backend Sécurisé (`app_new`)

Ce module expose un backend FastAPI dédié à la sécurisation des dossiers médicaux et des factures.

## Démarrage rapide

```bash
cd backend
python3 -m uvicorn app_new.main:app --host 0.0.0.0 --port 8010 --reload
```

Swagger : http://localhost:8010/docs

## Endpoints principaux

- `POST /api/patients/register`
- `POST /api/patients/login`
- `POST /api/medical-records/`
- `GET /api/medical-records/{record_id}/verify`
- `POST /api/medical-records/access/request`
- `PATCH /api/medical-records/access/{request_id}/approve`
- `PATCH /api/medical-records/access/{request_id}/reject`
- `POST /api/medical-records/access/revoke`
- `GET /api/medical-records/audit/{patient_id}`
- `POST /api/invoices/`
- `GET /api/invoices/{invoice_id}`
- `GET /api/invoices/{invoice_id}/verify`
- `GET /api/invoices/{invoice_id}/anchor-simulate`
- `GET /api/invoices/{invoice_id}/qr`

## Notes

- Base SQLite locale : `santeplus.db`
- Chiffrement AES-256-GCM via `app_new.services.encryption`
- Hash SHA-256 + simulation d’ancrage Bitcoin
- Pas de stockage des données médicales sur blockchain
