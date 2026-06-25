"use client";

import Link from "next/link";
import { ReactNode, useSyncExternalStore } from "react";
import { AdminAuthGuard } from "./admin-auth-guard";
import { AdminProfileAvatar } from "./admin-profile-avatar";
import { AdminWelcomeToast } from "./admin-welcome-toast";
import { LogoutButton } from "./logout-button";
import { getAdminProfile, parseAdminProfile, subscribeAdminSession } from "./admin-session";

type AdminShellProps = {
  activeItem: "overview" | "ml" | "history" | "settings";
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
      className={`flex items-center gap-3 rounded-sm px-4 py-3 text-sm font-medium transition ${
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
  const profileData = useSyncExternalStore(
    subscribeAdminSession,
    getAdminProfile,
    () => null,
  );
  const profile = parseAdminProfile(profileData);
  const displayName = profile?.display_name || profile?.username || "Admin";
  const roleLabel = profile?.role || "admin";

  return (
    <main className="min-h-screen bg-[#f6f9fe] text-slate-900">
      <AdminAuthGuard />
      <AdminWelcomeToast />
      <div className="grid min-h-screen lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="border-r border-slate-200 bg-white lg:sticky lg:top-0 lg:h-screen lg:self-start lg:overflow-y-auto lg:flex lg:flex-col">
          <div className="border-b border-slate-200 px-6 py-5">
            <div className="flex items-center gap-3">
              <AdminProfileAvatar
                photoUrl={profile?.photo_url}
                name={displayName}
                sizeClassName="h-10 w-10"
                className="shrink-0"
                iconClassName="h-5 w-5"
              />
              <div>
                <p className="text-base font-semibold text-slate-900">{displayName}</p>
                <p className="text-sm lowercase text-slate-500">{roleLabel}</p>
              </div>
            </div>
          </div>

          <div className="px-4 py-5">
            <p className="px-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Dashboard
            </p>
            <nav className="mt-4 space-y-1">
              <NavItem href="/admin" label="Ringkasan" active={activeItem === "overview"} />
              <NavItem href="/admin/ml" label="Prediksi ML" active={activeItem === "ml"} />
              <NavItem
                href="/admin/history"
                label="Riwayat Prediksi"
                active={activeItem === "history"}
              />
              <NavItem
                href="/admin/settings"
                label="Pengaturan"
                active={activeItem === "settings"}
              />
            </nav>
          </div>

          <div className="mt-auto px-6 py-5">
            <LogoutButton />
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
