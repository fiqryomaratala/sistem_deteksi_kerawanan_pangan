import Link from "next/link";
import { ReactNode } from "react";
import { AdminAuthGuard } from "./admin-auth-guard";
import { LogoutButton } from "./logout-button";

type AdminShellProps = {
  activeItem: "overview" | "ml";
  title: string;
  description: string;
  headerActions?: ReactNode;
  children: ReactNode;
};

function NavItem({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-[4px] px-4 py-3 text-sm font-medium transition ${
        active
          ? "bg-[#6777ef] text-white"
          : "text-slate-600 hover:bg-[#f8f9fc] hover:text-slate-900"
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${active ? "bg-white" : "bg-slate-300"}`} />
      {label}
    </Link>
  );
}

export function AdminShell({
  activeItem,
  title,
  description,
  headerActions,
  children,
}: AdminShellProps) {
  return (
    <main className="min-h-screen bg-[#f6f9fe] text-slate-900">
      <AdminAuthGuard />
      <div className="grid min-h-screen lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="border-r border-slate-200 bg-white lg:sticky lg:top-0 lg:h-screen lg:self-start lg:overflow-y-auto">
          <div className="border-b border-slate-200 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-[4px] bg-[#6777ef] text-sm font-bold text-white">
                SI
              </div>
              <div>
                <p className="text-base font-semibold text-slate-900">Stisla Admin</p>
                <p className="text-sm text-slate-500">Kerawanan Pangan</p>
              </div>
            </div>
          </div>

          <div className="px-4 py-5">
            <p className="px-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Dashboard
            </p>
            <nav className="mt-4 space-y-1">
              <NavItem href="/admin" label="Overview" active={activeItem === "overview"} />
              <NavItem href="/admin/ml" label="ML Prediction" active={activeItem === "ml"} />
              <div className="flex items-center gap-3 rounded-[4px] px-4 py-3 text-sm text-slate-600">
                <span className="h-2 w-2 rounded-full bg-slate-300" />
                Histori Prediksi
              </div>
              <div className="flex items-center gap-3 rounded-[4px] px-4 py-3 text-sm text-slate-600">
                <span className="h-2 w-2 rounded-full bg-slate-300" />
                Monitoring Bulanan
              </div>
              <div className="flex items-center gap-3 rounded-[4px] px-4 py-3 text-sm text-slate-600">
                <span className="h-2 w-2 rounded-full bg-slate-300" />
                Analisis Status
              </div>
            </nav>
          </div>

          <div className="px-6 py-5">
            <div className="rounded-[4px] bg-[#f8f9fc] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Catatan
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Sidebar admin dibuat tetap di tempat agar navigasi tetap mudah diakses
                saat konten utama discroll ke bawah.
              </p>
            </div>

            <div className="mt-4">
              <LogoutButton />
            </div>
          </div>
        </aside>

        <section className="min-w-0">
          <header className="border-b border-slate-200 bg-white px-5 py-4 sm:px-7">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="text-[28px] font-semibold tracking-tight text-slate-900">
                  {title}
                </h1>
                <p className="mt-1 text-sm text-slate-500">{description}</p>
              </div>

              {headerActions ? (
                <div className="flex flex-wrap items-center gap-3">{headerActions}</div>
              ) : null}
            </div>
          </header>

          <div className="p-5 sm:p-7">{children}</div>
        </section>
      </div>
    </main>
  );
}
