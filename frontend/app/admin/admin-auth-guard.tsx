"use client";

import { useEffect, useEffectEvent, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  clearAdminSession,
  getAdminAccessToken,
  getAdminSessionExpiresAt,
  isAdminSessionExpired,
  subscribeAdminSession,
} from "./admin-session";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  "http://127.0.0.1:8000";

type SessionState = {
  token: string | null;
  expiresAt: string | null;
};

const EMPTY_SESSION_SNAPSHOT = "";

function subscribeToHydration() {
  return () => {};
}

function getSessionSnapshot() {
  const token = getAdminAccessToken() ?? "";
  const expiresAt = getAdminSessionExpiresAt() ?? "";
  return `${token}::${expiresAt}`;
}

function parseSessionSnapshot(snapshot: string): SessionState {
  if (!snapshot) {
    return {
      token: null,
      expiresAt: null,
    };
  }

  const separatorIndex = snapshot.indexOf("::");
  if (separatorIndex === -1) {
    return {
      token: snapshot || null,
      expiresAt: null,
    };
  }

  const token = snapshot.slice(0, separatorIndex) || null;
  const expiresAt = snapshot.slice(separatorIndex + 2) || null;

  return {
    token,
    expiresAt,
  };
}

export function AdminAuthGuard() {
  const router = useRouter();
  const hasHydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
  const sessionSnapshot = useSyncExternalStore(
    subscribeAdminSession,
    getSessionSnapshot,
    () => EMPTY_SESSION_SNAPSHOT,
  );
  const session = parseSessionSnapshot(sessionSnapshot);
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const redirectToLogin = useEffectEvent((reason?: string) => {
    clearAdminSession();

    const params = new URLSearchParams();
    if (reason) {
      params.set("reason", reason);
    }

    const nextUrl = params.size > 0 ? `/admin/login?${params.toString()}` : "/admin/login";
    router.replace(nextUrl);
  });

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    let ignore = false;

    async function validateSession() {
      setError(null);

      if (!session.token) {
        redirectToLogin("missing-session");
        return;
      }

      if (session.expiresAt && isAdminSessionExpired()) {
        redirectToLogin("expired-session");
        return;
      }

      setIsChecking(true);

      try {
        const response = await fetch(`${API_BASE_URL}/admin/auth/me`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.token}`,
          },
          cache: "no-store",
        });

        if (ignore) {
          return;
        }

        if (response.status === 401 || response.status === 403) {
          redirectToLogin("invalid-session");
          return;
        }

        if (!response.ok) {
          setError("Sesi admin belum bisa divalidasi ke server. Coba muat ulang halaman.");
          return;
        }

        setIsChecking(false);
      } catch {
        if (!ignore) {
          setError("Tidak dapat memvalidasi sesi admin ke server.");
        }
      } finally {
        if (!ignore) {
          setIsChecking(false);
        }
      }
    }

    void validateSession();

    return () => {
      ignore = true;
    };
  }, [hasHydrated, session.expiresAt, session.token]);

  if (!hasHydrated || isChecking) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/12 px-4 backdrop-blur-sm">
        <div className="w-full max-w-sm rounded-xl border border-white/70 bg-white px-5 py-4 text-center shadow-[0_18px_50px_rgba(15,23,42,0.12)]">
          <p className="text-sm font-semibold text-slate-900">Memvalidasi sesi admin</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Mohon tunggu, sistem sedang memastikan akses admin masih aktif.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-6 rounded-sm border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        {error}
      </div>
    );
  }

  return null;
}
