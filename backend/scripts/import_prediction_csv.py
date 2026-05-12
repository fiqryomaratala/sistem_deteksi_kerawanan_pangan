import csv
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from app.database import SessionLocal
from app.services.predict import (
    PredictionServiceError,
    parse_import_row,
    predict_and_save,
    prediction_exists,
)


def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/import_prediction_csv.py <csv_path>")
        raise SystemExit(1)

    csv_path = Path(sys.argv[1]).resolve()
    if not csv_path.exists():
        print(f"File tidak ditemukan: {csv_path}")
        raise SystemExit(1)

    imported = 0
    skipped = 0

    with csv_path.open("r", encoding="utf-8-sig", newline="") as csv_file:
        reader = csv.DictReader(csv_file)
        rows = list(reader)

    with SessionLocal() as db:
        for index, row in enumerate(rows, start=1):
            try:
                payload = parse_import_row(row)
            except PredictionServiceError as exc:
                print(f"GAGAL baris {index}: {exc.message}")
                continue

            if prediction_exists(db, payload["tahun"], payload["bulan"]):
                print(
                    f"SKIP baris {index}: data bulan={payload['bulan']} "
                    f"tahun={payload['tahun']} sudah ada"
                )
                skipped += 1
                continue

            try:
                result = predict_and_save(db, payload)
            except PredictionServiceError as exc:
                print(
                    f"GAGAL baris {index}: bulan={payload['bulan']} "
                    f"tahun={payload['tahun']} -> {exc.message}"
                )
                continue

            print(
                f"IMPORT baris {index}: id={result['id']} bulan={result['bulan']} "
                f"tahun={result['tahun']} hasil={result['hasil_prediksi']}"
            )
            imported += 1

    print(f"Selesai. imported={imported} skipped={skipped} total={len(rows)}")


if __name__ == "__main__":
    main()
