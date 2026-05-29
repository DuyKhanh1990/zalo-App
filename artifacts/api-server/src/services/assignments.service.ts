/**
 * Assignments Service — returns mock data in the real API format.
 * TO SWAP TO REAL DB: replace method bodies with Drizzle queries.
 */

import { MOCK_SESSIONS, MOCK_CLASSES, MOCK_STUDENT } from "../mock/student.js";

const todayStr = () => new Date().toISOString().split("T")[0];

// In-memory submission store: homeworkId → submission
const submissionStore = new Map<
  string,
  { submissionContent?: string; submissionAttachments?: string[]; submittedAt: string }
>();

function deterministicScore(seed: string): string {
  let h = 0;
  for (const c of seed) h = ((h * 31 + c.charCodeAt(0)) | 0) >>> 0;
  const score = 5.0 + (h % 50) / 10;
  return score.toFixed(1);
}

const HW_DESCRIPTIONS: Record<string, string[]> = {
  "cls-toan-a1": [
    "Làm bài tập từ 1 đến 10 trang 87 trong sách giáo trình. Trình bày rõ ràng từng bước giải.",
    "Ôn tập lý thuyết chương 5: Tích phân. Giải các bài toán ứng dụng tích phân trong thực tế.",
    "Hoàn thành bài tập phần Đạo hàm và vi phân. Chú ý các dạng hàm hợp và hàm ngược.",
  ],
  "cls-vl-dai-cuong": [
    "Giải 5 bài tập cơ học chất điểm trang 112. Vẽ đồ thị vận tốc-thời gian cho bài 3.",
    "Ôn tập định luật Newton. Làm bài tập tổng hợp cuối chương 3.",
    "Bài tập Điện từ học: tính điện trường và từ trường trong các cấu hình cho trước.",
  ],
  "cls-hoa-huu-co": [
    "Viết phương trình phản ứng và cơ chế cho 5 phản ứng hữu cơ trong bài tập trang 78.",
    "Lab report: Báo cáo thực hành tổng hợp hợp chất hữu cơ số 3. Tính hiệu suất phản ứng.",
    "Ôn tập danh pháp IUPAC và tính chất các nhóm chức chính.",
  ],
  "cls-tieng-anh-b2": [
    "Listening Unit 9: nghe và điền vào chỗ trống. Viết tóm tắt 150 từ về chủ đề Technology.",
    "Grammar: ôn tập Conditionals loại 1, 2, 3. Làm bài tập trang 56–57.",
    "Writing task: viết bài luận 300 từ về 'Advantages of remote work'.",
  ],
  "cls-lap-trinh-python": [
    "Hoàn thành 3 bài tập trên HackerRank: Two Sum, Palindrome Check và Fibonacci Sequence.",
    "Xây dựng chương trình quản lý sinh viên đơn giản với Python OOP. Nộp file .py.",
    "Bài tập xử lý dữ liệu với Pandas: đọc CSV, lọc và thống kê theo yêu cầu.",
  ],
};

function getHwDescription(classId: string, counter: number): string {
  const list = HW_DESCRIPTIONS[classId] ?? ["Hoàn thành bài tập theo yêu cầu của giáo viên."];
  return list[counter % list.length];
}

