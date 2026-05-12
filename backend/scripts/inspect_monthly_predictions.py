from collections import defaultdict
from pathlib import Path
import sys

BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from app.database import SessionLocal
from app import models


def main():
    with SessionLocal() as db:
        rows = (
            db.query(
                models.PredictionResult.id,
                models.FoodData.bulan,
                models.FoodData.tahun,
                models.FoodData.catatan,
                models.PredictionResult.hasil_prediksi,
                models.PredictionResult.created_at,
            )
            .join(models.FoodData, models.PredictionResult.food_data_id == models.FoodData.id)
            .order_by(models.FoodData.tahun, models.FoodData.bulan, models.PredictionResult.created_at)
            .all()
        )

    grouped_rows = defaultdict(list)
    for row in rows:
        grouped_rows[(row.tahun, row.bulan)].append(row)

    if not grouped_rows:
        print("Belum ada data prediksi yang tersimpan.")
        return

    print("Ringkasan data prediksi per bulan:")
    for (tahun, bulan), items in grouped_rows.items():
        print(f"- tahun={tahun} bulan={bulan} total={len(items)}")

    print("\nDetail data per bulan:")
    for (tahun, bulan), items in grouped_rows.items():
        print(f"\n[{tahun}-{bulan:02d}]")
        for item in items:
            print(
                "  "
                f"id={item.id} "
                f"hasil={item.hasil_prediksi} "
                f"created_at={item.created_at} "
                f"catatan={item.catatan}"
            )


if __name__ == "__main__":
    main()
