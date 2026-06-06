import { Router, type IRouter } from "express";
import { requireStudent } from "../middleware/student-auth.js";
import { crmFetch } from "../lib/crm-proxy.js";

const router: IRouter = Router();

router.use(requireStudent);

function requireCrm(
  req: { student?: { crmToken?: string; centerId: string } },
  res: { status: (n: number) => { json: (b: unknown) => void } }
): req is { student: { crmToken: string; centerId: string } } {
  if (!req.student?.crmToken) {
    res.status(401).json({ error: "Không tìm thấy token CRM trong phiên đăng nhập. Vui lòng đăng nhập lại." });
    return false;
  }
  return true;
}

// ─── GET /api/my-space/calendar/student?month=YYYY-MM ────────────────────────
router.get("/my-space/calendar/student", async (req, res): Promise<void> => {
  if (!requireCrm(req, res)) return;
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const month = typeof req.query.month === "string" ? req.query.month : defaultMonth;
  try {
    const data = await crmFetch(req.student.centerId, req.student.crmToken, `/api/my-space/calendar/student?month=${month}`);
    res.json(data);
  } catch (err) {
    console.error("[crm-proxy] calendar/student failed:", (err as Error).message);
    res.status(502).json({ error: "Không thể lấy lịch học từ hệ thống CRM" });
  }
});

// ─── GET /api/my-space/calendar/student/list ─────────────────────────────────
router.get("/my-space/calendar/student/list", async (req, res): Promise<void> => {
  if (!requireCrm(req, res)) return;
  try {
    const data = await crmFetch(req.student.centerId, req.student.crmToken, "/api/my-space/calendar/student/list");
    res.json(data);
  } catch (err) {
    console.error("[crm-proxy] calendar/student/list failed:", (err as Error).message);
    res.status(502).json({ error: "Không thể lấy danh sách lịch học từ hệ thống CRM" });
  }
});

// ─── GET /api/my-space/calendar/student/classes ──────────────────────────────
router.get("/my-space/calendar/student/classes", async (req, res): Promise<void> => {
  if (!requireCrm(req, res)) return;
  try {
    const data = await crmFetch(req.student.centerId, req.student.crmToken, "/api/my-space/calendar/student/classes");
    res.json(data);
  } catch (err) {
    console.error("[crm-proxy] calendar/student/classes failed:", (err as Error).message);
    res.status(502).json({ error: "Không thể lấy danh sách lớp từ hệ thống CRM" });
  }
});

// ─── GET /api/my-space/calendar/student/class/:classId/sessions ──────────────
router.get("/my-space/calendar/student/class/:classId/sessions", async (req, res): Promise<void> => {
  if (!requireCrm(req, res)) return;
  const { classId } = req.params as { classId: string };
  const page = Math.max(1, parseInt((req.query.page as string) ?? "1", 10));
  const pageSize = Math.min(50, Math.max(1, parseInt((req.query.pageSize as string) ?? "20", 10)));
  try {
    const data = await crmFetch(
      req.student.centerId,
      req.student.crmToken,
      `/api/my-space/calendar/student/class/${classId}/sessions?page=${page}&pageSize=${pageSize}`
    );
    res.json(data);
  } catch (err) {
    console.error("[crm-proxy] class sessions failed:", (err as Error).message);
    res.status(502).json({ error: "Không thể lấy buổi học từ hệ thống CRM" });
  }
});