function buildRows(sessions: typeof MOCK_SESSIONS) {
  const rows = [];
  let hwCounter = 0;

  for (const session of sessions) {
    hwCounter++;
    const isPast = session.sessionDate < todayStr();
    const cls = MOCK_CLASSES.find((c) => c.classId === session.classId)!;

    if (session.isTestSession) {
      // Bài kiểm tra row
      const examId = `exam-${session.classSessionId}`;
      const hwId = `exam-hw-${session.classSessionId}`;
      const isSubmitted = isPast;
      rows.push({
        classSessionId: session.classSessionId,
        classId: session.classId,
        className: session.className,
        classCode: session.classCode,
        sessionDate: session.sessionDate,
        weekday: session.weekday,
        startTime: session.startTime,
        endTime: session.endTime,
        sessionIndex: session.sessionIndex,
        studentId: MOCK_STUDENT.studentId,
        studentName: MOCK_STUDENT.studentName,
        itemType: "Bài kiểm tra" as const,
        homeworkId: hwId,
        homeworkTitle: session.className,
        homeworkDescription: "Bài kiểm tra 45 phút, nội dung chương 1–4. Mang theo máy tính khoa học.",
        homeworkAttachments: [] as { name: string; url: string }[],
        isPersonalized: false,
        submissionStatus: isSubmitted ? ("submitted" as const) : ("pending" as const),
        submissionContent: undefined as string | undefined,
        submissionAttachments: [] as string[],
        studentSessionContentId: `ssc-${session.classSessionId}-exam`,
        score: isSubmitted ? deterministicScore(hwId) : null,
        comment: isSubmitted ? "Kết quả kiểm tra đã được ghi nhận." : null,
        examId,
      });
    } else {
      // BTVN row
      const hwId = `hw-${session.classSessionId}`;
      const storedSub = submissionStore.get(hwId);
      const autoSubmitted = isPast && hwCounter % 3 !== 0;
      const isSubmitted = !!storedSub || autoSubmitted;
      const hasScore = isSubmitted && isPast;

      rows.push({
        classSessionId: session.classSessionId,
        classId: session.classId,
        className: cls.className,
        classCode: session.classCode,
        sessionDate: session.sessionDate,
        weekday: session.weekday,
        startTime: session.startTime,
        endTime: session.endTime,
        sessionIndex: session.sessionIndex,
        studentId: MOCK_STUDENT.studentId,
        studentName: MOCK_STUDENT.studentName,
        itemType: "BTVN" as const,
        homeworkId: hwId,
        homeworkTitle: `Bài tập – Buổi ${session.sessionIndex} (${cls.classCode})`,
        homeworkDescription: getHwDescription(session.classId, hwCounter),
        homeworkAttachments: isPast
          ? [{ name: "TaiLieu_BuoiHoc.pdf", url: "/uploads/tailieubuoihoc.pdf" }]
          : [],
        isPersonalized: hwCounter % 5 === 0,
        submissionStatus: isSubmitted ? ("submitted" as const) : ("pending" as const),
        submissionContent: storedSub?.submissionContent ?? (autoSubmitted ? "Đã hoàn thành bài tập theo yêu cầu của giáo viên." : undefined),
        submissionAttachments: storedSub?.submissionAttachments ?? [],
        studentSessionContentId: `ssc-${session.classSessionId}-hw`,
        score: hasScore ? deterministicScore(hwId) : null,
        comment:
          hasScore && hwCounter % 2 === 0
            ? "Bài làm tốt, trình bày rõ ràng. Cần bổ sung thêm bước chứng minh ở bài 3."
            : null,
        examId: null,
      });
    }
  }

  return rows;
}

export function getAssignments(month?: string, dateFrom?: string, dateTo?: string) {
  let start: string, end: string, resolvedMonth: string;

  if (dateFrom && dateTo) {
    start = dateFrom;
    end = dateTo;
    resolvedMonth = dateFrom.slice(0, 7);
  } else {
    const target = month ?? new Date().toISOString().slice(0, 7);
    const [y, m] = target.split("-").map(Number);
    start = `${y}-${String(m).padStart(2, "0")}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    end = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    resolvedMonth = target;
  }

  const sessions = MOCK_SESSIONS.filter(
    (s) => s.sessionDate >= start && s.sessionDate <= end
  );
  return { month: resolvedMonth, rows: buildRows(sessions) };
}

export function submitAssignment(
  homeworkId: string,
  submissionContent?: string,
  submissionAttachments?: string[]
) {
  submissionStore.set(homeworkId, {
    submissionContent,
    submissionAttachments: submissionAttachments ?? [],
    submittedAt: new Date().toISOString(),
  });
  return { success: true };
}
