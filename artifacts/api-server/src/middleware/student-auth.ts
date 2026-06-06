import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-in-production";

export type StudentPayload = {
  studentId: string;
  centerId: string;
  role: "student";
  fullName?: string;
  studentCode?: string;
  crmToken?: string;
};

declare global {
  namespace Express {
    interface Request {
      student?: StudentPayload;
    }
  }
}

export function requireStudent(req: Request, res: Response, next: NextFunction): void {
  // Accept token from Authorization header OR ?token= query param (for ZMP SDK serverUploadUrl)
  const authHeader = req.headers.authorization;
  const queryToken = typeof req.query.token === "string" ? req.query.token : undefined;

  if (!authHeader?.startsWith("Bearer ") && !queryToken) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }

  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : queryToken!;
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
      fullName: typeof payload.fullName === "string" ? payload.fullName : undefined,
      studentCode: typeof payload.studentCode === "string" ? payload.studentCode : undefined,
      crmToken: typeof payload.crmToken === "string" ? payload.crmToken : undefined,
    };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function signStudentToken(
  studentId: string,
  centerId: string,
  fullName?: string,
  studentCode?: string,
  crmToken?: string,
): string {
  return jwt.sign(
    {
      studentId,
      centerId,
      role: "student",
      ...(fullName ? { fullName } : {}),
      ...(studentCode ? { studentCode } : {}),
      ...(crmToken ? { crmToken } : {}),
    },
    JWT_SECRET,
    { expiresIn: "30d" }
  );
}
