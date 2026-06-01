const ADMIN_SESSION_EVENT = "admin-session-change";
const ADMIN_WELCOME_TOAST_EVENT = "admin-welcome-toast";

export type AdminProfile = {
  username: string;
  display_name?: string | null;
  role: string;
  photo_url?: string | null;
};

export function getAdminAccessToken() {
  return window.localStorage.getItem("admin_access_token");
}

export function getAdminProfile() {
  return window.localStorage.getItem("admin_profile");
}

export function parseAdminProfile(profile: string | null): AdminProfile | null {
  if (!profile) {
    return null;
  }

  try {
    return JSON.parse(profile) as AdminProfile;
  } catch {
    return null;
  }
}

export function getAdminSessionExpiresAt() {
  return window.localStorage.getItem("admin_expires_at");
}

export function isAdminSessionExpired() {
  const expiresAt = getAdminSessionExpiresAt();

  if (!expiresAt) {
    return true;
  }

  const expiresAtMs = new Date(expiresAt).getTime();

  if (Number.isNaN(expiresAtMs)) {
    return true;
  }

  return Date.now() >= expiresAtMs;
}

export function saveAdminSession(payload: {
  accessToken: string;
  profile: string;
  expiresAt: string;
}) {
  window.localStorage.setItem("admin_access_token", payload.accessToken);
  window.localStorage.setItem("admin_profile", payload.profile);
  window.localStorage.setItem("admin_expires_at", payload.expiresAt);
  window.dispatchEvent(new Event(ADMIN_SESSION_EVENT));
}

export function clearAdminSession() {
  window.localStorage.removeItem("admin_access_token");
  window.localStorage.removeItem("admin_profile");
  window.localStorage.removeItem("admin_expires_at");
  window.dispatchEvent(new Event(ADMIN_SESSION_EVENT));
}

export function updateAdminProfile(profile: AdminProfile) {
  window.localStorage.setItem("admin_profile", JSON.stringify(profile));
  window.dispatchEvent(new Event(ADMIN_SESSION_EVENT));
}

export function queueAdminWelcomeToast(message: string) {
  window.sessionStorage.setItem(ADMIN_WELCOME_TOAST_EVENT, message);
}

export function consumeAdminWelcomeToast() {
  const message = window.sessionStorage.getItem(ADMIN_WELCOME_TOAST_EVENT);

  if (!message) {
    return null;
  }

  window.sessionStorage.removeItem(ADMIN_WELCOME_TOAST_EVENT);
  return message;
}

export function subscribeAdminSession(callback: () => void) {
  const notify = () => callback();
  window.addEventListener("storage", notify);
  window.addEventListener(ADMIN_SESSION_EVENT, notify);

  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener(ADMIN_SESSION_EVENT, notify);
  };
}
