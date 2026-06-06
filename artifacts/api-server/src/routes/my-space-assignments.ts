import { Router, type IRouter } from "express";
import multer from "multer";
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

// GET /api/my-space/assignments/student
router.get("/my-space/assignments/student", async (req, res): Promise<void> => {
  if (!requireCrm(req, res)) return;
  const { month, dateFrom, dateTo } = req.query as { month?: string; dateFrom?: string; dateTo?: string };
  const qs = new URLSearchParams();
  if (month) qs.set("month", month);
  if (dateFrom) qs.set("dateFrom", dateFrom);
  if (dateTo) qs.set("dateTo", dateTo);
  try {
    const data = await crmFetch(
      req.student.centerId,
      req.student.crmToken,
      `/api/my-space/assignments/student${qs.toString() ? "?" + qs.toString() : ""}`
    );
    res.json(data);
  } catch (err) {
    console.error("[crm-proxy] assignments failed:", (err as Error).message);
    res.status(502).json({ error: "Không thể lấy bài tập về nhà từ hệ thống CRM" });
  }
});

// POST /api/my-space/assignments/student/submit
router.post("/my-space/assignments/student/submit", async (req, res): Promise<void> => {
  if (!requireCrm(req, res)) return;
  const { homeworkId, submissionContent, submissionAttachments } = req.body as {
    homeworkId?: string;
    submissionContent?: string;
    submissionAttachments?: string[];
  };
  if (!homeworkId) {
    res.status(400).json({ error: "homeworkId is required" });
    return;
  }
  try {
    const data = await crmFetch(
      req.student.centerId,
      req.student.crmToken,
      "/api/my-space/assignments/student/submit",
      { method: "POST", body: { homeworkId, submissionContent, submissionAttachments } }
    );
    res.json(data);
  } catch (err) {
    console.error("[crm-proxy] assignments/submit failed:", (err as Error).message);
    res.status(502).json({ error: "Không thể nộp bài tập từ hệ thống CRM" });
  }
});

// ─── File upload ──────────────────────────────────────────────────────────────
// ZMP SDK openMediaPicker's serverUploadUrl calls this endpoint with
// multipart/form-data. We proxy the file to the CRM upload endpoint and return
// the resulting URL in the format ZMP SDK expects:
//   { url: "https://..." }
//
// The CRM upload endpoint is expected at:
//   POST /api/my-space/assignments/student/upload-attachment
// Returns: { url: string } or { fileUrl: string } or { data: { url: string } }

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ZMP SDK sends the file as the first field in multipart form data.
// The field name defaults to "file" but can vary — accept any single file.
router.post(
  "/my-space/assignments/student/upload-attachment",
  upload.any(),
  async (req, res): Promise<void> => {
    if (!requireCrm(req, res)) return;

    const files = (req as unknown as { files?: Express.Multer.File[] }).files ?? [];
    if (files.length === 0) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    const file = files[0];
    const centerId = req.student.centerId;
    const crmToken = req.student.crmToken;

    try {
      // Build a multipart/form-data body to forward to CRM
      const formData = new FormData();
      // Convert Buffer to Uint8Array for Blob compatibility
      const uint8 = new Uint8Array(file.buffer.buffer, file.buffer.byteOffset, file.buffer.byteLength);
      const blob = new Blob([uint8 as unknown as ArrayBuffer], { type: file.mimetype });
      // CRM's /api/upload endpoint expects field name "files" (not "file")
      formData.append("files", blob, file.originalname);

      const crmBase = /^https?:\/\//i.test(centerId)
        ? centerId.replace(/\/$/, "")
        : `https://${centerId}`;

      // CRM actual upload endpoint is POST /api/upload (not /api/my-space/.../upload-attachment)
      const crmRes = await fetch(
        `${crmBase}/api/upload`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${crmToken}` },
          body: formData,
        }
      );

      if (!crmRes.ok) {
        const errText = await crmRes.text();
        console.error("[upload] CRM upload failed:", crmRes.status, errText.slice(0, 200));
        res.status(502).json({ error: "CRM upload failed", detail: errText.slice(0, 200) });
        return;
      }

      const crmJson = await crmRes.json() as Record<string, unknown>;

      // CRM returns { files: [{ name, url, size, mimetype }] }
      // ZMP SDK expects { url: string } from serverUploadUrl callback
      const filesArr = crmJson["files"] as Array<Record<string, unknown>> | undefined;
      const fileUrl =
        filesArr?.[0]?.["url"] as string | undefined ??
        (crmJson["url"] as string | undefined) ??
        (crmJson["fileUrl"] as string | undefined) ??
        ((crmJson["data"] as Record<string, unknown> | undefined)?.["url"] as string | undefined) ??
        "";

      console.info("[upload] CRM returned url:", fileUrl || "(empty)");
      res.json({ url: fileUrl, raw: crmJson });
    } catch (err) {
      console.error("[upload] error:", (err as Error).message);
      res.status(502).json({ error: "File upload failed", detail: (err as Error).message });
    }
  }
);

export default router;
