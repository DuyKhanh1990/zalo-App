import { Router, type IRouter } from "express";
import jwt from "jsonwebtoken";

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
      id: payload.studentId as string,
      fullName: typeof payload.fullName === "string" ? payload.fullName : null,
      studentCode: typeof payload.studentCode === "string" ? payload.studentCode : null,
      centerId: typeof payload.centerId === "string" ? payload.centerId : null,
      role: "student",
    });
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
});

export default router;
