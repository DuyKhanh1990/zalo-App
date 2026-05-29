import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiPost } from "@/lib/api-client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AssignmentAttachment = {
  name: string;
  url: string;
};

export type AssignmentRow = {
  classSessionId: string;
  classId: string;
  className: string;
  classCode: string;
  sessionDate: string;
  weekday: number;
  startTime: string;
  endTime: string;
  sessionIndex: number;
  studentId: string;
  studentName: string;
  itemType: "BTVN" | "Bài kiểm tra";
  homeworkId: string;
  homeworkTitle: string;
  homeworkDescription: string;
  homeworkAttachments: AssignmentAttachment[];
  isPersonalized: boolean;
  submissionStatus: "pending" | "submitted";
  submissionContent?: string;
  submissionAttachments?: Array<string | Record<string, unknown>>;
  studentSessionContentId: string;
  score?: string | null;
  comment?: string | null;
  examId?: string | null;
};

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";

function resolveUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_BASE}/${url.replace(/^\//, "")}`;
}

export function normalizeSubmissionAttachments(
  raw?: Array<string | Record<string, unknown>>
): AssignmentAttachment[] {
  if (!raw || raw.length === 0) return [];
  return raw.map((item, i) => {
    if (typeof item === "string") {
      const name = item.split("/").pop() ?? item;
      return { name, url: resolveUrl(item) };
    }
    const url = resolveUrl(
      ((item["url"] ?? item["fileUrl"] ?? item["link"] ?? item["path"] ?? "") as string)
    );
    const name = (item["name"] ?? item["fileName"] ?? item["title"] ?? `Tệp ${i + 1}`) as string;
    return { name, url };
  });
}

export type AssignmentListResponse = {
  month: string;
  rows: AssignmentRow[];
};

// ─── Query key ────────────────────────────────────────────────────────────────

export function assignmentListQueryKey(month: string) {
  return ["assignments", month] as const;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useAssignmentList(month: string) {
  return useQuery<AssignmentListResponse>({
    queryKey: assignmentListQueryKey(month),
    queryFn: () =>
      apiFetch<AssignmentListResponse>(
        `/api/my-space/assignments/student?month=${month}`
      ),
  });
}

export function useSubmitAssignment() {
  const queryClient = useQueryClient();
  return useMutation<
    { success: boolean },
    Error,
    { homeworkId: string; submissionContent?: string; submissionAttachments?: string[]; month: string }
  >({
    mutationFn: ({ homeworkId, submissionContent, submissionAttachments }) =>
      apiPost("/api/my-space/assignments/student/submit", {
        homeworkId,
        submissionContent,
        submissionAttachments,
      }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: assignmentListQueryKey(vars.month) });
    },
  });
}
