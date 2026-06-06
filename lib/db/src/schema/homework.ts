import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const homeworkTable = pgTable("homework", {
  id: serial("id").primaryKey(),
  type: text("type").notNull().default("btvn"),
  title: text("title").notNull(),
  subject: text("subject").notNull(),
  className: text("class_name").notNull().default(""),
  dueDate: text("due_date").notNull(),
  startTime: text("start_time").notNull().default(""),
  endTime: text("end_time").notNull().default(""),
  status: text("status").notNull().default("pending"),
  description: text("description").notNull(),
  teacher: text("teacher"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertHomeworkSchema = createInsertSchema(homeworkTable).omit({ id: true, createdAt: true });
export type InsertHomework = z.infer<typeof insertHomeworkSchema>;
export type Homework = typeof homeworkTable.$inferSelect;
