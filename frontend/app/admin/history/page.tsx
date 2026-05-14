import Link from "next/link";
import { AdminShell } from "../admin-shell";

export const dynamic = "force-dynamic";

type PredictionLabel = "Aman" | "Waspada" | "Rawan";

type PredictionHistoryItem = {
  id: number;
  food_data_id: number;
  bulan: number | null;
  tahun: number | null;
  catatan: string | null;
  hasil_prediksi: PredictionLabel;
  created_at: string;
  beras_ratio: number;
  minyak_ratio: number;
  telur_ratio: number;
  beras_tersedia: number;
  beras_kebutuhan: number;
  minyak_tersedia: number;
  minyak_kebutuhan: number;
  telur_tersedia: number;
  telur_kebutuhan: number;
};

type PredictionHistoryResponse = {
  total: number;
  limit: number;
  offset: number;
  hasil_prediksi: PredictionLabel | null;
  bulan: number | null;
  tahun: number | null;
  items: PredictionHistoryItem[];
};

type HistorySearchParams = {
  page?: string;
  status?: string;
  bulan?: string;
  tahun?: string;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.API_URL ??
  "http://127.0.0.1:8000";

const PAGE_SIZE = 12;

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

function parsePositiveInt(value: string | undefined) {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function parseMonth(value: string | undefined) {
  const parsed = parsePositiveInt(value);
  if (!parsed || parsed > 12) {
    return null;
  }

  return parsed;
}

function parseStatus(value: string | undefined): PredictionLabel | null {
  if (value === "Aman" || value === "Waspada" || value === "Rawan") {
    return value;
  }

  return null;
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Request ${path} gagal dengan status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function getPredictionHistory(filters: {
  page: number;
  status: PredictionLabel | null;
  bulan: number | null;
  tahun: number | null;
}): Promise<{ data: PredictionHistoryResponse; error: string | null }> {
  const params = new URLSearchParams({
    limit: String(PAGE_SIZE),
    offset: String((filters.page - 1) * PAGE_SIZE),
  });

  if (filters.status) {
    params.set("hasil_prediksi", filters.status);
  }

  if (filters.bulan) {
    params.set("bulan", String(filters.bulan));
  }

  if (filters.tahun) {
    params.set("tahun", String(filters.tahun));
  }

  try {
    const data = await getJson<PredictionHistoryResponse>(`/predictions?${params.toString()}`);
    return { data, error: null };
  } catch (error) {
    return {
      data: {
        total: 0,
        limit: PAGE_SIZE,
        offset: 0,
        hasil_prediksi: filters.status,
        bulan: filters.bulan,
        tahun: filters.tahun,
        items: [],
      },
      error:
        error instanceof Error
          ? error.message
          : "Riwayat prediksi belum bisa diambil dari backend.",
    };
  }
}

function formatMonthYear(month: number | null, year: number | null) {
  if (!month || !year) {
    return "Periode belum diisi";
  }

  return `${MONTH_LABELS[month - 1]} ${year}`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function buildHistoryHref(filters: {
  page: number;
  status: PredictionLabel | null;
  bulan: number | null;
  tahun: number | null;
}) {
  const params = new URLSearchParams();

  if (filters.page > 1) {
    params.set("page", String(filters.page));
  }
  if (filters.status) {
    params.set("status", filters.status);
  }
  if (filters.bulan) {
    params.set("bulan", String(filters.bulan));
  }
  if (filters.tahun) {
    params.set("tahun", String(filters.tahun));
  }

  const query = params.toString();
  return query ? `/admin/history?${query}` : "/admin/history";
}

function getStatusSummary(items: PredictionHistoryItem[]) {
  return items.reduce(
    (summary, item) => {
      summary[item.hasil_prediksi] += 1;
      return summary;
    },
    { Aman: 0, Waspada: 0, Rawan: 0 } as Record<PredictionLabel, number>,
  );
}

export default async function AdminHistoryPage({
  searchParams,
}: {
  searchParams?: Promise<HistorySearchParams>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const page = parsePositiveInt(resolvedSearchParams.page) ?? 1;
  const status = parseStatus(resolvedSearchParams.status);
  const bulan = parseMonth(resolvedSearchParams.bulan);
  const tahun = parsePositiveInt(resolvedSearchParams.tahun);

  const { data, error } = await getPredictionHistory({
    page,
    status,
    bulan,
    tahun,
  });

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startItem = data.total === 0 ? 0 : data.offset + 1;
  const endItem = data.total === 0 ? 0 : data.offset + data.items.length;
  const pageSummary = getStatusSummary(data.items);

  return (
    <AdminShell
      activeItem="history"
      title="Riwayat Prediksi"
      description="Telaah seluruh hasil prediksi yang sudah tersimpan, lengkap dengan filter periode dan status."
      headerActions={
        <>
          <div className="rounded-sm border border-slate-200 bg-[#f8f9fc] px-4 py-3 text-sm text-slate-600">
            Total data: <span className="font-semibold text-slate-900">{data.total}</span>
          </div>
          <div className="rounded-sm border border-slate-200 bg-[#f8f9fc] px-4 py-3 text-sm text-slate-600">
            Tampil:{" "}
            <span className="font-semibold text-slate-900">
              {startItem}-{endItem}
            </span>
          </div>
        </>
      }
    >
      {error ? (
        <div className="mb-6 rounded-sm border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Backend belum merespons riwayat prediksi. Halaman tetap tampil dengan state
          kosong. Detail error: {error}
        </div>
      ) : null}

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <article className="rounded-sm bg-white shadow-[0_4px_20px_rgba(103,119,239,0.08)] ring-1 ring-slate-200/70">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900">Filter Riwayat</h2>
            <p className="mt-1 text-sm text-slate-500">
              Saring histori berdasarkan status, bulan, dan tahun analisis.
            </p>
          </div>

          <form className="grid gap-4 p-6 md:grid-cols-4 md:items-end" action="/admin/history">
            <label className="space-y-2 text-sm text-slate-600">
              <span>Status</span>
              <select
                name="status"
                defaultValue={status ?? ""}
                className="w-full rounded-sm border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-[#6777ef]"
              >
                <option value="">Semua status</option>
                <option value="Aman">Aman</option>
                <option value="Waspada">Waspada</option>
                <option value="Rawan">Rawan</option>
              </select>
            </label>

            <label className="space-y-2 text-sm text-slate-600">
              <span>Bulan</span>
              <select
                name="bulan"
                defaultValue={bulan ? String(bulan) : ""}
                className="w-full rounded-sm border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-[#6777ef]"
              >
                <option value="">Semua bulan</option>
                {MONTH_LABELS.map((label, index) => (
                  <option key={label} value={index + 1}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm text-slate-600">
              <span>Tahun</span>
              <input
                type="number"
                name="tahun"
                min={1900}
                defaultValue={tahun ?? ""}
                placeholder="Contoh 2026"
                className="w-full rounded-sm border border-slate-200 px-3 py-2.5 outline-none transition focus:border-[#6777ef]"
              />
            </label>

            <div className="flex gap-3">
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-sm bg-[#6777ef] px-4 py-2.5 text-[13px] font-semibold text-white transition hover:brightness-105"
              >
                Terapkan
              </button>
              <Link
                href="/admin/history"
                className="inline-flex items-center justify-center rounded-sm border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Reset
              </Link>
            </div>
          </form>
        </article>

        <article className="rounded-sm bg-white shadow-[0_4px_20px_rgba(103,119,239,0.08)] ring-1 ring-slate-200/70">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900">Ringkasan Halaman</h2>
            <p className="mt-1 text-sm text-slate-500">
              Gambaran cepat data yang sedang tampil di hasil filter sekarang.
            </p>
          </div>

          <div className="space-y-4 p-6">
            <div className="rounded-sm bg-[#f8f9fc] px-4 py-4">
              <p className="text-sm text-slate-500">Filter aktif</p>
              <p className="mt-2 text-sm leading-7 text-slate-700">
                Status: <span className="font-semibold">{status ?? "Semua"}</span>
                <br />
                Bulan: <span className="font-semibold">{bulan ? MONTH_LABELS[bulan - 1] : "Semua"}</span>
                <br />
                Tahun: <span className="font-semibold">{tahun ?? "Semua"}</span>
              </p>
            </div>

            {(["Aman", "Waspada", "Rawan"] as PredictionLabel[]).map((label) => (
              <div key={label} className="flex items-center justify-between rounded-sm bg-[#f8f9fc] px-4 py-3">
                <span className="text-sm text-slate-600">{label}</span>
                <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${STATUS_THEME[label]}`}>
                  {pageSummary[label]} data
                </span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mt-6 rounded-sm bg-white shadow-[0_4px_20px_rgba(103,119,239,0.08)] ring-1 ring-slate-200/70">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Daftar Riwayat</h2>
          <p className="mt-1 text-sm text-slate-500">
            Menampilkan histori prediksi beserta rasio komoditas dan nilai inputnya.
          </p>
        </div>

        <div className="overflow-x-auto p-3">
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-[0.14em] text-slate-400">
              <tr>
                <th className="px-3 py-3">Periode</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Rasio</th>
                <th className="px-3 py-3">Input Komoditas</th>
                <th className="px-3 py-3">Catatan</th>
                <th className="px-3 py-3">Tersimpan</th>
              </tr>
            </thead>
            <tbody>
              {data.items.length > 0 ? (
                data.items.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100 align-top">
                    <td className="px-3 py-4">
                      <p className="font-semibold text-slate-900">
                        {formatMonthYear(item.bulan, item.tahun)}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Prediksi #{item.id} · Food #{item.food_data_id}
                      </p>
                    </td>
                    <td className="px-3 py-4">
                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${STATUS_THEME[item.hasil_prediksi]}`}
                      >
                        {item.hasil_prediksi}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-slate-600">
                      <p>Beras: {formatNumber(item.beras_ratio)}</p>
                      <p>Minyak: {formatNumber(item.minyak_ratio)}</p>
                      <p>Telur: {formatNumber(item.telur_ratio)}</p>
                    </td>
                    <td className="px-3 py-4 text-slate-600">
                      <p>Beras {formatNumber(item.beras_tersedia)} / {formatNumber(item.beras_kebutuhan)}</p>
                      <p>Minyak {formatNumber(item.minyak_tersedia)} / {formatNumber(item.minyak_kebutuhan)}</p>
                      <p>Telur {formatNumber(item.telur_tersedia)} / {formatNumber(item.telur_kebutuhan)}</p>
                    </td>
                    <td className="px-3 py-4 text-slate-600">
                      <p className="max-w-xs leading-6">
                        {item.catatan?.trim() || "Tidak ada catatan."}
                      </p>
                    </td>
                    <td className="px-3 py-4 text-slate-500">
                      {formatDateTime(item.created_at)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-slate-500">
                    Belum ada riwayat prediksi yang cocok dengan filter saat ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-4 border-t border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Menampilkan <span className="font-semibold text-slate-900">{startItem}-{endItem}</span>{" "}
            dari <span className="font-semibold text-slate-900">{data.total}</span> data.
          </p>

          <div className="flex items-center gap-2">
            <Link
              href={buildHistoryHref({
                page: Math.max(currentPage - 1, 1),
                status,
                bulan,
                tahun,
              })}
              aria-disabled={currentPage <= 1}
              className={`inline-flex items-center justify-center rounded-sm px-4 py-2 text-sm font-semibold transition ${
                currentPage <= 1
                  ? "pointer-events-none border border-slate-200 bg-slate-100 text-slate-400"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              Sebelumnya
            </Link>
            <div className="rounded-sm border border-slate-200 bg-[#f8f9fc] px-4 py-2 text-sm text-slate-600">
              Halaman <span className="font-semibold text-slate-900">{currentPage}</span> / {totalPages}
            </div>
            <Link
              href={buildHistoryHref({
                page: Math.min(currentPage + 1, totalPages),
                status,
                bulan,
                tahun,
              })}
              aria-disabled={currentPage >= totalPages}
              className={`inline-flex items-center justify-center rounded-sm px-4 py-2 text-sm font-semibold transition ${
                currentPage >= totalPages
                  ? "pointer-events-none border border-slate-200 bg-slate-100 text-slate-400"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              Berikutnya
            </Link>
          </div>
        </div>
      </section>
    </AdminShell>
  );
}
