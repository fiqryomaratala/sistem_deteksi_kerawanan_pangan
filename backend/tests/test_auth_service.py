import os
import unittest
from unittest.mock import patch

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app import models
from app.services.auth import (
    AuthServiceError,
    build_admin_profile,
    create_admin_token,
    decode_admin_token,
    get_admin_auth_settings,
    hash_admin_password,
    login_admin,
    update_admin_password,
    verify_admin_password,
)


class AuthServiceTestCase(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        models.Base.metadata.create_all(bind=self.engine)

    def tearDown(self):
        models.Base.metadata.drop_all(bind=self.engine)
        self.engine.dispose()

    def _session(self):
        return self.SessionLocal()

    def _seed_admin(self, username="admin", password="super-rahasia"):
        with self._session() as db:
            admin_user = models.AdminUser(
                username=username,
                password_hash=hash_admin_password(password),
                role="admin",
                is_active=True,
            )
            db.add(admin_user)
            db.commit()

    def test_login_admin_returns_bearer_token(self):
        self._seed_admin()
        with patch.dict(
            os.environ,
            {
                "ADMIN_TOKEN_SECRET": "secret-token-testing",
                "ADMIN_TOKEN_EXPIRE_MINUTES": "60",
            },
            clear=False,
        ):
            with self._session() as db:
                result = login_admin(db, "admin", "super-rahasia")

        self.assertEqual(result["token_type"], "bearer")
        self.assertEqual(result["admin"]["username"], "admin")
        self.assertEqual(result["admin"]["role"], "admin")
        self.assertIsNone(result["admin"]["photo_url"])
        self.assertTrue(result["access_token"])

    def test_login_admin_rejects_invalid_credentials(self):
        self._seed_admin()
        with patch.dict(
            os.environ,
            {
                "ADMIN_TOKEN_SECRET": "secret-token-testing",
            },
            clear=False,
        ):
            with self._session() as db:
                with self.assertRaises(AuthServiceError) as context:
                    login_admin(db, "admin", "salah")

        self.assertEqual(context.exception.status_code, 401)
        self.assertEqual(context.exception.message, "Username atau password admin salah")

    def test_decode_admin_token_rejects_expired_token(self):
        token, _ = create_admin_token(
            username="admin",
            role="admin",
            token_secret="secret-token-testing",
            expire_minutes=-1,
        )

        with self.assertRaises(AuthServiceError) as context:
            decode_admin_token(token, "secret-token-testing")

        self.assertEqual(context.exception.status_code, 401)
        self.assertEqual(context.exception.message, "Sesi admin telah kedaluwarsa")

    def test_verify_admin_password_matches_hash(self):
        password_hash = hash_admin_password("super-rahasia")
        self.assertTrue(verify_admin_password("super-rahasia", password_hash))
        self.assertFalse(verify_admin_password("password-lain", password_hash))

    def test_get_admin_settings_requires_complete_env(self):
        with patch.dict(
            os.environ,
            {},
            clear=True,
        ):
            with self.assertRaises(AuthServiceError) as context:
                get_admin_auth_settings()

        self.assertEqual(context.exception.status_code, 500)
        self.assertEqual(context.exception.message, "Konfigurasi login admin belum lengkap")

    def test_update_admin_password_rehashes_password(self):
        self._seed_admin(password="password-lama")

        with self._session() as db:
            admin_user = db.query(models.AdminUser).filter_by(username="admin").first()
            result = update_admin_password(
                db,
                admin_id=admin_user.id,
                current_password="password-lama",
                new_password="password-baru-123",
            )

        self.assertEqual(result["username"], "admin")

        with self._session() as db:
            refreshed = db.query(models.AdminUser).filter_by(username="admin").first()
            self.assertTrue(
                verify_admin_password("password-baru-123", refreshed.password_hash)
            )
            self.assertFalse(
                verify_admin_password("password-lama", refreshed.password_hash)
            )

    def test_update_admin_password_rejects_invalid_current_password(self):
        self._seed_admin(password="password-lama")

        with self._session() as db:
            admin_user = db.query(models.AdminUser).filter_by(username="admin").first()
            with self.assertRaises(AuthServiceError) as context:
                update_admin_password(
                    db,
                    admin_id=admin_user.id,
                    current_password="salah",
                    new_password="password-baru-123",
                )

        self.assertEqual(context.exception.status_code, 400)
        self.assertEqual(context.exception.message, "Password saat ini tidak sesuai")

    def test_build_admin_profile_returns_upload_url(self):
        admin_user = models.AdminUser(
            username="admin",
            password_hash=hash_admin_password("super-rahasia"),
            profile_photo_path="admin-photos/foto.png",
            role="admin",
            is_active=True,
        )

        profile = build_admin_profile(admin_user)

        self.assertEqual(profile["photo_url"], "/uploads/admin-photos/foto.png")
