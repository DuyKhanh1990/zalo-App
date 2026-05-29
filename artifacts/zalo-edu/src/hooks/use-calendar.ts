import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiPost } from "@/lib/api-client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserType = "student" | "staff" | null;

export type CalendarSession = {
  classSessionId: string;
  studentSessionId: string;
  sessionDate: string;
  weekday: number;
  className: string;
  classCode: string;
  classId?: string;
  startTime: string;
  endTime: string;
  learningFormat: "offline" | "online" | "hybrid";
  onlineLink?: string;
  locationId?: string;
  locationName?: string;
  teacherNames?: string[];
  enrolledCount?: number;
  sessionStatus: "scheduled" | "completed" | "cancelled";
  attendanceStatus: "present" | "absent" | "late" | "pending" | "makeup_wait" | "makeup_done" | null;
  studentId?: string;
  studentName?: string;
  studentCode?: string;
  isTestSession?: boolean;
};

export type CalendarMonthResponse = {
  month: string;
  datesWithSessions: string[];
  sessions: CalendarSession[];
};

export type SessionContentAttachment = {
  name: string;
  url: string;
};

export type SessionContent = {
  id: string;
  type: string;
  title: string;
  description?: string;
  resourceUrl?: string;
  attachments?: SessionContentAttachment[];
  availableAt?: string;
  maxAttempts?: number;
};

function guessAttachmentName(url: string, type: string): string {
  try {
    const pathname = new URL(url).pathname;
    const filename = pathname.split("/").pop();
    if (filename && filename.includes(".")) return decodeURIComponent(filename);
  } catch {}
  return `Tài liệu – ${type}`;
}

export function normalizeSessionContent(item: SessionContent): SessionContent {
  const raw = item as SessionContent & Record<string, unknown>;

  let attachments = item.attachments ?? [];

  if (!Array.isArray(attachments) || attachments.length === 0) {
    const candidates: SessionContentAttachment[] = [];

    const files = raw["files"] ?? raw["resources"] ?? raw["materials"];
    if (Array.isArray(files)) {
      for (const f of files as Record<string, unknown>[]) {
        const url = (f["url"] ?? f["fileUrl"] ?? f["link"] ?? "") as string;
        const name = (f["name"] ?? f["fileName"] ?? f["title"] ?? guessAttachmentName(url, item.type)) as string;
        if (url) candidates.push({ name, url });
      }
    }

    if (candidates.length === 0 && item.resourceUrl) {
      candidates.push({ name: guessAttachmentName(item.resourceUrl, item.type), url: item.resourceUrl });
    }

    attachments = candidates;
  }

  return { ...item, attachments };
}

export type ReviewSubCriteria = {
  subCriteriaName: string;
  comment: string;
};

export type ReviewCriteria = {
  criteriaName: string;
  items: ReviewSubCriteria[];
};

export type ReviewItem = {
  teacherName: string;
  criteria: ReviewCriteria[];
};

export type SessionDetail = CalendarSession & {
  attendanceNote?: string;
  reviewPublished?: boolean;
  reviewSubject?: string | null;
  reviewData?: ReviewItem[];
  generalContents?: SessionContent[];
  personalContents?: SessionContent[];
  userType: string;
  enrolledCount?: number;
  onlineClickedAt?: string | null;
  onlineEndedAt?: string | null;
};

export type ClassListItem = {
  classId: string;
  className: string;
  classCode: string;
  sessions: ClassSessionSummary[];
};

export type ClassSessionSummary = {
  classSessionId: string;
  sessionIndex: number;
  sessionDate: string;
  startTime: string;
  endTime: string;
  attendanceStatus: "present" | "absent" | "late" | null;
  attendanceNote?: string | null;
};

export type StudentClass = {
  classId: string;
  className: string;
  classCode: string;
  totalSessions: number;
};

