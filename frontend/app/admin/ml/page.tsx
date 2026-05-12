import { AdminMlPanel } from "../admin-ml-panel";
import { AdminShell } from "../admin-shell";

export const dynamic = "force-dynamic";

export default function AdminMlPage() {
  return (
    <AdminShell
      activeItem="ml"
      title="ML Prediction"
      description="Jalankan prediksi manual dan impor dataset bulanan langsung dari panel admin."
      headerActions={
        <div className="rounded-[4px] border border-slate-200 bg-[#f8f9fc] px-4 py-3 text-sm text-slate-600">
          Mode kerja: <span className="font-semibold text-slate-900">Manual dan CSV Import</span>
        </div>
      }
    >
      <div className="rounded-sm border border-blue-100 bg-blue-50 px-4 py-4 text-sm leading-6 text-blue-900">
        Halaman ini memusatkan workflow machine learning admin agar proses prediksi
        bulanan dan update dataset tidak bercampur dengan ringkasan monitoring.
      </div>
      <AdminMlPanel />
    </AdminShell>
  );
}
