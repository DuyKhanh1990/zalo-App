import { MOCK_CLASSES, MOCK_SESSIONS, MOCK_STUDENT, todayStr } from "../mock/student.js";

const TODAY = todayStr();

interface ScoreCategory {
  categoryId: string;
  categoryName: string;
  score: string | null;
}

interface ScoreSheetRow {
  id: string;
  title: string;
  classId: string;
  scoreSheetId: string | null;
  sessionId: string | null;
  published: boolean;
  createdAt: string;
  updatedAt: string;
  classCode: string;
  className: string;
  scoreSheetName: string | null;
  sessionIndex: number | null;
  sessionDate: string | null;
  scores: ScoreCategory[] | null;
  teacherComment: string | null;
  createdByName: string;
  studentName: string | null;
}

const CATEGORY_SETS: Record<string, { id: string; name: string }[]> = {
  "cls-toan-a1": [
    { id: "cat-toan-1", name: "Điểm kiểm tra miệng" },
    { id: "cat-toan-2", name: "Điểm bài tập về nhà" },
    { id: "cat-toan-3", name: "Điểm kiểm tra 15 phút" },
    { id: "cat-toan-4", name: "Điểm cuối khoá" },
  ],
  "cls-vl-dai-cuong": [
    { id: "cat-vl-1", name: "Điểm kiểm tra lý thuyết" },
    { id: "cat-vl-2", name: "Điểm thực hành" },
    { id: "cat-vl-3", name: "Điểm cuối khoá" },
  ],
  "cls-hoa-huu-co": [
    { id: "cat-hoa-1", name: "Điểm kiểm tra miệng" },
    { id: "cat-hoa-2", name: "Điểm báo cáo thực hành" },
    { id: "cat-hoa-3", name: "Điểm cuối khoá" },
  ],
  "cls-tieng-anh-b2": [
    { id: "cat-eng-1", name: "Điểm Nghe" },
    { id: "cat-eng-2", name: "Điểm Nói" },
    { id: "cat-eng-3", name: "Điểm Đọc" },
    { id: "cat-eng-4", name: "Điểm Viết" },
    { id: "cat-eng-5", name: "Điểm cuối khoá" },
  ],
  "cls-lap-trinh-python": [
    { id: "cat-py-1", name: "Điểm bài tập lập trình" },
    { id: "cat-py-2", name: "Điểm dự án cuối khoá" },
    { id: "cat-py-3", name: "Điểm kiểm tra lý thuyết" },
  ],
};

const SCORE_SHEET_NAMES: Record<string, string[]> = {
  "cls-toan-a1": ["Bảng điểm tháng 4", "Bảng điểm giữa kỳ", "Bảng điểm tháng 5"],
  "cls-vl-dai-cuong": ["Bảng điểm định kỳ", "Bảng điểm cuối khoá"],
  "cls-hoa-huu-co": ["Bảng điểm thực hành", "Bảng điểm lý thuyết"],
  "cls-tieng-anh-b2": ["Bảng điểm kỹ năng", "Bảng điểm tổng kết"],
  "cls-lap-trinh-python": ["Bảng điểm lập trình", "Bảng điểm cuối khoá"],
};

const TEACHERS: Record<string, string> = {
  "cls-toan-a1": "Nguyễn Thị Bích Ngọc",
  "cls-vl-dai-cuong": "Trần Văn Minh",
  "cls-hoa-huu-co": "Lê Thị Hương",
  "cls-tieng-anh-b2": "Phạm Ngọc Lan",
  "cls-lap-trinh-python": "Đỗ Quang Huy",
};

