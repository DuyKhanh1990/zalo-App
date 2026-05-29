import { Router, type IRouter } from "express";
import * as gradesService from "../services/grades.service.js";

const router: IRouter = Router();

router.get("/grades", (req, res) => {
  const { subject, semester } = req.query as { subject?: string; semester?: string };
  res.json(gradesService.getGrades(subject, semester));
});

router.get("/grades/summary", (_req, res) => {
  res.json(gradesService.getGradesSummary());
});

export default router;
