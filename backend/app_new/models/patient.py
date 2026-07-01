from sqlalchemy import Column, String, BigInteger, Boolean
from app_new.database.session import Base
import uuid


class Patient(Base):
    __tablename__ = "patients"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    phone = Column(String, nullable=True)
    npi = Column(String, unique=True, nullable=True)
    wallet_balance = Column(BigInteger, nullable=False, default=10000)
    avatar = Column(String, nullable=True)
    is_deleted = Column(Boolean, default=False)
