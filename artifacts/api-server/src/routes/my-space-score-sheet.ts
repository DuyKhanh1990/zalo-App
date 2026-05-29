import { Router, type IRouter } from "express";
import * as scoreSheetService from "../services/score-sheet.service.js";

const router: IRouter = Router();

router.get("/my-space/score-sheet", (_req, res) => {
  res.json(scoreSheetService.getScoreSheet());
});

export default router;
