import { Router, type IRouter } from "express";
import * as homeworkService from "../services/homework.service.js";
import {
  CreateHomeworkBody,
  SubmitHomeworkParams,
  SubmitHomeworkResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/homework", (req, res) => {
  const { status, type } = req.query as { status?: string; type?: string };
  res.json(homeworkService.getHomework(status, type));
});

router.post("/homework", (req, res): void => {
  const parsed = CreateHomeworkBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const result = homeworkService.createHomework(parsed.data);
  res.status(201).json(SubmitHomeworkResponse.parse(result));
});

router.patch("/homework/:id/submit", (req, res): void => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = SubmitHomeworkParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const result = homeworkService.submitHomework(params.data.id);
  if (!result) {
    res.status(404).json({ error: "Homework not found" });
    return;
  }
  res.json(SubmitHomeworkResponse.parse(result));
});

export default router;
