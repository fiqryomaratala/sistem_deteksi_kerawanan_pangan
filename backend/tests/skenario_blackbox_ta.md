# Skenario & Tabel Pengujian Black-Box (Tugas Akhir)

Dokumen ini berisi tabel skenario pengujian Black-Box (Black-Box Test Cases Matrix) untuk **Sistem Deteksi Kerawanan Pangan Kabupaten Indramayu**. Tabel ini disesuaikan dengan standar penulisan **Bab 4 / Bab 5 (Pengujian dan Evaluasi)** pada Laporan Tugas Akhir / Skripsi.

---

## 📋 Metodologi Pengujian
1. **Equivalence Partitioning (EP)**: Membagi masukan menjadi kelas data valid dan tidak valid.
2. **Boundary Value Analysis (BVA)**: Menguji batas atas dan batas bawah masukan numerik (misal: bulan, limit, tahun).
3. **Error Handling & Security**: Menguji pengalihan status HTTP (400, 401, 404, 422, 500) saat terjadi kesalahan autentikasi atau data input yang tidak sesuai.

---

## 🧪 Tabel Skenario Pengujian Black-Box API

| ID Pengujian | Nama Endpoint / Fungsi | Skenario Input Data | Teknik | Ekspektasi Hasil | HTTP Code | Status |
|---|---|---|---|---|---|---|
| **TC-API-001** | `GET /` | Mengakses endpoint root API | EP (Valid) | Mengembalikan pesan API aktif | `200 OK` | PASS |
| **TC-API-002** | `GET /health` | Memeriksa status kesehatan DB & server | EP (Valid) | Status DB = `connected` | `200 OK` | PASS |
| **TC-API-003** | `POST /predict` | Input data pangan lengkap & valid (misal: bulan=5, tahun=2026, stok & kebutuhan > 0) | EP (Valid Input) | Mengembalikan hasil prediksi (Aman/Waspada/Rawan) & rasio komoditas | `200 OK` | PASS |
| **TC-API-004** | `POST /predict` | Input data tanpa field `tahun` | EP (Invalid Payload) | Mengembalikan pesan kesalahan validasi input | `422 Unprocessable` | PASS |
| **TC-API-005** | `POST /predict` | Input dengan bulan `13` (> 12) | BVA (Out of Range) | Menolak request karena bulan melebihi 12 | `422 Unprocessable` | PASS |
| **TC-API-006** | `POST /predict` | Input dengan stok `beras_tersedia` = `-100` | BVA (Negative Value) | Menolak request karena stok bernilai negatif | `422 Unprocessable` | PASS |
| **TC-API-007** | `GET /predictions` | Mengambil daftar riwayat (limit=10, offset=0) | EP (Valid Request) | Mengembalikan daftar item prediksi & total count | `200 OK` | PASS |
| **TC-API-008** | `GET /predictions` | Paginasi dengan query `limit=101` | BVA (Limit > 100) | Menolak request karena limit melebihi batas maksimum 100 | `422 Unprocessable` | PASS |
| **TC-API-009** | `GET /predictions/{id}` | Mengambil detail prediksi dengan ID yang valid (misal: ID 1) | EP (ID Exist) | Mengembalikan detail lengkap data pangan & hasil prediksi | `200 OK` | PASS |
| **TC-API-010** | `GET /predictions/{id}` | Mengambil detail prediksi dengan ID tidak ada (misal: ID 999999) | EP (ID Not Found) | Mengembalikan pesan `Data prediksi tidak ditemukan` | `404 Not Found` | PASS |
| **TC-API-011** | `GET /dashboard/summary` | Mengambil ringkasan metrik dashboard | EP (Valid Request) | Mengembalikan total data, jumlah aman/waspada/rawan, & prediksi terbaru | `200 OK` | PASS |
| **TC-API-012** | `GET /dashboard/trend/monthly` | Query parameter `tahun=1899` (< 1900) | BVA (Year < 1900) | Menolak request karena tahun di bawah 1900 | `422 Unprocessable` | PASS |
| **TC-API-013** | `POST /admin/auth/login` | Login dengan username & password admin yang benar | EP (Valid Credentials) | Mengembalikan token autentikasi (JWT Bearer Token) | `200 OK` | PASS |
| **TC-API-014** | `POST /admin/auth/login` | Login dengan password salah | EP (Invalid Password) | Mengembalikan pesan `Username atau password admin salah` | `401 Unauthorized` | PASS |
| **TC-API-015** | `GET /admin/auth/me` | Mengakses profile admin tanpa token autentikasi | EP (Missing Token) | Menolak akses | `401 Unauthorized` | PASS |
| **TC-API-016** | `GET /admin/auth/me` | Mengakses profile admin dengan token Bearer valid | EP (Valid Auth) | Mengembalikan data akun admin yang sedang login | `200 OK` | PASS |
| **TC-API-017** | `POST /admin/predictions/import` | Upload file dataset dengan format `.txt` (bukan CSV) | EP (Invalid File) | Mengembalikan pesan `File yang diunggah harus berformat CSV` | `400 Bad Request` | PASS |
| **TC-API-018** | `POST /admin/predictions/import` | Upload file dataset dengan format `.csv` valid | EP (Valid CSV) | Memproses data CSV dan mengembalikan jumlah data terimpor | `200 OK` | PASS |

---

## 📊 Kesimpulan Hasil Pengujian
Berdasarkan hasil eksekusi unit test black-box API di atas, sebanyak **18 dari 18 skenario pengujian (100%)** dinyatakan **LULUS (PASS)**. Hal ini menunjukkan bahwa API Sistem Deteksi Kerawanan Pangan telah memenuhi kriteria fungsionalitas, validasi masukan, keamanan autentikasi, serta penanganan kesalahan sesuai spesifikasi kebutuhan sistem.
