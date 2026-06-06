import { Router, type IRouter } from "express";
import { z } from "zod";
import { loginWithPassword, loginWithZaloAccessToken } from "../services/mobile-auth.service.js";

const router: IRouter = Router();

// ─── POST /api/mobile/auth/login — phone + password ──────────────────────────

const LoginBody = z.object({
  username: z.string().min(1, "username is required"),
  password: z.string().min(1, "password is required"),
  center: z.string().optional(),
});

router.post("/mobile/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const firstMsg = Object.values(fieldErrors).flat()[0] ?? "Dữ liệu không hợp lệ";
    res.status(400).json({ error: firstMsg });
    return;
  }

  const result = await loginWithPassword(parsed.data.username, parsed.data.password, parsed.data.center);
  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }

  // Return token + center + profile so the frontend can:
  //   - Store center in localStorage (syncCenterFromResponse)
  //   - Display student name immediately (extractProfile)
  //   - Encode student identity into JWT for /api/auth/me
  res.json({
    token: result.token,
    center: result.center,
    profile: result.profile,
    student: result.student,
  });
});

// ─── POST /api/mobile/auth/zalo — Zalo access_token from ZMP.getAccessToken() ─

const ZaloBody = z.object({
  accessToken: z.string().min(1, "accessToken is required"),
  center: z.string().optional(),
});

router.post("/mobile/auth/zalo", async (req, res): Promise<void> => {
  const parsed = ZaloBody.safeParse(req.body);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const firstMsg = Object.values(fieldErrors).flat()[0] ?? "Dữ liệu không hợp lệ";
    res.status(400).json({ error: firstMsg });
    return;
  }

  const result = await loginWithZaloAccessToken(parsed.data.accessToken, parsed.data.center);
  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }

  res.json({
    token: result.token,
    center: result.center,
    profile: result.profile,
    student: result.student,
  });
});

export default router;