const COMMENTS: Record<string, string[]> = {
  "cls-toan-a1": [
    "Em nắm vững kiến thức cơ bản, trình bày bài làm rõ ràng. Cần cải thiện tốc độ làm bài trong các bài kiểm tra giới hạn thời gian.",
    "Tiến bộ rõ rệt so với tháng trước. Bài tập về nhà hoàn thành đầy đủ và chính xác. Cần ôn thêm phần tích phân ứng dụng.",
  ],
  "cls-vl-dai-cuong": [
    "Phần thực hành tốt, hiểu rõ các khái niệm vật lý. Cần chú ý hơn đến phần bài tập tính toán chính xác.",
    "Em có nền tảng lý thuyết tốt. Bài thực hành cẩn thận và chính xác. Cần trình bày bước giải rõ ràng hơn.",
  ],
  "cls-hoa-huu-co": [
    "Báo cáo thực hành chi tiết và đầy đủ. Hiểu rõ cơ chế phản ứng. Cần cải thiện phần tính toán hiệu suất.",
    "Em học tốt, nắm vững kiến thức hóa hữu cơ. Cần bổ sung thêm ví dụ thực tế trong báo cáo.",
  ],
  "cls-tieng-anh-b2": [
    "Kỹ năng Nghe và Đọc xuất sắc. Kỹ năng Nói cần luyện tập thêm về phát âm và tự tin hơn khi giao tiếp.",
    "Em tiến bộ rõ rệt về kỹ năng Viết. Bài luận có cấu trúc tốt. Cần mở rộng thêm vốn từ vựng học thuật.",
  ],
  "cls-lap-trinh-python": [
    "Code sạch, logic rõ ràng. Dự án cuối khoá sáng tạo và có tính ứng dụng cao. Cần chú ý thêm về tối ưu hoá hiệu suất.",
    "Em nắm vững OOP và các thư viện Python. Bài tập hoàn thành đúng hạn và đầy đủ. Cần bổ sung thêm unit test cho dự án.",
  ],
};

function deterministicFloat(seed: string, min: number, max: number): number {
  let h = 0;
  for (const c of seed) h = ((h * 31 + c.charCodeAt(0)) | 0) >>> 0;
  const range = max - min;
  return Math.round((min + (h % (range * 10)) / 10) * 10) / 10;
}

function buildScoreSheets(): ScoreSheetRow[] {
  const rows: ScoreSheetRow[] = [];
  const pastSessions = MOCK_SESSIONS.filter(
    (s) => s.sessionDate < TODAY && !s.isTestSession
  );

  const seen = new Set<string>();

  for (const session of pastSessions) {
    const cls = MOCK_CLASSES.find((c) => c.classId === session.classId);
    if (!cls) continue;

    const sheetKey = `${session.classId}-${session.sessionIndex}`;
    if (seen.has(sheetKey)) continue;
    seen.add(sheetKey);

    const categories = CATEGORY_SETS[session.classId] ?? [
      { id: "cat-generic-1", name: "Điểm thường xuyên" },
      { id: "cat-generic-2", name: "Điểm cuối khoá" },
    ];

    const scores: ScoreCategory[] = categories.map((cat) => ({
      categoryId: cat.id,
      categoryName: cat.name,
      score: String(deterministicFloat(`${session.classSessionId}-${cat.id}`, 6.0, 10.0)),
    }));

    const sheetNames = SCORE_SHEET_NAMES[session.classId] ?? ["Bảng điểm"];
    const sheetName = sheetNames[session.sessionIndex % sheetNames.length];

    const comments = COMMENTS[session.classId] ?? ["Học viên học tốt và tiến bộ."];
    const comment = comments[session.sessionIndex % comments.length];

    const sessionDateObj = new Date(session.sessionDate + "T00:00:00");
    const createdAt = new Date(sessionDateObj.getTime() + 2 * 86400_000).toISOString();

    const titles = [
      "Kiểm tra định kỳ",
      "Đánh giá giữa kỳ",
      "Bảng điểm tổng kết",
      "Đánh giá tiến độ",
    ];
    const title = titles[(session.sessionIndex + session.classId.length) % titles.length];

    rows.push({
      id: `gs-${session.classSessionId}`,
      title,
      classId: session.classId,
      scoreSheetId: `ss-${session.classId}`,
      sessionId: session.classSessionId,
      published: true,
      createdAt,
      updatedAt: createdAt,
      classCode: cls.classCode,
      className: cls.className,
      scoreSheetName: sheetName,
      sessionIndex: session.sessionIndex,
      sessionDate: session.sessionDate,
      scores,
      teacherComment: comment,
      createdByName: TEACHERS[session.classId] ?? "Giáo viên",
      studentName: MOCK_STUDENT.studentName,
    });
  }

  return rows.sort((a, b) => (b.sessionDate ?? "").localeCompare(a.sessionDate ?? ""));
}

export function getScoreSheet(): ScoreSheetRow[] {
  return buildScoreSheets();
}
