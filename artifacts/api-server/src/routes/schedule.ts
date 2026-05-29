import { Router, type IRouter } from "express";
import * as calendarService from "../services/calendar.service.js";
import { ListScheduleResponse } from "@workspace/api-zod";
import { MOCK_SESSIONS } from "../mock/student.js";

const router: IRouter = Router();

// Legacy /api/schedule endpoint — maps mock sessions to the old schedule shape.
// When swapping to DB, replace with a DB query and remove the MOCK_SESSIONS import.
router.get("/schedule", (_req, res) => {
  const rows = MOCK_SESSIONS.map((s, idx) => ({
    id: idx + 1,
    subject: s.className,
    teacher: s.teacherNames.join(", "),
    room: s.locationName ?? "",
    dayOfWeek: ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"][s.weekday],
    startTime: s.startTime,
    endTime: s.endTime,
    date: s.sessionDate,
    color: null,
  }));
  res.json(ListScheduleResponse.parse(rows));
});

export default router;
