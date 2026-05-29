import { MOCK_STUDENT } from "../mock/student.js";
import { signStudentToken } from "../middleware/student-auth.js";

// ─── Environment flags ────────────────────────────────────────────────────────
//
// ENABLE_REAL_CRM=true  → Mini App server proxies to CRM for Zalo auth.
//   Required env vars when enabled:
//     CRM_BASE_URL         = https://easyeduv2.easyedu.vn
//     CRM_INTERNAL_SECRET  = <shared secret from CRM team> (K8s Secret)
//
// ENABLE_REAL_CRM=false (default) → mock mode; safe to deploy to Zalo portal
//   for review while CRM integration is in progress.

const ENABLE_REAL_CRM = process.env.ENABLE_REAL_CRM === "true";
const CRM_BASE_URL = (process.env.CRM_BASE_URL ?? "").replace(/\/$/, "");
const CRM_INTERNAL_SECRET = process.env.CRM_INTERNAL_SECRET ?? "";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AuthSuccess = {
  ok: true;
  token: string;
  student: { id: string; fullName: string; studentCode: string };
};

export type AuthFailure = { ok: false; status: 401 | 403; error: string };
export type AuthResult = AuthSuccess | AuthFailure;

// ─── Mock credential store (manual login — used while ENABLE_REAL_CRM=false) ─
// Replace with real DB query when CRM implements C2 (phone login endpoint).

interface StudentRecord {
  studentId: string;
  fullName: string;
  studentCode: string;
  centerId: string;
  passwordHash: string;
}

const MOCK_USERS: Record<string, StudentRecord> = {
  "nguyen.van.an": {
    studentId: MOCK_STUDENT.studentId,
    fullName: MOCK_STUDENT.studentName,
    studentCode: MOCK_STUDENT.studentCode,
    centerId: "center-stu",
    passwordHash: "password123",
  },
};

// ─── Zalo auth — proxy to CRM or mock ────────────────────────────────────────
//
// Receives the access_token from ZMP.getAccessToken() (not an auth code).
// In real mode: forwards to CRM POST /api/internal/zalo-auth.
//   CRM calls graph.zalo.me to verify, maps zaloUserId → student, signs JWT.
// In mock mode: skips verification, returns the default test student so the
//   full app flow can be tested inside Zalo before CRM integration is ready.

export async function loginWithZaloAccessToken(accessToken: string): Promise<AuthResult> {
  if (ENABLE_REAL_CRM) {
    if (!CRM_BASE_URL || !CRM_INTERNAL_SECRET) {
      console.error("[zalo-auth] CRM_BASE_URL or CRM_INTERNAL_SECRET is not set");
      return { ok: false, status: 403, error: "Cấu hình server chưa đầy đủ" };
    }

    let res: Response;
    try {
      res = await fetch(`${CRM_BASE_URL}/api/internal/zalo-auth`, {
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
      const message = typeof body["error"] === "string"
        ? body["error"]
        : "Đăng nhập Zalo thất bại";
      return { ok: false, status: res.status === 401 ? 401 : 403, error: message };
    }

    const data = await res.json() as {
      token: string;
      studentId: string;
      fullName: string;
      studentCode?: string;
    };

    return {
      ok: true,
      token: data.token,
      student: {
        id: data.studentId,
        fullName: data.fullName,
        studentCode: data.studentCode ?? "",
      },
    };
  }

  // ── Mock mode ──────────────────────────────────────────────────────────────
  // Any Zalo access_token → succeeds as the default test student.
  // This lets the full app UI be tested inside Zalo without CRM being ready.
  console.log("[zalo-auth] MOCK MODE — returning test student (set ENABLE_REAL_CRM=true for production)");
  const record = MOCK_USERS["nguyen.van.an"];
  return buildSuccess(record);
}

// ─── Manual login — phone + password ─────────────────────────────────────────
// Accepts phone number as username (UI label is "Số điện thoại").
// Mock: looks up by phone/username key. Real: CRM to implement C2.

export function loginWithPassword(phone: string, password: string): AuthResult {
  const key = phone.toLowerCase().trim();
  const record = MOCK_USERS[key];
  if (!record || record.passwordHash !== password) {
    return { ok: false, status: 401, error: "Sai tài khoản hoặc mật khẩu." };
  }
  return buildSuccess(record);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildSuccess(record: StudentRecord): AuthSuccess {
  const token = signStudentToken(record.studentId, record.centerId);
  return {
    ok: true,
    token,
    student: {
      id: record.studentId,
      fullName: record.fullName,
      studentCode: record.studentCode,
    },
  };
}