// ─── GET /api/my-space/calendar/student/session/:classSessionId ──────────────
router.get("/my-space/calendar/student/session/:classSessionId", async (req, res): Promise<void> => {
  if (!requireCrm(req, res)) return;
  const { classSessionId } = req.params as { classSessionId: string };
  const qs = req.query.studentId ? `?studentId=${req.query.studentId}` : "";
  try {
    const data = await crmFetch(
      req.student.centerId,
      req.student.crmToken,
      `/api/my-space/calendar/student/session/${classSessionId}${qs}`
    );
    // Debug: log content structure to verify attachments are present
    if (data && typeof data === "object") {
      const raw = data as Record<string, unknown>;
      const topKeys = Object.keys(raw);
      console.log(`[session-detail] top-level keys:`, topKeys.join(", "));
      for (const k of topKeys) {
        if (Array.isArray(raw[k]) && (raw[k] as unknown[]).length > 0) {
          const first = (raw[k] as Record<string, unknown>[])[0];
          const firstKeys = Object.keys(first ?? {});
          console.log(`[session-detail] "${k}" (array[${(raw[k] as unknown[]).length}]) first item keys:`, firstKeys.join(", "));
          // Extra: log attachments count per item so we know if CRM enrichment is working
          if (k === "generalContents" || k === "personalContents") {
            const items = raw[k] as Record<string, unknown>[];
            for (const item of items) {
              const atts = item["attachments"];
              const attCount = Array.isArray(atts) ? atts.length : (atts == null ? "null/absent" : "non-array");
              console.log(`[session-detail]   "${String(item["title"] ?? item["id"])}" attachments: ${attCount}`);
            }
          }
        }
      }
    }
    res.json(data);
  } catch (err) {
    console.error("[crm-proxy] session detail failed:", (err as Error).message);
    res.status(502).json({ error: "Không thể lấy chi tiết buổi học từ hệ thống CRM" });
  }
});

// ─── POST /api/my-space/calendar/student/session/:classSessionId/online-click ─
router.post("/my-space/calendar/student/session/:classSessionId/online-click", async (req, res): Promise<void> => {
  if (!requireCrm(req, res)) return;
  const { classSessionId } = req.params as { classSessionId: string };
  const qs = req.query.studentId ? `?studentId=${req.query.studentId}` : "";
  try {
    const data = await crmFetch(
      req.student.centerId,
      req.student.crmToken,
      `/api/my-space/calendar/student/session/${classSessionId}/online-click${qs}`,
      { method: "POST" }
    );
    res.json(data);
  } catch (err) {
    console.error("[crm-proxy] online-click failed:", (err as Error).message);
    res.status(502).json({ error: "Không thể ghi nhận tham gia từ hệ thống CRM" });
  }
});

// ─── POST /api/my-space/calendar/student/session/:classSessionId/online-end ──
router.post("/my-space/calendar/student/session/:classSessionId/online-end", async (req, res): Promise<void> => {
  if (!requireCrm(req, res)) return;
  const { classSessionId } = req.params as { classSessionId: string };
  const qs = req.query.studentId ? `?studentId=${req.query.studentId}` : "";
  try {
    const data = await crmFetch(
      req.student.centerId,
      req.student.crmToken,
      `/api/my-space/calendar/student/session/${classSessionId}/online-end${qs}`,
      { method: "POST" }
    );
    res.json(data);
  } catch (err) {
    console.error("[crm-proxy] online-end failed:", (err as Error).message);
    res.status(502).json({ error: "Không thể ghi nhận kết thúc từ hệ thống CRM" });
  }
});

// ─── POST /api/my-space/test-content-attempt ─────────────────────────────────
router.post("/my-space/test-content-attempt", async (req, res): Promise<void> => {
  if (!requireCrm(req, res)) return;
  const body = req.body as {
    contentId: string;
    studentId?: string;
    maxAttempts?: number;
    testSessionId?: string;
    contentType?: string;
  };
  if (!body.contentId) {
    res.status(400).json({ error: "contentId is required" });
    return;
  }
  try {
    const data = await crmFetch(
      req.student.centerId,
      req.student.crmToken,
      "/api/my-space/test-content-attempt",
      { method: "POST", body }
    );
    res.json(data);
  } catch (err) {
    console.error("[crm-proxy] test-content-attempt failed:", (err as Error).message);
    res.status(502).json({ error: "Không thể ghi nhận bài kiểm tra từ hệ thống CRM" });
  }
});

export default router;
