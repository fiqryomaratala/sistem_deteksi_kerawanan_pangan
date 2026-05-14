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

type DashboardData = {
  summary: DashboardSummaryResponse;
  distribution: DashboardDistributionResponse;
  trend: DashboardMonthlyTrendResponse;
  history: PredictionHistoryItem[];
  error: string | null;
};

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

const STATUS_STYLES: Record<
  PredictionLabel,
  { tone: string; soft: string; text: string }
> = {
  Aman: {
    tone: "bg-emerald-500",
    soft: "bg-emerald-100",
    text: "text-emerald-700",
  },
  Waspada: {
    tone: "bg-amber-400",
    soft: "bg-amber-100",
    text: "text-amber-700",
  },
  Rawan: {
    tone: "bg-rose-500",
    soft: "bg-rose-100",
    text: "text-rose-700",
  },
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.API_URL ??
  "http://127.0.0.1:8000";

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Request ${path} gagal dengan status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function getDashboardData(): Promise<DashboardData> {
  try {
    const [summary, distribution, trend, historyResponse] = await Promise.all([
      getJson<DashboardSummaryResponse>("/dashboard/summary"),
      getJson<DashboardDistributionResponse>("/dashboard/distribution"),
      getJson<DashboardMonthlyTrendResponse>("/dashboard/trend/monthly"),
      getJson<{ items: PredictionHistoryItem[] }>("/predictions?limit=12&offset=0"),
    ]);

    return {
      summary,
      distribution,
      trend,
      history: historyResponse.items,
      error: null,
    };
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
      history: [],
      error:
        error instanceof Error
          ? error.message
          : "Data dashboard belum bisa diambil.",
    };
  }
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

function formatDecimal(value: number, digits = 2) {
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function formatPercentage(value: number) {
  return `${new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 1,
  }).format(value)}%`;
}

function formatMonthYear(
  month: number | null | undefined,
  year: number | null | undefined,
) {
  if (!month || !year) {
    return "Periode belum diisi";
  }

  return `${MONTH_LABELS[month - 1]} ${year}`;
}

function buildPieGradient(items: DistributionItem[]) {
  const colorMap: Record<PredictionLabel, string> = {
    Aman: "#10b981",
    Waspada: "#f59e0b",
    Rawan: "#f43f5e",
  };

  const totalPercentage = items.reduce((sum, item) => sum + item.percentage, 0);

  if (totalPercentage === 0) {
    return "conic-gradient(#dbe3f1 0deg 360deg)";
  }

  let start = 0;
  const segments = items.map((item) => {
    const end = start + item.percentage * 3.6;
    const segment = `${colorMap[item.label]} ${start}deg ${end}deg`;
    start = end;
    return segment;
  });

  return `conic-gradient(${segments.join(", ")})`;
}

function getPeakMonth(items: MonthlyTrendItem[]) {
  return [...items].sort((a, b) => b.total - a.total)[0];
}

function TotalPredictiionCard () {
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
  icon?: React.ReactNode;
}) {
  return (
    <article className="rounded-[10px] border border-white/70 bg-white/90 p-5 shadow-[0_20px_45px_rgba(18,38,63,0.08)] backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <div className={`grid h-10 w-10 place-items-center rounded-sm`}>
          {icon ? <span className="text-xl font-semibold">{icon}</span> : null}
        </div>
      </div>
      <p className="font-[family:var(--font-space-grotesk)] text-3xl font-semibold text-slate-950">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{helper}</p>
    </article>
  );
}

export default async function Home() {
  const { summary, distribution, trend, history, error } = await getDashboardData();
  const maxTotal = Math.max(...trend.items.map((item) => item.total), 1);
  const peakMonth = getPeakMonth(trend.items);
  const pieGradient = buildPieGradient(distribution.items);
  const latestStatus = summary.latest_prediction?.hasil_prediksi;
  const latestStatusStyle = latestStatus ? STATUS_STYLES[latestStatus] : null;

  return (
    <main className="flex min-h-screen w-full flex-1">
      <section className="min-h-screen w-full">
        <div className="bg-white/65 p-5 sm:p-7 lg:p-8">
          <header className="flex flex-col gap-5 border-b border-slate-200/70 pb-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.22em] text-blue-600">
                Dashboard Publik
              </p>
              <h1 className="mt-3 font-[family:var(--font-space-grotesk)] text-3xl font-semibold text-slate-950 sm:text-4xl">
                Hasil Deteksi Kerawanan Pangan per Bulan
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500 sm:text-base">
                Halaman ini menampilkan hasil deteksi yang sudah diolah per bulan dan
                dapat diakses langsung oleh user tanpa login. Fokus utamanya adalah
                ringkasan status, distribusi hasil, dan penjelasan tren bulanan.
              </p>
            </div>

            <div className="rounded-[10px] border border-slate-200/80 bg-slate-50 px-5 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                Periode analisis
              </p>
              <p className="mt-2 font-[family:var(--font-space-grotesk)] text-2xl font-semibold text-slate-950">
                {trend.tahun ?? "Semua Tahun"}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Puncak aktivitas:{" "}
                {peakMonth.total > 0
                  ? `${MONTH_LABELS[peakMonth.bulan - 1]} dengan ${peakMonth.total} deteksi`
                  : "Belum ada data bulanan"}
              </p>
            </div>
          </header>

          {error ? (
            <div className="mt-6 rounded-[10px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
              Dashboard tetap ditampilkan dengan state kosong karena backend belum
              merespons. Detail error: {error}
            </div>
          ) : null}

          <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Total data deteksi"
              value={formatNumber(summary.total_data)}
              helper="Jumlah seluruh data prediksi yang sudah tersimpan."
              icon={<TotalPredictiionCard />}
            />
            <StatCard
              title="Deteksi aman"
              value={formatNumber(summary.counts.aman)}
              helper="Data dengan kondisi pasokan relatif aman."
              icon={<SafeStatusIcon />}
            />
            <StatCard
              title="Deteksi waspada"
              value={formatNumber(summary.counts.waspada)}
              helper="Data yang perlu perhatian sebelum masuk fase rawan."
              icon={<WaspadaIcon />}
            />
            <StatCard
              title="Deteksi rawan"
              value={formatNumber(summary.counts.rawan)}
              helper="Data yang menunjukkan indikasi kerawanan tertinggi."
              icon={<RawanIcon />}
            />
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_360px]">
            <article className="rounded-[10px] border border-slate-200/80 bg-white p-6 shadow-[0_20px_55px_rgba(15,23,42,0.08)]">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Bar chart bulanan</p>
                  <h2 className="mt-1 font-[family:var(--font-space-grotesk)] text-2xl font-semibold text-slate-950">
                    Ringkasan hasil deteksi per bulan
                  </h2>
                </div>
                <div className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-600">
                  Data bulanan yang sudah diolah
                </div>
              </div>

              <div className="mt-8">
                <div className="flex h-72 items-end gap-3 rounded-[10px] bg-slate-50 px-4 pb-4 pt-8 sm:gap-4 sm:px-5">
                  {trend.items.map((item) => {
                    const barHeight = item.total === 0 ? 14 : (item.total / maxTotal) * 100;

                    return (
                      <div
                        key={item.bulan}
                        className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-3"
                      >
                        <div className="flex h-full w-full items-end justify-center">
                          <div
                            className="flex w-full max-w-12 flex-col overflow-hidden rounded-t-[5px] bg-slate-200/80"
                            style={{ height: `${barHeight}%` }}
                          >
                            {item.aman > 0 ? (
                              <div
                                className="bg-emerald-500"
                                style={{ height: `${(item.aman / item.total) * 100}%` }}
                              />
                            ) : null}
                            {item.waspada > 0 ? (
                              <div
                                className="bg-amber-400"
                                style={{ height: `${(item.waspada / item.total) * 100}%` }}
                              />
                            ) : null}
                            {item.rawan > 0 ? (
                              <div
                                className="bg-rose-500"
                                style={{ height: `${(item.rawan / item.total) * 100}%` }}
                              />
                            ) : null}
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="font-[family:var(--font-space-grotesk)] text-sm font-semibold text-slate-700">
                            {MONTH_LABELS[item.bulan - 1]}
                          </p>
                          <p className="text-xs text-slate-400">{item.total} data</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-500">
                  {(["Aman", "Waspada", "Rawan"] as PredictionLabel[]).map((label) => (
                    <div
                      key={label}
                      className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2"
                    >
                      <span className={`h-2.5 w-2.5 rounded-full ${STATUS_STYLES[label].tone}`} />
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="font-[family:var(--font-space-grotesk)] text-xl font-semibold text-slate-950">
                    Penjelasan hasil deteksi bulanan
                  </h3>
                  <p className="text-sm text-slate-500">
                    {history.length} data terbaru ditampilkan
                  </p>
                </div>

                <div className="mt-4 overflow-hidden rounded-[10px] border border-slate-200/80 bg-white">
                  {history.length > 0 ? (
                    <>
                      <div className="hidden grid-cols-[1.2fr_0.7fr_0.9fr_1.1fr] gap-6 border-b border-slate-200/80 bg-slate-50/90 px-5 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 md:grid">
                        <p>Periode</p>
                        <p>Status</p>
                        <p>Rasio</p>
                        <p>Input Komoditas</p>
                      </div>

                      <div className="divide-y divide-slate-200/80">
                        {history.map((item) => {
                          const statusStyle = STATUS_STYLES[item.hasil_prediksi];

                          return (
                            <div
                              key={`history-${item.id}`}
                              className="grid gap-4 px-5 py-5 md:grid-cols-[1.2fr_0.7fr_0.9fr_1.1fr] md:gap-6"
                            >
                              <div>
                                <p className="font-[family:var(--font-space-grotesk)] text-xl font-semibold text-slate-900">
                                  {formatMonthYear(item.bulan, item.tahun)}
                                </p>
                                <p className="mt-1 text-sm text-slate-400">
                                  Prediksi #{item.id} · Food #{item.food_data_id}
                                </p>
                              </div>

                              <div className="md:pt-1">
                                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 md:hidden">
                                  Status
                                </p>
                                <span
                                  className={`inline-flex rounded-full px-4 py-2 text-sm font-semibold ${statusStyle.soft} ${statusStyle.text}`}
                                >
                                  {item.hasil_prediksi}
                                </span>
                              </div>

                              <div className="text-slate-700 md:pt-1">
                                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 md:hidden">
                                  Rasio
                                </p>
                                <p>Beras: {formatDecimal(item.beras_ratio)}</p>
                                <p>Minyak: {formatDecimal(item.minyak_ratio)}</p>
                                <p>Telur: {formatDecimal(item.telur_ratio)}</p>
                              </div>

                              <div className="text-slate-700 md:pt-1">
                                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 md:hidden">
                                  Input Komoditas
                                </p>
                                <p>
                                  Beras {formatNumber(item.beras_tersedia)} / {formatNumber(item.beras_kebutuhan)}
                                </p>
                                <p>
                                  Minyak {formatNumber(item.minyak_tersedia)} / {formatNumber(item.minyak_kebutuhan)}
                                </p>
                                <p>
                                  Telur {formatNumber(item.telur_tersedia)} / {formatNumber(item.telur_kebutuhan)}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="px-4 py-5 text-sm text-slate-500">
                      Belum ada data prediksi per bulan yang bisa dijelaskan.
                    </div>
                  )}
                </div>
              </div>
            </article>

            <div className="grid gap-6">
              <article className="rounded-[10px] border border-slate-200/80 bg-white p-6 shadow-[0_20px_55px_rgba(15,23,42,0.08)]">
                <p className="text-sm font-medium text-slate-500">Pie chart distribusi</p>
                <h2 className="mt-1 font-[family:var(--font-space-grotesk)] text-2xl font-semibold text-slate-950">
                  Distribusi hasil deteksi
                </h2>

                <div className="mt-6 flex flex-col items-center gap-6">
                  <div
                    className="relative h-52 w-52 rounded-full"
                    style={{ backgroundImage: pieGradient }}
                  >
                    <div className="absolute inset-[22%] grid place-items-center rounded-full bg-white shadow-inner">
                      <div className="text-center">
                        <p className="font-[family:var(--font-space-grotesk)] text-4xl font-semibold text-slate-950">
                          {formatNumber(distribution.total_data)}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">Total data</p>
                      </div>
                    </div>
                  </div>

                  <div className="w-full space-y-3">
                    {distribution.items.map((item) => (
                      <div
                        key={item.label}
                        className="flex items-center justify-between rounded-[10px] bg-slate-50 px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`h-3 w-3 rounded-full ${STATUS_STYLES[item.label].tone}`}
                          />
                          <span className="font-medium text-slate-700">{item.label}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-[family:var(--font-space-grotesk)] text-lg font-semibold text-slate-950">
                            {formatNumber(item.value)}
                          </p>
                          <p className="text-sm text-slate-500">
                            {formatPercentage(item.percentage)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </article>

              <article className="rounded-[10px] border border-slate-200/80 bg-white p-6 shadow-[0_20px_55px_rgba(15,23,42,0.08)]">
                <p className="text-sm font-medium text-slate-500">Catatan terbaru</p>
                <h2 className="mt-1 font-[family:var(--font-space-grotesk)] text-2xl font-semibold text-slate-950">
                  Hasil deteksi terbaru
                </h2>

                {summary.latest_prediction ? (
                  <div className="mt-5 space-y-4">
                    <div className="flex items-center justify-between rounded-[10px] bg-slate-50 px-4 py-4">
                      <div>
                        <p className="text-sm text-slate-500">Periode data</p>
                        <p className="mt-1 font-semibold text-slate-900">
                          {formatMonthYear(
                            summary.latest_prediction.bulan,
                            summary.latest_prediction.tahun,
                          )}
                        </p>
                      </div>
                      {latestStatusStyle ? (
                        <span
                          className={`rounded-full px-3 py-2 text-sm font-semibold ${latestStatusStyle.soft} ${latestStatusStyle.text}`}
                        >
                          {summary.latest_prediction.hasil_prediksi}
                        </span>
                      ) : null}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-[10px] bg-slate-50 px-4 py-3">
                        <p className="text-sm text-slate-500">Rasio beras</p>
                        <p className="mt-2 font-[family:var(--font-space-grotesk)] text-2xl font-semibold text-slate-950">
                          {summary.latest_prediction.beras_ratio.toFixed(2)}
                        </p>
                      </div>
                      <div className="rounded-[10px] bg-slate-50 px-4 py-3">
                        <p className="text-sm text-slate-500">Rasio minyak</p>
                        <p className="mt-2 font-[family:var(--font-space-grotesk)] text-2xl font-semibold text-slate-950">
                          {summary.latest_prediction.minyak_ratio.toFixed(2)}
                        </p>
                      </div>
                      <div className="rounded-[10px] bg-slate-50 px-4 py-3">
                        <p className="text-sm text-slate-500">Rasio telur</p>
                        <p className="mt-2 font-[family:var(--font-space-grotesk)] text-2xl font-semibold text-slate-950">
                          {summary.latest_prediction.telur_ratio.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-[10px] border border-slate-200/80 px-4 py-4">
                      <p className="text-sm text-slate-500">Catatan input</p>
                      <p className="mt-2 text-sm leading-7 text-slate-600">
                        {summary.latest_prediction.catatan ?? "Tidak ada catatan tambahan."}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 rounded-[22px] border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                    Detail prediksi terbaru akan muncul setelah data pertama disimpan.
                  </div>
                )}
              </article>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
