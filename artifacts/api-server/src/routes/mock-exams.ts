import { Router, type IRouter } from "express";

const router: IRouter = Router();

// In-memory store for submissions
const submissionStore = new Map<string, {
  examId: string;
  answers: { questionId: string; selectedOptionIds: string[] }[];
  submittedAt: string;
}>();

function makeMockQuestions(examId: string) {
  return [
    {
      id: `${examId}-q1`,
      content: "Phương trình bậc hai ax² + bx + c = 0 có hai nghiệm phân biệt khi nào?",
      type: "single_choice",
      options: [
        { id: `${examId}-q1-a`, content: "Δ > 0" },
        { id: `${examId}-q1-b`, content: "Δ = 0" },
        { id: `${examId}-q1-c`, content: "Δ < 0" },
        { id: `${examId}-q1-d`, content: "Δ ≥ 0" },
      ],
      correctOptionId: `${examId}-q1-a`,
    },
    {
      id: `${examId}-q2`,
      content: "Đạo hàm của hàm số f(x) = x³ - 3x² + 2x - 1 tại x = 1 bằng?",
      type: "single_choice",
      options: [
        { id: `${examId}-q2-a`, content: "-1" },
        { id: `${examId}-q2-b`, content: "0" },
        { id: `${examId}-q2-c`, content: "1" },
        { id: `${examId}-q2-d`, content: "2" },
      ],
      correctOptionId: `${examId}-q2-b`,
    },
    {
      id: `${examId}-q3`,
      content: "Giá trị của log₂(8) bằng?",
      type: "single_choice",
      options: [
        { id: `${examId}-q3-a`, content: "2" },
        { id: `${examId}-q3-b`, content: "3" },
        { id: `${examId}-q3-c`, content: "4" },
        { id: `${examId}-q3-d`, content: "6" },
      ],
      correctOptionId: `${examId}-q3-b`,
    },
    {
      id: `${examId}-q4`,
      content: "Tổng các góc trong một tam giác bằng?",
      type: "single_choice",
      options: [
        { id: `${examId}-q4-a`, content: "90°" },
        { id: `${examId}-q4-b`, content: "180°" },
        { id: `${examId}-q4-c`, content: "270°" },
        { id: `${examId}-q4-d`, content: "360°" },
      ],
      correctOptionId: `${examId}-q4-b`,
    },
    {
      id: `${examId}-q5`,
      content: "Số nguyên tố nào sau đây là số chẵn?",
      type: "single_choice",
      options: [
        { id: `${examId}-q5-a`, content: "1" },
        { id: `${examId}-q5-b`, content: "2" },
        { id: `${examId}-q5-c`, content: "4" },
        { id: `${examId}-q5-d`, content: "6" },
      ],
      correctOptionId: `${examId}-q5-b`,
    },
  ];
}

// GET /api/exams/:id
router.get("/exams/:id", (req, res) => {
  const { id } = req.params;
  res.json({
    id,
    title: "Bài kiểm tra",
    duration: 30,
    maxAttempts: 3,
    totalQuestions: 5,
    passingScore: 5,
    description: "Bài kiểm tra cuối chương. Thời gian làm bài 30 phút.",
  });
});

// GET /api/exams/:examId/my-attempt-count
router.get("/exams/:examId/my-attempt-count", (req, res) => {
  const { examId } = req.params;
  let count = 0;
  for (const [, sub] of submissionStore) {
    if (sub.examId === examId) count++;
  }
  res.json({ count });
});

// GET /api/exams/:examId/preview
router.get("/exams/:examId/preview", (req, res) => {
  const { examId } = req.params;
  res.json({ questions: makeMockQuestions(examId) });
});

// POST /api/exam-submissions
router.post("/exam-submissions", (req, res): void => {
  const { examId, answers } = req.body as {
    examId?: string;
    answers?: { questionId: string; selectedOptionIds: string[] }[];
  };

  if (!examId || !answers) {
    res.status(400).json({ error: "examId and answers are required" });
    return;
  }

  const questions = makeMockQuestions(examId);
  const correctMap = new Map(questions.map((q) => [q.id, q.correctOptionId]));

  let correctCount = 0;
  const answerDetails = answers.map((a) => {
    const correctId = correctMap.get(a.questionId);
    const isCorrect = correctId != null && a.selectedOptionIds.includes(correctId);
    if (isCorrect) correctCount++;
    return {
      questionId: a.questionId,
      correct: isCorrect,
      selectedOptionIds: a.selectedOptionIds,
      correctOptionIds: correctId ? [correctId] : [],
    };
  });

  const totalCount = questions.length;
  const score = correctCount * 2;
  const totalScore = 10;

  const id = `sub-${Date.now()}`;
  submissionStore.set(id, { examId, answers, submittedAt: new Date().toISOString() });

  res.json({
    id,
    score,
    totalScore,
    correctCount,
    totalCount,
    passed: score >= 5,
    answers: answerDetails,
  });
});

// GET /api/exam-submissions/:id
router.get("/exam-submissions/:id", (req, res): void => {
  const { id } = req.params;
  const sub = submissionStore.get(id);
  if (!sub) {
    res.status(404).json({ error: "Submission not found" });
    return;
  }
  res.json({ id, ...sub });
});

export default router;
