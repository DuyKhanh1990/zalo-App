import { useQuery, useMutation } from "@tanstack/react-query";
import { apiFetch, apiPost } from "@/lib/api-client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ExamMeta = {
  id: string;
  title: string;
  duration: number;
  maxAttempts: number | null;
  passingScore?: number | null;
  totalQuestions?: number | null;
  showResult?: boolean;
};

export type ExamAttemptCount = {
  count: number;
  maxAttempts?: number;
};

export type ExamOption = {
  id: string;
  content: string;
};

export type PassageInfo = {
  url: string;
  absoluteUrl: string;
  name: string;
  fileType: "pdf" | "image" | "word" | "powerpoint" | "excel" | "video" | "other";
  viewerUrl: string | null;
  canEmbedDirect: boolean;
};

export type AudioInfo = {
  url: string;
  name: string;
};

export type MatchingItem = {
  id: string;
  text: string;
};

export type MatchingData = {
  leftItems: MatchingItem[];
  rightItems: MatchingItem[];
  scorePerPair: number;
  shuffleB?: boolean;
};

export type ExamQuestion = {
  id: string;
  content: string;
  type?: string; // single_choice | multiple_choice | fill_blank | essay | matching
  options: ExamOption[];
  mediaImageUrl?: string | null;
  mediaAudioUrl?: string | null;
  sectionName?: string;
  sectionReadingUrl?: string | null;
  sectionAudioUrl?: string | null;
  passageInfo?: PassageInfo | null;
  audioInfo?: AudioInfo | null;
  matchingData?: MatchingData | null;
  score?: string;
};

export type ExamPreview = {
  questions: ExamQuestion[];
};

