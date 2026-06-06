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

// GET /api/exams/:id
router.get("/exams/:id", async (req, res): Promise<void> => {
  if (!requireCrm(req, res)) return;
  const { id } = req.params;
  try {
    const data = await crmFetch(req.student.centerId, req.student.crmToken, `/api/exams/${id}`);
    res.json(data);
  } catch (err) {
    console.error("[crm-proxy] exams/:id failed:", (err as Error).message);
    res.status(502).json({ error: "Không thể lấy thông tin bài kiểm tra từ hệ thống CRM" });
  }
});

// GET /api/exams/:examId/my-attempt-count
router.get("/exams/:examId/my-attempt-count", async (req, res): Promise<void> => {
  if (!requireCrm(req, res)) return;
  const { examId } = req.params;
  try {
    const data = await crmFetch(req.student.centerId, req.student.crmToken, `/api/exams/${examId}/my-attempt-count`);
    res.json(data);
  } catch (err) {
    console.error("[crm-proxy] exams/my-attempt-count failed:", (err as Error).message);
    res.status(502).json({ error: "Không thể lấy số lần làm bài từ hệ thống CRM" });
  }
});

// GET /api/exams/:examId/preview
router.get("/exams/:examId/preview", async (req, res): Promise<void> => {
  if (!requireCrm(req, res)) return;
  const { examId } = req.params;
  try {
    const data = await crmFetch(req.student.centerId, req.student.crmToken, `/api/exams/${examId}/preview`);
    // Debug: log first section's structure so we can identify matching data field names
    if (Array.isArray(data)) {
      const sections = data as Record<string, unknown>[];
      for (const section of sections) {
        const sectionName = section["name"] ?? "(no name)";
        const sectionKeys = Object.keys(section);
        console.log(`[exam-preview] section "${sectionName}" keys:`, sectionKeys.join(", "));
        if (Array.isArray(section["questions"])) {
          const qs = section["questions"] as { question: Record<string, unknown>; orderIndex: number }[];
          const matchingQ = qs.find((sq) => {
            const q = sq["question"] ?? sq;
            return (q as Record<string, unknown>)["type"] === "matching";
          });
          if (matchingQ) {
            const q = (matchingQ["question"] ?? matchingQ) as Record<string, unknown>;
            console.log(`[exam-preview] matching question keys:`, Object.keys(q).join(", "));
            console.log(`[exam-preview] matching question raw:`, JSON.stringify(q).slice(0, 800));
          }
        }
      }
    }
    res.json(data);
  } catch (err) {
    console.error("[crm-proxy] exams/preview failed:", (err as Error).message);
    res.status(502).json({ error: "Không thể lấy đề thi từ hệ thống CRM" });
  }
});

// POST /api/exam-submissions
router.post("/exam-submissions", async (req, res): Promise<void> => {
  if (!requireCrm(req, res)) return;
  const { examId, classId, answers, timeTakenSeconds, submittedAt } = req.body as {
    examId?: string;
    classId?: string;
    answers?: Record<string, string | string[]>;
    timeTakenSeconds?: number;
    submittedAt?: string;
  };
  if (!examId || !answers) {
    res.status(400).json({ error: "examId and answers are required" });
    return;
  }
  try {
    const data = await crmFetch(
      req.student.centerId,
      req.student.crmToken,
      "/api/exam-submissions",
      {
        method: "POST",
        body: {
          examId,
          ...(classId ? { classId } : {}),
          answers,
          ...(timeTakenSeconds != null ? { timeTakenSeconds } : {}),
          ...(submittedAt ? { submittedAt } : {}),
        },
      }
    );
    res.json(data);
  } catch (err) {
    console.error("[crm-proxy] exam-submissions failed:", (err as Error).message);
    res.status(502).json({ error: "Không thể nộp bài kiểm tra lên hệ thống CRM" });
  }
});

// GET /api/exam-submissions/:id
router.get("/exam-submissions/:id", async (req, res): Promise<void> => {
  if (!requireCrm(req, res)) return;
  const { id } = req.params;
  try {
    const data = await crmFetch(req.student.centerId, req.student.crmToken, `/api/exam-submissions/${id}`);
    res.json(data);
  } catch (err) {
    console.error("[crm-proxy] exam-submissions/:id failed:", (err as Error).message);
    res.status(502).json({ error: "Không thể lấy kết quả bài kiểm tra từ hệ thống CRM" });
  }
});

export default router;
