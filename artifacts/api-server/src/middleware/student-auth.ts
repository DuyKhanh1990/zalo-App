import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-in-production";

export type StudentPayload = {
  studentId: string;
  centerId: string;
  role: "student";
};

declare global {
  namespace Express {
    interface Request {
      student?: StudentPayload;
    }
  }
}

export function requireStudent(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
    if (payload.role !== "student") {
      res.status(403).json({ error: "Access denied: student role required" });
      return;
    }
    req.student = {
      studentId: payload.studentId as string,
      centerId: payload.centerId as string,
      role: "student",
    };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function signStudentToken(studentId: string, centerId: string): string {
  return jwt.sign(
    { studentId, centerId, role: "student" },
    JWT_SECRET,
    { expiresIn: "30d" }
  );
}
