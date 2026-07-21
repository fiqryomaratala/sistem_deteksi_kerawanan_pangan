"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { AdminProfileAvatar } from "../admin-profile-avatar";
import {
  getAdminAccessToken,
  getAdminProfile,
  parseAdminProfile,
  resolveAdminPhotoUrl,
  updateAdminProfile,
} from "../admin-session";

type SettingsPanelProps = {
  initialProfile: {
    username: string;
    display_name?: string | null;
    role: string;
    photo_url?: string | null;
  };
};

type ApiSuccessResponse = {
  message: string;
  admin: {
    username: string;
    display_name?: string | null;
    role: string;
    photo_url?: string | null;
  };
};

type ApiErrorResponse = {
  message?: string;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  "http://127.0.0.1:8000";

function CameraIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-current">
      <path d="M9.7 4.5a1 1 0 0 0-.8.4l-1.1 1.6H5A2.5 2.5 0 0 0 2.5 9v8A2.5 2.5 0 0 0 5 19.5h14A2.5 2.5 0 0 0 21.5 17V9A2.5 2.5 0 0 0 19 6.5h-2.8l-1.1-1.6a1 1 0 0 0-.8-.4H9.7Zm2.3 4a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Zm0 1.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-current">
      <path d="M12 1.75A5.25 5.25 0 0 0 6.75 7v2H6A2.25 2.25 0 0 0 3.75 11.25v8.5A2.25 2.25 0 0 0 6 22h12a2.25 2.25 0 0 0 2.25-2.25v-8.5A2.25 2.25 0 0 0 18 9h-.75V7A5.25 5.25 0 0 0 12 1.75Zm3.75 7.25h-7.5V7a3.75 3.75 0 1 1 7.5 0v2Z" />
    </svg>
  );
}

