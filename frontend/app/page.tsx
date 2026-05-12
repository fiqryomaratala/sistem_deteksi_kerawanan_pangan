export const dynamic = "force-dynamic";

type PredictionLabel = "Aman" | "Waspada" | "Rawan";

type PredictionHistoryItem = {
  id: number;
  bulan: number | null;
  tahun: number | null;
  catatan: string | null;
  hasil_prediksi: PredictionLabel;
  created_at: string;
  beras_ratio: number;
  minyak_ratio: number;
  telur_ratio: number;
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
    const [summary, distribution, trend] = await Promise.all([
      getJson<DashboardSummaryResponse>("/dashboard/summary"),
      getJson<DashboardDistributionResponse>("/dashboard/distribution"),
      getJson<DashboardMonthlyTrendResponse>("/dashboard/trend/monthly"),
    ]);

    return {
      summary,
      distribution,
      trend,
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

function getDominantStatus(item: MonthlyTrendItem): PredictionLabel | null {
  if (item.total === 0) {
    return null;
  }

  const entries: Array<[PredictionLabel, number]> = [
    ["Aman", item.aman],
    ["Waspada", item.waspada],
    ["Rawan", item.rawan],
  ];

  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

function describeMonth(item: MonthlyTrendItem) {
  if (item.total === 0) {
    return "Belum ada data deteksi pada bulan ini.";
  }

  const dominantStatus = getDominantStatus(item);
  const dominantCount =
    dominantStatus === "Aman"
      ? item.aman
      : dominantStatus === "Waspada"
        ? item.waspada
        : item.rawan;

  return `Mayoritas ${dominantStatus?.toLowerCase()} dengan ${dominantCount} dari ${item.total} deteksi. Aman ${item.aman}, Waspada ${item.waspada}, Rawan ${item.rawan}.`;
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

function StatCard({
  title,
  value,
  helper,
  accent,
}: {
  title: string;
  value: string;
  helper: string;
  accent: string;
}) {
  return (
    <article className="rounded-[10px] border border-white/70 bg-white/90 p-5 shadow-[0_20px_45px_rgba(18,38,63,0.08)] backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <span className={`h-3 w-3 rounded-full ${accent}`} />
      </div>
      <p className="font-[family:var(--font-space-grotesk)] text-3xl font-semibold text-slate-950">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{helper}</p>
    </article>
  );
}

export default async function Home() {
  const { summary, distribution, trend, error } = await getDashboardData();
  const maxTotal = Math.max(...trend.items.map((item) => item.total), 1);
  const highlightedMonths = trend.items.filter((item) => item.total > 0);
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
              accent="bg-blue-600"
            />
            <StatCard
              title="Deteksi aman"
              value={formatNumber(summary.counts.aman)}
              helper="Data dengan kondisi pasokan relatif aman."
              accent="bg-emerald-500"
            />
            <StatCard
              title="Deteksi waspada"
              value={formatNumber(summary.counts.waspada)}
              helper="Data yang perlu perhatian sebelum masuk fase rawan."
              accent="bg-amber-400"
            />
            <StatCard
              title="Deteksi rawan"
              value={formatNumber(summary.counts.rawan)}
              helper="Data yang menunjukkan indikasi kerawanan tertinggi."
              accent="bg-rose-500"
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
                    {highlightedMonths.length} bulan memiliki data
                  </p>
                </div>

                <div className="mt-4 grid gap-3">
                  {highlightedMonths.length > 0 ? (
                    highlightedMonths.map((item) => {
                      const dominantStatus = getDominantStatus(item);
                      const statusStyle = dominantStatus
                        ? STATUS_STYLES[dominantStatus]
                        : null;

                      return (
                        <div
                          key={`detail-${item.bulan}`}
                          className="flex flex-col gap-3 rounded-[10px] border border-slate-200/80 bg-slate-50/80 p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <p className="font-[family:var(--font-space-grotesk)] text-lg font-semibold text-slate-900">
                              {MONTH_LABELS[item.bulan - 1]}
                            </p>
                            <p className="mt-1 text-sm leading-6 text-slate-500">
                              {describeMonth(item)}
                            </p>
                          </div>
                          {statusStyle ? (
                            <span
                              className={`inline-flex w-fit rounded-full px-3 py-2 text-sm font-semibold ${statusStyle.soft} ${statusStyle.text}`}
                            >
                              Dominan {dominantStatus}
                            </span>
                          ) : null}
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-[22px] border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">
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
