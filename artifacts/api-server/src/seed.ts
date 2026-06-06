import { db, scheduleTable, homeworkTable, gradesTable, invoicesTable } from "@workspace/db";
import { pool } from "@workspace/db";

function datePlus(base: string, days: number): string {
  const d = new Date(base + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const TODAY = "2026-05-26";
const WEEKDAY = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
const wd = (s: string) => WEEKDAY[new Date(s + "T00:00:00").getDay()];

async function seed() {
  console.log("🌱 Clearing tables...");
  await db.delete(scheduleTable);
  await db.delete(homeworkTable);
  await db.delete(gradesTable);
  await db.delete(invoicesTable);

  console.log("📅 Seeding schedule...");
  await db.insert(scheduleTable).values([
    // This week
    { subject: "Toán nâng cao A1", teacher: "Nguyễn Thị Bích Ngọc", room: "P.201 – Cơ sở 1", dayOfWeek: wd(TODAY), startTime: "08:00", endTime: "10:00", date: TODAY, color: "#7c6fd4" },
    { subject: "Vật lý đại cương", teacher: "Trần Văn Minh", room: "P.305 – Cơ sở 1", dayOfWeek: wd(TODAY), startTime: "14:00", endTime: "16:00", date: TODAY, color: "#e07b54" },
    { subject: "Hóa học hữu cơ", teacher: "Lê Thị Hương", room: "P.102 – Cơ sở 2", dayOfWeek: wd(datePlus(TODAY, 1)), startTime: "09:00", endTime: "11:00", date: datePlus(TODAY, 1), color: "#3b82f6" },
    { subject: "Tiếng Anh B2", teacher: "Phạm Ngọc Lan", room: "P.410 – Cơ sở 1", dayOfWeek: wd(datePlus(TODAY, 2)), startTime: "13:30", endTime: "15:30", date: datePlus(TODAY, 2), color: "#10b981" },
    { subject: "Toán nâng cao A1", teacher: "Nguyễn Thị Bích Ngọc", room: "P.201 – Cơ sở 1", dayOfWeek: wd(datePlus(TODAY, 3)), startTime: "08:00", endTime: "10:00", date: datePlus(TODAY, 3), color: "#7c6fd4" },
    { subject: "Lập trình Python", teacher: "Đỗ Quang Huy", room: "P.Lab02 – Cơ sở 1", dayOfWeek: wd(datePlus(TODAY, 4)), startTime: "15:00", endTime: "17:00", date: datePlus(TODAY, 4), color: "#f59e0b" },
    // Last week (history)
    { subject: "Toán nâng cao A1", teacher: "Nguyễn Thị Bích Ngọc", room: "P.201 – Cơ sở 1", dayOfWeek: wd(datePlus(TODAY, -7)), startTime: "08:00", endTime: "10:00", date: datePlus(TODAY, -7), color: "#7c6fd4" },
    { subject: "Vật lý đại cương", teacher: "Trần Văn Minh", room: "P.305 – Cơ sở 1", dayOfWeek: wd(datePlus(TODAY, -7)), startTime: "14:00", endTime: "16:00", date: datePlus(TODAY, -7), color: "#e07b54" },
    { subject: "Tiếng Anh B2", teacher: "Phạm Ngọc Lan", room: "P.410 – Cơ sở 1", dayOfWeek: wd(datePlus(TODAY, -5)), startTime: "13:30", endTime: "15:30", date: datePlus(TODAY, -5), color: "#10b981" },
    { subject: "Hóa học hữu cơ", teacher: "Lê Thị Hương", room: "P.102 – Cơ sở 2", dayOfWeek: wd(datePlus(TODAY, -4)), startTime: "09:00", endTime: "11:00", date: datePlus(TODAY, -4), color: "#3b82f6" },
    { subject: "Lập trình Python", teacher: "Đỗ Quang Huy", room: "P.Lab02 – Cơ sở 1", dayOfWeek: wd(datePlus(TODAY, -3)), startTime: "15:00", endTime: "17:00", date: datePlus(TODAY, -3), color: "#f59e0b" },
    // Next week
    { subject: "Toán nâng cao A1", teacher: "Nguyễn Thị Bích Ngọc", room: "P.201 – Cơ sở 1", dayOfWeek: wd(datePlus(TODAY, 7)), startTime: "08:00", endTime: "10:00", date: datePlus(TODAY, 7), color: "#7c6fd4" },
    { subject: "Lập trình Python", teacher: "Đỗ Quang Huy", room: "P.Lab02 – Cơ sở 1", dayOfWeek: wd(datePlus(TODAY, 8)), startTime: "15:00", endTime: "17:00", date: datePlus(TODAY, 8), color: "#f59e0b" },
    { subject: "Vật lý đại cương", teacher: "Trần Văn Minh", room: "P.305 – Cơ sở 1", dayOfWeek: wd(datePlus(TODAY, 9)), startTime: "14:00", endTime: "16:00", date: datePlus(TODAY, 9), color: "#e07b54" },
    { subject: "Tiếng Anh B2", teacher: "Phạm Ngọc Lan", room: "P.410 – Cơ sở 1", dayOfWeek: wd(datePlus(TODAY, 10)), startTime: "13:30", endTime: "15:30", date: datePlus(TODAY, 10), color: "#10b981" },
    { subject: "Kiểm tra Toán giữa kỳ", teacher: "Nguyễn Thị Bích Ngọc", room: "P.Hội trường A", dayOfWeek: wd(datePlus(TODAY, 12)), startTime: "07:30", endTime: "09:30", date: datePlus(TODAY, 12), color: "#ef4444" },
    // Week after
    { subject: "Hóa học hữu cơ", teacher: "Lê Thị Hương", room: "P.102 – Cơ sở 2", dayOfWeek: wd(datePlus(TODAY, 15)), startTime: "09:00", endTime: "11:00", date: datePlus(TODAY, 15), color: "#3b82f6" },
    { subject: "Toán nâng cao A1", teacher: "Nguyễn Thị Bích Ngọc", room: "P.201 – Cơ sở 1", dayOfWeek: wd(datePlus(TODAY, 14)), startTime: "08:00", endTime: "10:00", date: datePlus(TODAY, 14), color: "#7c6fd4" },
    { subject: "Tiếng Anh B2", teacher: "Phạm Ngọc Lan", room: "P.410 – Cơ sở 1", dayOfWeek: wd(datePlus(TODAY, 17)), startTime: "13:30", endTime: "15:30", date: datePlus(TODAY, 17), color: "#10b981" },
  ]);

  console.log("📚 Seeding homework...");
  await db.insert(homeworkTable).values([
    { type: "btvn", title: "Bài tập Chương 5 – Tích phân", subject: "Toán nâng cao A1", className: "TOAN-A1-2026", dueDate: datePlus(TODAY, 2), startTime: "08:00", endTime: "10:00", status: "pending", description: "Làm bài tập từ 5.1 đến 5.8 trong sách giáo trình. Chú ý các bài tập phần tích phân từng phần.", teacher: "Nguyễn Thị Bích Ngọc" },
    { type: "btvn", title: "Essay: Describe your hometown", subject: "Tiếng Anh B2", className: "ENG-B2-2026", dueDate: datePlus(TODAY, 3), startTime: "13:30", endTime: "15:30", status: "pending", description: "Viết bài luận 250–300 từ miêu tả quê hương. Sử dụng Past Simple và Present Perfect.", teacher: "Phạm Ngọc Lan" },
    { type: "kiemtra", title: "Kiểm tra 15 phút – Chương 3", subject: "Vật lý đại cương", className: "PHY-2026", dueDate: datePlus(TODAY, 4), startTime: "14:00", endTime: "16:00", status: "pending", description: "Kiểm tra lý thuyết và bài tập chương 3: Cơ học chất điểm. Mang theo máy tính khoa học.", teacher: "Trần Văn Minh" },
    { type: "btvn", title: "Lab report – Thực hành Hóa hữu cơ số 4", subject: "Hóa học hữu cơ", className: "CHEM-HUU-2026", dueDate: datePlus(TODAY, 5), startTime: "09:00", endTime: "11:00", status: "pending", description: "Viết báo cáo thực hành tổng hợp aspirin. Bao gồm: mục đích, cách tiến hành, kết quả, nhận xét.", teacher: "Lê Thị Hương" },
    { type: "btvn", title: "Bài tập Python – Vòng lặp và hàm", subject: "Lập trình Python", className: "PY-2026", dueDate: datePlus(TODAY, 6), startTime: "15:00", endTime: "17:00", status: "pending", description: "Hoàn thành 5 bài tập trên HackerRank: FizzBuzz, Fibonacci, Palindrome, Matrix transpose, tìm số nguyên tố.", teacher: "Đỗ Quang Huy" },
    { type: "btvn", title: "Bài tập Chương 4 – Giới hạn và liên tục", subject: "Toán nâng cao A1", className: "TOAN-A1-2026", dueDate: TODAY, startTime: "08:00", endTime: "10:00", status: "pending", description: "Bài tập ôn lại giới hạn hàm số và tính liên tục. Tập trung vào dạng vô định 0/0 và ∞/∞.", teacher: "Nguyễn Thị Bích Ngọc" },
    { type: "btvn", title: "Listening – Unit 8: Technology", subject: "Tiếng Anh B2", className: "ENG-B2-2026", dueDate: datePlus(TODAY, -3), startTime: "13:30", endTime: "15:30", status: "submitted", description: "Nghe và trả lời câu hỏi unit 8. Bài tập nghe điền từ vào chỗ trống.", teacher: "Phạm Ngọc Lan" },
    { type: "kiemtra", title: "Kiểm tra 15 phút – Chương 2: Động học", subject: "Vật lý đại cương", className: "PHY-2026", dueDate: datePlus(TODAY, -5), startTime: "14:00", endTime: "16:00", status: "submitted", description: "Kiểm tra lý thuyết động học chất điểm. Các công thức vận tốc, gia tốc và chuyển động tròn đều.", teacher: "Trần Văn Minh" },
    { type: "btvn", title: "Bài tập Python – Chuỗi và danh sách", subject: "Lập trình Python", className: "PY-2026", dueDate: datePlus(TODAY, -7), startTime: "15:00", endTime: "17:00", status: "submitted", description: "Bài tập xử lý chuỗi: đảo ngược, tìm ký tự, đếm từ. Bài tập danh sách: sắp xếp, lọc, zip.", teacher: "Đỗ Quang Huy" },
    { type: "btvn", title: "Báo cáo thực hành Hóa số 3", subject: "Hóa học hữu cơ", className: "CHEM-HUU-2026", dueDate: datePlus(TODAY, -10), startTime: "09:00", endTime: "11:00", status: "submitted", description: "Báo cáo phản ứng điều chế ethyl acetate. Tính hiệu suất phản ứng và giải thích.", teacher: "Lê Thị Hương" },
  ]);

  console.log("🎓 Seeding grades...");
  await db.insert(gradesTable).values([
    { subject: "Toán cao cấp A", semester: "HK1 2025-2026", midterm: 7.5, final: 8.0, average: 7.8, letterGrade: "B+", teacher: "Nguyễn Thị Bích Ngọc" },
    { subject: "Vật lý đại cương 1", semester: "HK1 2025-2026", midterm: 6.5, final: 7.0, average: 6.8, letterGrade: "B", teacher: "Trần Văn Minh" },
    { subject: "Hóa học đại cương", semester: "HK1 2025-2026", midterm: 8.0, final: 9.0, average: 8.6, letterGrade: "A", teacher: "Lê Thị Hương" },
    { subject: "Tiếng Anh 1", semester: "HK1 2025-2026", midterm: 9.0, final: 8.5, average: 8.7, letterGrade: "A", teacher: "Phạm Ngọc Lan" },
    { subject: "Nhập môn lập trình", semester: "HK1 2025-2026", midterm: 7.0, final: 8.5, average: 7.9, letterGrade: "B+", teacher: "Đỗ Quang Huy" },
    { subject: "Giáo dục thể chất", semester: "HK1 2025-2026", midterm: 8.0, final: 8.0, average: 8.0, letterGrade: "B+", teacher: "Lê Văn Phúc" },
    { subject: "Toán nâng cao A1", semester: "HK2 2025-2026", midterm: 7.0, final: 7.5, average: 7.3, letterGrade: "B", teacher: "Nguyễn Thị Bích Ngọc" },
    { subject: "Vật lý đại cương 2", semester: "HK2 2025-2026", midterm: 6.0, final: 6.5, average: 6.3, letterGrade: "C+", teacher: "Trần Văn Minh" },
    { subject: "Hóa học hữu cơ", semester: "HK2 2025-2026", midterm: 8.5, final: 9.0, average: 8.8, letterGrade: "A", teacher: "Lê Thị Hương" },
    { subject: "Tiếng Anh B2", semester: "HK2 2025-2026", midterm: 8.0, final: 8.5, average: 8.3, letterGrade: "A-", teacher: "Phạm Ngọc Lan" },
    { subject: "Lập trình Python", semester: "HK2 2025-2026", midterm: 9.0, final: 9.5, average: 9.3, letterGrade: "A+", teacher: "Đỗ Quang Huy" },
  ]);

  console.log("💰 Seeding invoices...");
  await db.insert(invoicesTable).values([
    { title: "Học phí Học kỳ 2 – 2025-2026", amount: 8500000, dueDate: datePlus(TODAY, 15), status: "unpaid", semester: "HK2 2025-2026", category: "Học phí", paidAt: null },
    { title: "Phí tài liệu & giáo trình HK2", amount: 350000, dueDate: datePlus(TODAY, 10), status: "unpaid", semester: "HK2 2025-2026", category: "Tài liệu", paidAt: null },
    { title: "Phí bảo hiểm sinh viên 2025-2026", amount: 680000, dueDate: datePlus(TODAY, -10), status: "overdue", semester: "HK2 2025-2026", category: "Bảo hiểm", paidAt: null },
    { title: "Phí phòng Lab Hóa học HK2", amount: 250000, dueDate: datePlus(TODAY, -3), status: "overdue", semester: "HK2 2025-2026", category: "Thực hành", paidAt: null },
    { title: "Học phí Học kỳ 1 – 2025-2026", amount: 8500000, dueDate: datePlus(TODAY, -120), status: "paid", semester: "HK1 2025-2026", category: "Học phí", paidAt: datePlus(TODAY, -125) },
    { title: "Phí thi lại Vật lý đại cương 1", amount: 150000, dueDate: datePlus(TODAY, -90), status: "paid", semester: "HK1 2025-2026", category: "Thi cử", paidAt: datePlus(TODAY, -92) },
    { title: "Phí tài liệu học kỳ 1", amount: 320000, dueDate: datePlus(TODAY, -110), status: "paid", semester: "HK1 2025-2026", category: "Tài liệu", paidAt: datePlus(TODAY, -115) },
    { title: "Phí hoạt động ngoại khóa HK1", amount: 200000, dueDate: datePlus(TODAY, -60), status: "paid", semester: "HK1 2025-2026", category: "Hoạt động", paidAt: datePlus(TODAY, -62) },
  ]);

  console.log("✅ Seed complete!");
  await pool.end();
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
