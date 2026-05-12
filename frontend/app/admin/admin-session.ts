const ADMIN_SESSION_EVENT = "admin-session-change";

export function getAdminAccessToken() {
  return window.localStorage.getItem("admin_access_token");
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

export function subscribeAdminSession(callback: () => void) {
  const notify = () => callback();
  window.addEventListener("storage", notify);
  window.addEventListener(ADMIN_SESSION_EVENT, notify);

  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener(ADMIN_SESSION_EVENT, notify);
  };
}
