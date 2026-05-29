import { Router, type IRouter } from "express";
import { z } from "zod";
import { loginWithPassword, loginWithZaloAccessToken } from "../services/mobile-auth.service.js";

const router: IRouter = Router();

// ─── POST /api/mobile/auth/login — phone + password ──────────────────────────

const LoginBody = z.object({
  username: z.string().min(1, "username is required"),
  password: z.string().min(1, "password is required"),
});

router.post("/mobile/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const firstMsg = Object.values(fieldErrors).flat()[0] ?? "Dữ liệu không hợp lệ";
    res.status(400).json({ error: firstMsg });
    return;
  }

  const result = loginWithPassword(parsed.data.username, parsed.data.password);
  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }

  res.json({ token: result.token, student: result.student });
});

// ─── POST /api/mobile/auth/zalo — Zalo access_token from ZMP.getAccessToken() ─
//
// Frontend sends the access_token returned by zmp-sdk's getAccessToken().
// This is NOT an auth code — no OAuth exchange needed.
// Server proxies to CRM POST /api/internal/zalo-auth (when ENABLE_REAL_CRM=true)
// or returns mock student (when ENABLE_REAL_CRM=false).

const ZaloBody = z.object({
  accessToken: z.string().min(1, "accessToken is required"),
});

router.post("/mobile/auth/zalo", async (req, res): Promise<void> => {
  const parsed = ZaloBody.safeParse(req.body);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const firstMsg = Object.values(fieldErrors).flat()[0] ?? "Dữ liệu không hợp lệ";
    res.status(400).json({ error: firstMsg });
    return;
  }

  const result = await loginWithZaloAccessToken(parsed.data.accessToken);
  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }

  res.json({ token: result.token, student: result.student });
});

export default router;
