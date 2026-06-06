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
  const { centerId } = req.student;
  console.info("[invoices] fetching for centerId:", centerId);
  try {
    const data = await crmFetch(req.student.centerId, req.student.crmToken, "/api/my-space/invoices");
    const count = Array.isArray((data as Record<string, unknown>)["invoices"])
      ? ((data as Record<string, unknown>)["invoices"] as unknown[]).length
      : "n/a (unexpected shape)";
    console.info("[invoices] CRM returned, invoice count:", count, "| keys:", Object.keys(data as object));
    res.json(data);
  } catch (err) {
    console.error("[invoices] crmFetch failed for", centerId, "—", (err as Error).message);
    res.status(502).json({ error: "Không thể lấy hoá đơn từ hệ thống CRM" });
  }
});

export default router;
