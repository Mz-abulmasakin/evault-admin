const TOKEN_KEY = "evault_admin_token";

export function saveAdminToken(token) {
  if (typeof window === "undefined") return;

  localStorage.setItem(TOKEN_KEY, token);
}

export function getAdminToken() {
  if (typeof window === "undefined") return null;

  return localStorage.getItem(TOKEN_KEY);
}

export function removeAdminToken() {
  if (typeof window === "undefined") return;

  localStorage.removeItem(TOKEN_KEY);
}

export function isAdminAuthenticated() {
  return Boolean(getAdminToken());
}