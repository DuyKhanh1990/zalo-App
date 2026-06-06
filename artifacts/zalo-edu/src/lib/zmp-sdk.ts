/**
 * ZMP SDK utilities
 * Wraps zmp-sdk with safe detection and fallbacks.
 *
 * Auth flow inside Zalo Mini App:
 *   1. getZaloAccessToken() → access_token string (từ ZMP.getAccessToken())
 *   2. POST /api/mobile/auth/zalo { accessToken, center? }
 *   3. Mini App server relay → CRM /api/internal/zalo-auth → ký JWT
 *   4. POST-AUTH: sync center từ backend response → localStorage
 *   5. Store JWT → authenticated
 *
 * Chỉ dùng getAccessToken() từ zmp-sdk (modern SDK).
 * Legacy getAuthCode() / auth code exchange đã loại bỏ theo thống nhất với team CRM.
 */

// ─── Pre-cached openOutApp ────────────────────────────────────────────────────
// Load zmp-sdk eagerly so _cachedOpenOutApp is ready before any user gesture.
// Click handlers must call openUrlSync() (synchronous, no await) to keep the
// user activation alive — any await between the click and the openOutApp call
// causes Zalo WebView to silently drop the navigation.

let _cachedOpenOutApp: ((opts: { url: string }) => Promise<void>) | null = null;

if (typeof window !== "undefined") {
  import("zmp-sdk")
    .then((sdk) => { _cachedOpenOutApp = sdk.openOutApp; })
    .catch(() => {/* not inside ZMP */});
}

/**
 * Open a URL synchronously from a user gesture (click handler).
 * Uses the pre-cached openOutApp so there is NO await between the click
 * and the actual SDK call — this preserves the user activation state.
 * Falls back to window.open for non-ZMP environments.
 */
export function openUrlSync(url: string): void {
  if (!url) return;
  if (_cachedOpenOutApp) {
    _cachedOpenOutApp({ url }).catch(() => {
      window.open(url, "_blank", "noopener,noreferrer");
    });
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

/** Returns true when running inside Zalo Mini App WebView */
export function isInsideZMP(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as Record<string, unknown>;
  return (
    !!w.__ZMP_RUNNING__ ||
    !!w.zmp ||
    navigator.userAgent.includes("MiniApp") ||
    navigator.userAgent.includes("ZaloApp")
  );
}

/**
 * Get Zalo access token using the official zmp-sdk getAccessToken().
 * Returns null if not inside ZMP or SDK call fails — caller should
 * fall through to manual login in that case.
 */
export async function getZaloAccessToken(): Promise<string | null> {
  try {
    const { getAccessToken } = await import("zmp-sdk");
    const token = await getAccessToken();
    return token ?? null;
  } catch {
    return null;
  }
}

/**
 * Open an exam URL.
 * Inside Zalo → openOutApp (system browser, no domain whitelist needed).
 * Outside Zalo → window.open.
 */
export async function openExamWebview(examId: string, classId?: string, _title?: string): Promise<void> {
  let url: string;
  if (examId.startsWith("http")) {
    url = examId;
  } else {
    const base = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";
    url = `${base}/my-space/exam/${examId}`;
    if (classId) url += `?classId=${classId}`;
  }

  if (!isInsideZMP()) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }

  try {
    const { openOutApp } = await import("zmp-sdk");
    await openOutApp({ url });
    return;
  } catch {
    // SDK unavailable
  }

  window.open(url, "_blank", "noopener,noreferrer");
}

/**
 * Open a URL safely inside Zalo Mini App.
 *
 * Strategy: openOutApp → window.open
 *
 * NOTE: openDocument is intentionally NOT used here. In practice it resolves
 * without throwing even when it fails to open anything (silent no-op), so
 * there is no reliable way to detect failure and fall through to openOutApp.
 * openOutApp opens the system browser which handles PDF/Office/images natively
 * and works for ALL domains without whitelisting.
 *
 * openWebview is also NOT used — it requires domain whitelisting in the Zalo
 * Developer Console and silently fails for unlisted domains.
 */
export async function openUrl(url: string, _title?: string): Promise<void> {
  if (!url) return;

  if (!isInsideZMP()) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }

  // openOutApp — opens in the system browser, works for all domains and file types
  try {
    const { openOutApp } = await import("zmp-sdk");
    await openOutApp({ url });
    return;
  } catch {
    // SDK unavailable — fall back to window.open
  }

  window.open(url, "_blank", "noopener,noreferrer");
}

/**
 * Pick media files via ZMP SDK openMediaPicker (inside Zalo).
 * Returns array of file URLs (either local temp paths or server URLs if serverUploadUrl provided).
 * Returns null if not inside ZMP or SDK fails — caller should use regular <input type="file">.
 */
export async function pickMediaFiles(opts: {
  type: "photo" | "file" | "zcamera_photo" | "zcamera_video" | "zcamera_scan" | "zcamera" | "video";
  maxSelectItem?: number;
  serverUploadUrl?: string;
}): Promise<string[] | null> {
  if (!isInsideZMP()) return null;

  try {
    const { openMediaPicker } = await import("zmp-sdk");
    const result = await openMediaPicker({
      type: opts.type,
      maxSelectItem: opts.maxSelectItem ?? 5,
      maxItemSize: 10 * 1024 * 1024,
      compressLevel: 0,
      ...(opts.serverUploadUrl ? { serverUploadUrl: opts.serverUploadUrl } : {}),
    });
    const rawData = result?.data;
    if (!rawData) return [];

    // data can be string | string[] — normalize to string[]
    const dataStrings: string[] = Array.isArray(rawData) ? rawData : [rawData];

    const allUrls: string[] = [];
    for (const dataStr of dataStrings) {
      try {
        const parsed = JSON.parse(dataStr) as unknown;
        if (Array.isArray(parsed)) {
          for (const f of parsed as { url?: string; path?: string; fileUrl?: string }[]) {
            const u = f.url ?? f.fileUrl ?? f.path ?? "";
            if (u) allUrls.push(u);
          }
        } else if (typeof parsed === "object" && parsed !== null) {
          const obj = parsed as Record<string, unknown>;
          const u = (obj["url"] ?? obj["fileUrl"] ?? obj["path"] ?? "") as string;
          if (u) allUrls.push(u);
        }
      } catch {
        // Not JSON — local file path or plain URL
        if (dataStr) allUrls.push(dataStr);
      }
    }
    return allUrls;
  } catch {
    return null;
  }
}

/**
 * Resolve candidate center from deep link.
 *
 * PRE-AUTH resolution only — this is a "hint" for the backend,
 * NOT the authoritative source of truth (backend POST-AUTH response is).
 */
export function getDeepLinkCenter(): string | null {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get("center");
    if (fromUrl) return fromUrl;

    const w = window as unknown as Record<string, unknown>;
    const zmp = w.ZMP as Record<string, unknown> | undefined;
    if (zmp && typeof zmp.getLaunchContext === "function") {
      const ctx = zmp.getLaunchContext() as Record<string, unknown> | null;
      if (ctx && typeof ctx["center"] === "string") return ctx["center"];
    }

    return null;
  } catch {
    return null;
  }
}
