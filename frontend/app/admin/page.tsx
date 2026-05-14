import { ReactNode } from "react";
import { AdminShell } from "./admin-shell";

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

type DashboardSummaryResponse = {
  total_data: number;
  counts: {
    total: number;
    aman: number;
    waspada: number;
    rawan: number;
  };
  latest_prediction: PredictionHistoryItem | null;
};

type DistributionItem = {
  label: PredictionLabel;
  value: number;
  percentage: number;
};

type DashboardDistributionResponse = {
  total_data: number;
  items: DistributionItem[];
};

type MonthlyTrendItem = {
  bulan: number;
  total: number;
  aman: number;
  waspada: number;
  rawan: number;
};

type DashboardMonthlyTrendResponse = {
  tahun: number | null;
  items: MonthlyTrendItem[];
};

type PredictionHistoryResponse = {
  total: number;
  limit: number;
  offset: number;
  items: PredictionHistoryItem[];
};

type AdminDashboardData = {
  summary: DashboardSummaryResponse;
  distribution: DashboardDistributionResponse;
  trend: DashboardMonthlyTrendResponse;
  history: PredictionHistoryResponse;
  error: string | null;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.API_URL ??
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

const STATUS_THEME: Record<
  PredictionLabel,
  { badge: string; chip: string; bar: string; icon: string }
> = {
  Aman: {
    badge: "bg-emerald-100 text-emerald-700 ring-emerald-200",
    chip: "bg-emerald-50 text-emerald-700",
    bar: "bg-emerald-500",
    icon: "bg-emerald-500/14 text-emerald-700",
  },
  Waspada: {
    badge: "bg-amber-100 text-amber-700 ring-amber-200",
    chip: "bg-amber-50 text-amber-700",
    bar: "bg-amber-400",
    icon: "bg-amber-500/14 text-amber-700",
  },
  Rawan: {
    badge: "bg-rose-100 text-rose-700 ring-rose-200",
    chip: "bg-rose-50 text-rose-700",
    bar: "bg-rose-500",
    icon: "bg-rose-500/14 text-rose-700",
  },
};

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Request ${path} gagal dengan status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function getAdminDashboardData(): Promise<AdminDashboardData> {
  try {
    const [summary, distribution, trend, history] = await Promise.all([
      getJson<DashboardSummaryResponse>("/dashboard/summary"),
      getJson<DashboardDistributionResponse>("/dashboard/distribution"),
      getJson<DashboardMonthlyTrendResponse>("/dashboard/trend/monthly"),
      getJson<PredictionHistoryResponse>("/predictions?limit=6&offset=0"),
    ]);

    return { summary, distribution, trend, history, error: null };
  } catch (error) {
    return {
      summary: {
        total_data: 0,
        counts: { total: 0, aman: 0, waspada: 0, rawan: 0 },
        latest_prediction: null,
      },
      distribution: {
        total_data: 0,
        items: [
          { label: "Aman", value: 0, percentage: 0 },
          { label: "Waspada", value: 0, percentage: 0 },
          { label: "Rawan", value: 0, percentage: 0 },
        ],
      },
      trend: {
        tahun: null,
        items: Array.from({ length: 12 }, (_, index) => ({
          bulan: index + 1,
          total: 0,
          aman: 0,
          waspada: 0,
          rawan: 0,
        })),
      },
      history: {
        total: 0,
        limit: 6,
        offset: 0,
        items: [],
      },
      error:
        error instanceof Error
          ? error.message
          : "Dashboard admin belum bisa mengambil data.",
    };
  }
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

function formatPercentage(value: number) {
  return `${new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 1,
  }).format(value)}%`;
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

function formatMonthYear(month: number | null, year: number | null) {
  if (!month || !year) {
    return "Periode belum diisi";
  }

  return `${MONTH_LABELS[month - 1]} ${year}`;
}

function getPeakMonth(items: MonthlyTrendItem[]) {
  return [...items].sort((a, b) => b.total - a.total)[0];
}

function getDominantStatus(item: MonthlyTrendItem): PredictionLabel | null {
  if (item.total === 0) {
    return null;
  }

  const stats: Array<[PredictionLabel, number]> = [
    ["Aman", item.aman],
    ["Waspada", item.waspada],
    ["Rawan", item.rawan],
  ];

  return stats.sort((a, b) => b[1] - a[1])[0][0];
}

function getStatusSummary(item: PredictionHistoryItem) {
  if (item.hasil_prediksi === "Rawan") {
    return "Pasokan perlu tindakan cepat";
  }
  if (item.hasil_prediksi === "Waspada") {
    return "Perlu pemantauan lebih ketat";
  }
  return "Kondisi relatif stabil";
}

function SafeStatusIcon() {
  return (
    <svg
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="#69ff39"
    >
      <path d="m20.42 6.11-7.97-4c-.28-.14-.62-.14-.9 0l-7.97 4c-.31.15-.51.45-.55.79-.01.11-.96 10.76 8.55 15.01a.98.98 0 0 0 .82 0C21.91 17.66 20.97 7 20.95 6.9a.98.98 0 0 0-.55-.79ZM12 19.9C5.26 16.63 4.94 9.64 5 7.64l7-3.51 7 3.51c.04 1.99-.33 9.02-7 12.26" />
      <path d="m11 12.59-1.29-1.3-1.42 1.42 2.71 2.7 4.71-4.7-1.42-1.42z" />
    </svg>
  );
}

function TotalPredictionIcon() {
  return (
    <svg  
    xmlns="http://www.w3.org/2000/svg" 
    width="24" height="24"
    viewBox="0 0 24 24"  
    fill="#3a3838" 
  >
    <path d="M21 7h-5V3c0-.55-.45-1-1-1H9c-.55 0-1 .45-1 1v8H3c-.55 0-1 .45-1 1v9c0 .55.45 1 1 1h18c.55 0 1-.45 1-1V8c0-.55-.45-1-1-1M4 13h4v7H4zm6-1V4h4v16h-4zm10 8h-4V9h4z">
    </path>
  </svg>
  );
}

function WaspadaIcon() {
  return (
    <svg  
    xmlns="http://www.w3.org/2000/svg" 
    width="24" height="24"  
    viewBox="0 0 24 24" 
    fill="#f6a700"
  >
    <path d="M11 9h2v6h-2zm0 8h2v2h-2z"></path>
    <path d="M12.87 2.51c-.35-.63-1.4-.63-1.75 0l-9.99 18c-.17.31-.17.69.01.99.18.31.51.49.86.49h20c.35 0 .68-.19.86-.49a1 1 0 0 0 .01-.99zM3.7 20 12 5.06 20.3 20z"></path>
</svg>
  );
}

function RawanIcon() {
  return (
    <svg  
    xmlns="http://www.w3.org/2000/svg" 
    width="24" height="24"  
    viewBox="0 0 24 24" 
    fill="#ff0000"
  > 
    <path d="M7 19H4v2h16v-2h-3v-6c0-2.76-2.24-5-5-5s-5 2.24-5 5zm2-6c0-1.65 1.35-3 3-3s3 1.35 3 3v6H9zm4-7V3h-2v3zm6 5v2h3v-2zM5 13v-2H2v2zm12.66-5.24 1.06-1.06 1.06-1.06-.71-.71-.71-.71-1.06 1.06-1.06 1.06.71.71zm-11.32 0 .71-.71.71-.71L6.7 5.28 5.64 4.22l-.71.71-.71.71L5.28 6.7z">
    </path>
    </svg>
  );
}

function StatCard({
  title,
  value,
  helper,
  icon,
}: {
  title: string;
  value: string;
  helper: string;
  icon?: ReactNode;
}) {
  return (
    <article className="rounded-sm bg-white shadow-[0_4px_20px_rgba(103,119,239,0.08)] ring-1 ring-slate-200/70">
      <div className="flex items-center gap-4 p-6">
        <div className={`grid h-24 w-24 place-items-center rounded-sm`}>
          {icon ? <span className="text-xl font-semibold">{icon}</span> : null}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            {title}
          </p>
          <p className="mt-2 text-3xl font-semibold leading-none text-slate-900">
            {value}
          </p>
          <p className="mt-2 text-sm text-slate-500">{helper}</p>
        </div>
      </div>
    </article>
  );
}

export default async function AdminPage() {
  const { summary, distribution, trend, history, error } =
    await getAdminDashboardData();
  const peakMonth = getPeakMonth(trend.items);
  const maxTrendValue = Math.max(...trend.items.map((item) => item.total), 1);
  const latestPrediction = summary.latest_prediction;

  return (
    <AdminShell
      activeItem="overview"
      title="Dashboard"
      description="Ringkasan kondisi deteksi kerawanan pangan untuk kebutuhan admin."
      headerActions={
        <>
          <div className="rounded-sm border border-slate-200 bg-[#f8f9fc] px-4 py-3 text-sm text-slate-600">
            Tahun analisis:{" "}
            <span className="font-semibold text-slate-900">{trend.tahun ?? "Semua"}</span>
          </div>
          <div className="rounded-sm border border-slate-200 bg-[#f8f9fc] px-4 py-3 text-sm text-slate-600">
            Puncak bulan:{" "}
            <span className="font-semibold text-slate-900">
              {peakMonth.total > 0
                ? `${MONTH_LABELS[peakMonth.bulan - 1]} (${peakMonth.total})`
                : "Belum ada data"}
            </span>
          </div>
        </>
      }
    >
      {error ? (
        <div className="mb-6 rounded-sm border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Backend belum merespons data admin. Halaman tetap tampil dengan state
          kosong. Detail error: {error}
        </div>
      ) : null}

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Prediksi"
          value={formatNumber(summary.total_data)}
          helper="Seluruh entri yang telah tersimpan"
          icon={<TotalPredictionIcon />}
        />
        <StatCard
          title="Status Aman"
          value={formatNumber(summary.counts.aman)}
          helper="Data dengan kondisi pasokan aman"
          icon={<SafeStatusIcon />}
        />
        <StatCard
          title="Status Waspada"
          value={formatNumber(summary.counts.waspada)}
          helper="Data yang perlu pemantauan"
          icon={<WaspadaIcon />}
        />
        <StatCard
          title="Status Rawan"
          value={formatNumber(summary.counts.rawan)}
          helper="Data prioritas tindak lanjut"
          icon={<RawanIcon />}
        />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_360px]">
              <article className="rounded-sm bg-white shadow-[0_4px_20px_rgba(103,119,239,0.08)] ring-1 ring-slate-200/70">
                <div className="border-b border-slate-200 px-6 py-4">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Aktivitas Bulanan
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Jumlah prediksi per bulan dengan warna mengikuti status dominan.
                  </p>
                </div>

                <div className="p-6">
                  <div className="grid h-72 grid-cols-12 items-end gap-3">
                    {trend.items.map((item) => {
                      const dominant = getDominantStatus(item);
                      const barTheme = dominant
                        ? STATUS_THEME[dominant].bar
                        : "bg-slate-300";
                      const height =
                        item.total === 0
                          ? 12
                          : Math.max((item.total / maxTrendValue) * 100, 14);

                      return (
                        <div
                          key={item.bulan}
                          className="flex h-full flex-col items-center justify-end gap-3"
                        >
                          <div className="flex h-full w-full items-end justify-center">
                            <div
                              className={`w-full max-w-10 rounded-t-[4px] ${barTheme}`}
                              style={{ height: `${height}%` }}
                            />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-semibold text-slate-700">
                              {MONTH_LABELS[item.bulan - 1]}
                            </p>
                            <p className="text-xs text-slate-400">{item.total}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    {distribution.items.map((item) => (
                      <div
                        key={item.label}
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm ${STATUS_THEME[item.label].chip}`}
                      >
                        <span className={`h-2.5 w-2.5 rounded-full ${STATUS_THEME[item.label].bar}`} />
                        <span>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </article>

              <div className="grid gap-6">
                <article className="rounded-sm bg-white shadow-[0_4px_20px_rgba(103,119,239,0.08)] ring-1 ring-slate-200/70">
                  <div className="border-b border-slate-200 px-6 py-4">
                    <h2 className="text-lg font-semibold text-slate-900">
                      Distribusi Status
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Komposisi hasil prediksi yang tersimpan.
                    </p>
                  </div>

                  <div className="space-y-4 p-6">
                    {distribution.items.map((item) => (
                      <div key={item.label}>
                        <div className="mb-2 flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full ${STATUS_THEME[item.label].bar}`} />
                            <span className="font-medium text-slate-700">{item.label}</span>
                          </div>
                          <span className="text-slate-500">
                            {formatNumber(item.value)} ({formatPercentage(item.percentage)})
                          </span>
                        </div>
                        <div className="h-2.5 rounded-full bg-slate-100">
                          <div
                            className={`h-2.5 rounded-full ${STATUS_THEME[item.label].bar}`}
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="rounded-sm bg-white shadow-[0_4px_20px_rgba(103,119,239,0.08)] ring-1 ring-slate-200/70">
                  <div className="border-b border-slate-200 px-6 py-4">
                    <h2 className="text-lg font-semibold text-slate-900">
                      Prediksi Terbaru
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Detail hasil prediksi paling baru.
                    </p>
                  </div>

                  <div className="p-6">
                    {latestPrediction ? (
                      <div className="space-y-4">
                        <div className="flex items-start justify-between gap-4 rounded-sm bg-[#f8f9fc] p-4">
                          <div>
                            <p className="text-sm text-slate-500">Periode</p>
                            <p className="mt-1 text-lg font-semibold text-slate-900">
                              {formatMonthYear(latestPrediction.bulan, latestPrediction.tahun)}
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-3 py-2 text-xs font-semibold ring-1 ${STATUS_THEME[latestPrediction.hasil_prediksi].badge}`}
                          >
                            {latestPrediction.hasil_prediksi}
                          </span>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                          <div className="rounded-sm bg-[#f8f9fc] px-4 py-3">
                            <p className="text-sm text-slate-500">Beras</p>
                            <p className="mt-1 text-2xl font-semibold text-slate-900">
                              {latestPrediction.beras_ratio.toFixed(2)}
                            </p>
                          </div>
                          <div className="rounded-sm bg-[#f8f9fc] px-4 py-3">
                            <p className="text-sm text-slate-500">Minyak</p>
                            <p className="mt-1 text-2xl font-semibold text-slate-900">
                              {latestPrediction.minyak_ratio.toFixed(2)}
                            </p>
                          </div>
                          <div className="rounded-sm bg-[#f8f9fc] px-4 py-3">
                            <p className="text-sm text-slate-500">Telur</p>
                            <p className="mt-1 text-2xl font-semibold text-slate-900">
                              {latestPrediction.telur_ratio.toFixed(2)}
                            </p>
                          </div>
                        </div>

                        <div className="rounded-sm border border-slate-200 px-4 py-4">
                          <p className="text-sm text-slate-500">Catatan</p>
                          <p className="mt-2 text-sm leading-7 text-slate-600">
                            {latestPrediction.catatan ?? "Belum ada catatan untuk data ini."}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-sm bg-[#f8f9fc] px-4 py-5 text-sm text-slate-500">
                        Belum ada hasil prediksi yang tersimpan.
                      </div>
                    )}
                  </div>
                </article>
              </div>
            </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_420px]">
              <article className="rounded-sm bg-white shadow-[0_4px_20px_rgba(103,119,239,0.08)] ring-1 ring-slate-200/70">
                <div className="border-b border-slate-200 px-6 py-4">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Prediksi Terbaru
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Histori prediksi terbaru untuk peninjauan cepat.
                  </p>
                </div>

                <div className="overflow-x-auto p-3">
                  <table className="min-w-full text-sm">
                    <thead className="text-left text-xs uppercase tracking-[0.14em] text-slate-400">
                      <tr>
                        <th className="px-3 py-3">Periode</th>
                        <th className="px-3 py-3">Status</th>
                        <th className="px-3 py-3">Rasio</th>
                        <th className="px-3 py-3">Input</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.items.length > 0 ? (
                        history.items.map((item) => (
                          <tr key={item.id} className="border-t border-slate-100">
                            <td className="px-3 py-4">
                              <p className="font-semibold text-slate-900">
                                {formatMonthYear(item.bulan, item.tahun)}
                              </p>
                              <p className="mt-1 text-xs text-slate-400">
                                ID #{item.id}
                              </p>
                            </td>
                            <td className="px-3 py-4">
                              <span
                                className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${STATUS_THEME[item.hasil_prediksi].badge}`}
                              >
                                {item.hasil_prediksi}
                              </span>
                            </td>
                            <td className="px-3 py-4 text-slate-500">
                              <p>Beras {item.beras_ratio.toFixed(2)}</p>
                              <p>Minyak {item.minyak_ratio.toFixed(2)}</p>
                              <p>Telur {item.telur_ratio.toFixed(2)}</p>
                            </td>
                            <td className="px-3 py-4 text-slate-500">
                              {formatDateTime(item.created_at)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-3 py-8 text-center text-slate-500"
                          >
                            Belum ada histori prediksi.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </article>

              <article className="rounded-sm bg-white shadow-[0_4px_20px_rgba(103,119,239,0.08)] ring-1 ring-slate-200/70">
                <div className="border-b border-slate-200 px-6 py-4">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Umpan Aktivitas
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Ringkasan cepat dari entri yang baru masuk.
                  </p>
                </div>

                <div className="space-y-4 p-6">
                  {history.items.length > 0 ? (
                    history.items.slice(0, 4).map((item) => (
                      <div key={`feed-${item.id}`} className="flex gap-4">
                        <div
                          className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-semibold ${STATUS_THEME[item.hasil_prediksi].icon}`}
                        >
                          {item.hasil_prediksi.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-slate-900">
                              {formatMonthYear(item.bulan, item.tahun)}
                            </p>
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_THEME[item.hasil_prediksi].chip}`}
                            >
                              {item.hasil_prediksi}
                            </span>
                          </div>
                          <p className="mt-1 text-sm leading-6 text-slate-500">
                            {getStatusSummary(item)}. {item.catatan ?? "Tanpa catatan tambahan."}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {formatDateTime(item.created_at)}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-sm bg-[#f8f9fc] px-4 py-5 text-sm text-slate-500">
                      Umpan aktivitas akan muncul setelah data prediksi mulai masuk.
                    </div>
                  )}
                </div>
              </article>
            </section>
    </AdminShell>
  );
}
