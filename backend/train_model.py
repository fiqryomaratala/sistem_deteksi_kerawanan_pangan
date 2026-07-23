import os
import pandas as pd
import numpy as np
import pickle

from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report

np.random.seed(42)

data = []
years = list(range(2020, 2026))
months = list(range(1, 13))

for year in years:
    for month in months:
        for sample in range(5):
            if sample % 3 == 0:
                # Scenario Aman
                beras_tersedia = np.random.randint(30000, 45000)
                beras_kebutuhan = np.random.randint(18000, 22000)
                minyak_tersedia = np.random.randint(3000, 5000)
                minyak_kebutuhan = np.random.randint(1500, 2500)
                telur_tersedia = np.random.randint(25000, 35000)
                telur_kebutuhan = np.random.randint(15000, 20000)
            elif sample % 3 == 1:
                # Scenario Waspada
                beras_tersedia = np.random.randint(18000, 24000)
                beras_kebutuhan = np.random.randint(20000, 24000)
                minyak_tersedia = np.random.randint(2000, 3000)
                minyak_kebutuhan = np.random.randint(2000, 2500)
                telur_tersedia = np.random.randint(18000, 24000)
                telur_kebutuhan = np.random.randint(20000, 24000)
            else:
                # Scenario Rawan
                beras_tersedia = np.random.randint(10000, 16000)
                beras_kebutuhan = np.random.randint(20000, 25000)
                minyak_tersedia = np.random.randint(800, 1500)
                minyak_kebutuhan = np.random.randint(2000, 3000)
                telur_tersedia = np.random.randint(8000, 14000)
                telur_kebutuhan = np.random.randint(18000, 25000)

            beras_ratio = beras_tersedia / beras_kebutuhan
            minyak_ratio = minyak_tersedia / minyak_kebutuhan
            telur_ratio = telur_tersedia / telur_kebutuhan

            avg_ratio = (beras_ratio + minyak_ratio + telur_ratio) / 3

            if avg_ratio > 1.2:
                label = "Aman"
            elif avg_ratio >= 0.8:
                label = "Waspada"
            else:
                label = "Rawan"

            data.append([
                year, month,
                beras_tersedia, beras_kebutuhan,
                minyak_tersedia, minyak_kebutuhan,
                telur_tersedia, telur_kebutuhan,
                beras_ratio, minyak_ratio, telur_ratio, avg_ratio,
                label
            ])

columns = [
    "tahun", "bulan",
    "beras_tersedia", "beras_kebutuhan",
    "minyak_tersedia", "minyak_kebutuhan",
    "telur_tersedia", "telur_kebutuhan",
    "beras_ratio", "minyak_ratio", "telur_ratio", "avg_ratio",
    "label"
]

df = pd.DataFrame(data, columns=columns)

X = df[["beras_ratio", "minyak_ratio", "telur_ratio", "avg_ratio"]]
y = df["label"]

label_encoder = LabelEncoder()
y_encoded = label_encoder.fit_transform(y)

X_train, X_test, y_train, y_test = train_test_split(
    X, y_encoded, test_size=0.2, random_state=42
)

model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

y_pred = model.predict(X_test)
print(classification_report(y_test, y_pred, target_names=label_encoder.classes_))

with open("app/ml/model.pkl", "wb") as f:
    pickle.dump(model, f)

with open("app/ml/label_encoder.pkl", "wb") as f:
    pickle.dump(label_encoder, f)

print("Model dan label encoder berhasil disimpan.")
print("Ukuran Model.pkl:", os.path.getsize("app/ml/model.pkl"), "bytes")
print("Ukuran label_encoder.pkl:", os.path.getsize("app/ml/label_encoder.pkl"), "bytes")