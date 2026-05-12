from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class PredictionRequest(BaseModel):
    bulan: int = Field(..., ge=1, le=12)
    tahun: int = Field(..., ge=1900)
    catatan: Optional[str] = None

    beras_tersedia: float = Field(..., gt=0)
    beras_kebutuhan: float = Field(..., gt=0)
    minyak_tersedia: float = Field(..., gt=0)
    minyak_kebutuhan: float = Field(..., gt=0)
    telur_tersedia: float = Field(..., gt=0)
    telur_kebutuhan: float = Field(..., gt=0)

class PredictionResponse(BaseModel):
    id: int
    bulan: Optional[int] = None
    tahun: Optional[int] = None
    catatan: Optional[str] = None
    beras_ratio: float
    minyak_ratio: float
    telur_ratio: float
    hasil_prediksi: str

    class Config:
        from_attributes = True


class PredictionHistoryItem(BaseModel):
    id: int
    food_data_id: int
    bulan: Optional[int] = None
    tahun: Optional[int] = None
    catatan: Optional[str] = None
    beras_tersedia: float
    beras_kebutuhan: float
    minyak_tersedia: float
    minyak_kebutuhan: float
    telur_tersedia: float
    telur_kebutuhan: float
    beras_ratio: float
    minyak_ratio: float
    telur_ratio: float
    hasil_prediksi: str
    created_at: datetime


class PredictionHistoryResponse(BaseModel):
    total: int
    limit: int
    offset: int
    hasil_prediksi: Optional[str] = None
    bulan: Optional[int] = None
    tahun: Optional[int] = None
    items: list[PredictionHistoryItem]


class HealthResponse(BaseModel):
    status: str
    database: str


class PredictionSummaryCounts(BaseModel):
    total: int
    aman: int
    waspada: int
    rawan: int


class DashboardSummaryResponse(BaseModel):
    total_data: int
    counts: PredictionSummaryCounts
    latest_prediction: Optional[PredictionHistoryItem] = None


class DistributionItem(BaseModel):
    label: str
    value: int
    percentage: float


class DashboardDistributionResponse(BaseModel):
    total_data: int
    items: list[DistributionItem]


class MonthlyTrendItem(BaseModel):
    bulan: int
    total: int
    aman: int
    waspada: int
    rawan: int


class DashboardMonthlyTrendResponse(BaseModel):
    tahun: Optional[int] = None
    items: list[MonthlyTrendItem]


class AdminLoginRequest(BaseModel):
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)


class AdminProfile(BaseModel):
    username: str
    role: str


class AdminLoginResponse(BaseModel):
    access_token: str
    token_type: str
    expires_at: datetime
    admin: AdminProfile


class AdminSessionResponse(BaseModel):
    authenticated: bool
    admin: AdminProfile


class DatasetImportRowResult(BaseModel):
    row_number: int
    status: str
    bulan: Optional[int] = None
    tahun: Optional[int] = None
    prediction_id: Optional[int] = None
    hasil_prediksi: Optional[str] = None
    message: str


class DatasetImportResponse(BaseModel):
    filename: str
    total_rows: int
    imported: int
    skipped: int
    failed: int
    items: list[DatasetImportRowResult]
