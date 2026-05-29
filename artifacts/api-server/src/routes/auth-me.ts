import { Router, type IRouter } from "express";
import jwt from "jsonwebtoken";
import { MOCK_STUDENT } from "../mock/student.js";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-in-production";

const router: IRouter = Router();

router.get("/auth/me", (req, res): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
    if (payload.role !== "student") {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    res.json({
      id: payload.studentId,
      fullName: MOCK_STUDENT.studentName,
      studentCode: MOCK_STUDENT.studentCode,
      role: "student",
    });
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
});

export default router;
