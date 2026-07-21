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
import { buildApiUrl } from "../../lib/api-config";

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
      const response = await fetch(buildApiUrl("/admin/profile/display-name"), {
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

      const response = await fetch(buildApiUrl("/admin/profile/photo"), {
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
      const response = await fetch(buildApiUrl("/admin/auth/reset-password"), {
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
    <section className="space-y-6">
      <article className="rounded-sm bg-white p-6 shadow-[0_4px_20px_rgba(37,99,235,0.08)] ring-1 ring-slate-200/70">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
          <AdminProfileAvatar
            name={displayName}
            photoUrl={photoPreviewUrl}
            sizeClassName="h-20 w-20 text-xl"
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2563eb]">
              {profile.role}
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">{displayName}</h1>
            <p className="mt-1 text-sm text-slate-500">@{profile.username}</p>
          </div>
        </div>
      </article>

      <div className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-sm bg-white shadow-[0_4px_20px_rgba(37,99,235,0.08)] ring-1 ring-slate-200/70">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900">Nama Tampilan</h2>
            <p className="mt-1 text-sm text-slate-500">
              Ubah nama yang ditampilkan pada header dan komponen admin.
            </p>
          </div>

          <form className="space-y-4 p-6" onSubmit={handleDisplayNameSubmit}>
            <label className="block space-y-2 text-sm text-slate-600">
              <span>Nama Tampilan</span>
              <input
                type="text"
                value={displayNameForm}
                onChange={(event) => setDisplayNameForm(event.target.value)}
                placeholder="Contoh: Admin Ketahanan Pangan"
                className="w-full rounded-sm border border-slate-200 px-3 py-2.5 outline-none transition focus:border-[#2563eb]"
              />
            </label>

            {displayNameError ? (
              <div className="rounded-sm border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
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
              <div className="grid h-10 w-10 place-items-center rounded-sm bg-blue-50 text-[#2563eb]">
                <CameraIcon />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Foto Profil</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Unggah foto profil dalam format JPG, PNG, atau WEBP (max 2 MB).
                </p>
              </div>
            </div>
          </div>

          <form className="space-y-4 p-6" onSubmit={handlePhotoSubmit}>
            <label className="block space-y-2 text-sm text-slate-600">
              <span>Pilih foto baru</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoChange}
                className="w-full rounded-sm border border-slate-200 px-3 py-2 text-sm text-slate-600 file:mr-3 file:rounded-sm file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
              />
            </label>

            {photoError ? (
              <div className="rounded-sm border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
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