export type ExamAnswer = {
  questionId: string;
  selectedOptionIds: string[]; // for essay/fill_blank: [text]
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

// ─── Normalizers ──────────────────────────────────────────────────────────────

function normalizeExamMeta(raw: unknown): ExamMeta {
  const obj = ((raw ?? {}) as Record<string, unknown>);
  return {
    id: (obj["id"] ?? "") as string,
    title: ((obj["name"] ?? obj["title"]) ?? "Bài kiểm tra") as string,
    duration: Number(obj["timeLimitMinutes"] ?? obj["duration"] ?? 0),
    maxAttempts: (obj["maxAttempts"] ?? null) as number | null,
    passingScore: (obj["passingScore"] ?? null) as number | null,
    totalQuestions: (obj["totalQuestions"] ?? null) as number | null,
    showResult: (obj["showResult"] ?? true) as boolean,
  };
}

function normalizeOption(o: Record<string, unknown>): ExamOption {
  return {
    id: (o["id"] ?? "") as string,
    content: ((o["text"] ?? o["content"] ?? o["label"] ?? "") as string),
  };
}

/**
 * Robustly parse matchingData from various CRM field-name patterns.
 *
 * Supported formats:
 *   1. { leftItems: [...], rightItems: [...] }  — two separate arrays
 *   2. { pairs: [{ left/question/a: "...", right/answer/b: "..." }] } — flat pairs
 *   3. { connections: [...] }  — same flat pairs under different key
 *   4. { items: [...] }  — single array, auto-split into left/right by odd/even index
 *
 * Each item/pair may use "text", "content", "value", "label", "name" for display.
 */
function normalizeMatchingData(raw: unknown): MatchingData | null {
  if (!raw) return null;

  // ── Handle array input directly ────────────────────────────────────────────
  // CRM actual format: options = [{id:"pair-1", left:{text:"..."}, right:{text:"..."}}]
  // When the options array is passed directly, treat it as flat pairs.
  if (Array.isArray(raw)) {
    if (raw.length === 0) return null;
    return normalizeMatchingData({ pairs: raw });
  }

  if (typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  /**
   * Extract text from a value that may be a plain string OR a nested object
   * like { text: "..." } | { content: "..." } | { label: "..." }
   */
  function extractText(val: unknown): string {
    if (typeof val === "string") return val;
    if (val && typeof val === "object") {
      const o = val as Record<string, unknown>;
      const t = o["text"] ?? o["content"] ?? o["value"] ?? o["label"] ?? o["name"] ?? o["title"];
      if (typeof t === "string") return t;
    }
    return "";
  }

  function itemText(o: Record<string, unknown>): string {
    return extractText(o["text"] ?? o["content"] ?? o["value"] ?? o["label"] ?? o["name"] ?? o["title"]) ||
      String(o["text"] ?? o["content"] ?? o["value"] ?? o["label"] ?? o["name"] ?? o["title"] ?? "");
  }

  function normalizeItems(arr: unknown): MatchingItem[] {
    if (!Array.isArray(arr)) return [];
    return arr.map((item, idx) => {
      const o = (item ?? {}) as Record<string, unknown>;
      return { id: String(o["id"] ?? o["_id"] ?? o["key"] ?? idx), text: itemText(o) };
    }).filter((item) => item.text !== "");
  }

  // ── Format 1: Two separate arrays ─────────────────────────────────────────
  const leftRaw = obj["leftItems"] ?? obj["left"] ?? obj["leftSide"] ?? obj["leftColumn"] ?? obj["itemsLeft"] ?? obj["questions"] ?? null;
  const rightRaw = obj["rightItems"] ?? obj["right"] ?? obj["rightSide"] ?? obj["rightColumn"] ?? obj["itemsRight"] ?? obj["answers"] ?? null;

  if (leftRaw !== null || rightRaw !== null) {
    const leftItems = normalizeItems(leftRaw);
    const rightItems = normalizeItems(rightRaw);
    if (leftItems.length > 0 || rightItems.length > 0) {
      const scorePerPair = Number(obj["scorePerPair"] ?? obj["score"] ?? obj["pointPerPair"] ?? 0);
      return { leftItems, rightItems, scorePerPair, shuffleB: Boolean(obj["shuffleB"] ?? false) };
    }
  }

  // ── Format 2: Flat pairs array (CRM actual format) ─────────────────────────
  // e.g. [{id:"pair-1", left:{text:"Nhật Bản"}, right:{text:"Nổi tiếng với..."}}]
  const pairsRaw = obj["pairs"] ?? obj["connections"] ?? obj["matchPairs"] ?? obj["matchingPairs"] ?? null;
  if (Array.isArray(pairsRaw) && pairsRaw.length > 0) {
    const leftItems: MatchingItem[] = [];
    const rightItems: MatchingItem[] = [];
    (pairsRaw as Record<string, unknown>[]).forEach((pair, idx) => {
      // left/right can be a plain string OR an object like {text: "..."}
      const leftText = extractText(pair["left"]) ||
        String(pair["question"] ?? pair["a"] ?? pair["leftText"] ?? pair["leftItem"] ?? pair["item1"] ?? pair["from"] ?? "");
      const rightText = extractText(pair["right"]) ||
        String(pair["answer"] ?? pair["b"] ?? pair["rightText"] ?? pair["rightItem"] ?? pair["item2"] ?? pair["to"] ?? "");
      const leftId = String(pair["id"] ? `${pair["id"]}_L` : (pair["leftId"] ?? pair["questionId"] ?? pair["idA"] ?? `L${idx}`));
      const rightId = String(pair["id"] ? `${pair["id"]}_R` : (pair["rightId"] ?? pair["answerId"] ?? pair["idB"] ?? `R${idx}`));
      if (leftText) leftItems.push({ id: leftId, text: leftText });
      if (rightText) rightItems.push({ id: rightId, text: rightText });
    });
    if (leftItems.length > 0 || rightItems.length > 0) {
      const scorePerPair = Number(obj["scorePerPair"] ?? obj["score"] ?? obj["pointPerPair"] ?? 0);
      return { leftItems, rightItems, scorePerPair, shuffleB: Boolean(obj["shuffleB"] ?? false) };
    }
  }

  // ── Format 3: Single items array — interleave into left/right ─────────────
  const singleArr = obj["items"] ?? null;
  if (Array.isArray(singleArr) && singleArr.length >= 2) {
    const allItems = normalizeItems(singleArr);
    const half = Math.ceil(allItems.length / 2);
    const leftItems = allItems.slice(0, half);
    const rightItems = allItems.slice(half);
    if (leftItems.length > 0) {
      const scorePerPair = Number(obj["scorePerPair"] ?? obj["score"] ?? obj["pointPerPair"] ?? 0);
      return { leftItems, rightItems, scorePerPair, shuffleB: Boolean(obj["shuffleB"] ?? false) };
    }
  }

  return null;
}

function normalizeQuestion(
  q: Record<string, unknown>,
  sectionInfo?: {
    sectionName?: string;
    sectionReadingUrl?: string | null;
    sectionAudioUrl?: string | null;
    passageInfo?: PassageInfo | null;
    audioInfo?: AudioInfo | null;
    sectionMatchingData?: MatchingData | null;
  }
): ExamQuestion {
  const rawOptions = Array.isArray(q["options"]) ? (q["options"] as Record<string, unknown>[]) : [];
  // matchingData: check question level first, then fall back to section level.
  // For matching questions the CRM stores pairs in the `options` array (same field
  // used for MC options) with shape [{id, left:{text}, right:{text}}].
  const matchingData =
    normalizeMatchingData(
      q["matchingData"] ?? q["matching"] ?? q["matchingPairs"] ??
      (q["type"] === "matching" ? rawOptions : null)
    ) ??
    sectionInfo?.sectionMatchingData ??
    null;
  const { sectionMatchingData: _drop, ...restSectionInfo } = sectionInfo ?? {};
  return {
    id: (q["id"] ?? "") as string,
    content: ((q["content"] ?? q["question"] ?? q["text"] ?? "") as string),
    type: (q["type"] ?? "single_choice") as string,
    options: rawOptions.map(normalizeOption),
    mediaImageUrl: (q["mediaImageUrl"] ?? null) as string | null,
    mediaAudioUrl: (q["mediaAudioUrl"] ?? null) as string | null,
    matchingData,
    score: (q["score"] ?? undefined) as string | undefined,
    // Note: correctAnswer is intentionally NOT included — server-side scoring only
    ...restSectionInfo,
  };
}

/**
 * Normalize CRM preview response to ExamPreview.
 * CRM returns sections: [{ id, name, type, questions: [{ question: {...}, orderIndex }] }]
 * We flatten to { questions: ExamQuestion[] } and strip correctAnswer.
 */
function normalizePreview(raw: unknown): ExamPreview {
  if (!raw) return { questions: [] };

  // CRM sections array: [{ name, questions: [{ question: {...}, orderIndex }] }]
  if (Array.isArray(raw)) {
    const first = raw[0] as Record<string, unknown> | undefined;
    if (first && Array.isArray(first["questions"])) {
      const sections = raw as Record<string, unknown>[];
      const questions: ExamQuestion[] = [];
      for (const section of sections) {
        const sectionName = (section["name"] ?? "") as string;
        // New API: passageInfo / audioInfo objects; fall back to old flat fields
        const passageInfo = (section["passageInfo"] ?? null) as PassageInfo | null;
        const audioInfo = (section["audioInfo"] ?? null) as AudioInfo | null;
        const sectionReadingUrl = passageInfo?.absoluteUrl ?? (
          section["readingPassageUrl"] ??
          section["readingUrl"] ??
          section["passageUrl"] ??
          section["fileUrl"] ??
          section["attachmentUrl"] ??
          null
        ) as string | null;
        const sectionAudioUrl = audioInfo?.url ?? (section["sessionAudioUrl"] ?? null) as string | null;
        // matchingData may live at section level, shared across all questions in the section
        const sectionMatchingData =
          normalizeMatchingData(section["matchingData"] ?? section["matching"] ?? section["matchingPairs"]);
        const sectionQs = section["questions"] as { question: Record<string, unknown>; orderIndex: number }[];
        const sorted = [...sectionQs].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
        for (const sq of sorted) {
          questions.push(normalizeQuestion(sq["question"], { sectionName, sectionReadingUrl, sectionAudioUrl, passageInfo, audioInfo, sectionMatchingData }));
        }
      }
      return { questions };
    }
    // Raw array of questions
    return { questions: (raw as Record<string, unknown>[]).map((q) => normalizeQuestion(q)) };
  }

  if (typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    const candidates = [obj["questions"], obj["items"], obj["data"]];
    for (const c of candidates) {
      if (Array.isArray(c)) {
        return { questions: (c as Record<string, unknown>[]).map((q) => normalizeQuestion(q)) };
      }
    }
    // Nested: { data: { questions: [...] } }
    if (obj["data"] && typeof obj["data"] === "object") {
      const inner = obj["data"] as Record<string, unknown>;
      if (Array.isArray(inner["questions"])) {
        return { questions: (inner["questions"] as Record<string, unknown>[]).map((q) => normalizeQuestion(q)) };
      }
    }
  }

  return { questions: [] };
}

/**
 * Normalize submission result — handles various API response shapes and
 * ensures numeric fields are always safe numbers (never undefined).
 */
export function normalizeSubmissionResult(raw: unknown): ExamSubmissionResult {
  if (!raw || typeof raw !== "object") {
    return { id: "", score: 0, totalScore: 10, correctCount: 0, totalCount: 0 };
  }
  const obj = raw as Record<string, unknown>;

  // Unwrap common envelopes like { data: {...} } or { result: {...} }
  const inner: Record<string, unknown> =
    (obj["data"] && typeof obj["data"] === "object" ? obj["data"] as Record<string, unknown> : null) ??
    (obj["result"] && typeof obj["result"] === "object" ? obj["result"] as Record<string, unknown> : null) ??
    obj;

  const score = Number(
    inner["score"] ?? inner["totalScore_earned"] ?? inner["earnedScore"] ?? inner["points"] ?? 0
  );
  const totalScore = Number(
    inner["totalScore"] ?? inner["maxScore"] ?? inner["totalPoints"] ?? inner["maxPoints"] ?? 10
  );
  const correctCount = Number(inner["correctCount"] ?? inner["correct"] ?? inner["correctAnswers"] ?? 0);
  const totalCount = Number(inner["totalCount"] ?? inner["total"] ?? inner["questionCount"] ?? 0);

  let answers: ExamSubmissionResult["answers"] | undefined;
  if (Array.isArray(inner["answers"])) {
    answers = (inner["answers"] as Record<string, unknown>[]).map((a) => ({
      questionId: String(a["questionId"] ?? a["id"] ?? ""),
      correct: Boolean(a["correct"] ?? a["isCorrect"] ?? false),
      selectedOptionIds: Array.isArray(a["selectedOptionIds"]) ? a["selectedOptionIds"] as string[] : [],
      correctOptionIds: Array.isArray(a["correctOptionIds"]) ? a["correctOptionIds"] as string[] : [],
    }));
  }

  return {
    id: String(inner["id"] ?? ""),
    score: isNaN(score) ? 0 : score,
    totalScore: isNaN(totalScore) || totalScore === 0 ? 10 : totalScore,
    correctCount: isNaN(correctCount) ? 0 : correctCount,
    totalCount: isNaN(totalCount) ? 0 : totalCount,
    passed: inner["passed"] != null ? Boolean(inner["passed"]) : undefined,
    answers,
  };
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useExamMeta(examId: string | null) {
  return useQuery<ExamMeta>({
    queryKey: ["exam-meta", examId],
    queryFn: async () => {
      const raw = await apiFetch<unknown>(`/api/exams/${examId}`);
      return normalizeExamMeta(raw);
    },
    enabled: !!examId,
    staleTime: 60_000,
  });
}

export function useExamAttemptCount(examId: string | null, classId?: string | null) {
  return useQuery<ExamAttemptCount>({
    queryKey: ["exam-attempt-count", examId, classId],
    queryFn: async () => {
      const qs = classId ? `?classId=${encodeURIComponent(classId)}` : "";
      return apiFetch<ExamAttemptCount>(`/api/exams/${examId}/my-attempt-count${qs}`);
    },
    enabled: !!examId,
    staleTime: 0,
  });
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
    { examId: string; classId?: string | null; answers: ExamAnswer[]; timeTakenSeconds?: number }
  >({
    mutationFn: async ({ examId, classId, answers, timeTakenSeconds }) => {
      // Convert array → CRM object format: { [questionId]: string | string[] }
      const answersObj: Record<string, string | string[]> = {};
      for (const a of answers) {
        if (a.selectedOptionIds.length === 1) {
          answersObj[a.questionId] = a.selectedOptionIds[0];
        } else {
          answersObj[a.questionId] = a.selectedOptionIds;
        }
      }
      const raw = await apiPost<unknown>("/api/exam-submissions", {
        examId,
        ...(classId ? { classId } : {}),
        answers: answersObj,
        ...(timeTakenSeconds != null ? { timeTakenSeconds } : {}),
        submittedAt: new Date().toISOString(),
      });
      return normalizeSubmissionResult(raw);
    },
  });
}

export function useExamSubmissionResult(submissionId: string | null) {
  return useQuery<ExamSubmissionResult>({
    queryKey: ["exam-submission", submissionId],
    queryFn: async () => {
      const raw = await apiFetch<unknown>(`/api/exam-submissions/${submissionId}`);
      return normalizeSubmissionResult(raw);
    },
    enabled: !!submissionId,
    staleTime: Infinity,
  });
}
