from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.backends import default_backend
import base64
import os


class EncryptionService:
    @staticmethod
    def _derive_key(secret: str, salt: bytes) -> bytes:
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
            backend=default_backend(),
        )
        return kdf.derive(secret.encode("utf-8"))

    @staticmethod
    def encrypt(plaintext: str, secret: str) -> str:
        salt = os.urandom(16)
        key = EncryptionService._derive_key(secret, salt)
        aesgcm = AESGCM(key)
        nonce = os.urandom(12)
        ciphertext = aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)
        payload = base64.b64encode(salt + nonce + ciphertext).decode("utf-8")
        return payload

    @staticmethod
    def decrypt(payload: str, secret: str) -> str:
        raw = base64.b64decode(payload.encode("utf-8"))
        salt = raw[:16]
        nonce = raw[16:28]
        ciphertext = raw[28:]
        key = EncryptionService._derive_key(secret, salt)
        aesgcm = AESGCM(key)
        plaintext = aesgcm.decrypt(nonce, ciphertext, None)
        return plaintext.decode("utf-8")
