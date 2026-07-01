from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app_new.routers import patients, medical_records, invoices
from app_new.database.session import engine, Base

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Santé+ Bénin - Module Médical Sécurisé",
    description="Backend FastAPI dédié à la sécurité des dossiers médicaux.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(patients.router)
app.include_router(medical_records.router)
app.include_router(invoices.router)


@app.get("/")
def root():
    return {
        "status": "online",
        "mode": "app_new",
        "endpoints": [
            "/api/patients/register",
            "/api/patients/login",
            "/api/medical-records/",
            "/api/medical-records/{record_id}/verify",
            "/api/invoices/",
            "/api/invoices/{invoice_id}/verify",
        ],
    }
