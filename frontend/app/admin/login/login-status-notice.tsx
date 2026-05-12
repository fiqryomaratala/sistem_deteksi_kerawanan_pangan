"use client";

const REASON_MESSAGE: Record<string, string> = {
  "logged-out": "Anda sudah logout dari dashboard admin.",
  "missing-session": "Sesi admin tidak ditemukan. Silakan login kembali.",
  "expired-session": "Sesi admin telah berakhir. Silakan login kembali.",
  "invalid-session": "Sesi admin tidak valid lagi. Silakan login ulang.",
};

export function LoginStatusNotice({ reason }: { reason?: string }) {
  if (!reason) {
    return null;
  }

  const message =
    REASON_MESSAGE[reason] ?? "Sesi admin perlu diperbarui. Silakan login kembali.";

  return (
    <div className="mb-6 rounded-[16px] border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
      {message}
    </div>
  );
}
