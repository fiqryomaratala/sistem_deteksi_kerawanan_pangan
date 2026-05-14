from sqlalchemy import Boolean, Column, Integer, Float, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import UTC, datetime

from app.database import Base


def utc_now():
    return datetime.now(UTC).replace(tzinfo=None)

class FoodData(Base):
    __tablename__ = "food_data"

    id = Column(Integer, primary_key=True, index=True)
    bulan = Column(Integer, nullable=True)
    tahun = Column(Integer, nullable=True)
    catatan = Column(String, nullable=True)

    beras_tersedia = Column(Float, nullable=False)
    beras_kebutuhan = Column(Float, nullable=False)

    minyak_tersedia = Column(Float, nullable=False)
    minyak_kebutuhan = Column(Float, nullable=False)

    telur_tersedia = Column(Float, nullable=False)
    telur_kebutuhan = Column(Float, nullable=False)

    created_at = Column(DateTime, default=utc_now)

    prediction = relationship("PredictionResult", back_populates="food_data", uselist=False)

class PredictionResult(Base):
    __tablename__ = "prediction_results"

    id = Column(Integer, primary_key=True, index=True)
    food_data_id = Column(
        Integer,
        ForeignKey("food_data.id"),
        nullable=False,
        unique=True
    )

    beras_ratio = Column(Float, nullable=False)
    minyak_ratio = Column(Float, nullable=False)
    telur_ratio = Column(Float, nullable=False)

    hasil_prediksi = Column(String, nullable=False, index=True)
    created_at = Column(DateTime, default=utc_now)

    food_data = relationship(
        "FoodData", 
        back_populates="prediction"
        )


class AdminUser(Base):
    __tablename__ = "admin_users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, nullable=False, unique=True, index=True)
    password_hash = Column(String, nullable=False)
    profile_photo_path = Column(String, nullable=True)
    role = Column(String, nullable=False, default="admin")
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
