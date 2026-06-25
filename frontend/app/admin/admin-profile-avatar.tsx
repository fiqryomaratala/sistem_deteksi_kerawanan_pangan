"use client";

import { resolveAdminPhotoUrl } from "./admin-session";

type AdminProfileAvatarProps = {
  photoUrl?: string | null;
  name: string;
  sizeClassName?: string;
  className?: string;
  iconClassName?: string;
};

function UserPlaceholderIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className ?? "h-5 w-5"}
      fill="currentColor"
    >
      <path d="M12 2.75A4.75 4.75 0 1 0 12 12.25a4.75 4.75 0 0 0 0-9.5ZM5.5 19A4.5 4.5 0 0 1 10 14.5h4A4.5 4.5 0 0 1 18.5 19v.25a.75.75 0 0 1-1.5 0V19A3 3 0 0 0 14 16h-4a3 3 0 0 0-3 3v.25a.75.75 0 0 1-1.5 0V19Z" />
    </svg>
  );
}

export function AdminProfileAvatar({
  photoUrl,
  name,
  sizeClassName = "h-10 w-10",
  className = "",
  iconClassName = "h-5 w-5",
}: AdminProfileAvatarProps) {
  const resolvedPhotoUrl = resolveAdminPhotoUrl(photoUrl);
  const baseClassName = `overflow-hidden rounded-full ${sizeClassName} ${className}`.trim();

  if (resolvedPhotoUrl) {
    return (
      // We intentionally use a native img here to support backend-relative URLs
      // and temporary blob preview URLs from the settings upload flow.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={resolvedPhotoUrl}
        alt={`Foto profil ${name}`}
        className={`${baseClassName} object-cover`}
      />
    );
  }

  return (
    <div
      aria-label={`Avatar placeholder ${name}`}
      className={`${baseClassName} grid place-items-center bg-slate-100 text-slate-400 ring-1 ring-slate-200`}
    >
      <UserPlaceholderIcon className={iconClassName} />
    </div>
  );
}
