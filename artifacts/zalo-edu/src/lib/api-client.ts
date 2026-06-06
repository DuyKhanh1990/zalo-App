const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";
// eslint-disable-next-line no-console
console.log("[api-client] API_BASE_URL =", API_BASE || "(empty — will use relative paths)");
const TOKEN_KEY = "crm_auth_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Fired when any authenticated API call returns 401.
 * useAuthState listens for this to trigger an automatic logout.
 */
export function dispatchUnauthorized(): void {
  clearToken();
  window.dispatchEvent(new CustomEvent("auth:unauthorized"));
}

function buildHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...extra,
  };
  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: buildHeaders(),
    cache: "no-store",
  });
  if (res.status === 401) {
    dispatchUnauthorized();
    throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as Record<string, unknown>;
    const msg = typeof err["error"] === "string" ? err["error"] : `Lỗi ${res.status}: ${res.statusText}`;
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

/**
 * Upload a File object to a multipart endpoint.
 * Returns the JSON response from the server.
 */
export async function apiUploadFile<T>(path: string, file: File): Promise<T> {
  const hadToken = !!getToken();
  const formData = new FormData();
  formData.append("file", file, file.name);

  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: formData,
    cache: "no-store",
  });
  if (res.status === 401 && hadToken) {
    dispatchUnauthorized();
    throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    const raw = (err as Record<string, unknown>).error ?? (err as Record<string, unknown>).message;
    throw new Error(typeof raw === "string" ? raw : `Lỗi ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body?: object): Promise<T> {
  const hadToken = !!getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: buildHeaders(),
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (res.status === 401 && hadToken) {
    // 401 on an authenticated call means the session is invalid — logout
    dispatchUnauthorized();
    throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    const raw = (err as Record<string, unknown>).error ?? (err as Record<string, unknown>).message;
    const msg = typeof raw === "string" ? raw : `Lỗi ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}
