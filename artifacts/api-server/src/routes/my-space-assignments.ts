import { Router, type IRouter } from "express";
import * as assignmentsService from "../services/assignments.service.js";

const router: IRouter = Router();

// GET /api/my-space/assignments/student
router.get("/my-space/assignments/student", (req, res) => {
  const { month, dateFrom, dateTo } = req.query as {
    month?: string;
    dateFrom?: string;
    dateTo?: string;
  };
  res.json(assignmentsService.getAssignments(month, dateFrom, dateTo));
});

// POST /api/my-space/assignments/student/submit
router.post("/my-space/assignments/student/submit", (req, res): void => {
  const { homeworkId, submissionContent, submissionAttachments } = req.body as {
    homeworkId?: string;
    submissionContent?: string;
    submissionAttachments?: string[];
  };
  if (!homeworkId) {
    res.status(400).json({ error: "homeworkId is required" });
    return;
  }
  const result = assignmentsService.submitAssignment(
    homeworkId,
    submissionContent,
    submissionAttachments
  );
  res.json(result);
});

export default router;
