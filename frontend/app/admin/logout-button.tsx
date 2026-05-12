"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { clearAdminSession } from "./admin-session";

const MODAL_EXIT_DURATION_MS = 220;
const LOGOUT_LOADING_DURATION_MS = 1200;
const TOAST_SHOW_DURATION_MS = 1400;

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"
    />
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="h-5 w-5 fill-current"
    >
      <path d="M16.7 5.3a.75.75 0 0 1 0 1.06l-7 7a.75.75 0 0 1-1.06 0l-3.34-3.34a.75.75 0 1 1 1.06-1.06l2.81 2.81 6.47-6.47a.75.75 0 0 1 1.06 0Z" />
    </svg>
  );
}

export function LogoutButton() {
  const router = useRouter();
  const frameRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const [isModalMounted, setIsModalMounted] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isToastMounted, setIsToastMounted] = useState(false);
  const [isToastVisible, setIsToastVisible] = useState(false);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isModalMounted || isLoggingOut) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsModalVisible(false);
        clearTimers();
        timeoutRef.current = window.setTimeout(() => {
          setIsModalMounted(false);
        }, MODAL_EXIT_DURATION_MS);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLoggingOut, isModalMounted]);

  function clearTimers() {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }

  function openModal() {
    clearTimers();
    setIsModalMounted(true);
    frameRef.current = window.requestAnimationFrame(() => {
      setIsModalVisible(true);
    });
  }

  function closeModal() {
    if (isLoggingOut) {
      return;
    }

    setIsModalVisible(false);
    clearTimers();
    timeoutRef.current = window.setTimeout(() => {
      setIsModalMounted(false);
    }, MODAL_EXIT_DURATION_MS);
  }

  function showToast() {
    setIsToastMounted(true);
    frameRef.current = window.requestAnimationFrame(() => {
      setIsToastVisible(true);
    });
  }

  async function handleLogoutConfirm() {
    setIsLoggingOut(true);
    clearTimers();

    await new Promise((resolve) => {
      timeoutRef.current = window.setTimeout(resolve, LOGOUT_LOADING_DURATION_MS);
    });

    setIsModalVisible(false);
    timeoutRef.current = window.setTimeout(() => {
      setIsModalMounted(false);
      showToast();
    }, MODAL_EXIT_DURATION_MS);

    timeoutRef.current = window.setTimeout(() => {
      clearAdminSession();
      router.replace("/admin/login?reason=logged-out");
      router.refresh();
    }, MODAL_EXIT_DURATION_MS + TOAST_SHOW_DURATION_MS);
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        disabled={isLoggingOut}
        className="inline-flex items-center justify-center rounded-[4px] border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition duration-200 hover:-translate-y-0.5 hover:bg-rose-100 hover:shadow-[0_12px_28px_rgba(244,63,94,0.12)] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isLoggingOut ? "Logging Out..." : "Logout"}
      </button>

      {isModalMounted ? (
        <div
          className={`fixed inset-0 z-[70] flex items-center justify-center px-4 transition duration-200 ${
            isModalVisible ? "pointer-events-auto" : "pointer-events-none"
          }`}
        >
          <button
            type="button"
            aria-label="Tutup konfirmasi logout"
            onClick={closeModal}
            className={`absolute inset-0 bg-slate-950/40 backdrop-blur-[3px] transition duration-200 ${
              isModalVisible ? "opacity-100" : "opacity-0"
            }`}
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-confirmation-title"
            className={`relative w-full max-w-md rounded-[22px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,249,253,0.96))] p-6 shadow-[0_30px_90px_rgba(15,23,42,0.20)] transition duration-200 sm:p-7 ${
              isModalVisible
                ? "translate-y-0 scale-100 opacity-100"
                : "translate-y-3 scale-[0.98] opacity-0"
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-rose-100 text-rose-700 shadow-inner">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  className="h-5 w-5 fill-current"
                >
                  <path d="M10 1.75a.75.75 0 0 1 .75.75v6.69l2.47-2.47a.75.75 0 1 1 1.06 1.06l-3.75 3.75a.75.75 0 0 1-1.06 0L5.72 7.78a.75.75 0 0 1 1.06-1.06l2.47 2.47V2.5A.75.75 0 0 1 10 1.75Zm-6.5 12a.75.75 0 0 1 .75.75v.75c0 .28.22.5.5.5h10.5a.5.5 0 0 0 .5-.5v-.75a.75.75 0 0 1 1.5 0v.75a2 2 0 0 1-2 2H4.75a2 2 0 0 1-2-2v-.75a.75.75 0 0 1 .75-.75Z" />
                </svg>
              </div>

              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-500">
                  Konfirmasi Logout
                </p>
                <h2
                  id="logout-confirmation-title"
                  className="mt-2 text-2xl font-semibold text-slate-950"
                >
                  Keluar dari dashboard admin?
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-500">
                  Sesi admin akan diakhiri di browser ini. Setelah logout, Anda perlu
                  login kembali untuk mengakses fitur admin dan workflow machine
                  learning.
                </p>
              </div>
            </div>

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeModal}
                disabled={isLoggingOut}
                className="inline-flex items-center justify-center rounded-[14px] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition duration-200 hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleLogoutConfirm}
                disabled={isLoggingOut}
                className="inline-flex min-w-36 items-center justify-center gap-2 rounded-[14px] bg-[linear-gradient(180deg,#fb7185,#e11d48)] px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(225,29,72,0.25)] transition duration-200 hover:-translate-y-0.5 hover:brightness-105 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-80"
              >
                {isLoggingOut ? (
                  <>
                    <Spinner />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <span>Ya, Logout</span>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isToastMounted ? (
        <div
          className={`fixed right-4 top-4 z-[80] w-[min(92vw,380px)] transition duration-300 sm:right-6 sm:top-6 ${
            isToastVisible
              ? "translate-y-0 opacity-100"
              : "-translate-y-3 opacity-0"
          }`}
        >
          <div className="overflow-hidden rounded-[20px] border border-emerald-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(240,253,244,0.96))] shadow-[0_22px_55px_rgba(16,185,129,0.16)]">
            <div className="flex items-start gap-4 px-5 py-4">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-emerald-500 text-white shadow-[0_10px_24px_rgba(16,185,129,0.24)]">
                <CheckIcon />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">Logout berhasil</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Sesi admin sedang ditutup dan Anda akan diarahkan ke halaman login.
                </p>
              </div>
            </div>
            <div className="h-1 w-full bg-emerald-100">
              <div className="h-full origin-left animate-[toast-progress_1.4s_linear_forwards] bg-emerald-500" />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
