/**
 * Homework Service — currently returns mock data.
 *
 * TO SWAP TO REAL DB:
 *   Replace each method body with a Drizzle/pg query.
 *   The route handlers and frontend never change.
 */

import { MOCK_HOMEWORK, type MockHomework } from "../mock/student.js";

// In-memory mutable state (simulate DB writes until real DB is wired)
let homeworkStore: MockHomework[] = [...MOCK_HOMEWORK];
let nextId = Math.max(...MOCK_HOMEWORK.map((h) => h.id)) + 1;

function toDto(h: MockHomework) {
  const isScored = h.status === "graded" || h.status === "submitted";
  const score = isScored
    ? Math.round((6.5 + ((h.id * 17) % 30) / 10) * 100) / 100
    : null;
  return {
    id: h.id,
    type: h.type,
    title: h.title,
    subject: h.subject,
    className: h.className,
    dueDate: h.dueDate,
    startTime: h.startTime,
    endTime: h.endTime,
    status: h.status,
    description: h.description,
    teacher: h.teacher,
    score,
    hasComment: h.teacher !== "" && isScored,
  };
}

export function getHomework(status?: string, type?: string) {
  let rows = [...homeworkStore].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  if (status && status !== "all") rows = rows.filter((h) => h.status === status);
  if (type && type !== "all") rows = rows.filter((h) => h.type === type);
  return rows.map(toDto);
}

export function createHomework(data: {
  type?: string;
  title: string;
  subject: string;
  className?: string;
  dueDate: string;
  startTime?: string;
  endTime?: string;
  description?: string;
  teacher?: string;
}) {
  const newItem: MockHomework = {
    id: nextId++,
    type: (data.type as MockHomework["type"]) ?? "btvn",
    title: data.title,
    subject: data.subject,
    className: data.className ?? "",
    dueDate: data.dueDate,
    startTime: data.startTime ?? "",
    endTime: data.endTime ?? "",
    status: "pending",
    description: data.description ?? "",
    teacher: data.teacher ?? "",
  };
  homeworkStore.push(newItem);
  return toDto(newItem);
}

export function submitHomework(id: number) {
  const idx = homeworkStore.findIndex((h) => h.id === id);
  if (idx === -1) return null;
  homeworkStore[idx] = { ...homeworkStore[idx], status: "submitted" };
  return toDto(homeworkStore[idx]);
}
