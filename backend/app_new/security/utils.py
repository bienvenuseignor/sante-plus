from datetime import datetime, timedelta
from jose import jwt
import os

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
SECRET_KEY = os.getenv("SANTE_PLUS_JWT_SECRET", "sante-plus-jwt-secret-2026-demo")


def create_access_token(subject: str, extra: dict | None = None) -> str:
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": subject, "exp": expire}
    if extra:
        payload.update(extra)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
