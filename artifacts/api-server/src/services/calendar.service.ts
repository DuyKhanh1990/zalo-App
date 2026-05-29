/**
 * Calendar Service — currently returns mock data.
 *
 * TO SWAP TO REAL DB:
 *   Replace each method body with a Drizzle/pg query.
 *   The route handlers and frontend never change.
 */

import {
  MOCK_STUDENT,
  MOCK_CLASSES,
  MOCK_SESSIONS,
  buildGeneralContents,
  buildPersonalContents,
  buildReviewData,
  todayStr,
} from "../mock/student.js";

// In-memory state for online check-in/out and test attempts.
// When swapping to DB, store these in a sessions table instead.
const onlineClickedAtMap = new Map<string, string>();
const onlineEndedAtMap = new Map<string, string>();
const testAttemptMap = new Map<string, number>();

// ─── 1. User type ─────────────────────────────────────────────────────────────

export function getUserType() {
  return { userType: MOCK_STUDENT.userType };
}

// ─── 2. Calendar month ────────────────────────────────────────────────────────

export function getCalendarMonth(month: string, _studentId?: string) {
  const [y, m] = month.split("-").map(Number);
  const start = `${y}-${String(m).padStart(2, "0")}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const end = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const sessions = MOCK_SESSIONS.filter(
    (s) => s.sessionDate >= start && s.sessionDate <= end
  ).map((s) => ({
    classSessionId: s.classSessionId,
    studentSessionId: s.studentSessionId,
    sessionDate: s.sessionDate,
    weekday: s.weekday,
    className: s.className,
    classCode: s.classCode,
    startTime: s.startTime,
    endTime: s.endTime,
    learningFormat: s.learningFormat,
    onlineLink: s.onlineLink,
    locationId: s.locationId,
    locationName: s.locationName,
    teacherNames: s.teacherNames,
    enrolledCount: s.enrolledCount,
    sessionStatus: s.sessionStatus,
    attendanceStatus: s.attendanceStatus,
    studentId: MOCK_STUDENT.studentId,
    studentName: MOCK_STUDENT.studentName,
    studentCode: MOCK_STUDENT.studentCode,
    isTestSession: s.isTestSession,
  }));

  const datesWithSessions = [...new Set(sessions.map((s) => s.sessionDate))];

  return { month, datesWithSessions, sessions };
}

// ─── 3. Session list grouped by class ────────────────────────────────────────

export function getClassSessionList(_studentId?: string) {
  const classMap = new Map<string, { classId: string; className: string; classCode: string; sessions: object[] }>();

  for (const s of MOCK_SESSIONS) {
    if (!classMap.has(s.classId)) {
      classMap.set(s.classId, {
        classId: s.classId,
        className: s.className,
        classCode: s.classCode,
        sessions: [],
      });
    }
    const entry = classMap.get(s.classId)!;
    const sessionIndex = (entry.sessions.length as number) + 1;
    entry.sessions.push({
      classSessionId: s.classSessionId,
      sessionIndex,
      sessionDate: s.sessionDate,
      startTime: s.startTime,
      endTime: s.endTime,
      attendanceStatus: s.attendanceStatus,
      attendanceNote: s.attendanceNote,
    });
  }

  return Array.from(classMap.values());
}

// ─── 4. Student's enrolled classes ───────────────────────────────────────────

export function getStudentClasses(_studentId?: string) {
  return MOCK_CLASSES.map((c) => ({
    classId: c.classId,
    className: c.className,
    classCode: c.classCode,
    totalSessions: c.totalSessions,
  }));
}

// ─── 5. Sessions by class (paginated) ────────────────────────────────────────

export function getClassSessions(
  classId: string,
  page: number,
  pageSize: number,
  _studentId?: string
) {
  const allSessions = MOCK_SESSIONS.filter((s) => s.classId === classId);
  const total = allSessions.length;
  const totalPages = Math.ceil(total / pageSize);
  const pageRows = allSessions.slice((page - 1) * pageSize, page * pageSize);

  const sessions = pageRows.map((s, idx) => ({
    classSessionId: s.classSessionId,
    sessionIndex: (page - 1) * pageSize + idx + 1,
    sessionDate: s.sessionDate,
    startTime: s.startTime,
    endTime: s.endTime,
    attendanceStatus: s.attendanceStatus,
    attendanceNote: s.attendanceNote,
  }));

  return { sessions, total, page, pageSize, totalPages };
}

// ─── 6. Session detail ────────────────────────────────────────────────────────

export function getSessionDetail(classSessionId: string, studentId?: string) {
  const session = MOCK_SESSIONS.find((s) => s.classSessionId === classSessionId);
  if (!session) return null;

  const { reviewPublished, reviewSubject, reviewData } = buildReviewData(session);
  const isParent = studentId && studentId !== MOCK_STUDENT.studentId;

  return {
    classSessionId: session.classSessionId,
    studentSessionId: session.studentSessionId,
    sessionDate: session.sessionDate,
    weekday: session.weekday,
    className: session.className,
    classCode: session.classCode,
    startTime: session.startTime,
    endTime: session.endTime,
    learningFormat: session.learningFormat,
    onlineLink: session.onlineLink,
    sessionStatus: session.sessionStatus,
    teacherNames: session.teacherNames,
    attendanceStatus: session.attendanceStatus,
    attendanceNote: session.attendanceNote,
    reviewPublished,
    reviewSubject,
    reviewData,
    generalContents: buildGeneralContents(session),
    personalContents: buildPersonalContents(session),
    userType: MOCK_STUDENT.userType,
    studentId: MOCK_STUDENT.studentId,
    enrolledCount: session.enrolledCount,
    ...(isParent ? { studentName: MOCK_STUDENT.studentName, studentCode: MOCK_STUDENT.studentCode } : {}),
    onlineClickedAt: onlineClickedAtMap.get(classSessionId) ?? null,
    onlineEndedAt: onlineEndedAtMap.get(classSessionId) ?? null,
  };
}

// ─── 7. Online check-in ───────────────────────────────────────────────────────

export function onlineCheckin(classSessionId: string, _studentId?: string) {
  const ts = new Date().toISOString();
  onlineClickedAtMap.set(classSessionId, ts);
  return { onlineClickedAt: ts };
}

// ─── 8. Online check-out ──────────────────────────────────────────────────────

export function onlineCheckout(classSessionId: string, _studentId?: string) {
  if (!onlineClickedAtMap.has(classSessionId)) {
    return { error: "Chưa check-in vào lớp online. Vui lòng nhấn 'Vào lớp' trước." };
  }
  const ts = new Date().toISOString();
  onlineEndedAtMap.set(classSessionId, ts);
  return { onlineEndedAt: ts };
}

// ─── 9. Test content attempt ──────────────────────────────────────────────────

export function recordTestAttempt(
  contentId: string,
  maxAttempts: number,
  studentId: string = MOCK_STUDENT.studentId
) {
  const key = `${contentId}-${studentId}`;
  const used = (testAttemptMap.get(key) ?? 0) + 1;
  testAttemptMap.set(key, used);
  return { allowed: used <= maxAttempts, attemptsUsed: used, maxAttempts };
}
