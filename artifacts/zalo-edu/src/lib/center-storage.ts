/**
 * Center storage utility — Spec v1.5
 *
 * center is a "sticky identity context":
 *   - persisted across sessions and logouts (localStorage)
 *   - TTL 7 days, reset on every successful write
 *   - backend-returned center always overwrites (source of truth)
 *   - never cleared on logout or when backend returns null
 *   - self-healing: if expired, backend restores on next auth
 */

const STORAGE_KEY = "edu_center";
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface StoredCenter {
  value: string;
  ts: number;
}

export function setCenter(center: string): void {
  try {
    const payload: StoredCenter = { value: center, ts: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // localStorage may be unavailable in some WebView contexts
  }
}

export function getCenter(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as StoredCenter;
    if (!parsed?.value || !parsed?.ts) return null;

    if (Date.now() - parsed.ts > TTL_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return parsed.value;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}
