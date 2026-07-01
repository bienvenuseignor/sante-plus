from pydantic import BaseModel


class PatientCreate(BaseModel):
    name: str
    email: str
    phone: str | None = None
    npi: str | None = None


class PatientOut(BaseModel):
    id: str
    name: str
    email: str
    phone: str | None = None
    wallet_balance: int = 10000
    npi: str | None = None
    avatar: str | None = None


class LoginRequest(BaseModel):
    email: str
    password: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    patient: PatientOut
