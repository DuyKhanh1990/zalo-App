/**
 * Centralized mock data for the student "Nguyễn Văn An" (HV-2024-001).
 *
 * HOW TO SWAP TO REAL DATA:
 *   Each service in `../services/` imports helpers from this file.
 *   To use real DB, replace the service method body with a DB query —
 *   the route handlers and UI never need to change.
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function datePlus(base: string, days: number): string {
  const d = new Date(base + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─── Student profile ──────────────────────────────────────────────────────────

export const MOCK_STUDENT = {
  studentId: "stu-001",
  studentName: "Nguyễn Văn An",
  studentCode: "HV-2024-001",
  userType: "student" as const,
};

// ─── Classes ──────────────────────────────────────────────────────────────────

export interface MockClass {
  classId: string;
  className: string;
  classCode: string;
  totalSessions: number;
  learningFormat: "offline" | "online";
  onlineLink?: string;
  teacherNames: string[];
}

export const MOCK_CLASSES: MockClass[] = [
  {
    classId: "cls-toan-a1",
    className: "Toán nâng cao A1",
    classCode: "TOAN-A1",
    totalSessions: 24,
    learningFormat: "offline",
    teacherNames: ["Nguyễn Thị Bích Ngọc"],
  },
  {
    classId: "cls-vl-dai-cuong",
    className: "Vật lý đại cương",
    classCode: "VL-DU",
    totalSessions: 20,
    learningFormat: "online",
    onlineLink: "https://meet.example.com/vl-dai-cuong",
    teacherNames: ["Trần Văn Minh"],
  },
  {
    classId: "cls-hoa-huu-co",
    className: "Hóa học hữu cơ",
    classCode: "CHEM-HUU",
    totalSessions: 18,
    learningFormat: "offline",
    teacherNames: ["Lê Thị Hương"],
  },
  {
    classId: "cls-tieng-anh-b2",
    className: "Tiếng Anh B2",
    classCode: "ENG-B2",
    totalSessions: 30,
    learningFormat: "online",
    onlineLink: "https://meet.example.com/eng-b2",
    teacherNames: ["Phạm Ngọc Lan"],
  },
  {
    classId: "cls-lap-trinh-python",
    className: "Lập trình Python",
    classCode: "PY-2026",
    totalSessions: 20,
    learningFormat: "online",
    onlineLink: "https://meet.example.com/python-2026",
    teacherNames: ["Đỗ Quang Huy"],
  },
];

// ─── Session templates ────────────────────────────────────────────────────────

interface SessionTemplate {
  classId: string;
  dayOffset: number;
  startTime: string;
  endTime: string;
  room?: string;
  isTest?: boolean;
}

const TODAY = todayStr();

const SESSION_TEMPLATES: SessionTemplate[] = [
  // === Current week (Today = May 26) ===
  { classId: "cls-toan-a1", dayOffset: 0, startTime: "08:00", endTime: "10:00", room: "P.201 – Cơ sở 1" },
  { classId: "cls-vl-dai-cuong", dayOffset: 0, startTime: "14:00", endTime: "16:00", room: "P.305 – Cơ sở 1" },
  { classId: "cls-hoa-huu-co", dayOffset: 1, startTime: "09:00", endTime: "11:00", room: "P.102 – Cơ sở 2" },
  { classId: "cls-tieng-anh-b2", dayOffset: 2, startTime: "13:30", endTime: "15:30" },
  { classId: "cls-toan-a1", dayOffset: 3, startTime: "08:00", endTime: "10:00", room: "P.201 – Cơ sở 1" },
  { classId: "cls-lap-trinh-python", dayOffset: 4, startTime: "15:00", endTime: "17:00" },
  // === Previous week (history) ===
  { classId: "cls-toan-a1", dayOffset: -7, startTime: "08:00", endTime: "10:00", room: "P.201 – Cơ sở 1" },
  { classId: "cls-vl-dai-cuong", dayOffset: -7, startTime: "14:00", endTime: "16:00", room: "P.305 – Cơ sở 1" },
  { classId: "cls-tieng-anh-b2", dayOffset: -5, startTime: "13:30", endTime: "15:30" },
  { classId: "cls-hoa-huu-co", dayOffset: -4, startTime: "09:00", endTime: "11:00", room: "P.102 – Cơ sở 2" },
  { classId: "cls-lap-trinh-python", dayOffset: -3, startTime: "15:00", endTime: "17:00" },
  // === Two weeks ago ===
  { classId: "cls-toan-a1", dayOffset: -14, startTime: "08:00", endTime: "10:00", room: "P.201 – Cơ sở 1" },
  { classId: "cls-vl-dai-cuong", dayOffset: -14, startTime: "14:00", endTime: "16:00", room: "P.305 – Cơ sở 1" },
  { classId: "cls-tieng-anh-b2", dayOffset: -12, startTime: "13:30", endTime: "15:30" },
  { classId: "cls-hoa-huu-co", dayOffset: -11, startTime: "09:00", endTime: "11:00", room: "P.102 – Cơ sở 2" },
  // === Next week ===
  { classId: "cls-toan-a1", dayOffset: 7, startTime: "08:00", endTime: "10:00", room: "P.201 – Cơ sở 1" },
  { classId: "cls-lap-trinh-python", dayOffset: 8, startTime: "15:00", endTime: "17:00" },
  { classId: "cls-vl-dai-cuong", dayOffset: 9, startTime: "14:00", endTime: "16:00", room: "P.305 – Cơ sở 1" },
  { classId: "cls-tieng-anh-b2", dayOffset: 10, startTime: "13:30", endTime: "15:30" },
  // === Test sessions ===
  { classId: "cls-vl-dai-cuong", dayOffset: -10, startTime: "14:00", endTime: "16:00", room: "P.Hội trường B", isTest: true },
  { classId: "cls-tieng-anh-b2", dayOffset: 3, startTime: "13:30", endTime: "15:30", isTest: true },
  { classId: "cls-toan-a1", dayOffset: 12, startTime: "07:30", endTime: "09:30", room: "P.Hội trường A", isTest: true },
  // === Two weeks ahead ===
  { classId: "cls-hoa-huu-co", dayOffset: 15, startTime: "09:00", endTime: "11:00", room: "P.102 – Cơ sở 2" },
  { classId: "cls-toan-a1", dayOffset: 14, startTime: "08:00", endTime: "10:00", room: "P.201 – Cơ sở 1" },
  { classId: "cls-tieng-anh-b2", dayOffset: 17, startTime: "13:30", endTime: "15:30" },
  { classId: "cls-lap-trinh-python", dayOffset: 16, startTime: "15:00", endTime: "17:00" },
];

// ─── Generated sessions ───────────────────────────────────────────────────────

export interface MockSession {
  classSessionId: string;
  studentSessionId: string;
  classId: string;
  sessionDate: string;
  weekday: number;
  className: string;
  classCode: string;
  startTime: string;
  endTime: string;
  learningFormat: "offline" | "online";
  onlineLink?: string;
  locationId?: string;
  locationName?: string;
  teacherNames: string[];
  enrolledCount: number;
  sessionStatus: "scheduled" | "completed" | "cancelled";
  attendanceStatus: "present" | "absent" | "late" | null;
  attendanceNote: string | null;
  isTestSession: boolean;
  sessionIndex: number;
}

export const MOCK_SESSIONS: MockSession[] = SESSION_TEMPLATES.map((t, idx) => {
  const cls = MOCK_CLASSES.find((c) => c.classId === t.classId)!;
  const sessionDate = datePlus(TODAY, t.dayOffset);
  const isPast = sessionDate < TODAY;
  const isToday = sessionDate === TODAY;

  // Build a unique test name if it's a test
  let className = cls.className;
  if (t.isTest) className = `Kiểm tra giữa kỳ – ${cls.className}`;

  return {
    classSessionId: `session-${idx + 1}`,
    studentSessionId: `stu-session-${idx + 1}`,
    classId: cls.classId,
    sessionDate,
    weekday: new Date(sessionDate + "T00:00:00").getDay(),
    className,
    classCode: cls.classCode,
    startTime: t.startTime,
    endTime: t.endTime,
    learningFormat: cls.learningFormat,
    onlineLink: cls.onlineLink,
    locationId: t.room ?? undefined,
    locationName: t.room ?? undefined,
    teacherNames: cls.teacherNames,
    enrolledCount: 18,
    sessionStatus: (isPast ? "completed" : "scheduled") as MockSession["sessionStatus"],
    attendanceStatus: (isPast ? (isToday ? null : "present") : null) as MockSession["attendanceStatus"],
    attendanceNote: null,
    isTestSession: t.isTest ?? false,
    sessionIndex: idx + 1,
  };
}).sort((a, b) => a.sessionDate.localeCompare(b.sessionDate) || a.startTime.localeCompare(b.startTime));

// ─── Session content factory ──────────────────────────────────────────────────

export interface MockContentAttachment {
  name: string;
  url: string;
}

export interface MockContent {
  id: string;
  type: string;
  title: string;
  description?: string;
  resourceUrl?: string;
  attachments?: MockContentAttachment[];
  availableAt?: string;
  maxAttempts?: number;
}

export function buildGeneralContents(session: MockSession): MockContent[] {
  const isPast = session.sessionDate < todayStr();
  return [
    {
      id: `${session.classSessionId}-gc-1`,
      type: "Bài học",
      title: `Lý thuyết: ${session.className}`,
      description: "Nội dung bài giảng theo giáo trình chính thức. Học viên cần đọc trước chương tương ứng.",
      attachments: [
        {
          name: `Giáo trình – ${session.className}.pdf`,
          url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        },
      ],
      availableAt: `${session.sessionDate}T00:00:00Z`,
    },
    {
      id: `${session.classSessionId}-gc-2`,
      type: "Slide bài giảng",
      title: `Slide ${session.className} – Buổi ${session.sessionIndex}`,
      description: "Slide trình chiếu sử dụng trong buổi học. Tải về để ôn tập.",
      attachments: [
        {
          name: `Slide buổi ${session.sessionIndex}.pdf`,
          url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        },
      ],
      availableAt: `${session.sessionDate}T00:00:00Z`,
    },
    {
      id: `${session.classSessionId}-gc-3`,
      type: "Bài tập về nhà",
      title: "Bài tập thực hành cuối buổi",
      description: "Hoàn thành trước buổi học tiếp theo. Nộp bài qua hệ thống hoặc trực tiếp cho giáo viên.",
      attachments: isPast
        ? [
            {
              name: "Đề bài tập thực hành.pdf",
              url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
            },
            {
              name: "Hình minh họa.jpg",
              url: "https://upload.wikimedia.org/wikipedia/commons/a/a7/Camponotus_flavomarginatus_ant.jpg",
            },
          ]
        : undefined,
      availableAt: `${session.sessionDate}T${session.endTime}:00Z`,
      maxAttempts: 1,
    },
    ...(isPast
      ? [
          {
            id: `${session.classSessionId}-gc-4`,
            type: "Video ghi lại",
            title: `Ghi lại buổi học – ${session.className}`,
            description: "Video ghi lại toàn bộ buổi học. Xem lại để ôn tập.",
            attachments: [
              {
                name: `Video ghi lại buổi ${session.sessionIndex}.mp4`,
                url: "https://sample-videos.com/video321/mp4/240/big_buck_bunny_240p_1mb.mp4",
              },
            ],
            availableAt: `${session.sessionDate}T${session.endTime}:00Z`,
          },
        ]
      : []),
  ];
}

export function buildPersonalContents(session: MockSession): MockContent[] {
  const isPast = session.sessionDate < todayStr();
  if (!isPast) return [];
  return [
    {
      id: `${session.classSessionId}-pc-1`,
      type: "Bài kiểm tra",
      title: "Kiểm tra nhanh cuối buổi",
      description: "Bài kiểm tra 15 câu trắc nghiệm ôn lại kiến thức buổi học.",
      attachments: [
        {
          name: "Đề kiểm tra.pdf",
          url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        },
      ],
      maxAttempts: 2,
    },
  ];
}

export function buildReviewData(session: MockSession) {
  const isPast = session.sessionDate < todayStr();
  if (!isPast) return { reviewPublished: false, reviewSubject: null, reviewData: [] };
  return {
    reviewPublished: true,
    reviewSubject: session.className,
    reviewData: [
      {
        teacherName: (MOCK_CLASSES.find((c) => c.classId === session.classId)?.teacherNames[0]) ?? "Giáo viên",
        criteria: [
          {
            criteriaName: "Thái độ & tham gia",
            items: [
              { subCriteriaName: "Thái độ học", comment: "<p>Học viên tập trung và chú ý bài giảng. Tham gia tích cực các hoạt động nhóm.</p>" },
              { subCriteriaName: "Tham gia phát biểu", comment: "<p>Trả lời đúng 3/4 câu hỏi trong giờ. Phát biểu chủ động và tự tin hơn so với buổi trước.</p>" },
            ],
          },
          {
            criteriaName: "Học lực",
            items: [
              { subCriteriaName: "Mức độ hiểu bài", comment: "<p>Nắm được khoảng 80% nội dung chương. Cần ôn luyện thêm phần bài tập ứng dụng.</p>" },
              { subCriteriaName: "Bài tập về nhà", comment: "" },
            ],
          },
        ],
      },
    ],
  };
}

// ─── Homework ─────────────────────────────────────────────────────────────────

export interface MockHomework {
  id: number;
  type: "btvn" | "kiemtra";
  title: string;
  subject: string;
  className: string;
  dueDate: string;
  startTime: string;
  endTime: string;
  status: "pending" | "submitted" | "graded";
  description: string;
  teacher: string;
}

export const MOCK_HOMEWORK: MockHomework[] = [
  // Pending
  { id: 1, type: "btvn", title: "Bài tập Chương 5 – Tích phân", subject: "Toán nâng cao A1", className: "TOAN-A1-2026", dueDate: datePlus(TODAY, 2), startTime: "08:00", endTime: "10:00", status: "pending", description: "Làm bài tập từ 5.1 đến 5.8 trong sách giáo trình. Chú ý các bài tập phần tích phân từng phần.", teacher: "Nguyễn Thị Bích Ngọc" },
  { id: 2, type: "btvn", title: "Essay: Describe your hometown", subject: "Tiếng Anh B2", className: "ENG-B2-2026", dueDate: datePlus(TODAY, 3), startTime: "13:30", endTime: "15:30", status: "pending", description: "Viết bài luận 250–300 từ miêu tả quê hương. Sử dụng Past Simple và Present Perfect.", teacher: "Phạm Ngọc Lan" },
  { id: 3, type: "kiemtra", title: "Kiểm tra 15 phút – Chương 3", subject: "Vật lý đại cương", className: "PHY-2026", dueDate: datePlus(TODAY, 4), startTime: "14:00", endTime: "16:00", status: "pending", description: "Kiểm tra lý thuyết và bài tập chương 3: Cơ học chất điểm. Mang theo máy tính khoa học.", teacher: "Trần Văn Minh" },
  { id: 4, type: "btvn", title: "Lab report – Thực hành Hóa hữu cơ số 4", subject: "Hóa học hữu cơ", className: "CHEM-HUU-2026", dueDate: datePlus(TODAY, 5), startTime: "09:00", endTime: "11:00", status: "pending", description: "Viết báo cáo thực hành tổng hợp aspirin. Bao gồm: mục đích, cách tiến hành, kết quả, nhận xét.", teacher: "Lê Thị Hương" },
  { id: 5, type: "btvn", title: "Bài tập Python – Vòng lặp và hàm", subject: "Lập trình Python", className: "PY-2026", dueDate: datePlus(TODAY, 6), startTime: "15:00", endTime: "17:00", status: "pending", description: "Hoàn thành 5 bài tập trên HackerRank: FizzBuzz, Fibonacci, Palindrome, Matrix transpose, tìm số nguyên tố.", teacher: "Đỗ Quang Huy" },
  { id: 6, type: "btvn", title: "Bài tập Chương 4 – Giới hạn và liên tục", subject: "Toán nâng cao A1", className: "TOAN-A1-2026", dueDate: TODAY, startTime: "08:00", endTime: "10:00", status: "pending", description: "Bài tập ôn lại giới hạn hàm số và tính liên tục. Tập trung vào dạng vô định 0/0 và ∞/∞.", teacher: "Nguyễn Thị Bích Ngọc" },
  // Submitted
  { id: 7, type: "btvn", title: "Listening – Unit 8: Technology", subject: "Tiếng Anh B2", className: "ENG-B2-2026", dueDate: datePlus(TODAY, -3), startTime: "13:30", endTime: "15:30", status: "submitted", description: "Nghe và trả lời câu hỏi unit 8. Bài tập nghe điền từ vào chỗ trống.", teacher: "Phạm Ngọc Lan" },
  { id: 8, type: "kiemtra", title: "Kiểm tra 15 phút – Chương 2: Động học", subject: "Vật lý đại cương", className: "PHY-2026", dueDate: datePlus(TODAY, -5), startTime: "14:00", endTime: "16:00", status: "submitted", description: "Kiểm tra lý thuyết động học chất điểm. Các công thức vận tốc, gia tốc và chuyển động tròn đều.", teacher: "Trần Văn Minh" },
  { id: 9, type: "btvn", title: "Bài tập Python – Chuỗi và danh sách", subject: "Lập trình Python", className: "PY-2026", dueDate: datePlus(TODAY, -7), startTime: "15:00", endTime: "17:00", status: "submitted", description: "Bài tập xử lý chuỗi: đảo ngược, tìm ký tự, đếm từ. Bài tập danh sách: sắp xếp, lọc, zip.", teacher: "Đỗ Quang Huy" },
  { id: 10, type: "btvn", title: "Báo cáo thực hành Hóa số 3", subject: "Hóa học hữu cơ", className: "CHEM-HUU-2026", dueDate: datePlus(TODAY, -10), startTime: "09:00", endTime: "11:00", status: "submitted", description: "Báo cáo phản ứng điều chế ethyl acetate. Tính hiệu suất phản ứng và giải thích.", teacher: "Lê Thị Hương" },
];

// ─── Grades ───────────────────────────────────────────────────────────────────

export interface MockGrade {
  id: number;
  subject: string;
  semester: string;
  midterm: number;
  final: number;
  average: number;
  letterGrade: string;
  teacher: string;
}

export const MOCK_GRADES: MockGrade[] = [
  // HK1 2025-2026
  { id: 1, subject: "Toán cao cấp A", semester: "HK1 2025-2026", midterm: 7.5, final: 8.0, average: 7.8, letterGrade: "B+", teacher: "Nguyễn Thị Bích Ngọc" },
  { id: 2, subject: "Vật lý đại cương 1", semester: "HK1 2025-2026", midterm: 6.5, final: 7.0, average: 6.8, letterGrade: "B", teacher: "Trần Văn Minh" },
  { id: 3, subject: "Hóa học đại cương", semester: "HK1 2025-2026", midterm: 8.0, final: 9.0, average: 8.6, letterGrade: "A", teacher: "Lê Thị Hương" },
  { id: 4, subject: "Tiếng Anh 1", semester: "HK1 2025-2026", midterm: 9.0, final: 8.5, average: 8.7, letterGrade: "A", teacher: "Phạm Ngọc Lan" },
  { id: 5, subject: "Nhập môn lập trình", semester: "HK1 2025-2026", midterm: 7.0, final: 8.5, average: 7.9, letterGrade: "B+", teacher: "Đỗ Quang Huy" },
  { id: 6, subject: "Giáo dục thể chất", semester: "HK1 2025-2026", midterm: 8.0, final: 8.0, average: 8.0, letterGrade: "B+", teacher: "Lê Văn Phúc" },
  // HK2 2025-2026
  { id: 7, subject: "Toán nâng cao A1", semester: "HK2 2025-2026", midterm: 7.0, final: 7.5, average: 7.3, letterGrade: "B", teacher: "Nguyễn Thị Bích Ngọc" },
  { id: 8, subject: "Vật lý đại cương 2", semester: "HK2 2025-2026", midterm: 6.0, final: 6.5, average: 6.3, letterGrade: "C+", teacher: "Trần Văn Minh" },
  { id: 9, subject: "Hóa học hữu cơ", semester: "HK2 2025-2026", midterm: 8.5, final: 9.0, average: 8.8, letterGrade: "A", teacher: "Lê Thị Hương" },
  { id: 10, subject: "Tiếng Anh B2", semester: "HK2 2025-2026", midterm: 8.0, final: 8.5, average: 8.3, letterGrade: "A-", teacher: "Phạm Ngọc Lan" },
  { id: 11, subject: "Lập trình Python", semester: "HK2 2025-2026", midterm: 9.0, final: 9.5, average: 9.3, letterGrade: "A+", teacher: "Đỗ Quang Huy" },
];

// ─── Invoices ─────────────────────────────────────────────────────────────────

export interface MockInvoice {
  id: number;
  title: string;
  amount: number;
  dueDate: string;
  status: "unpaid" | "overdue" | "paid";
  semester: string;
  category: string;
  paidAt: string | null;
}

export const MOCK_INVOICES: MockInvoice[] = [
  { id: 1, title: "Học phí Học kỳ 2 – 2025-2026", amount: 8500000, dueDate: datePlus(TODAY, 15), status: "unpaid", semester: "HK2 2025-2026", category: "Học phí", paidAt: null },
  { id: 2, title: "Phí tài liệu & giáo trình HK2", amount: 350000, dueDate: datePlus(TODAY, 10), status: "unpaid", semester: "HK2 2025-2026", category: "Tài liệu", paidAt: null },
  { id: 3, title: "Phí bảo hiểm sinh viên 2025-2026", amount: 680000, dueDate: datePlus(TODAY, -10), status: "overdue", semester: "HK2 2025-2026", category: "Bảo hiểm", paidAt: null },
  { id: 4, title: "Phí phòng Lab Hóa học HK2", amount: 250000, dueDate: datePlus(TODAY, -3), status: "overdue", semester: "HK2 2025-2026", category: "Thực hành", paidAt: null },
  { id: 5, title: "Học phí Học kỳ 1 – 2025-2026", amount: 8500000, dueDate: datePlus(TODAY, -120), status: "paid", semester: "HK1 2025-2026", category: "Học phí", paidAt: datePlus(TODAY, -125) },
  { id: 6, title: "Phí thi lại Vật lý đại cương 1", amount: 150000, dueDate: datePlus(TODAY, -90), status: "paid", semester: "HK1 2025-2026", category: "Thi cử", paidAt: datePlus(TODAY, -92) },
  { id: 7, title: "Phí tài liệu học kỳ 1", amount: 320000, dueDate: datePlus(TODAY, -110), status: "paid", semester: "HK1 2025-2026", category: "Tài liệu", paidAt: datePlus(TODAY, -115) },
  { id: 8, title: "Phí hoạt động ngoại khóa HK1", amount: 200000, dueDate: datePlus(TODAY, -60), status: "paid", semester: "HK1 2025-2026", category: "Hoạt động", paidAt: datePlus(TODAY, -62) },
];
