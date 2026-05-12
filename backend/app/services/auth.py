import base64
import hashlib
import hmac
import json
import os
import secrets
from datetime import UTC, datetime, timedelta

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app import models
from app.database import get_db
from app.logging_config import get_logger

logger = get_logger(__name__)
bearer_scheme = HTTPBearer(auto_error=False)


class AuthServiceError(Exception):
    def __init__(self, message: str, status_code: int = 401):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(f"{value}{padding}")


def get_admin_auth_settings() -> dict:
    token_secret = os.getenv("ADMIN_TOKEN_SECRET")
    expire_minutes_raw = os.getenv("ADMIN_TOKEN_EXPIRE_MINUTES", "480")

    if not token_secret:
        raise AuthServiceError(
            "Konfigurasi login admin belum lengkap",
            status_code=500,
        )

    try:
        expire_minutes = int(expire_minutes_raw)
    except ValueError as exc:
        raise AuthServiceError(
            "Konfigurasi durasi token admin tidak valid",
            status_code=500,
        ) from exc

    if expire_minutes <= 0:
        raise AuthServiceError(
            "Durasi token admin harus lebih dari 0 menit",
            status_code=500,
        )

    return {
        "token_secret": token_secret,
        "expire_minutes": expire_minutes,
    }


def hash_admin_password(password: str, salt: str | None = None) -> str:
    password_salt = salt or secrets.token_hex(16)
    password_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        password_salt.encode("utf-8"),
        200000,
    ).hex()
    return f"{password_salt}${password_hash}"


def verify_admin_password(password: str, stored_password_hash: str) -> bool:
    try:
        password_salt, _ = stored_password_hash.split("$", maxsplit=1)
    except ValueError:
        return False

    recomputed_hash = hash_admin_password(password, salt=password_salt)
    return hmac.compare_digest(recomputed_hash, stored_password_hash)


def _build_signature(payload_b64: str, token_secret: str) -> str:
    digest = hmac.new(
        token_secret.encode("utf-8"),
        payload_b64.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    return _b64url_encode(digest)


def create_admin_token(username: str, role: str, token_secret: str, expire_minutes: int):
    expires_at = datetime.now(UTC) + timedelta(minutes=expire_minutes)
    payload = {
        "sub": username,
        "role": role,
        "exp": int(expires_at.timestamp()),
    }
    payload_b64 = _b64url_encode(
        json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    )
    signature = _build_signature(payload_b64, token_secret)
    token = f"{payload_b64}.{signature}"
    return token, expires_at


def decode_admin_token(token: str, token_secret: str) -> dict:
    try:
        payload_b64, signature = token.split(".", maxsplit=1)
    except ValueError as exc:
        raise AuthServiceError("Token admin tidak valid", status_code=401) from exc

    expected_signature = _build_signature(payload_b64, token_secret)
    if not hmac.compare_digest(signature, expected_signature):
        raise AuthServiceError("Token admin tidak valid", status_code=401)

    try:
        payload = json.loads(_b64url_decode(payload_b64).decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError, ValueError) as exc:
        raise AuthServiceError("Token admin tidak valid", status_code=401) from exc

    exp = payload.get("exp")
    if not isinstance(exp, int):
        raise AuthServiceError("Token admin tidak valid", status_code=401)

    if datetime.now(UTC).timestamp() > exp:
        raise AuthServiceError("Sesi admin telah kedaluwarsa", status_code=401)

    if payload.get("role") != "admin" or not payload.get("sub"):
        raise AuthServiceError("Token admin tidak valid", status_code=401)

    return payload


def login_admin(db: Session, username: str, password: str) -> dict:
    settings = get_admin_auth_settings()

    admin_user = (
        db.query(models.AdminUser)
        .filter(models.AdminUser.username == username)
        .first()
    )

    if admin_user is None or not admin_user.is_active:
        raise AuthServiceError("Username atau password admin salah", status_code=401)

    if not verify_admin_password(password, admin_user.password_hash):
        raise AuthServiceError("Username atau password admin salah", status_code=401)

    token, expires_at = create_admin_token(
        username=admin_user.username,
        role=admin_user.role,
        token_secret=settings["token_secret"],
        expire_minutes=settings["expire_minutes"],
    )

    logger.info("Login admin berhasil untuk %s", admin_user.username)
    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_at": expires_at,
        "admin": {
            "username": admin_user.username,
            "role": admin_user.role,
        },
    }


def get_current_admin(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise AuthServiceError("Token admin diperlukan", status_code=401)

    settings = get_admin_auth_settings()
    payload = decode_admin_token(credentials.credentials, settings["token_secret"])
    admin_user = (
        db.query(models.AdminUser)
        .filter(
            models.AdminUser.username == payload["sub"],
            models.AdminUser.role == payload["role"],
            models.AdminUser.is_active.is_(True),
        )
        .first()
    )

    if admin_user is None:
        raise AuthServiceError("Admin tidak ditemukan atau tidak aktif", status_code=401)

    return {
        "username": admin_user.username,
        "role": admin_user.role,
    }
