import { Router, type IRouter } from "express";
import { requireStudent } from "../middleware/student-auth.js";
import { crmFetch } from "../lib/crm-proxy.js";

const router: IRouter = Router();

router.use(requireStudent);

function requireCrm(
  req: { student?: { crmToken?: string; centerId: string } },
  res: { status: (n: number) => { json: (b: unknown) => void } }
): req is { student: { crmToken: string; centerId: string } } {
  if (!req.student?.crmToken) {
    res.status(401).json({ error: "Không tìm thấy token CRM trong phiên đăng nhập. Vui lòng đăng nhập lại." });
    return false;
  }
  return true;
}

router.get("/my-space/invoices", async (req, res): Promise<void> => {
  if (!requireCrm(req, res)) return;
  try {
    const data = await crmFetch(req.student.centerId, req.student.crmToken, "/api/my-space/invoices");
    res.json(data);
  } catch (err) {
    console.error("[crm-proxy] invoices failed:", (err as Error).message);
    res.status(502).json({ error: "Không thể lấy hoá đơn từ hệ thống CRM" });
  }
});

export default router;
