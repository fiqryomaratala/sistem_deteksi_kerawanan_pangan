import os
from pathlib import Path
from urllib.parse import urlparse

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import sessionmaker, declarative_base

from app.logging_config import get_logger

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")
logger = get_logger(__name__)


def validate_postgres_url(database_url: str) -> str:
    if database_url.startswith("postgres://"):
        database_url = "postgresql+psycopg2://" + database_url[len("postgres://"):]
    parsed = urlparse(database_url)
    allowed_schemes = {"postgresql", "postgresql+psycopg2"}

    if parsed.scheme not in allowed_schemes:
        raise ValueError(
            "Database harus menggunakan PostgreSQL. "
            "Gunakan DATABASE_URL PostgreSQL atau isi DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, dan DB_NAME."
        )

    return database_url


def build_database_url() -> str:
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        return validate_postgres_url(database_url)

    db_user = os.getenv("DB_USER")
    db_password = os.getenv("DB_PASSWORD")
    db_host = os.getenv("DB_HOST")
    db_port = os.getenv("DB_PORT", "5432")
    db_name = os.getenv("DB_NAME", "postgres")

    if not all([db_user, db_password, db_host]):
        raise ValueError(
            "Konfigurasi database belum lengkap di file .env. "
            "Isi DATABASE_URL atau DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, dan DB_NAME."
        )

    return validate_postgres_url(
        URL.create(
            drivername="postgresql+psycopg2",
            username=db_user,
            password=db_password,
            host=db_host,
            port=int(db_port),
            database=db_name,
        ).render_as_string(hide_password=False)
    )


DATABASE_URL = build_database_url()

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_database_connection() -> bool:
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return True
    except SQLAlchemyError:
        logger.exception("Pengecekan koneksi database gagal")
        return False
