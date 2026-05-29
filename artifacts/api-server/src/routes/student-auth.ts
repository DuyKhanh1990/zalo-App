import { Router, type IRouter } from "express";
import { z } from "zod";
import { signStudentToken } from "../middleware/student-auth.js";

const router: IRouter = Router();

const DevLoginBody = z.object({
  studentId: z.string().min(1, "studentId is required"),
});

router.post("/student/dev-login", async (req, res): Promise<void> => {
  const parsed = DevLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const { studentId } = parsed.data;

  const centerId = `center-${studentId.slice(0, 4)}`;

  const token = signStudentToken(studentId, centerId);

  res.json({
    token,
    student: {
      id: studentId,
      fullName: `Học viên ${studentId}`,
      centerId,
    },
  });
});

export default router;
