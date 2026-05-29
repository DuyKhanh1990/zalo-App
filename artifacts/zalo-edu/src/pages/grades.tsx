import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, User, MessageSquare, GraduationCap, BookOpen, CalendarDays, Search, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";

import { apiFetch } from "@/lib/api-client";
const ACCENT = "#7c6fd4";

// ─── API Types ────────────────────────────────────────────────────────────────

type ScoreCategory = {
  categoryId: string;
  categoryName: string;
  score: string | null;
};

type StudentInfo = {
  id: string;
  name: string;
  code: string;
};

type ScoreSheetRow = {
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
  student: StudentInfo | null;
  isParent: boolean;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DOW_SHORT = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return {
    label: `${DOW_SHORT[dt.getDay()]}, ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`,
    display: `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`,
  };
}

function parseScore(s: string | null | undefined): number | null {
  if (s == null) return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function avgScore(scores: ScoreCategory[] | null): number | null {
  if (!scores || scores.length === 0) return null;
  const nums = scores.map((c) => parseScore(c.score)).filter((n): n is number => n !== null);
  if (nums.length === 0) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

function scoreColor(score: number, max = 10): { text: string; bg: string } {
  const pct = score / max;
  if (pct >= 0.85) return { text: "#16a34a", bg: "#f0fdf4" };
  if (pct >= 0.70) return { text: "#2563eb", bg: "#eff6ff" };
  if (pct >= 0.55) return { text: "#d97706", bg: "#fffbeb" };
  return { text: "#dc2626", bg: "#fef2f2" };
}

function formatScoreDisplay(n: number): string {
  return n % 1 === 0 ? n.toFixed(0) : n.toFixed(1);
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

async function fetchScoreSheet(): Promise<ScoreSheetRow[]> {
  return apiFetch<ScoreSheetRow[]>("/api/mobile/student/score-sheet");
}

// ─── Score badge ─────────────────────────────────────────────────────────────

function ScoreBadge({ score, max = 10 }: { score: number; max?: number }) {
  const c = scoreColor(score, max);
  return (
    <span
      className="text-sm font-bold w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ color: c.text, background: c.bg }}
    >
      {formatScoreDisplay(score)}
    </span>
  );
}

// ─── Grade card ──────────────────────────────────────────────────────────────

function GradeCard({ sheet, fallbackName }: { sheet: ScoreSheetRow; fallbackName?: string }) {
  const [expanded, setExpanded] = useState(false);

  const dateStr = sheet.sessionDate ?? sheet.createdAt.slice(0, 10);
  const { display } = formatDate(dateStr);
  const avg = avgScore(sheet.scores);
  const avgColor = avg != null ? scoreColor(avg) : null;

  const validScores = (sheet.scores ?? []).filter((c) => parseScore(c.score) !== null);
  const hasScores = validScores.length > 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Header row */}
      <div className="px-4 pt-4 pb-3 flex items-start gap-3">
        <div className="flex-1 min-w-0">
          {/* Badges row */}
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-lg"
              style={{ background: ACCENT + "18", color: ACCENT }}
            >
              {sheet.classCode}
            </span>
            {sheet.scoreSheetName && (
              <span
                className="text-[11px] font-semibold px-2 py-0.5 rounded-lg"
                style={{ background: "#f0fdf4", color: "#16a34a" }}
              >
                {sheet.scoreSheetName}
              </span>
            )}
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <CalendarDays size={11} />
              {display}
            </span>
          </div>

          {/* Title */}
          <p className="text-sm font-bold text-slate-800 leading-snug">{sheet.title}</p>

          {/* Class name + session index */}
          <p className="text-xs text-slate-400 mt-0.5">
            {sheet.className}
            {sheet.sessionIndex != null && ` · Buổi ${sheet.sessionIndex}`}
          </p>

          {/* Student name — shown for parents viewing their child's scores */}
          {sheet.student?.name && (
            <div className="flex items-center gap-1 mt-1">
              <User size={11} className="flex-shrink-0" style={{ color: "#ea580c" }} />
              <span className="text-xs font-semibold" style={{ color: "#ea580c" }}>
                {sheet.student.name}
                {sheet.student.code ? ` · ${sheet.student.code}` : ""}
              </span>
            </div>
          )}
        </div>

        {/* Avg score box */}
        {avg != null && avgColor ? (
          <div
            className="flex-shrink-0 w-14 rounded-xl flex flex-col items-center justify-center py-2"
            style={{ background: avgColor.bg }}
          >
            <span className="text-xl font-black leading-none" style={{ color: avgColor.text }}>
              {formatScoreDisplay(avg)}
            </span>
            <span className="text-[10px] font-semibold mt-0.5" style={{ color: avgColor.text }}>
              TB
            </span>
          </div>
        ) : (
          <div className="flex-shrink-0 w-14 rounded-xl flex items-center justify-center py-3 bg-slate-50">
            <span className="text-[11px] font-semibold text-slate-400 text-center leading-tight">Chưa có</span>
          </div>
        )}
      </div>

      {/* Expand button */}
      <button
        className="w-full flex items-center justify-center gap-1.5 py-2.5 border-t border-slate-100 text-sm font-semibold transition-colors active:bg-slate-50"
        style={{ color: ACCENT }}
        onClick={() => setExpanded((e) => !e)}
      >
        Xem chi tiết
        {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>

      {/* Expandable detail */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            style={{ overflow: "hidden" }}
          >
            <div className="border-t border-slate-100">
              {/* Teacher */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-50">
                <User size={13} className="text-slate-400 flex-shrink-0" />
                <span className="text-sm text-slate-500">{sheet.createdByName}</span>
              </div>

              {/* Score categories table */}
              {hasScores ? (
                <div className="mx-4 my-3 rounded-xl overflow-hidden border border-slate-100">
                  {validScores.map((cat, i) => {
                    const num = parseScore(cat.score)!;
                    return (
                      <div
                        key={cat.categoryId}
                        className="flex items-center justify-between px-4 py-2.5"
                        style={{ background: i % 2 === 0 ? "white" : "#fafafa" }}
                      >
                        <span className="text-sm text-slate-700">{cat.categoryName}</span>
                        <ScoreBadge score={num} />
                      </div>
                    );
                  })}
                  {/* Average row */}
                  {avg != null && avgColor && (
                    <div
                      className="flex items-center justify-between px-4 py-3"
                      style={{ background: avgColor.bg }}
                    >
                      <span className="text-sm font-bold" style={{ color: avgColor.text }}>
                        Điểm trung bình
                      </span>
                      <ScoreBadge score={avg} />
                    </div>
                  )}
                </div>
              ) : (
                <div className="mx-4 my-3 py-4 rounded-xl border border-slate-100 flex flex-col items-center justify-center text-center">
                  <BookOpen size={20} className="text-slate-300 mb-1" />
                  <p className="text-xs text-slate-400">Giáo viên chưa nhập điểm</p>
                </div>
              )}

              {/* Teacher comment */}
              {sheet.teacherComment && (
                <div
                  className="mx-4 mb-4 rounded-xl px-4 py-3"
                  style={{ background: ACCENT + "0d" }}
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <MessageSquare size={13} style={{ color: ACCENT }} />
                    <span className="text-xs font-bold" style={{ color: ACCENT }}>
                      Nhận xét
                    </span>
                  </div>
                  <div className="text-sm text-slate-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: sheet.teacherComment! }} />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

function formatMonthYear(month: number, year: number) {
  return `Tháng ${month}, ${year}`;
}

export default function Grades() {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [searchQuery, setSearchQuery] = useState("");

  const { profile } = useAuth();

  const { data: sheets, isLoading } = useQuery<ScoreSheetRow[]>({
    queryKey: ["score-sheet"],
    queryFn: fetchScoreSheet,
  });

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  const monthPrefix = `${year}-${String(month).padStart(2, "0")}`;

  const filteredSheets = useMemo(() => {
    if (!sheets) return [];
    let list = sheets.filter((s) => {
      const dateKey = s.sessionDate ?? s.createdAt.slice(0, 10);
      return dateKey.startsWith(monthPrefix);
    });
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((s) =>
        s.title?.toLowerCase().includes(q) ||
        s.className?.toLowerCase().includes(q) ||
        s.classCode?.toLowerCase().includes(q) ||
        s.student?.name?.toLowerCase().includes(q) ||
        s.student?.code?.toLowerCase().includes(q) ||
        s.scoreSheetName?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [sheets, monthPrefix, searchQuery]);

  const summary = useMemo(() => {
    if (filteredSheets.length === 0) return null;
    const avgs = filteredSheets
      .map((s) => avgScore(s.scores))
      .filter((n): n is number => n !== null);
    return {
      count: filteredSheets.length,
      maxScore: avgs.length > 0 ? Math.max(...avgs) : 0,
      minScore: avgs.length > 0 ? Math.min(...avgs) : 0,
    };
  }, [filteredSheets]);

  const groups = useMemo<[string, ScoreSheetRow[]][]>(() => {
    const map = new Map<string, ScoreSheetRow[]>();
    for (const s of filteredSheets) {
      const key = s.sessionDate ?? s.createdAt.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [filteredSheets]);

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "#f0f0f7" }}>
      {/* Purple gradient header — compact */}
      <div
        className="px-5 pt-7 pb-4"
        style={{
          background: "linear-gradient(160deg, #c3b8f5 0%, #a89de8 40%, #8f84d8 100%)",
        }}
      >
        {/* Title + month nav on one row */}
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-black text-white">Bảng điểm</h1>
          <div className="flex items-center gap-1">
            <button
              onClick={prevMonth}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors text-white"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="text-white font-semibold text-sm px-1">{formatMonthYear(month, year)}</span>
            <button
              onClick={nextMonth}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors text-white"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>

        {/* Summary stats — compact */}
        {isLoading ? (
          <div className="flex gap-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 flex-1 rounded-xl bg-white/20" />
            ))}
          </div>
        ) : summary ? (
          <div className="grid grid-cols-3 divide-x divide-white/30">
            {[
              { value: summary.count, label: "Bảng điểm" },
              { value: formatScoreDisplay(summary.maxScore), label: "Cao nhất" },
              { value: formatScoreDisplay(summary.minScore), label: "Thấp nhất" },
            ].map((stat) => (
              <div key={stat.label} className="text-center px-2">
                <p className="text-lg font-black text-white leading-none">{stat.value}</p>
                <p className="text-[11px] text-white/70 mt-0.5 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 divide-x divide-white/30">
            {["Bảng điểm", "Cao nhất", "Thấp nhất"].map((label) => (
              <div key={label} className="text-center px-2">
                <p className="text-lg font-black text-white/40 leading-none">–</p>
                <p className="text-[11px] text-white/60 mt-0.5 font-medium">{label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Content — search bar is sticky inside the scroll area so it stays visible when keyboard opens */}
      <div className="flex-1 overflow-y-auto pb-24">
        {/* Sticky search bar */}
        <div className="sticky top-0 z-10 px-4 pt-3 pb-2" style={{ background: "#f0f0f7" }}>
          <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2.5 shadow-sm border border-slate-100">
            <Search size={15} className="text-slate-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Tìm bảng điểm, tên lớp, học viên..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 text-slate-700 placeholder-slate-400 outline-none bg-transparent"
              style={{ fontSize: '16px' }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="px-4 pt-2">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 w-full rounded-2xl" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-52 text-center px-4">
            <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mb-3">
              <GraduationCap size={28} className="text-indigo-300" />
            </div>
            <p className="text-slate-600 font-semibold">Không có bảng điểm</p>
            <p className="text-slate-400 text-sm mt-1">Tháng này chưa có bảng điểm nào được công bố.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {groups.map(([dateKey, groupSheets]) => {
              const { label } = formatDate(dateKey);
              return (
                <div key={dateKey}>
                  {/* Group header */}
                  <div className="flex items-center gap-2 mb-2.5 px-1">
                    <span className="text-sm font-bold" style={{ color: ACCENT }}>
                      {label}
                    </span>
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ background: ACCENT + "18", color: ACCENT }}
                    >
                      {groupSheets.length} bảng
                    </span>
                  </div>

                  <div className="space-y-3">
                    {groupSheets.map((sheet, i) => (
                      <motion.div
                        key={sheet.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05, duration: 0.18 }}
                      >
                        <GradeCard sheet={sheet} fallbackName={profile?.fullName} />
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
