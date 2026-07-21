import csv
import io
import pickle
import pandas as pd
from pathlib import Path
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app import models
from app.logging_config import get_logger

BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR / "ml" / "model.pkl"
ENCODER_PATH = BASE_DIR / "ml" / "label_encoder.pkl"

with open(MODEL_PATH, "rb") as f:
    model = pickle.load(f)

with open(ENCODER_PATH, "rb") as f:
    label_encoder = pickle.load(f)

logger = get_logger(__name__)


class PredictionServiceError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


def predict_and_save(db: Session, data: dict):
    if data["beras_kebutuhan"] == 0 or \
       data["minyak_kebutuhan"] == 0 or \
       data["telur_kebutuhan"] == 0 or \
       data["daging_sapi_kebutuhan"] == 0 or \
       data["daging_ayam_kebutuhan"] == 0:
        raise PredictionServiceError("Kebutuhan tidak boleh 0")

    bulan = data.get("bulan")
    tahun = data.get("tahun")
    catatan = data.get("catatan")

    if bulan is None:
        raise PredictionServiceError("Bulan wajib diisi")

    if tahun is None:
        raise PredictionServiceError("Tahun wajib diisi")

    if not 1 <= bulan <= 12:
        raise PredictionServiceError("Bulan harus berada di rentang 1 sampai 12")

    if tahun < 1900:
        raise PredictionServiceError("Tahun tidak valid")

    try:
        beras_ratio = data["beras_tersedia"] / data["beras_kebutuhan"]
        minyak_ratio = data["minyak_tersedia"] / data["minyak_kebutuhan"]
        telur_ratio = data["telur_tersedia"] / data["telur_kebutuhan"]
        daging_sapi_ratio = data["daging_sapi_tersedia"] / data["daging_sapi_kebutuhan"]
        daging_ayam_ratio = data["daging_ayam_tersedia"] / data["daging_ayam_kebutuhan"]

        X = pd.DataFrame([{
            "beras_ratio": beras_ratio,
            "minyak_ratio": minyak_ratio,
            "telur_ratio": telur_ratio
        }])

        prediction = model.predict(X)[0]
        hasil_label = label_encoder.inverse_transform([prediction])[0]
    except Exception as exc:
        logger.exception("Prediksi model gagal diproses")
        raise PredictionServiceError(
            "Gagal memproses prediksi model",
            status_code=500
        ) from exc

    try:
        food_data = models.FoodData(
            bulan=bulan,
            tahun=tahun,
            catatan=catatan,
            beras_tersedia=data["beras_tersedia"],
            beras_kebutuhan=data["beras_kebutuhan"],
            minyak_tersedia=data["minyak_tersedia"],
            minyak_kebutuhan=data["minyak_kebutuhan"],
            telur_tersedia=data["telur_tersedia"],
            telur_kebutuhan=data["telur_kebutuhan"],
            daging_sapi_tersedia=data["daging_sapi_tersedia"],
            daging_sapi_kebutuhan=data["daging_sapi_kebutuhan"],
            daging_ayam_tersedia=data["daging_ayam_tersedia"],
            daging_ayam_kebutuhan=data["daging_ayam_kebutuhan"]
        )

        db.add(food_data)
        prediction_result = models.PredictionResult(
            beras_ratio=round(beras_ratio, 3),
            minyak_ratio=round(minyak_ratio, 3),
            telur_ratio=round(telur_ratio, 3),
            daging_sapi_ratio=round(daging_sapi_ratio, 3),
            daging_ayam_ratio=round(daging_ayam_ratio, 3),
            hasil_prediksi=hasil_label
        )

        food_data.prediction = prediction_result
        db.add(food_data)
        db.commit()
        db.refresh(food_data)
        db.refresh(prediction_result)
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Penyimpanan hasil prediksi ke database gagal")
        raise PredictionServiceError(
            "Gagal menyimpan data prediksi ke database",
            status_code=500
        ) from exc

    return {
            "id": prediction_result.id,
            "bulan": food_data.bulan,
            "tahun": food_data.tahun,
            "catatan": food_data.catatan,
            "beras_ratio": prediction_result.beras_ratio,
            "minyak_ratio": prediction_result.minyak_ratio,
            "telur_ratio": prediction_result.telur_ratio,
            "daging_sapi_ratio": prediction_result.daging_sapi_ratio,
            "daging_ayam_ratio": prediction_result.daging_ayam_ratio,
            "hasil_prediksi": prediction_result.hasil_prediksi
        }


