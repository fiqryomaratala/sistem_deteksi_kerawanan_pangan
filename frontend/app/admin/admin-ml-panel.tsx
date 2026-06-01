"use client";

import { useRouter } from "next/navigation";
import { FormEvent, startTransition, useState, useSyncExternalStore } from "react";
import { getAdminAccessToken, subscribeAdminSession } from "./admin-session";

type PredictionLabel = "Aman" | "Waspada" | "Rawan";

type PredictionResponse = {
  id: number;
  bulan: number | null;
  tahun: number | null;
  catatan: string | null;
  beras_ratio: number;
  minyak_ratio: number;
  telur_ratio: number;
  hasil_prediksi: PredictionLabel;
};

type DatasetImportItem = {
  row_number: number;
  status: string;
  bulan: number | null;
  tahun: number | null;
  prediction_id: number | null;
  hasil_prediksi: PredictionLabel | null;
  message: string;
};

type DatasetImportResponse = {
  filename: string;
  total_rows: number;
  imported: number;
  skipped: number;
  failed: number;
  items: DatasetImportItem[];
};

type ApiError = {
  message?: string;
};

type PredictionFormState = {
  bulan: string;
  tahun: string;
  catatan: string;
  beras_tersedia: string;
  beras_kebutuhan: string;
  minyak_tersedia: string;
  minyak_kebutuhan: string;
  telur_tersedia: string;
  telur_kebutuhan: string;
  daging_sapi_tersedia: string;
  daging_sapi_kebutuhan: string;
  daging_ayam_tersedia: string;
  daging_ayam_kebutuhan: string;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  "http://127.0.0.1:8000";

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

const STATUS_THEME: Record<PredictionLabel, string> = {
  Aman: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  Waspada: "bg-amber-100 text-amber-700 ring-amber-200",
  Rawan: "bg-rose-100 text-rose-700 ring-rose-200",
};

function createInitialFormState(): PredictionFormState {
  const now = new Date();

  return {
    bulan: String(now.getMonth() + 1),
    tahun: String(now.getFullYear()),
    catatan: "",
    beras_tersedia: "",
    beras_kebutuhan: "",
    minyak_tersedia: "",
    minyak_kebutuhan: "",
    telur_tersedia: "",
    telur_kebutuhan: "",
    daging_sapi_tersedia: "",
    daging_sapi_kebutuhan: "",
    daging_ayam_tersedia: "",
    daging_ayam_kebutuhan: "",
  };
}

function formatMonthYear(month: number | null, year: number | null) {
  if (!month || !year) {
    return "Periode belum diisi";
  }

  return `${MONTH_LABELS[month - 1]} ${year}`;
}

function getErrorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "message" in payload) {
    return (payload as ApiError).message ?? fallback;
  }

  return fallback;
}

function numberFieldLabel(key: keyof PredictionFormState) {
  return key.replaceAll("_", " ");
}

