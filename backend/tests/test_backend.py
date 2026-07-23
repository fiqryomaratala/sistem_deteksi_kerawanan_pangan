
import os
import unittest
from unittest.mock import patch

from sqlalchemy import create_engine, StaticPool
from sqlalchemy.orm import sessionmaker

from app import models
from app.health import get_health_status
from app.services import predict as predict_service
from app.services.predict import PredictionServiceError


class FakeModel:
    def __init__(self, prediction=0):
        self.prediction = prediction

    def predict(self, data):
        return [self.prediction]


class FakeLabelEncoder:
    def __init__(self, label="Aman"):
        self.label = label

    def inverse_transform(self, values):
        return [self.label for _ in values]


class BackendTestCase(unittest.TestCase):
    def setUp(self):
        self.database_url = os.getenv("TEST_DATABASE_URL")
        if self.database_url:
            self.engine = create_engine(self.database_url)
        else:
            self.engine = create_engine(
                "sqlite:///:memory:",
                connect_args={"check_same_thread": False},
                poolclass=StaticPool,
            )

        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        models.Base.metadata.create_all(bind=self.engine)

    def tearDown(self):
        models.Base.metadata.drop_all(bind=self.engine)
        self.engine.dispose()

    def _session(self):
        return self.SessionLocal()

    def _seed_prediction(self, label="Aman", bulan=4, tahun=2026):
        with self._session() as db:
            food_data = models.FoodData(
                bulan=bulan,
                tahun=tahun,
                catatan="Data simulasi",
                beras_tersedia=30000,
                beras_kebutuhan=20000,
                minyak_tersedia=2500,
                minyak_kebutuhan=2000,
                telur_tersedia=28000,
                telur_kebutuhan=20000,
                daging_sapi_tersedia=1200,
                daging_sapi_kebutuhan=1000,
                daging_ayam_tersedia=1500,
                daging_ayam_kebutuhan=1000,
            )
            prediction = models.PredictionResult(
                beras_ratio=1.5,
                minyak_ratio=1.25,
                telur_ratio=1.4,
                daging_sapi_ratio=1.2,
                daging_ayam_ratio=1.5,
                hasil_prediksi=label,
            )
            food_data.prediction = prediction
            db.add(food_data)
            db.commit()
            db.refresh(prediction)
            return prediction.id

    def test_predict_and_save_persists_prediction(self):
        payload = {
            "bulan": 4,
            "tahun": 2026,
            "catatan": "Input uji backend",
            "beras_tersedia": 30000,
            "beras_kebutuhan": 20000,
            "minyak_tersedia": 2500,
            "minyak_kebutuhan": 2000,
            "telur_tersedia": 28000,
            "telur_kebutuhan": 20000,
            "daging_sapi_tersedia": 1200,
            "daging_sapi_kebutuhan": 1000,
            "daging_ayam_tersedia": 1500,
            "daging_ayam_kebutuhan": 1000,
        }

        with self._session() as db:
            with patch.object(predict_service, "model", FakeModel()), patch.object(
                predict_service, "label_encoder", FakeLabelEncoder("Aman")
            ):
                result = predict_service.predict_and_save(db, payload)

        self.assertEqual(result["hasil_prediksi"], "Aman")
        self.assertEqual(result["beras_ratio"], 1.5)
        self.assertEqual(result["daging_sapi_ratio"], 1.2)
        self.assertEqual(result["daging_ayam_ratio"], 1.5)
        self.assertEqual(result["catatan"], "Input uji backend")

        with self._session() as db:
            self.assertEqual(db.query(models.FoodData).count(), 1)
            self.assertEqual(db.query(models.PredictionResult).count(), 1)

    def test_predict_and_save_requires_bulan_and_tahun(self):
        payload = {
            "catatan": "Input tanpa periode",
            "beras_tersedia": 30000,
            "beras_kebutuhan": 20000,
            "minyak_tersedia": 2500,
            "minyak_kebutuhan": 2000,
            "telur_tersedia": 28000,
            "telur_kebutuhan": 20000,
            "daging_sapi_tersedia": 1200,
            "daging_sapi_kebutuhan": 1000,
            "daging_ayam_tersedia": 1500,
            "daging_ayam_kebutuhan": 1000,
        }

        with self._session() as db:
            with self.assertRaises(PredictionServiceError) as context:
                with patch.object(predict_service, "model", FakeModel()), patch.object(
                    predict_service, "label_encoder", FakeLabelEncoder("Aman")
                ):
                    predict_service.predict_and_save(db, payload)

        self.assertEqual(context.exception.status_code, 400)
        self.assertEqual(context.exception.message, "Bulan wajib diisi")

    def test_get_prediction_history_supports_pagination_and_filters(self):
        self._seed_prediction(label="Aman", bulan=4, tahun=2026)
        self._seed_prediction(label="Rawan", bulan=5, tahun=2025)

        with self._session() as db:
            result = predict_service.get_prediction_history(
                db,
                limit=1,
                offset=0,
                hasil_prediksi="Rawan",
                bulan=5,
                tahun=2025,
            )

        self.assertEqual(result["total"], 1)
        self.assertEqual(len(result["items"]), 1)
        self.assertEqual(result["items"][0]["hasil_prediksi"], "Rawan")

    def test_get_prediction_by_id_returns_detail(self):
        prediction_id = self._seed_prediction(label="Waspada")

        with self._session() as db:
            result = predict_service.get_prediction_by_id(db, prediction_id)

        self.assertEqual(result["id"], prediction_id)
        self.assertEqual(result["hasil_prediksi"], "Waspada")
        self.assertEqual(result["catatan"], "Data simulasi")

    def test_get_prediction_by_id_raises_when_missing(self):
        with self._session() as db:
            with self.assertRaises(PredictionServiceError) as context:
                predict_service.get_prediction_by_id(db, 9999)

        self.assertEqual(context.exception.status_code, 404)

    def test_health_status_returns_ok(self):
        with self._session() as db:
            result = get_health_status(db)

        self.assertEqual(result, {"status": "ok", "database": "connected"})

    def test_get_dashboard_summary_returns_counts_and_latest_prediction(self):
        self._seed_prediction(label="Aman", bulan=4, tahun=2026)
        latest_id = self._seed_prediction(label="Rawan", bulan=5, tahun=2025)

        with self._session() as db:
            result = predict_service.get_dashboard_summary(db)

        self.assertEqual(result["total_data"], 2)
        self.assertEqual(result["counts"]["total"], 2)
        self.assertEqual(result["counts"]["aman"], 1)
        self.assertEqual(result["counts"]["rawan"], 1)
        self.assertEqual(result["counts"]["waspada"], 0)
        self.assertIsNotNone(result["latest_prediction"])
        self.assertEqual(result["latest_prediction"]["id"], latest_id)
        self.assertEqual(result["latest_prediction"]["hasil_prediksi"], "Rawan")

    def test_get_dashboard_distribution_returns_chart_data(self):
        self._seed_prediction(label="Aman", bulan=4, tahun=2026)
        self._seed_prediction(label="Waspada", bulan=5, tahun=2025)
        self._seed_prediction(label="Rawan", bulan=6, tahun=2024)
        self._seed_prediction(label="Rawan", bulan=7, tahun=2023)

        with self._session() as db:
            result = predict_service.get_dashboard_distribution(db)

        self.assertEqual(result["total_data"], 4)
        items = {item["label"]: item for item in result["items"]}
        self.assertEqual(items["Aman"]["value"], 1)
        self.assertEqual(items["Waspada"]["value"], 1)
        self.assertEqual(items["Rawan"]["value"], 2)
        self.assertEqual(items["Aman"]["percentage"], 25.0)
        self.assertEqual(items["Waspada"]["percentage"], 25.0)
        self.assertEqual(items["Rawan"]["percentage"], 50.0)

    def test_get_dashboard_monthly_trend_returns_monthly_breakdown(self):
        self._seed_prediction(label="Aman", bulan=1, tahun=2026)
        self._seed_prediction(label="Rawan", bulan=1, tahun=2026)
        self._seed_prediction(label="Waspada", bulan=2, tahun=2026)
        self._seed_prediction(label="Rawan", bulan=3, tahun=2025)

        with self._session() as db:
            result = predict_service.get_dashboard_monthly_trend(db, tahun=2026)

        self.assertEqual(result["tahun"], 2026)
        self.assertEqual(len(result["items"]), 12)

        januari = result["items"][0]
        februari = result["items"][1]
        maret = result["items"][2]

        self.assertEqual(januari["bulan"], 1)
        self.assertEqual(januari["total"], 2)
        self.assertEqual(januari["aman"], 1)
        self.assertEqual(januari["rawan"], 1)
        self.assertEqual(januari["waspada"], 0)

        self.assertEqual(februari["bulan"], 2)
        self.assertEqual(februari["total"], 1)
        self.assertEqual(februari["waspada"], 1)

        self.assertEqual(maret["bulan"], 3)
        self.assertEqual(maret["total"], 0)


if __name__ == "__main__":
    unittest.main()
