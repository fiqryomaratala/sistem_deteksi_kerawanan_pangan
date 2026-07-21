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

// Icons for Sidebar Navigation
function HomeIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function MlIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  );
}

function HistoryIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 8v4l3 3" />
      <path d="M3.05 11a9 9 0 1 1 .5 4m-.5-4v-4m0 4h4" />
    </svg>
  );
}

function SettingsIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function NavItem({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: ReactNode;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-150 ${
        active
          ? "bg-[#2563eb] text-white shadow-sm"
          : "text-slate-600 hover:bg-[#f8f9fc] hover:text-slate-900"
      }`}
    >
      <span
        className={`shrink-0 transition-colors ${
          active ? "text-white" : "text-slate-400 group-hover:text-slate-600"
        }`}
      >
        {icon}
      </span>
      <span
        className={`transition-colors ${
          active ? "text-white font-semibold" : "text-slate-600 group-hover:text-slate-900"
        }`}
      >
        {label}
      </span>
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
              <NavItem
                href="/admin"
                label="Ringkasan"
                icon={<HomeIcon />}
                active={activeItem === "overview"}
              />
              <NavItem
                href="/admin/ml"
                label="Prediksi ML"
                icon={<MlIcon />}
                active={activeItem === "ml"}
              />
              <NavItem
                href="/admin/history"
                label="Riwayat Prediksi"
                icon={<HistoryIcon />}
                active={activeItem === "history"}
              />
              <NavItem
                href="/admin/settings"
                label="Pengaturan"
                icon={<SettingsIcon />}
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
