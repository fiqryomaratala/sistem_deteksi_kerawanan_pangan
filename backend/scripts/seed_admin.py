import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from app import models
from app.database import Base, SessionLocal, engine
from app.services.auth import hash_admin_password


def main():
    if len(sys.argv) < 3:
        print("Usage: python scripts/seed_admin.py <username> <password>")
        raise SystemExit(1)

    username = sys.argv[1].strip()
    password = sys.argv[2]

    if not username or not password:
        print("Username dan password admin wajib diisi.")
        raise SystemExit(1)

    Base.metadata.create_all(bind=engine)

    with SessionLocal() as db:
        admin_user = (
            db.query(models.AdminUser)
            .filter(models.AdminUser.username == username)
            .first()
        )

        password_hash = hash_admin_password(password)

        if admin_user is None:
            admin_user = models.AdminUser(
                username=username,
                password_hash=password_hash,
                role="admin",
                is_active=True,
            )
            db.add(admin_user)
            action = "created"
        else:
            admin_user.password_hash = password_hash
            admin_user.role = "admin"
            admin_user.is_active = True
            action = "updated"

        db.commit()
        db.refresh(admin_user)

    print(
        f"Seeder admin selesai: action={action} "
        f"id={admin_user.id} username={admin_user.username}"
    )


if __name__ == "__main__":
    main()
