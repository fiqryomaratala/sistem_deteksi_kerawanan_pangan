import base64
import hashlib
import hmac
import json
import os
import secrets
from pathlib import Path
from datetime import UTC, datetime, timedelta

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app import models
from app.database import get_db
from app.logging_config import get_logger

logger = get_logger(__name__)
bearer_scheme = HTTPBearer(auto_error=False)
UPLOAD_ROOT = Path(__file__).resolve().parents[2] / "uploads" / "admin-photos"
MAX_PHOTO_SIZE_BYTES = 2 * 1024 * 1024
ALLOWED_PHOTO_EXTENSIONS = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
}


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


def build_admin_profile(admin_user: models.AdminUser) -> dict:
    photo_url = None
    if admin_user.profile_photo_path:
        photo_url = f"/uploads/{admin_user.profile_photo_path.replace(os.sep, '/')}"

    return {
        "username": admin_user.username,
        "display_name": admin_user.display_name,
        "role": admin_user.role,
        "photo_url": photo_url,
    }


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
        "admin": build_admin_profile(admin_user),
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
        "id": admin_user.id,
        "username": admin_user.username,
        "role": admin_user.role,
        "photo_url": build_admin_profile(admin_user)["photo_url"],
    }


def update_admin_password(
    db: Session,
    admin_id: int,
    current_password: str,
    new_password: str,
) -> dict:
    admin_user = db.query(models.AdminUser).filter(models.AdminUser.id == admin_id).first()

    if admin_user is None or not admin_user.is_active:
        raise AuthServiceError("Admin tidak ditemukan atau tidak aktif", status_code=404)

    if not verify_admin_password(current_password, admin_user.password_hash):
        raise AuthServiceError("Password saat ini tidak sesuai", status_code=400)

    if current_password == new_password:
        raise AuthServiceError("Password baru harus berbeda dari password saat ini", status_code=400)

    admin_user.password_hash = hash_admin_password(new_password)
    db.add(admin_user)
    db.commit()
    db.refresh(admin_user)

    logger.info("Password admin berhasil diperbarui untuk %s", admin_user.username)
    return build_admin_profile(admin_user)


def update_admin_display_name(
    db: Session,
    admin_id: int,
    display_name: str,
) -> dict:
    admin_user = db.query(models.AdminUser).filter(models.AdminUser.id == admin_id).first()

    if admin_user is None or not admin_user.is_active:
        raise AuthServiceError("Admin tidak ditemukan atau tidak aktif", status_code=404)

    admin_user.display_name = display_name.strip()
    db.add(admin_user)
    db.commit()
    db.refresh(admin_user)

    logger.info("Display name admin berhasil diperbarui untuk %s", admin_user.username)
    return build_admin_profile(admin_user)


def update_admin_profile_photo(
    db: Session,
    admin_id: int,
    file_bytes: bytes,
    filename: str,
    content_type: str | None,
) -> dict:
    admin_user = db.query(models.AdminUser).filter(models.AdminUser.id == admin_id).first()

    if admin_user is None or not admin_user.is_active:
        raise AuthServiceError("Admin tidak ditemukan atau tidak aktif", status_code=404)

    if not file_bytes:
        raise AuthServiceError("File foto profil tidak boleh kosong", status_code=400)

    if len(file_bytes) > MAX_PHOTO_SIZE_BYTES:
        raise AuthServiceError("Ukuran foto profil maksimal 2 MB", status_code=400)

    suffix = Path(filename).suffix.lower()
    if suffix not in ALLOWED_PHOTO_EXTENSIONS:
        raise AuthServiceError("Format foto profil harus JPG, PNG, atau WEBP", status_code=400)

    expected_content_type = ALLOWED_PHOTO_EXTENSIONS[suffix]
    if content_type and content_type != expected_content_type:
        raise AuthServiceError("Tipe file foto profil tidak sesuai dengan ekstensi", status_code=400)

    UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)

    previous_file = admin_user.profile_photo_path
    safe_filename = f"admin-{admin_user.id}-{secrets.token_hex(8)}{suffix}"
    relative_path = Path("admin-photos") / safe_filename
    output_path = UPLOAD_ROOT / safe_filename
    output_path.write_bytes(file_bytes)

    admin_user.profile_photo_path = str(relative_path)
    db.add(admin_user)
    db.commit()
    db.refresh(admin_user)

    if previous_file:
        previous_path = UPLOAD_ROOT.parent / previous_file
        if previous_path.exists():
            previous_path.unlink(missing_ok=True)

    logger.info("Foto profil admin berhasil diperbarui untuk %s", admin_user.username)
    return build_admin_profile(admin_user)
