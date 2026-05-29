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
 *
 * Note: getAccessToken() returns an access_token string directly (NOT
 * an auth code). CRM can use it straight with graph.zalo.me without
 * any OAuth exchange step.
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
 * Open an exam in the ZMP webview (inside Zalo) or a new browser tab (outside Zalo).
 *
 * examId can be:
 *   - A full URL (when examResourceUrl is set)  → open directly
 *   - A UUID / slug (examContentId)             → construct URL from VITE_API_BASE_URL
 */
export async function openExamWebview(examId: string, classId?: string, title?: string): Promise<void> {
  let url: string;
  if (examId.startsWith("http")) {
    url = examId;
  } else {
    const base = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";
    url = `${base}/my-space/exam/${examId}`;
    if (classId) url += `?classId=${classId}`;
  }

  // Outside Zalo: open immediately and synchronously so the browser
  // doesn't treat it as an unsolicited popup (user gesture is still active).
  if (!isInsideZMP()) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }

  // Inside Zalo Mini App: use ZMP SDK webview.
  try {
    const sdk = await import("zmp-sdk");
    const openWebview = (sdk as unknown as Record<string, unknown>)["openWebview"] as
      | ((opts: { url: string; title?: string }) => void)
      | undefined;
    if (typeof openWebview === "function") {
      openWebview({ url, title });
      return;
    }
  } catch {
    // SDK unavailable — fall back to window.open
  }

  window.open(url, "_blank", "noopener,noreferrer");
}

/**
 * Resolve candidate center from deep link.
 *
 * PRE-AUTH resolution only — this is a "hint" for the backend,
 * NOT the authoritative source of truth (backend POST-AUTH response is).
 *
 * Priority:
 *   1. window.location.search ?center= param (standard deep link)
 *   2. ZMP.getLaunchContext() fallback (if SDK supports it)
 *
 * Deep link format: https://zalo.me/s/{app_id}?path=/calendar?center=crma.easyedu.vn
 * Zalo opens the app at path /calendar?center=... → center is in window.location.search
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
