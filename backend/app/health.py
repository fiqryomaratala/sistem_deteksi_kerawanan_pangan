from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.logging_config import get_logger
from app.services.predict import PredictionServiceError

logger = get_logger(__name__)


def get_health_status(db: Session) -> dict:
    try:
        db.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        logger.exception("Database health check gagal")
        raise PredictionServiceError(
            "Koneksi database tidak tersedia",
            status_code=503
        ) from exc

    return {
        "status": "ok",
        "database": "connected"
    }