def serialize_prediction(prediction):
    food_data = prediction.food_data
    return {
        "id": prediction.id,
        "food_data_id": prediction.food_data_id,
        "bulan": food_data.bulan,
        "tahun": food_data.tahun,
        "catatan": food_data.catatan,
        "beras_tersedia": food_data.beras_tersedia,
        "beras_kebutuhan": food_data.beras_kebutuhan,
        "minyak_tersedia": food_data.minyak_tersedia,
        "minyak_kebutuhan": food_data.minyak_kebutuhan,
        "telur_tersedia": food_data.telur_tersedia,
        "telur_kebutuhan": food_data.telur_kebutuhan,
        "daging_sapi_tersedia": food_data.daging_sapi_tersedia,
        "daging_sapi_kebutuhan": food_data.daging_sapi_kebutuhan,
        "daging_ayam_tersedia": food_data.daging_ayam_tersedia,
        "daging_ayam_kebutuhan": food_data.daging_ayam_kebutuhan,
        "beras_ratio": prediction.beras_ratio,
        "minyak_ratio": prediction.minyak_ratio,
        "telur_ratio": prediction.telur_ratio,
        "daging_sapi_ratio": prediction.daging_sapi_ratio,
        "daging_ayam_ratio": prediction.daging_ayam_ratio,
        "hasil_prediksi": prediction.hasil_prediksi,
        "created_at": prediction.created_at
    }


def prediction_exists(db: Session, tahun: int, bulan: int) -> bool:
    return (
        db.query(models.PredictionResult)
        .join(models.FoodData)
        .filter(models.FoodData.tahun == tahun, models.FoodData.bulan == bulan)
        .first()
        is not None
    )


def parse_import_row(row: dict[str, str]) -> dict:
    try:
        return {
            "tahun": int(row["tahun"]),
            "bulan": int(row["bulan"]),
            "catatan": row.get("catatan") or None,
            "beras_tersedia": float(row["beras_tersedia"]),
            "beras_kebutuhan": float(row["beras_kebutuhan"]),
            "minyak_tersedia": float(row["minyak_tersedia"]),
            "minyak_kebutuhan": float(row["minyak_kebutuhan"]),
            "telur_tersedia": float(row["telur_tersedia"]),
            "telur_kebutuhan": float(row["telur_kebutuhan"]),
            "daging_sapi_tersedia": float(row["daging_sapi_tersedia"]),
            "daging_sapi_kebutuhan": float(row["daging_sapi_kebutuhan"]),
            "daging_ayam_tersedia": float(row["daging_ayam_tersedia"]),
            "daging_ayam_kebutuhan": float(row["daging_ayam_kebutuhan"]),
        }
    except KeyError as exc:
        raise PredictionServiceError(
            f"Kolom CSV wajib tidak ditemukan: {exc.args[0]}"
        ) from exc
    except (TypeError, ValueError) as exc:
        raise PredictionServiceError(
            "Nilai CSV tidak valid. Pastikan seluruh kolom numerik terisi benar."
        ) from exc


def import_predictions_from_csv_bytes(
    db: Session,
    csv_bytes: bytes,
    filename: str = "dataset.csv",
):
    try:
        content = csv_bytes.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise PredictionServiceError(
            "File CSV harus menggunakan encoding UTF-8",
            status_code=400,
        ) from exc

    reader = csv.DictReader(io.StringIO(content))
    rows = list(reader)

    if reader.fieldnames is None:
        raise PredictionServiceError("File CSV tidak memiliki header", status_code=400)

    if not rows:
        raise PredictionServiceError("File CSV tidak berisi data", status_code=400)

    results = []
    imported = 0
    skipped = 0
    failed = 0

    for index, row in enumerate(rows, start=1):
        try:
            payload = parse_import_row(row)
        except PredictionServiceError as exc:
            failed += 1
            results.append(
                {
                    "row_number": index,
                    "status": "failed",
                    "message": exc.message,
                }
            )
            continue

        tahun = payload["tahun"]
        bulan = payload["bulan"]

        if prediction_exists(db, tahun=tahun, bulan=bulan):
            skipped += 1
            results.append(
                {
                    "row_number": index,
                    "status": "skipped",
                    "bulan": bulan,
                    "tahun": tahun,
                    "message": "Data bulan dan tahun tersebut sudah ada.",
                }
            )
            continue

        try:
            prediction = predict_and_save(db, payload)
        except PredictionServiceError as exc:
            failed += 1
            results.append(
                {
                    "row_number": index,
                    "status": "failed",
                    "bulan": bulan,
                    "tahun": tahun,
                    "message": exc.message,
                }
            )
            continue

        imported += 1
        results.append(
            {
                "row_number": index,
                "status": "imported",
                "bulan": bulan,
                "tahun": tahun,
                "prediction_id": prediction["id"],
                "hasil_prediksi": prediction["hasil_prediksi"],
                "message": "Data berhasil diimpor.",
            }
        )

    return {
        "filename": filename,
        "total_rows": len(rows),
        "imported": imported,
        "skipped": skipped,
        "failed": failed,
        "items": results,
    }


