import os
import unittest
from unittest.mock import patch
import io

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, StaticPool
from sqlalchemy.orm import sessionmaker


from app.database import Base, get_db
from app.main import app
from app import models
from app.services import predict as predict_service
from app.services.auth import hash_admin_password, create_admin_token


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


class BlackBoxAPITestCase(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        cls.TestingSessionLocal = sessionmaker(
            autocommit=False, autoflush=False, bind=cls.engine
        )


        def override_get_db():
            db = cls.TestingSessionLocal()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_get_db
        cls.client = TestClient(app)

    def setUp(self):
        Base.metadata.create_all(bind=self.engine)
        self.db = self.TestingSessionLocal()

        # Seed admin default
        self.admin_user = models.AdminUser(
            username="admin_test",
            password_hash=hash_admin_password("password123"),
            display_name="Admin Test",
            role="admin",
            is_active=True,
        )
        self.db.add(self.admin_user)
        self.db.commit()
        self.db.refresh(self.admin_user)

        # Environment patch untuk JWT secret
        self.env_patcher = patch.dict(
            os.environ,
            {
                "ADMIN_TOKEN_SECRET": "test-secret-key-blackbox-12345",
                "ADMIN_TOKEN_EXPIRE_MINUTES": "60",
            },
        )
        self.env_patcher.start()

    def tearDown(self):
        self.env_patcher.stop()
        self.db.close()
        Base.metadata.drop_all(bind=self.engine)

    def _get_admin_headers(self):
        token, _ = create_admin_token(
            username=self.admin_user.username,
            role=self.admin_user.role,
            token_secret="test-secret-key-blackbox-12345",
            expire_minutes=60,
        )
        return {"Authorization": f"Bearer {token}"}

    def _seed_prediction(self, label="Aman", bulan=4, tahun=2026):
        food_data = models.FoodData(
            bulan=bulan,
            tahun=tahun,
            catatan="Data pengujian blackbox",
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
        self.db.add(food_data)
        self.db.commit()
        self.db.refresh(prediction)
        return prediction.id

    # ==========================================
    # 1. PENGUJIAN ENDPOINT PUBLIK & HEALTH
    # ==========================================
    def test_tc_api_001_get_root(self):
        """TC-API-001: Menguji endpoint root '/' (EP: Request Valid)"""
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"message": "API Deteksi Kerawanan Pangan aktif"})

    def test_tc_api_002_get_health(self):
        """TC-API-002: Menguji endpoint health check '/health' (EP: Database terhubung)"""
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok", "database": "connected"})

    # ==========================================
    # 2. PENGUJIAN PREDIKSI PUBLIK (POST /predict)
    # ==========================================
    def test_tc_api_003_predict_valid_payload(self):
        """TC-API-003: Prediksi dengan payload lengkap dan valid (EP: Valid Input)"""
        payload = {
            "bulan": 5,
            "tahun": 2026,
            "catatan": "Uji Blackbox Valid",
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
        with patch.object(predict_service, "model", FakeModel()), patch.object(
            predict_service, "label_encoder", FakeLabelEncoder("Aman")
        ):
            response = self.client.post("/predict", json=payload)

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["hasil_prediksi"], "Aman")
        self.assertEqual(data["beras_ratio"], 1.5)
        self.assertEqual(data["bulan"], 5)
        self.assertEqual(data["tahun"], 2026)

    def test_tc_api_004_predict_missing_required_fields(self):
        """TC-API-004: Prediksi dengan field wajib yang hilang (EP: Invalid Payload)"""
        payload = {
            "bulan": 5,
            # 'tahun' sengaja dihilangkan
            "beras_tersedia": 30000,
            "beras_kebutuhan": 20000,
        }
        response = self.client.post("/predict", json=payload)
        self.assertEqual(response.status_code, 422)
        body = response.json()
        self.assertEqual(body["status"], "error")
        self.assertEqual(body["message"], "Input request tidak valid")

    def test_tc_api_005_predict_invalid_month_bva(self):
        """TC-API-005: Prediksi dengan bulan di luar batas 1-12 (BVA: bulan=13)"""
        payload = {
            "bulan": 13,  # Invalid BVA (> 12)
            "tahun": 2026,
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
        response = self.client.post("/predict", json=payload)
        self.assertEqual(response.status_code, 422)

    def test_tc_api_006_predict_negative_values_bva(self):
        """TC-API-006: Prediksi dengan nilai stok/kebutuhan negatif (BVA: beras_tersedia=-100)"""
        payload = {
            "bulan": 6,
            "tahun": 2026,
            "beras_tersedia": -100,  # Invalid BVA (< 0)
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
        response = self.client.post("/predict", json=payload)
        self.assertEqual(response.status_code, 422)

    # ==========================================
    # 3. PENGUJIAN RIWAYAT PREDIKSI (GET /predictions)
    # ==========================================
    def test_tc_api_007_get_predictions_history(self):
        """TC-API-007: Mengambil riwayat prediksi (EP: Request Valid)"""
        self._seed_prediction(label="Aman", bulan=1, tahun=2026)
        self._seed_prediction(label="Rawan", bulan=2, tahun=2026)

        response = self.client.get("/predictions?limit=10&offset=0")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["total"], 2)
        self.assertEqual(len(data["items"]), 2)

    def test_tc_api_008_get_predictions_invalid_limit_bva(self):
        """TC-API-008: Paginasi riwayat dengan limit > 100 (BVA: limit=101)"""
        response = self.client.get("/predictions?limit=101")
        self.assertEqual(response.status_code, 422)

    def test_tc_api_009_get_prediction_detail_success(self):
        """TC-API-009: Detail prediksi berdasarkan ID yang ada (EP: ID Valid)"""
        pred_id = self._seed_prediction(label="Waspada")
        response = self.client.get(f"/predictions/{pred_id}")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["id"], pred_id)
        self.assertEqual(data["hasil_prediksi"], "Waspada")

    def test_tc_api_010_get_prediction_detail_not_found(self):
        """TC-API-010: Detail prediksi berdasarkan ID yang tidak ada (EP: Non-existent ID)"""
        response = self.client.get("/predictions/999999")
        self.assertEqual(response.status_code, 404)
        body = response.json()
        self.assertEqual(body["status"], "error")
        self.assertEqual(body["message"], "Data prediksi tidak ditemukan")

    # ==========================================
    # 4. PENGUJIAN DASHBOARD METRICS
    # ==========================================
    def test_tc_api_011_get_dashboard_summary(self):
        """TC-API-011: Mengambil ringkasan dashboard (EP: Request Valid)"""
        self._seed_prediction(label="Aman", bulan=1, tahun=2026)
        response = self.client.get("/dashboard/summary")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["total_data"], 1)
        self.assertEqual(data["counts"]["aman"], 1)

    def test_tc_api_012_get_dashboard_monthly_trend_invalid_year_bva(self):
        """TC-API-012: Trend bulanan dengan tahun di bawah 1900 (BVA: tahun=1899)"""
        response = self.client.get("/dashboard/trend/monthly?tahun=1899")
        self.assertEqual(response.status_code, 422)

    # ==========================================
    # 5. PENGUJIAN AUTENTIKASI ADMIN
    # ==========================================
    def test_tc_api_013_admin_login_success(self):
        """TC-API-013: Login admin dengan kredensial benar (EP: Valid Credentials)"""
        payload = {
            "username": "admin_test",
            "password": "password123"
        }
        response = self.client.post("/admin/auth/login", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("access_token", data)
        self.assertEqual(data["token_type"], "bearer")
        self.assertEqual(data["admin"]["username"], "admin_test")

    def test_tc_api_014_admin_login_wrong_password(self):
        """TC-API-014: Login admin dengan password salah (EP: Invalid Password)"""
        payload = {
            "username": "admin_test",
            "password": "passwordsalah"
        }
        response = self.client.post("/admin/auth/login", json=payload)
        self.assertEqual(response.status_code, 401)
        body = response.json()
        self.assertEqual(body["message"], "Username atau password admin salah")

    def test_tc_api_015_admin_me_unauthorized(self):
        """TC-API-015: Akses endpoint terproteksi tanpa Token (EP: Missing Auth Token)"""
        response = self.client.get("/admin/auth/me")
        self.assertEqual(response.status_code, 401)

    def test_tc_api_016_admin_me_authorized(self):
        """TC-API-016: Akses endpoint terproteksi dengan Token valid (EP: Valid Token)"""
        headers = self._get_admin_headers()
        response = self.client.get("/admin/auth/me", headers=headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["authenticated"])
        self.assertEqual(data["admin"]["username"], "admin_test")

    # ==========================================
    # 6. PENGUJIAN UPLOAD FILE ADMIN
    # ==========================================
    def test_tc_api_017_import_csv_invalid_filetype(self):
        """TC-API-017: Import dataset dengan format file non-CSV (EP: Invalid File Type)"""
        headers = self._get_admin_headers()
        file_content = b"header1,header2\nval1,val2"
        files = {"file": ("data.txt", io.BytesIO(file_content), "text/plain")}
        
        response = self.client.post("/admin/predictions/import", headers=headers, files=files)
        self.assertEqual(response.status_code, 400)
        body = response.json()
        self.assertEqual(body["message"], "File yang diunggah harus berformat CSV")

    def test_tc_api_018_import_csv_valid(self):
        """TC-API-018: Import dataset dengan file CSV valid (EP: Valid CSV File)"""
        headers = self._get_admin_headers()
        csv_content = (
            "bulan,tahun,catatan,beras_tersedia,beras_kebutuhan,minyak_tersedia,minyak_kebutuhan,"
            "telur_tersedia,telur_kebutuhan,daging_sapi_tersedia,daging_sapi_kebutuhan,"
            "daging_ayam_tersedia,daging_ayam_kebutuhan\n"
            "5,2026,Import CSV Test,30000,20000,2500,2000,28000,20000,1200,1000,1500,1000\n"
        ).encode("utf-8")
        
        files = {"file": ("dataset_test.csv", io.BytesIO(csv_content), "text/csv")}

        with patch.object(predict_service, "model", FakeModel()), patch.object(
            predict_service, "label_encoder", FakeLabelEncoder("Aman")
        ):
            response = self.client.post("/admin/predictions/import", headers=headers, files=files)

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["imported"], 1)



if __name__ == "__main__":
    unittest.main()
