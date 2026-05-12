"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { queueAdminWelcomeToast, saveAdminSession } from "../admin-session";

type FormState = {
  username: string;
  password: string;
};

type LoginResponse = {
  access_token: string;
  token_type: string;
  expires_at: string;
  admin: {
    username: string;
    role: string;
  };
};

type LoginErrorResponse = {
  message?: string;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  "http://127.0.0.1:8000";

function MailIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="h-4 w-4 fill-current"
    >
      <path d="M2.75 4.5A1.75 1.75 0 0 1 4.5 2.75h11A1.75 1.75 0 0 1 17.25 4.5v11a1.75 1.75 0 0 1-1.75 1.75h-11A1.75 1.75 0 0 1 2.75 15.5v-11Zm1.5.32v.12l5.75 4.19 5.75-4.19v-.12a.25.25 0 0 0-.25-.25h-11a.25.25 0 0 0-.25.25Zm11.5 1.98-5.31 3.87a.75.75 0 0 1-.88 0L4.25 6.8v8.7c0 .14.11.25.25.25h11a.25.25 0 0 0 .25-.25V6.8Z" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="h-4 w-4 fill-current"
    >
      <path d="M10 1.75A4.25 4.25 0 0 0 5.75 6v1.25H5A2.25 2.25 0 0 0 2.75 9.5v6A2.25 2.25 0 0 0 5 17.75h10A2.25 2.25 0 0 0 17.25 15.5v-6A2.25 2.25 0 0 0 15 7.25h-.75V6A4.25 4.25 0 0 0 10 1.75Zm2.75 5.5h-5.5V6a2.75 2.75 0 1 1 5.5 0v1.25Z" />
    </svg>
  );
}

function EyeOpenIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="h-4 w-4 fill-current"
    >
      <path d="M10 4.25c4.84 0 8.58 4.18 9.48 5.3a.75.75 0 0 1 0 .9c-.9 1.12-4.64 5.3-9.48 5.3S1.42 11.57.52 10.45a.75.75 0 0 1 0-.9c.9-1.12 4.64-5.3 9.48-5.3Zm0 1.5c-3.72 0-6.87 3.02-7.9 4.25 1.03 1.23 4.18 4.25 7.9 4.25s6.87-3.02 7.9-4.25c-1.03-1.23-4.18-4.25-7.9-4.25Zm0 1.75A2.5 2.5 0 1 1 7.5 10 2.5 2.5 0 0 1 10 7.5Zm0 1.5A1 1 0 1 0 11 10a1 1 0 0 0-1-1Z" />
    </svg>
  );
}

function EyeClosedIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="h-4 w-4 fill-current"
    >
      <path d="M3.28 2.22a.75.75 0 1 0-1.06 1.06l1.69 1.69C2.03 6.33.96 7.87.52 8.42a.75.75 0 0 0 0 .9c.9 1.12 4.64 5.3 9.48 5.3 1.72 0 3.3-.52 4.72-1.3l2 2a.75.75 0 1 0 1.06-1.06L3.28 2.22Zm8.96 8.96a2.5 2.5 0 0 1-3.42-3.42l3.42 3.42Zm-4.53-5.6A8.99 8.99 0 0 1 10 5.38c4.84 0 8.58 4.18 9.48 5.3a.75.75 0 0 1 0 .9 15.16 15.16 0 0 1-3.14 2.99l-1.09-1.09a12.34 12.34 0 0 0 2.65-2.35c-1.03-1.23-4.18-4.25-7.9-4.25-.92 0-1.8.18-2.62.5L7.7 5.58Z" />
    </svg>
  );
}

export function LoginForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({ username: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const username = form.username.trim();
    const password = form.password;

    if (!username || !password) {
      setError("Username dan password wajib diisi.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/admin/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const payload = (await response.json().catch(() => null)) as
        | LoginResponse
        | LoginErrorResponse
        | null;

      if (!response.ok) {
        const errorMessage =
          payload && "message" in payload
            ? payload.message
            : "Login admin gagal. Silakan cek kembali akun.";
        setError(errorMessage ?? "Login admin gagal. Silakan cek kembali akun.");
        return;
      }

      const result = payload as LoginResponse;
      saveAdminSession({
        accessToken: result.access_token,
        profile: JSON.stringify(result.admin),
        expiresAt: result.expires_at,
      });
      queueAdminWelcomeToast(
        `${result.admin.username} berhasil masuk ke dashboard admin.`,
      );

      router.push("/admin");
      router.refresh();
    } catch {
      setError("Tidak dapat terhubung ke server login admin.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="space-y-4">
        <div className="group flex items-center gap-3 rounded-[14px] border border-slate-200 bg-white px-4 py-3 text-slate-400 transition focus-within:border-blue-400 focus-within:text-blue-500 focus-within:shadow-[0_0_0_4px_rgba(59,130,246,0.10)]">
          <MailIcon />
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            placeholder="Enter your username"
            value={form.username}
            onChange={(event) =>
              setForm((current) => ({ ...current, username: event.target.value }))
            }
            className="w-full border-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
          />
        </div>

        <div className="group flex items-center gap-3 rounded-[14px] border border-slate-200 bg-white px-4 py-3 text-slate-400 transition focus-within:border-blue-400 focus-within:text-blue-500 focus-within:shadow-[0_0_0_4px_rgba(59,130,246,0.10)]">
          <LockIcon />
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Enter your password"
            value={form.password}
            onChange={(event) =>
              setForm((current) => ({ ...current, password: event.target.value }))
            }
            className="w-full border-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
            aria-pressed={showPassword}
            className="shrink-0 text-slate-400 transition hover:text-slate-700"
          >
            {showPassword ? <EyeClosedIcon /> : <EyeOpenIcon />}
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-[14px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex w-full items-center justify-center rounded-[14px] bg-[linear-gradient(180deg,#3b82f6,#2563eb)] px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(37,99,235,0.22)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? "Signing In..." : "Sign In"}
      </button>
    </form>
  );
}