def get_prediction_history(
    db: Session,
    limit: int = 10,
    offset: int = 0,
    hasil_prediksi: str | None = None,
    bulan: int | None = None,
    tahun: int | None = None
):
    try:
        query = (
            db.query(models.PredictionResult)
            .join(models.FoodData)
        )

        if hasil_prediksi is not None:
            query = query.filter(models.PredictionResult.hasil_prediksi == hasil_prediksi)
        if bulan is not None:
            query = query.filter(models.FoodData.bulan == bulan)
        if tahun is not None:
            query = query.filter(models.FoodData.tahun == tahun)

        total = query.count()
        prediction_rows = (
            query
            .order_by(models.PredictionResult.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )
    except SQLAlchemyError as exc:
        logger.exception("Pengambilan riwayat prediksi gagal")
        raise PredictionServiceError(
            "Gagal mengambil riwayat prediksi dari database",
            status_code=500
        ) from exc

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "hasil_prediksi": hasil_prediksi,
        "bulan": bulan,
        "tahun": tahun,
        "items": [serialize_prediction(prediction) for prediction in prediction_rows]
    }


def get_prediction_by_id(db: Session, prediction_id: int):
    try:
        prediction = (
            db.query(models.PredictionResult)
            .join(models.FoodData)
            .filter(models.PredictionResult.id == prediction_id)
            .first()
        )
    except SQLAlchemyError as exc:
        logger.exception("Pengambilan detail prediksi gagal")
        raise PredictionServiceError(
            "Gagal mengambil detail prediksi dari database",
            status_code=500
        ) from exc

    if prediction is None:
        raise PredictionServiceError("Data prediksi tidak ditemukan", status_code=404)

    return serialize_prediction(prediction)


def get_dashboard_summary(db: Session):
    try:
        prediction_rows = db.query(models.PredictionResult).join(models.FoodData)

        total_data = prediction_rows.count()
        aman = prediction_rows.filter(models.PredictionResult.hasil_prediksi == "Aman").count()
        waspada = prediction_rows.filter(models.PredictionResult.hasil_prediksi == "Waspada").count()
        rawan = prediction_rows.filter(models.PredictionResult.hasil_prediksi == "Rawan").count()

        latest_prediction = (
            prediction_rows
            .order_by(models.PredictionResult.created_at.desc())
            .first()
        )
    except SQLAlchemyError as exc:
        logger.exception("Pengambilan ringkasan dashboard gagal")
        raise PredictionServiceError(
            "Gagal mengambil ringkasan dashboard dari database",
            status_code=500
        ) from exc

    return {
        "total_data": total_data,
        "counts": {
            "total": total_data,
            "aman": aman,
            "waspada": waspada,
            "rawan": rawan,
        },
        "latest_prediction": (
            serialize_prediction(latest_prediction)
            if latest_prediction is not None
            else None
        ),
    }


def get_dashboard_distribution(db: Session):
    try:
        prediction_rows = db.query(models.PredictionResult)
        total_data = prediction_rows.count()

        raw_counts = {
            "Aman": prediction_rows.filter(models.PredictionResult.hasil_prediksi == "Aman").count(),
            "Waspada": prediction_rows.filter(models.PredictionResult.hasil_prediksi == "Waspada").count(),
            "Rawan": prediction_rows.filter(models.PredictionResult.hasil_prediksi == "Rawan").count(),
        }
    except SQLAlchemyError as exc:
        logger.exception("Pengambilan distribusi dashboard gagal")
        raise PredictionServiceError(
            "Gagal mengambil distribusi dashboard dari database",
            status_code=500
        ) from exc

    items = []
    for label, value in raw_counts.items():
        percentage = round((value / total_data) * 100, 2) if total_data > 0 else 0.0
        items.append({
            "label": label,
            "value": value,
            "percentage": percentage,
        })

    return {
        "total_data": total_data,
        "items": items,
    }


def get_dashboard_monthly_trend(db: Session, tahun: int | None = None):
    try:
        query = db.query(models.PredictionResult).join(models.FoodData)

        if tahun is not None:
            query = query.filter(models.FoodData.tahun == tahun)

        prediction_rows = query.all()
    except SQLAlchemyError as exc:
        logger.exception("Pengambilan tren bulanan dashboard gagal")
        raise PredictionServiceError(
            "Gagal mengambil tren bulanan dashboard dari database",
            status_code=500
        ) from exc

    monthly_map = {
        month: {
            "bulan": month,
            "total": 0,
            "aman": 0,
            "waspada": 0,
            "rawan": 0,
        }
        for month in range(1, 13)
    }

    for prediction in prediction_rows:
        food_data = prediction.food_data
        if food_data.bulan is None:
            continue

        month_data = monthly_map.get(food_data.bulan)
        if month_data is None:
            continue

        month_data["total"] += 1

        if prediction.hasil_prediksi == "Aman":
            month_data["aman"] += 1
        elif prediction.hasil_prediksi == "Waspada":
            month_data["waspada"] += 1
        elif prediction.hasil_prediksi == "Rawan":
            month_data["rawan"] += 1

    return {
        "tahun": tahun,
        "items": [monthly_map[month] for month in range(1, 13)],
    }