export function AdminMlPanel() {
  const router = useRouter();
  const token = useSyncExternalStore(
    subscribeAdminSession,
    getAdminAccessToken,
    () => null,
  );
  const [predictionForm, setPredictionForm] = useState<PredictionFormState>(
    createInitialFormState(),
  );
  const [predictionError, setPredictionError] = useState<string | null>(null);
  const [predictionResult, setPredictionResult] =
    useState<PredictionResponse | null>(null);
  const [predictionSubmitting, setPredictionSubmitting] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<DatasetImportResponse | null>(null);
  const [importSubmitting, setImportSubmitting] = useState(false);

  async function handlePredictionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPredictionError(null);
    setPredictionResult(null);

    if (!token) {
      setPredictionError("Login admin diperlukan untuk menjalankan prediksi.");
      return;
    }

    const payload = {
      bulan: Number(predictionForm.bulan),
      tahun: Number(predictionForm.tahun),
      catatan: predictionForm.catatan.trim() || null,
      beras_tersedia: Number(predictionForm.beras_tersedia),
      beras_kebutuhan: Number(predictionForm.beras_kebutuhan),
      minyak_tersedia: Number(predictionForm.minyak_tersedia),
      minyak_kebutuhan: Number(predictionForm.minyak_kebutuhan),
      telur_tersedia: Number(predictionForm.telur_tersedia),
      telur_kebutuhan: Number(predictionForm.telur_kebutuhan),
      daging_sapi_tersedia: Number(predictionForm.daging_sapi_tersedia),
      daging_sapi_kebutuhan: Number(predictionForm.daging_sapi_kebutuhan),
      daging_ayam_tersedia: Number(predictionForm.daging_ayam_tersedia),
      daging_ayam_kebutuhan: Number(predictionForm.daging_ayam_kebutuhan),
    };

    setPredictionSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/admin/predict`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const responsePayload = (await response.json().catch(() => null)) as
        | PredictionResponse
        | ApiError
        | null;

      if (!response.ok) {
        setPredictionError(
          getErrorMessage(
            responsePayload,
            "Prediksi gagal dijalankan dari dashboard admin.",
          ),
        );
        return;
      }

      setPredictionResult(responsePayload as PredictionResponse);
      setPredictionForm(createInitialFormState());
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setPredictionError("Tidak dapat terhubung ke layanan prediksi admin.");
    } finally {
      setPredictionSubmitting(false);
    }
  }

  async function handleImportSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setImportError(null);
    setImportResult(null);

    if (!token) {
      setImportError("Login admin diperlukan untuk import dataset bulanan.");
      return;
    }

    if (!csvFile) {
      setImportError("Pilih file CSV terlebih dahulu.");
      return;
    }

    const formData = new FormData();
    formData.append("file", csvFile);

    setImportSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/admin/predictions/import`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const responsePayload = (await response.json().catch(() => null)) as
        | DatasetImportResponse
        | ApiError
        | null;

      if (!response.ok) {
        setImportError(
          getErrorMessage(
            responsePayload,
            "Import dataset bulanan gagal diproses.",
          ),
        );
        return;
      }

      setImportResult(responsePayload as DatasetImportResponse);
      setCsvFile(null);

      const fileInput = document.getElementById("csv-upload") as HTMLInputElement | null;
      if (fileInput) {
        fileInput.value = "";
      }

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setImportError("Tidak dapat terhubung ke layanan import dataset.");
    } finally {
      setImportSubmitting(false);
    }
  }

  return (
    <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <article className="rounded-sm bg-white shadow-[0_4px_20px_rgba(103,119,239,0.08)] ring-1 ring-slate-200/70">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Panel Prediksi ML</h2>
          <p className="mt-1 text-sm text-slate-500">
            Admin dapat menjalankan prediksi manual langsung dari dashboard.
          </p>
        </div>

        <div className="space-y-5 p-6">
          {!token ? (
            <div className="rounded-sm border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
              Login admin belum ditemukan di browser ini. Silakan login ulang agar
              fitur machine learning bisa dipakai dari dashboard.
            </div>
          ) : null}

          <form className="space-y-5" onSubmit={handlePredictionSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm text-slate-600">
                <span>Bulan</span>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={predictionForm.bulan}
                  onChange={(event) =>
                    setPredictionForm((current) => ({
                      ...current,
                      bulan: event.target.value,
                    }))
                  }
                  className="w-full rounded-sm border border-slate-200 px-3 py-2.5 outline-none ring-0 transition focus:border-[#6777ef]"
                />
              </label>
              <label className="space-y-2 text-sm text-slate-600">
                <span>Tahun</span>
                <input
                  type="number"
                  min={1900}
                  value={predictionForm.tahun}
                  onChange={(event) =>
                    setPredictionForm((current) => ({
                      ...current,
                      tahun: event.target.value,
                    }))
                  }
                  className="w-full rounded-sm border border-slate-200 px-3 py-2.5 outline-none ring-0 transition focus:border-[#6777ef]"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {(
                [
                  "beras_tersedia",
                  "beras_kebutuhan",
                  "minyak_tersedia",
                  "minyak_kebutuhan",
                  "telur_tersedia",
                  "telur_kebutuhan",
                  "daging_sapi_tersedia",
                  "daging_sapi_kebutuhan",
                  "daging_ayam_tersedia",
                  "daging_ayam_kebutuhan",
                ] as Array<keyof PredictionFormState>
              ).map((field) => (
                <label key={field} className="space-y-2 text-sm text-slate-600">
                  <span className="capitalize">{numberFieldLabel(field)}</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={predictionForm[field]}
                    onChange={(event) =>
                      setPredictionForm((current) => ({
                        ...current,
                        [field]: event.target.value,
                      }))
                    }
                    className="w-full rounded-sm border border-slate-200 px-3 py-2.5 outline-none ring-0 transition focus:border-[#6777ef]"
                  />
                </label>
              ))}
            </div>

            <label className="space-y-2 text-sm text-slate-600">
              <span>Catatan</span>
              <textarea
                rows={3}
                value={predictionForm.catatan}
                onChange={(event) =>
                  setPredictionForm((current) => ({
                    ...current,
                    catatan: event.target.value,
                  }))
                }
                className="w-full rounded-sm border border-slate-200 px-3 py-2.5 outline-none ring-0 transition focus:border-[#6777ef]"
                placeholder="Opsional, misalnya ringkasan kondisi lapangan bulan ini."
              />
            </label>

            {predictionError ? (
              <div className="rounded-sm border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {predictionError}
              </div>
            ) : null}

            {predictionResult ? (
              <div className="rounded-sm border border-slate-200 bg-[#f8f9fc] px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-500">Prediksi terbaru berhasil disimpan</p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {formatMonthYear(predictionResult.bulan, predictionResult.tahun)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-2 text-xs font-semibold ring-1 ${STATUS_THEME[predictionResult.hasil_prediksi]}`}
                  >
                    {predictionResult.hasil_prediksi}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
                  <div className="rounded-sm bg-white px-3 py-3">
                    Beras: {predictionResult.beras_ratio.toFixed(2)}
                  </div>
                  <div className="rounded-sm bg-white px-3 py-3">
                    Minyak: {predictionResult.minyak_ratio.toFixed(2)}
                  </div>
                  <div className="rounded-sm bg-white px-3 py-3">
                    Telur: {predictionResult.telur_ratio.toFixed(2)}
                  </div>
                </div>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={predictionSubmitting || !token}
              className="inline-flex items-center justify-center rounded-sm bg-[#6777ef] px-4 py-3 text-[13px] font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {predictionSubmitting ? "Memproses prediksi..." : "Jalankan Prediksi"}
            </button>
          </form>
        </div>
      </article>

      <article className="rounded-sm bg-white shadow-[0_4px_20px_rgba(103,119,239,0.08)] ring-1 ring-slate-200/70">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Impor Dataset Bulanan</h2>
          <p className="mt-1 text-sm text-slate-500">
            Unggah CSV bulanan untuk menambah banyak data prediksi sekaligus.
          </p>
        </div>

        <div className="space-y-5 p-6">
          <div className="rounded-sm bg-[#f8f9fc] px-4 py-4 text-sm text-slate-600">
            Format kolom CSV:
            <code className="mt-2 block overflow-x-auto rounded-sm bg-white px-3 py-3 text-[13px] text-slate-700">
              tahun,bulan,catatan,beras_tersedia,beras_kebutuhan,minyak_tersedia,minyak_kebutuhan,telur_tersedia,telur_kebutuhan,daging_sapi_tersedia,daging_sapi_kebutuhan,daging_ayam_tersedia,daging_ayam_kebutuhan
            </code>
          </div>

          <form className="space-y-4" onSubmit={handleImportSubmit}>
            <label className="block space-y-2 text-sm text-slate-600">
              <span>File dataset bulanan</span>
              <input
                id="csv-upload"
                type="file"
                accept=".csv,text/csv"
                onChange={(event) => setCsvFile(event.target.files?.[0] ?? null)}
                className="block w-full rounded-sm border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600 file:mr-3 file:rounded-sm file:border-0 file:bg-[#eef1ff] file:px-3 file:py-2 file:text-sm file:font-medium file:text-[#6777ef]"
              />
            </label>

            {importError ? (
              <div className="rounded-sm border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {importError}
              </div>
            ) : null}

            {importResult ? (
              <div className="space-y-4 rounded-sm border border-slate-200 bg-[#f8f9fc] px-4 py-4">
                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="rounded-sm bg-white px-3 py-3 text-sm text-slate-600">
                    Total: <span className="font-semibold text-slate-900">{importResult.total_rows}</span>
                  </div>
                  <div className="rounded-sm bg-white px-3 py-3 text-sm text-slate-600">
                    Import: <span className="font-semibold text-emerald-700">{importResult.imported}</span>
                  </div>
                  <div className="rounded-sm bg-white px-3 py-3 text-sm text-slate-600">
                    Skip: <span className="font-semibold text-amber-700">{importResult.skipped}</span>
                  </div>
                  <div className="rounded-sm bg-white px-3 py-3 text-sm text-slate-600">
                    Gagal: <span className="font-semibold text-rose-700">{importResult.failed}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  {importResult.items.slice(0, 6).map((item) => (
                    <div
                      key={`${item.row_number}-${item.status}`}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-sm bg-white px-3 py-3 text-sm text-slate-600"
                    >
                      <div>
                        <p className="font-medium text-slate-900">
                          Baris {item.row_number}{" "}
                          {item.bulan && item.tahun
                            ? `- ${formatMonthYear(item.bulan, item.tahun)}`
                            : ""}
                        </p>
                        <p className="mt-1">{item.message}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.hasil_prediksi ? (
                          <span
                            className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${STATUS_THEME[item.hasil_prediksi]}`}
                          >
                            {item.hasil_prediksi}
                          </span>
                        ) : null}
                        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                          {item.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={importSubmitting || !token}
              className="inline-flex items-center justify-center rounded-sm bg-[#6777ef] px-4 py-3 text-[13px] font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {importSubmitting ? "Mengimpor dataset..." : "Impor Dataset CSV"}
            </button>
          </form>
        </div>
      </article>
    </section>
  );
}
