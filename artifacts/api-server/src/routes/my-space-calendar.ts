import { Router, type IRouter } from "express";
import * as calendarService from "../services/calendar.service.js";

const router: IRouter = Router();

// ─── 1. GET /api/my-space/user-type ──────────────────────────────────────────
router.get("/my-space/user-type", (_req, res) => {
  res.json(calendarService.getUserType());
});

// ─── 2. GET /api/my-space/calendar/student?month=YYYY-MM ─────────────────────
router.get("/my-space/calendar/student", (req, res) => {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const month = typeof req.query.month === "string" ? req.query.month : defaultMonth;
  const studentId = typeof req.query.studentId === "string" ? req.query.studentId : undefined;
  res.json(calendarService.getCalendarMonth(month, studentId));
});

// ─── 3. GET /api/my-space/calendar/student/list ──────────────────────────────
router.get("/my-space/calendar/student/list", (req, res) => {
  const studentId = typeof req.query.studentId === "string" ? req.query.studentId : undefined;
  res.json(calendarService.getClassSessionList(studentId));
});

// ─── 4. GET /api/my-space/calendar/student/classes ───────────────────────────
router.get("/my-space/calendar/student/classes", (req, res) => {
  const studentId = typeof req.query.studentId === "string" ? req.query.studentId : undefined;
  res.json(calendarService.getStudentClasses(studentId));
});

// ─── 5. GET /api/my-space/calendar/student/class/:classId/sessions ───────────
router.get("/my-space/calendar/student/class/:classId/sessions", (req, res) => {
  const { classId } = req.params as { classId: string };
  const page = Math.max(1, parseInt((req.query.page as string) ?? "1", 10));
  const pageSize = Math.min(50, Math.max(1, parseInt((req.query.pageSize as string) ?? "20", 10)));
  const studentId = typeof req.query.studentId === "string" ? req.query.studentId : undefined;
  res.json(calendarService.getClassSessions(classId, page, pageSize, studentId));
});

// ─── 6. GET /api/my-space/calendar/student/session/:classSessionId ───────────
router.get("/my-space/calendar/student/session/:classSessionId", (req, res): void => {
  const { classSessionId } = req.params as { classSessionId: string };
  const studentId = typeof req.query.studentId === "string" ? req.query.studentId : undefined;
  const detail = calendarService.getSessionDetail(classSessionId, studentId);
  if (!detail) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  res.json(detail);
});

// ─── 7. POST /api/my-space/calendar/student/session/:classSessionId/online-click
router.post("/my-space/calendar/student/session/:classSessionId/online-click", (req, res) => {
  const { classSessionId } = req.params as { classSessionId: string };
  const studentId = typeof req.query.studentId === "string" ? req.query.studentId : undefined;
  res.json(calendarService.onlineCheckin(classSessionId, studentId));
});

// ─── 8. POST /api/my-space/calendar/student/session/:classSessionId/online-end
router.post("/my-space/calendar/student/session/:classSessionId/online-end", (req, res): void => {
  const { classSessionId } = req.params as { classSessionId: string };
  const studentId = typeof req.query.studentId === "string" ? req.query.studentId : undefined;
  const result = calendarService.onlineCheckout(classSessionId, studentId);
  if ("error" in result) {
    res.status(400).json(result);
    return;
  }
  res.json(result);
});

// ─── 9. POST /api/my-space/test-content-attempt ──────────────────────────────
router.post("/my-space/test-content-attempt", (req, res): void => {
  const { contentId, studentId, maxAttempts = 2 } = req.body as {
    contentId: string;
    studentId?: string;
    maxAttempts?: number;
  };
  if (!contentId) {
    res.status(400).json({ error: "contentId is required" });
    return;
  }
  res.json(calendarService.recordTestAttempt(contentId, maxAttempts, studentId));
});

export default router;