export type ClassSessionsResponse = {
  sessions: ClassSessionSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type TestAttemptResponse = {
  allowed: boolean;
  attemptsUsed: number;
  maxAttempts: number;
};

// ─── 1. User type ─────────────────────────────────────────────────────────────

export function useUserType() {
  return useQuery<{ userType: UserType }>({
    queryKey: ["user-type"],
    queryFn: () => apiFetch<{ userType: UserType }>("/api/my-space/user-type"),
  });
}

// ─── 2. Calendar month ────────────────────────────────────────────────────────

export function useCalendarMonth(month: string) {
  return useQuery<CalendarMonthResponse>({
    queryKey: ["calendar-month", month],
    queryFn: () =>
      apiFetch<CalendarMonthResponse>(`/api/my-space/calendar/student?month=${month}`),
  });
}

// ─── 3. Session list by class ─────────────────────────────────────────────────

export function useClassSessionList() {
  return useQuery<ClassListItem[]>({
    queryKey: ["calendar-class-list"],
    queryFn: () => apiFetch<ClassListItem[]>("/api/my-space/calendar/student/list"),
  });
}

// ─── 4. Student's classes ─────────────────────────────────────────────────────

export function useStudentClasses() {
  return useQuery<StudentClass[]>({
    queryKey: ["student-classes"],
    queryFn: () => apiFetch<StudentClass[]>("/api/my-space/calendar/student/classes"),
  });
}

// ─── 5. Sessions by class (paginated) ────────────────────────────────────────

export function useClassSessions(classId: string | null, page = 1, pageSize = 20) {
  return useQuery<ClassSessionsResponse>({
    queryKey: ["class-sessions", classId, page, pageSize],
    queryFn: () =>
      apiFetch<ClassSessionsResponse>(
        `/api/my-space/calendar/student/class/${classId}/sessions?page=${page}&pageSize=${pageSize}`
      ),
    enabled: classId !== null,
  });
}

// ─── 6. Session detail ────────────────────────────────────────────────────────

export function useSessionDetail(classSessionId: string | null, studentId?: string) {
  const qs = studentId ? `?studentId=${studentId}` : "";
  return useQuery<SessionDetail>({
    queryKey: ["session-detail", classSessionId, studentId],
    queryFn: () =>
      apiFetch<SessionDetail>(
        `/api/my-space/calendar/student/session/${classSessionId}${qs}`
      ),
    enabled: classSessionId !== null,
  });
}

// ─── 7. Online check-in ───────────────────────────────────────────────────────

export function useOnlineCheckin() {
  const qc = useQueryClient();
  return useMutation<{ onlineClickedAt: string }, Error, { classSessionId: string; studentId?: string }>({
    mutationFn: ({ classSessionId, studentId }) => {
      const qs = studentId ? `?studentId=${studentId}` : "";
      return apiPost<{ onlineClickedAt: string }>(
        `/api/my-space/calendar/student/session/${classSessionId}/online-click${qs}`
      );
    },
    onSuccess: (_data, { classSessionId }) => {
      qc.invalidateQueries({ queryKey: ["session-detail", classSessionId] });
    },
  });
}

// ─── 8. Online check-out ──────────────────────────────────────────────────────

export function useOnlineCheckout() {
  const qc = useQueryClient();
  return useMutation<{ onlineEndedAt: string }, Error, { classSessionId: string; studentId?: string }>({
    mutationFn: ({ classSessionId, studentId }) => {
      const qs = studentId ? `?studentId=${studentId}` : "";
      return apiPost<{ onlineEndedAt: string }>(
        `/api/my-space/calendar/student/session/${classSessionId}/online-end${qs}`
      );
    },
    onSuccess: (_data, { classSessionId }) => {
      qc.invalidateQueries({ queryKey: ["session-detail", classSessionId] });
    },
  });
}

// ─── 9. Test content attempt ──────────────────────────────────────────────────

export function useTestContentAttempt() {
  return useMutation<
    TestAttemptResponse,
    Error,
    { testSessionId?: string; contentId: string; contentType: "exam" | "assignment"; studentId?: string; maxAttempts?: number }
  >({
    mutationFn: (body) => apiPost<TestAttemptResponse>("/api/my-space/test-content-attempt", body),
  });
}
