/**
 * Grades Service — currently returns mock data.
 *
 * TO SWAP TO REAL DB:
 *   Replace each method body with a Drizzle/pg query.
 *   The route handlers and frontend never change.
 */

import { MOCK_GRADES } from "../mock/student.js";

const SKILL_NAMES = ["Nghe", "Nói", "Đọc", "Viết"];

function deriveSkills(midterm: number, fin: number) {
  const raw = [
    Math.round(midterm),
    Math.min(10, Math.round(midterm * 1.05)),
    Math.round(fin * 0.95),
    Math.round(fin),
  ];
  return SKILL_NAMES.map((name, i) => ({ name, score: Math.max(0, Math.min(10, raw[i])) }));
}

function gradeDate(semester: string): string {
  return semester.includes("HK2") ? "2026-05-25" : "2025-11-28";
}

function gradeClassCode(id: number): string {
  return `A${id + 10}`;
}

function toDto(g: typeof MOCK_GRADES[number]) {
  const skills = deriveSkills(g.midterm, g.final);
  const totalScore = skills.reduce((a, b) => a + b.score, 0);
  return {
    id: g.id,
    subject: g.subject,
    semester: g.semester,
    midterm: g.midterm,
    final: g.final,
    average: g.average,
    letterGrade: g.letterGrade,
    teacher: g.teacher,
    classCode: gradeClassCode(g.id),
    date: gradeDate(g.semester),
    title: "Bảng điểm cuối khoá",
    skills,
    totalScore,
    comment: g.teacher
      ? `<p>Học viên có tiến bộ rõ rệt. Cần cải thiện thêm phần nghe và nói để đạt kết quả tốt hơn.</p>`
      : null,
  };
}

export function getGrades(subject?: string, semester?: string) {
  let rows = [...MOCK_GRADES].sort((a, b) => a.subject.localeCompare(b.subject));
  if (subject) rows = rows.filter((g) => g.subject === subject);
  if (semester) rows = rows.filter((g) => g.semester === semester);
  return rows.map(toDto);
}

export function getGradesSummary() {
  const totals = MOCK_GRADES.map((g) => {
    const skills = deriveSkills(g.midterm, g.final);
    return skills.reduce((a, b) => a + b.score, 0);
  });
  const count = MOCK_GRADES.length;
  const maxScore = totals.length > 0 ? Math.max(...totals) : 0;
  const minScore = totals.length > 0 ? Math.min(...totals) : 0;
  return { count, maxScore, minScore };
}
