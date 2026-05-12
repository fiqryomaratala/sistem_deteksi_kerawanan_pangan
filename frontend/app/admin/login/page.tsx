import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";
import { LoginStatusNotice } from "./login-status-notice";

export const metadata: Metadata = {
  title: "Login Admin | Dashboard Deteksi Kerawanan Pangan",
  description: "Halaman login admin untuk mengakses dashboard monitoring internal.",
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(76,135,255,0.16),transparent_28%),linear-gradient(180deg,#f4f7ff_0%,#eef3ff_48%,#edf2fb_100%)] px-4 py-6 text-slate-900 sm:px-6 sm:py-8">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center justify-center overflow-hidden rounded-[32px] border border-white/70 bg-[linear-gradient(180deg,rgba(245,248,255,0.96),rgba(236,242,252,0.94))] shadow-[0_32px_90px_rgba(37,99,235,0.12)] ring-1 ring-slate-200/60 sm:min-h-[calc(100vh-4rem)]">
        <div className="relative flex w-full flex-col items-center px-6 py-10 sm:px-10">
          <div className="absolute left-10 top-8 hidden text-sm font-medium text-slate-500 sm:block">
            Panel Admin
          </div>
          <Link
            href="/"
            className="absolute right-6 top-6 rounded-full border border-white/80 bg-white/80 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm backdrop-blur transition hover:border-slate-200 hover:text-slate-900"
          >
            Kembali
          </Link>

          <div className="mb-10 mt-4 flex h-14 w-14 items-center justify-center rounded-full bg-[radial-gradient(circle_at_30%_30%,#5ea4ff,#2563eb_70%)] shadow-[0_18px_38px_rgba(37,99,235,0.24)]">
            <svg
              aria-hidden="true"
              viewBox="0 0 40 20"
              className="h-5 w-8"
            >
              <defs>
                <linearGradient id="mark-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#dbeafe" />
                  <stop offset="100%" stopColor="#ffffff" />
                </linearGradient>
              </defs>
              <path
                d="M10 2c4.418 0 8 3.582 8 8s-3.582 8-8 8S2 14.418 2 10s3.582-8 8-8Zm20 0c4.418 0 8 3.582 8 8s-3.582 8-8 8-8-3.582-8-8 3.582-8 8-8Z"
                fill="url(#mark-gradient)"
                opacity="0.98"
              />
            </svg>
          </div>

          <div className="w-full max-w-md rounded-[24px] border border-white/80 bg-white/92 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8">
            <LoginStatusNotice reason={params.reason} />

            <div className="text-center">
              <h1 className="font-[family:var(--font-space-grotesk)] text-3xl font-semibold text-slate-900">
                Welcome Back
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Masukkan kredensial admin untuk mengakses dashboard internal.
              </p>
            </div>

            <div className="mt-8">
              <LoginForm />
            </div>
          </div>

          <p className="mt-8 text-center text-sm text-slate-400">
            Login ini hanya untuk admin sistem monitoring kerawanan pangan.
          </p>
        </div>
      </section>
    </main>
  );
}