export function SettingsPanel({ initialProfile }: SettingsPanelProps) {
  const [profile, setProfile] = useState(() => {
    if (typeof window === "undefined") {
      return initialProfile;
    }

    const storedProfile = parseAdminProfile(getAdminProfile());
    if (!storedProfile) {
      return initialProfile;
    }

    return {
      username: storedProfile.username,
      display_name: storedProfile.display_name ?? null,
      role: storedProfile.role,
      photo_url: storedProfile.photo_url ?? null,
    };
  });
  const [displayNameForm, setDisplayNameForm] = useState(initialProfile.display_name || "");
  const [displayNameError, setDisplayNameError] = useState<string | null>(null);
  const [displayNameMessage, setDisplayNameMessage] = useState<string | null>(null);
  const [isUpdatingDisplayName, setIsUpdatingDisplayName] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoMessage, setPhotoMessage] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const photoPreviewUrl = useMemo(() => {
    if (selectedFile) {
      return URL.createObjectURL(selectedFile);
    }

    return resolveAdminPhotoUrl(profile.photo_url);
  }, [profile.photo_url, selectedFile]);

  useEffect(() => {
    if (!selectedFile || !photoPreviewUrl) {
      return;
    }

    return () => {
      URL.revokeObjectURL(photoPreviewUrl);
    };
  }, [photoPreviewUrl, selectedFile]);

  function syncProfile(nextProfile: SettingsPanelProps["initialProfile"]) {
    setProfile(nextProfile);
    updateAdminProfile({
      username: nextProfile.username,
      display_name: nextProfile.display_name ?? null,
      role: nextProfile.role,
      photo_url: nextProfile.photo_url ?? null,
    });
  }

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    setPhotoError(null);
    setPhotoMessage(null);

    if (!nextFile) {
      setSelectedFile(null);
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(nextFile.type)) {
      setSelectedFile(null);
      setPhotoError("Gunakan file JPG, PNG, atau WEBP.");
      return;
    }

    if (nextFile.size > 2 * 1024 * 1024) {
      setSelectedFile(null);
      setPhotoError("Ukuran foto maksimal 2 MB.");
      return;
    }

    setSelectedFile(nextFile);
  }

  async function handleDisplayNameSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDisplayNameError(null);
    setDisplayNameMessage(null);

    const trimmedName = displayNameForm.trim();
    if (!trimmedName) {
      setDisplayNameError("Nama tampilan tidak boleh kosong.");
      return;
    }

    const token = getAdminAccessToken();
    if (!token) {
      setDisplayNameError("Sesi admin tidak ditemukan. Silakan login ulang.");
      return;
    }

    setIsUpdatingDisplayName(true);

    try {
      const response = await fetch(`${API_BASE_URL}/admin/profile/display-name`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ display_name: trimmedName }),
      });

      const payload = (await response.json().catch(() => null)) as
        | ApiSuccessResponse
        | ApiErrorResponse
        | null;

      if (!response.ok) {
        setDisplayNameError(payload && "message" in payload ? payload.message ?? "Update nama gagal." : "Update nama gagal.");
        return;
      }

      const result = payload as ApiSuccessResponse;
      syncProfile(result.admin);
      setDisplayNameMessage(result.message);
    } catch {
      setDisplayNameError("Tidak dapat menghubungi server untuk update nama.");
    } finally {
      setIsUpdatingDisplayName(false);
    }
  }

  async function handlePhotoSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPhotoError(null);
    setPhotoMessage(null);

    if (!selectedFile) {
      setPhotoError("Pilih foto baru terlebih dahulu.");
      return;
    }

    const token = getAdminAccessToken();
    if (!token) {
      setPhotoError("Sesi admin tidak ditemukan. Silakan login ulang.");
      return;
    }

    setIsUploadingPhoto(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch(`${API_BASE_URL}/admin/profile/photo`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const payload = (await response.json().catch(() => null)) as
        | ApiSuccessResponse
        | ApiErrorResponse
        | null;

      if (!response.ok) {
        setPhotoError(payload && "message" in payload ? payload.message ?? "Unggah foto gagal." : "Unggah foto gagal.");
        return;
      }

      const result = payload as ApiSuccessResponse;
      syncProfile(result.admin);
      setSelectedFile(null);
      setPhotoMessage(result.message);
    } catch {
      setPhotoError("Tidak dapat mengunggah foto profil ke server.");
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError(null);
    setPasswordMessage(null);

    if (
      !passwordForm.currentPassword ||
      !passwordForm.newPassword ||
      !passwordForm.confirmPassword
    ) {
      setPasswordError("Semua field password wajib diisi.");
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError("Password baru minimal 8 karakter.");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("Konfirmasi password baru belum cocok.");
      return;
    }

    const token = getAdminAccessToken();
    if (!token) {
      setPasswordError("Sesi admin tidak ditemukan. Silakan login ulang.");
      return;
    }

    setIsChangingPassword(true);

    try {
      const response = await fetch(`${API_BASE_URL}/admin/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_password: passwordForm.currentPassword,
          new_password: passwordForm.newPassword,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | ApiSuccessResponse
        | ApiErrorResponse
        | null;

      if (!response.ok) {
        setPasswordError(
          payload && "message" in payload
            ? payload.message ?? "Reset password gagal."
            : "Reset password gagal.",
        );
        return;
      }

      const result = payload as ApiSuccessResponse;
      syncProfile(result.admin);
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setPasswordMessage(result.message);
    } catch {
      setPasswordError("Tidak dapat menghubungi server untuk atur ulang password.");
    } finally {
      setIsChangingPassword(false);
    }
  }
  const displayName = profile.display_name || profile.username;

  return (
    <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <article className="rounded-sm bg-white shadow-[0_4px_20px_rgba(37,99,235,0.08)] ring-1 ring-slate-200/70">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Profil Admin</h2>
          <p className="mt-1 text-sm text-slate-500">
            Foto profil dan identitas singkat akun yang sedang aktif.
          </p>
        </div>

        <div className="space-y-5 p-6">
          <div className="flex flex-col items-center rounded-sm bg-[#f8f9fc] px-5 py-6 text-center">
            <AdminProfileAvatar
              photoUrl={photoPreviewUrl}
              name={displayName}
              sizeClassName="h-28 w-28"
              className="ring-4 ring-white"
              iconClassName="h-10 w-10"
            />
            <p className="mt-4 text-lg font-semibold text-slate-900">{displayName}</p>
            <p className="text-sm lowercase text-slate-500">{profile.role}</p>
          </div>

          <div className="rounded-sm border border-dashed border-slate-200 px-4 py-4 text-sm leading-6 text-slate-500">
            Gunakan foto profil yang jelas agar akun admin mudah dikenali. Sistem saat
            ini menerima file JPG, PNG, atau WEBP dengan ukuran maksimal 2 MB.
          </div>
        </div>
      </article>

      <div className="grid gap-6">
        <article className="rounded-sm bg-white shadow-[0_4px_20px_rgba(37,99,235,0.08)] ring-1 ring-slate-200/70">
          <div className="border-b border-slate-200 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-sm bg-blue-100 text-blue-700">
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Ubah Nama Tampilan</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Atur nama yang ditampilkan di sidebar dashboard.
                </p>
              </div>
            </div>
          </div>

          <form className="space-y-4 p-6" onSubmit={handleDisplayNameSubmit}>
            <label className="block space-y-2 text-sm text-slate-600">
              <span>Nama tampilan</span>
              <input
                type="text"
                value={displayNameForm}
                onChange={(e) => setDisplayNameForm(e.target.value)}
                placeholder="Masukkan nama tampilan"
                className="w-full rounded-sm border border-slate-200 px-3 py-2.5 outline-none transition focus:border-[#2563eb]"
              />
            </label>

            <div className="rounded-sm border border-dashed border-slate-200 px-4 py-4 text-sm leading-6 text-slate-500">
              Nama tampilan akan muncul di sidebar dashboard menggantikan email. Username login tetap menggunakan email.
            </div>

            {displayNameError ? (
              <div className="rounded-sm border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700">
                {displayNameError}
              </div>
            ) : null}

            {displayNameMessage ? (
              <div className="rounded-sm border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {displayNameMessage}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isUpdatingDisplayName}
              className="inline-flex items-center justify-center rounded-sm bg-[#2563eb] px-4 py-2.5 text-[13px] font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isUpdatingDisplayName ? "Menyimpan..." : "Simpan Nama"}
            </button>
          </form>
        </article>

        <article className="rounded-sm bg-white shadow-[0_4px_20px_rgba(37,99,235,0.08)] ring-1 ring-slate-200/70">
          <div className="border-b border-slate-200 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-sm bg-sky-100 text-sky-700">
                <CameraIcon />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Unggah Foto Profil</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Perbarui foto admin yang tampil di halaman pengaturan.
                </p>
              </div>
            </div>
          </div>

          <form className="space-y-4 p-6" onSubmit={handlePhotoSubmit}>
            <label className="block space-y-2 text-sm text-slate-600">
              <span>Pilih foto</span>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={handlePhotoChange}
                className="block w-full rounded-sm border border-slate-200 px-3 py-2.5 text-[13px] text-slate-600 file:mr-4 file:rounded-sm file:border-0 file:bg-[#2563eb] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
              />
            </label>

            {photoError ? (
              <div className="rounded-sm border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700">
                {photoError}
              </div>
            ) : null}

            {photoMessage ? (
              <div className="rounded-sm border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {photoMessage}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isUploadingPhoto}
              className="inline-flex items-center justify-center rounded-sm bg-[#2563eb] px-4 py-2.5 text-[13px] font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isUploadingPhoto ? "Mengunggah..." : "Simpan Foto"}
            </button>
          </form>
        </article>

        <article className="rounded-sm bg-white shadow-[0_4px_20px_rgba(37,99,235,0.08)] ring-1 ring-slate-200/70">
          <div className="border-b border-slate-200 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-sm bg-amber-100 text-amber-700">
                <LockIcon />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Atur Ulang Password</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Ganti password admin secara langsung dari dashboard.
                </p>
              </div>
            </div>
          </div>

          <form className="grid gap-4 p-6 md:grid-cols-2" onSubmit={handlePasswordSubmit}>
            <label className="space-y-2 text-sm text-slate-600 md:col-span-2">
              <span>Password saat ini</span>
              <input
                type="password"
                autoComplete="current-password"
                value={passwordForm.currentPassword}
                onChange={(event) =>
                  setPasswordForm((current) => ({
                    ...current,
                    currentPassword: event.target.value,
                  }))
                }
                className="w-full rounded-sm border border-slate-200 px-3 py-2.5 outline-none transition focus:border-[#2563eb]"
              />
            </label>

            <label className="space-y-2 text-sm text-slate-600">
              <span>Password baru</span>
              <input
                type="password"
                autoComplete="new-password"
                value={passwordForm.newPassword}
                onChange={(event) =>
                  setPasswordForm((current) => ({
                    ...current,
                    newPassword: event.target.value,
                  }))
                }
                className="w-full rounded-sm border border-slate-200 px-3 py-2.5 outline-none transition focus:border-[#2563eb]"
              />
            </label>

            <label className="space-y-2 text-sm text-slate-600">
              <span>Konfirmasi password baru</span>
              <input
                type="password"
                autoComplete="new-password"
                value={passwordForm.confirmPassword}
                onChange={(event) =>
                  setPasswordForm((current) => ({
                    ...current,
                    confirmPassword: event.target.value,
                  }))
                }
                className="w-full rounded-sm border border-slate-200 px-3 py-2.5 outline-none transition focus:border-[#2563eb]"
              />
            </label>

            <div className="md:col-span-2 rounded-sm border border-dashed border-slate-200 px-4 py-4 text-sm leading-6 text-slate-500">
              Password baru minimal 8 karakter dan sebaiknya berbeda jelas dari
              password sebelumnya.
            </div>

            {passwordError ? (
              <div className="md:col-span-2 rounded-sm border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {passwordError}
              </div>
            ) : null}

            {passwordMessage ? (
              <div className="md:col-span-2 rounded-sm border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {passwordMessage}
              </div>
            ) : null}

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={isChangingPassword}
                className="inline-flex items-center justify-center rounded-sm bg-slate-900 px-4 py-2.5 text-[13px] font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isChangingPassword ? "Memperbarui..." : "Perbarui Password"}
              </button>
            </div>
          </form>
        </article>
      </div>
    </section>
  );
}
