import os

from fastapi import FastAPI, Depends, File, Query, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.database import Base, engine, get_db
from app.health import get_health_status
from app.logging_config import get_logger, setup_logging
from app.schemas import (
    AdminLoginRequest,
    AdminLoginResponse,
    AdminSessionResponse,
    DatasetImportResponse,
    DashboardDistributionResponse,
    DashboardMonthlyTrendResponse,
    DashboardSummaryResponse,
    HealthResponse,
    PredictionHistoryItem,
    PredictionHistoryResponse,
    PredictionRequest,
    PredictionResponse,
)
from app.services.auth import AuthServiceError, get_current_admin, login_admin
from app.services.predict import (
    get_dashboard_distribution,
    get_dashboard_monthly_trend,
    PredictionServiceError,
    get_dashboard_summary,
    import_predictions_from_csv_bytes,
    get_prediction_by_id,
    get_prediction_history,
    predict_and_save,
)

setup_logging()
logger = get_logger(__name__)

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Sistem Deteksi Kerawanan Pangan Kabupaten Indramayu",
    version="1.0.0"
)


def get_allowed_origins() -> list[str]:
    raw_origins = os.getenv("CORS_ALLOW_ORIGINS")
    if raw_origins:
        return [origin.strip() for origin in raw_origins.split(",") if origin.strip()]

    return [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]


app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info("Request masuk: %s %s", request.method, request.url.path)
    response = await call_next(request)
    logger.info(
        "Request selesai: %s %s -> %s",
        request.method,
        request.url.path,
        response.status_code
    )
    return response


def error_response(status_code: int, message: str, errors=None):
    payload = {
        "status": "error",
        "message": message
    }
    if errors is not None:
        payload["errors"] = errors
    return JSONResponse(status_code=status_code, content=payload)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning("Validasi request gagal: %s %s", request.method, request.url.path)
    errors = []
    for error in exc.errors():
        errors.append({
            "field": ".".join(str(part) for part in error["loc"] if part != "body"),
            "message": error["msg"]
        })
    return error_response(422, "Input request tidak valid", errors)


@app.exception_handler(PredictionServiceError)
async def prediction_exception_handler(request: Request, exc: PredictionServiceError):
    logger.warning(
        "Prediction service error pada %s %s: %s",
        request.method,
        request.url.path,
        exc.message
    )
    return error_response(exc.status_code, exc.message)


@app.exception_handler(AuthServiceError)
async def auth_exception_handler(request: Request, exc: AuthServiceError):
    logger.warning(
        "Auth service error pada %s %s: %s",
        request.method,
        request.url.path,
        exc.message
    )
    return error_response(exc.status_code, exc.message)


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error pada %s %s", request.method, request.url.path)
    return error_response(500, "Terjadi kesalahan pada server")


@app.get("/")
def root():
    return {"message": "API Deteksi Kerawanan Pangan aktif"}


@app.get("/health", response_model=HealthResponse)
def health_check(db: Session = Depends(get_db)):
    return get_health_status(db)


@app.post("/admin/auth/login", response_model=AdminLoginResponse)
def admin_login(request: AdminLoginRequest, db: Session = Depends(get_db)):
    return login_admin(db, request.username, request.password)


@app.get("/admin/auth/me", response_model=AdminSessionResponse)
def admin_me(admin=Depends(get_current_admin)):
    return {
        "authenticated": True,
        "admin": admin,
    }


@app.post("/admin/predict", response_model=PredictionResponse)
def admin_predict(
    request: PredictionRequest,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    return predict_and_save(db, request.model_dump())


@app.post("/admin/predictions/import", response_model=DatasetImportResponse)
async def import_predictions_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    if not file.filename:
        raise PredictionServiceError("Nama file CSV tidak ditemukan", status_code=400)

    if not file.filename.lower().endswith(".csv"):
        raise PredictionServiceError("File yang diunggah harus berformat CSV", status_code=400)

    file_bytes = await file.read()
    return import_predictions_from_csv_bytes(db, file_bytes, filename=file.filename)


@app.get("/dashboard/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary_endpoint(db: Session = Depends(get_db)):
    return get_dashboard_summary(db)


@app.get("/dashboard/distribution", response_model=DashboardDistributionResponse)
def get_dashboard_distribution_endpoint(db: Session = Depends(get_db)):
    return get_dashboard_distribution(db)


@app.get("/dashboard/trend/monthly", response_model=DashboardMonthlyTrendResponse)
def get_dashboard_monthly_trend_endpoint(
    tahun: int | None = Query(default=None, ge=1900),
    db: Session = Depends(get_db)
):
    return get_dashboard_monthly_trend(db, tahun=tahun)


@app.get("/predictions", response_model=PredictionHistoryResponse)
def get_predictions(
    limit: int = Query(default=10, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    hasil_prediksi: str | None = Query(default=None),
    bulan: int | None = Query(default=None, ge=1, le=12),
    tahun: int | None = Query(default=None, ge=1900),
    db: Session = Depends(get_db)
):
    return get_prediction_history(
        db,
        limit=limit,
        offset=offset,
        hasil_prediksi=hasil_prediksi,
        bulan=bulan,
        tahun=tahun
    )


@app.get("/predictions/{prediction_id}", response_model=PredictionHistoryItem)
def get_prediction_detail(prediction_id: int, db: Session = Depends(get_db)):
    return get_prediction_by_id(db, prediction_id)


@app.post("/predict", response_model=PredictionResponse)
def predict(request: PredictionRequest, db: Session = Depends(get_db)):
    result = predict_and_save(db, request.model_dump())
    return result
