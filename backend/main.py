import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routes import hospitals, appointments, wallet, documents, access

app = FastAPI(
    title="Santé+ Bénin",
    description="API Santé Plus - Hackathon 2026",
    version="2.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(hospitals.router)
app.include_router(appointments.router)
app.include_router(wallet.router)
app.include_router(documents.router)
app.include_router(access.router)

@app.get("/")
def root():
    return {
        "status": "online",
        "service": "Santé Plus API",
        "version": "2.0.0",
        "endpoints": [
            "/api/auth/login",
            "/api/lightning/create-invoice",
            "/api/hospitals",
            "/api/appointments",
            "/api/documents"
        ]
    }

if __name__ == "__main__":
    uvicorn.run("main_new:app", host="0.0.0.0", port=8000, reload=True)
