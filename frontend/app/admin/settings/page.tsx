import { AdminShell } from "../admin-shell";
import { SettingsPanel } from "./settings-panel";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const profile = {
    username: "admin",
    role: "admin",
    photo_url: null,
  };

  return (
    <AdminShell
      activeItem="settings"
      title="Pengaturan Admin"
      description="Kelola foto profil dan keamanan akun admin dari satu tempat."
      headerActions={
        <div className="rounded-sm border border-slate-200 bg-[#f8f9fc] px-4 py-3 text-sm text-slate-600">
          Fokus pengaturan: <span className="font-semibold text-slate-900">profil dan keamanan akun</span>
        </div>
      }
    >
      <SettingsPanel initialProfile={profile} />
    </AdminShell>
  );
}
