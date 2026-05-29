import { useQuery, useMutation } from "@tanstack/react-query";
import { apiFetch, apiPost } from "@/lib/api-client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ExamMeta = {
  id: string;
  title: string;
  duration: number;
  maxAttempts: number | null;
  description?: string | null;
  passingScore?: number | null;
  totalQuestions?: number | null;
};

export type ExamAttemptCount = {
  count: number;
};

export type ExamOption = {
  id: string;
  content: string;
};

export type ExamQuestion = {
  id: string;
  content: string;
  type?: string;
  options: ExamOption[];
};

export type ExamPreview = {
  questions: ExamQuestion[];
};

export type ExamAnswer = {
  questionId: string;
  selectedOptionIds: string[];
};

export type ExamSubmissionResult = {
  id: string;
  score: number;
  totalScore: number;
  correctCount: number;
  totalCount: number;
  passed?: boolean;
  answers?: {
    questionId: string;
    correct: boolean;
    selectedOptionIds: string[];
    correctOptionIds: string[];
  }[];
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useExamMeta(examId: string | null) {
  return useQuery<ExamMeta>({
    queryKey: ["exam-meta", examId],
    queryFn: () => apiFetch<ExamMeta>(`/api/exams/${examId}`),
    enabled: !!examId,
    staleTime: 60_000,
  });
}

export function useExamAttemptCount(examId: string | null) {
  return useQuery<ExamAttemptCount>({
    queryKey: ["exam-attempt-count", examId],
    queryFn: () => apiFetch<ExamAttemptCount>(`/api/exams/${examId}/my-attempt-count`),
    enabled: !!examId,
    staleTime: 0,
  });
}

function normalizePreview(raw: unknown): ExamPreview {
  if (!raw) return { questions: [] };

  // Already correct shape: { questions: [...] }
  if (typeof raw === "object" && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;

    if (Array.isArray(obj["questions"])) return { questions: obj["questions"] as ExamQuestion[] };
    if (Array.isArray(obj["items"]))     return { questions: obj["items"] as ExamQuestion[] };
    if (Array.isArray(obj["data"]))      return { questions: obj["data"] as ExamQuestion[] };

    // Nested: { data: { questions: [...] } }
    if (obj["data"] && typeof obj["data"] === "object" && !Array.isArray(obj["data"])) {
      const inner = obj["data"] as Record<string, unknown>;
      if (Array.isArray(inner["questions"])) return { questions: inner["questions"] as ExamQuestion[] };
    }
  }

  // Raw array of questions
  if (Array.isArray(raw)) return { questions: raw as ExamQuestion[] };

  return { questions: [] };
}

export function useExamPreview(examId: string | null, enabled: boolean) {
  return useQuery<ExamPreview>({
    queryKey: ["exam-preview", examId],
    queryFn: async () => {
      const raw = await apiFetch<unknown>(`/api/exams/${examId}/preview`);
      return normalizePreview(raw);
    },
    enabled: !!examId && enabled,
    staleTime: 60_000,
  });
}

export function useSubmitExam() {
  return useMutation<
    ExamSubmissionResult,
    Error,
    { examId: string; answers: ExamAnswer[] }
  >({
    mutationFn: ({ examId, answers }) =>
      apiPost<ExamSubmissionResult>("/api/exam-submissions", { examId, answers }),
  });
}

export function useExamSubmissionResult(submissionId: string | null) {
  return useQuery<ExamSubmissionResult>({
    queryKey: ["exam-submission", submissionId],
    queryFn: () => apiFetch<ExamSubmissionResult>(`/api/exam-submissions/${submissionId}`),
    enabled: !!submissionId,
    staleTime: Infinity,
  });
}
