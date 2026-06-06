import { signStudentToken } from "../middleware/student-auth.js";

const CRM_BASE_URL = (process.env.CRM_BASE_URL ?? "").replace(/\/$/, "");
const CRM_INTERNAL_SECRET = process.env.CRM_INTERNAL_SECRET ?? "";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AuthSuccess = {
  ok: true;
  token: string;
  center?: string;
  profile?: { fullName: string; code: string; type: string };
  student: { id: string; fullName: string; studentCode: string };
};

export type AuthFailure = { ok: false; status: 401 | 403; error: string };
export type AuthResult = AuthSuccess | AuthFailure;

// ─── Zalo auth ────────────────────────────────────────────────────────────────

export async function loginWithZaloAccessToken(
  accessToken: string,
  center?: string,
): Promise<AuthResult> {
  // Resolve which CRM to call:
  //   - center provided (from localStorage / deep link) → use it
  //   - no center → fall back to CRM_BASE_URL env var (legacy single-tenant)
  const crmUrl = center ? normalizeCenterUrl(center) : CRM_BASE_URL;

  if (!crmUrl || !CRM_INTERNAL_SECRET) {
    console.error("[zalo-auth] CRM URL or CRM_INTERNAL_SECRET is not set");
    return { ok: false, status: 403, error: "Cấu hình server chưa đầy đủ" };
  }

  console.info("[zalo-auth] Forwarding to CRM:", `${crmUrl}/api/internal/zalo-auth`);

  let res: Response;
  try {
    res = await fetch(`${crmUrl}/api/internal/zalo-auth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": CRM_INTERNAL_SECRET,
      },
      body: JSON.stringify({ zaloAccessToken: accessToken }),
    });
  } catch (err) {
    console.error("[zalo-auth] CRM request failed:", err);
    return { ok: false, status: 403, error: "Không kết nối được đến hệ thống CRM" };
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as Record<string, unknown>;
    const message = typeof body["error"] === "string" ? body["error"] : "Đăng nhập Zalo thất bại";
    return { ok: false, status: res.status === 401 ? 401 : 403, error: message };
  }

  const raw = await res.json() as Record<string, unknown>;

  // CRM may return the token under different field names
  const crmToken =
    (typeof raw["token"] === "string" ? raw["token"] : null) ??
    (typeof raw["accessToken"] === "string" ? raw["accessToken"] : null) ??
    (typeof raw["access_token"] === "string" ? raw["access_token"] : null) ??
    undefined;

  if (!crmToken) {
    console.warn("[zalo-auth] CRM response did not include a recognisable token field. Response keys:", Object.keys(raw));
  }

  const studentId = raw["studentId"] as string ?? "";
  const fullName = raw["fullName"] as string ?? "";
  const studentCode = raw["studentCode"] as string | undefined;

  // Derive centerId from the resolved CRM URL hostname
  let centerId: string;
  try {
    centerId = new URL(crmUrl).hostname;
  } catch {
    centerId = crmUrl;
  }

  const token = signStudentToken(studentId, centerId, fullName, studentCode, crmToken);

  return {
    ok: true,
    token,
    center: crmUrl,
    student: { id: studentId, fullName, studentCode: studentCode ?? "" },
  };
}

// ─── Manual login — username + password → proxy to tenant CRM ────────────────
//
// CRM response shape:
//   { token, center, user: { id, username }, profile: { fullName, code }, userType, needsOnboarding }

function normalizeCenterUrl(center: string): string {
  return /^https?:\/\//i.test(center)
    ? center.replace(/\/$/, "")
    : `https://${center.replace(/\/$/, "")}`;
}

export async function loginWithPassword(
  username: string,
  password: string,
  center?: string,
): Promise<AuthResult> {
  if (!center) {
    return { ok: false, status: 401, error: "Vui lòng nhập tên trung tâm." };
  }

  const centerUrl = normalizeCenterUrl(center);
  const loginUrl = `${centerUrl}/api/mobile/auth/login`;

  console.info("[password-auth] Forwarding to CRM:", loginUrl);

  let res: Response;
  try {
    res = await fetch(loginUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
  } catch (err) {
    console.error("[password-auth] CRM request failed:", err);
    return { ok: false, status: 403, error: "Không kết nối được đến hệ thống CRM" };
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as Record<string, unknown>;
    const message =
      typeof body["error"] === "string"
        ? body["error"]
        : typeof body["message"] === "string"
          ? body["message"]
          : "Sai tài khoản hoặc mật khẩu.";
    return { ok: false, status: 401, error: message };
  }

  const raw = await res.json() as Record<string, unknown>;

  // CRM may return the token under different field names
  const crmToken =
    (typeof raw["token"] === "string" ? raw["token"] : null) ??
    (typeof raw["accessToken"] === "string" ? raw["accessToken"] : null) ??
    (typeof raw["access_token"] === "string" ? raw["access_token"] : null) ??
    undefined;

  if (!crmToken) {
    console.warn("[password-auth] CRM login response did not include a recognisable token field — data endpoints will use mock fallback. Response keys:", Object.keys(raw));
  }

  const data = raw as {
    token?: string;
    center: string;
    user: { id: string; username: string };
    profile: { fullName: string; code: string; type?: string };
  };

  // Derive centerId hostname from the authoritative center URL
  let centerId: string;
  try {
    centerId = new URL(data.center).hostname;
  } catch {
    centerId = center;
  }

  const fullName = data.profile?.fullName ?? "";
  const studentCode = data.profile?.code ?? "";

  // Sign our own JWT — embed the CRM token so data endpoints can proxy to CRM
  const token = signStudentToken(data.user.id, centerId, fullName, studentCode, crmToken);

  return {
    ok: true,
    token,
    center: data.center,
    profile: {
      fullName,
      code: studentCode,
      type: data.profile?.type ?? "Học viên",
    },
    student: { id: data.user.id, fullName, studentCode },
  };
}
