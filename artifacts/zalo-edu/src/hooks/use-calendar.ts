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

/** Returns true only for real HTTP(S) file URLs — not UUIDs or relative paths. */
function isFileUrl(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}

export function normalizeSessionContent(item: SessionContent): SessionContent {
  const raw = item as SessionContent & Record<string, unknown>;

  let attachments = item.attachments ?? [];

  if (!Array.isArray(attachments) || attachments.length === 0) {
    const candidates: SessionContentAttachment[] = [];

    const files =
      raw["files"] ??
      raw["resources"] ??
      raw["materials"] ??
      raw["attachedFiles"] ??
      raw["fileAttachments"] ??
      raw["lessonFiles"] ??
      raw["contentFiles"];
    if (Array.isArray(files)) {
      for (const f of files as Record<string, unknown>[]) {
        const url = (f["url"] ?? f["fileUrl"] ?? f["link"] ?? f["path"] ?? f["downloadUrl"] ?? "") as string;
        const name = (f["name"] ?? f["fileName"] ?? f["title"] ?? f["originalName"] ?? guessAttachmentName(url, item.type)) as string;
        if (url) candidates.push({ name, url });
      }
    }

    // Single resource URL fallback — only for real HTTP(S) URLs, not CRM UUIDs
    const singleUrl = (item.resourceUrl ?? raw["fileUrl"] ?? raw["url"] ?? raw["link"] ?? "") as string;
    if (candidates.length === 0 && singleUrl && isFileUrl(singleUrl)) {
      candidates.push({ name: guessAttachmentName(singleUrl, item.type), url: singleUrl });
    }

    attachments = candidates;
  }

  // Normalize title fallback
  const title = (item.title ?? (raw["name"] as string) ?? (raw["lessonName"] as string) ?? "") as string;

  return { ...item, title, attachments };
}

/**
 * Normalize a single raw CRM content item to SessionContent shape.
 * Handles the many field name variants across CRM versions.
 */
function normalizeContentItem(raw: Record<string, unknown>, index: number): SessionContent {
  const id = String(raw["id"] ?? raw["_id"] ?? raw["contentId"] ?? raw["lessonId"] ?? index);
  const type = String(
    raw["type"] ?? raw["contentType"] ?? raw["lessonType"] ?? raw["category"] ?? "Bài học"
  );
  const title = String(
    raw["title"] ?? raw["name"] ?? raw["lessonName"] ?? raw["contentName"] ?? raw["subject"] ?? ""
  );
  const description = (
    raw["description"] ?? raw["content"] ?? raw["note"] ?? raw["detail"] ?? raw["summary"]
  ) as string | undefined;
  const resourceUrl = (
    raw["resourceUrl"] ?? raw["fileUrl"] ?? raw["url"] ?? raw["link"] ?? raw["attachmentUrl"]
  ) as string | undefined;
  const availableAt = (raw["availableAt"] ?? raw["openAt"] ?? raw["unlockAt"]) as string | undefined;
  const maxAttempts = raw["maxAttempts"] != null ? Number(raw["maxAttempts"]) : undefined;

  // Collect attachments from all possible sub-fields
  const rawAttachments =
    raw["attachments"] ?? raw["files"] ?? raw["resources"] ?? raw["materials"] ??
    raw["attachedFiles"] ?? raw["fileAttachments"] ?? raw["lessonFiles"];
  let attachments: SessionContentAttachment[] | undefined;
  if (Array.isArray(rawAttachments) && rawAttachments.length > 0) {
    attachments = (rawAttachments as Record<string, unknown>[]).map((f) => ({
      url: String(f["url"] ?? f["fileUrl"] ?? f["link"] ?? f["path"] ?? f["downloadUrl"] ?? ""),
      name: String(f["name"] ?? f["fileName"] ?? f["title"] ?? f["originalName"] ?? guessAttachmentName(String(f["url"] ?? ""), type)),
    })).filter((a) => a.url !== "");
  } else if (resourceUrl && isFileUrl(resourceUrl)) {
    // Only fall back to resourceUrl if it's a real HTTP(S) URL — not a CRM UUID
    attachments = [{ url: resourceUrl, name: guessAttachmentName(resourceUrl, type) }];
  }

  const partial: SessionContent = { id, type, title };
  if (description) partial.description = description;
  if (resourceUrl) partial.resourceUrl = resourceUrl;
  if (attachments) partial.attachments = attachments;
  if (availableAt) partial.availableAt = availableAt;
  if (maxAttempts != null && !isNaN(maxAttempts)) partial.maxAttempts = maxAttempts;
  return partial;
}

/**
 * Normalize the raw CRM session detail response.
 * The CRM may use many different field names for the same concepts across versions.
 */
export function normalizeSessionDetail(raw: Record<string, unknown>): Partial<SessionDetail> {
  // ── Try to find generalContents ──────────────────────────────────────────
  const generalRaw =
    raw["generalContents"] ??
    raw["contents"] ??
    raw["sessionContents"] ??
    raw["classContents"] ??
    raw["lessonContents"] ??
    raw["lessons"] ??
    raw["materials"] ??
    raw["items"] ??
    null;

  // ── Try to find personalContents ─────────────────────────────────────────
  const personalRaw =
    raw["personalContents"] ??
    raw["studentContents"] ??
    raw["personalLessons"] ??
    raw["myContents"] ??
    raw["studentMaterials"] ??
    null;

  function toContentArray(val: unknown): SessionContent[] | undefined {
    if (!Array.isArray(val) || val.length === 0) return undefined;
    return (val as Record<string, unknown>[]).map((item, i) => {
      const normalized = normalizeContentItem(item, i);
      return normalizeSessionContent(normalized);
    });
  }

  const result: Partial<SessionDetail> = {};

  // If CRM already provides split arrays, use them directly
  if (Array.isArray(raw["generalContents"]) || Array.isArray(raw["personalContents"])) {
    const gc = toContentArray(raw["generalContents"]);
    const pc = toContentArray(raw["personalContents"]);
    if (gc) result.generalContents = gc;
    if (pc) result.personalContents = pc;
    return result;
  }

  // Otherwise try the fallback field and put everything in generalContents
  const gc = toContentArray(generalRaw);
  const pc = toContentArray(personalRaw);
  if (gc) result.generalContents = gc;
  if (pc) result.personalContents = pc;

  return result;
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
    queryFn: async () => {
      const raw = await apiFetch<Record<string, unknown>>(
        `/api/my-space/calendar/student/session/${classSessionId}${qs}`
      );
      const normalized = normalizeSessionDetail(raw);
      return { ...raw, ...normalized } as SessionDetail;
    },
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
