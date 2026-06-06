import { Router, type IRouter } from "express";
import { requireStudent } from "../middleware/student-auth.js";

const router: IRouter = Router();

router.get("/my-space/user-type", requireStudent, (req, res): void => {
  res.json({ userType: "student" });
});

export default router;
