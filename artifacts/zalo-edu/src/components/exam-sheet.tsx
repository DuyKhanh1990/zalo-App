import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, ChevronLeft, ChevronRight, Clock, CheckCircle2,
  XCircle, AlertCircle, Loader2, BookOpen, Trophy, RotateCcw,
  Headphones, FileText, Volume2, ChevronDown, ChevronUp,
} from "lucide-react";
import {
  useExamMeta,
  useExamAttemptCount,
  useExamPreview,
  useSubmitExam,
  type ExamAnswer,
  type ExamQuestion,
  type ExamSubmissionResult,
  type PassageInfo,
  type MatchingData,
  type MatchingItem,
} from "@/hooks/use-exam";
import { resolveAndProxy, FileViewerSheet, type FileEntry } from "@/components/file-viewer";
import { openUrlSync } from "@/lib/zmp-sdk";

const ACCENT = "#be185d";
const ACCENT_BG = "#fdf2f8";

// ─── Timer ────────────────────────────────────────────────────────────────────

function useCountdown(minutes: number, running: boolean, onExpire: () => void) {
  const [remaining, setRemaining] = useState(minutes * 60);
  const ref = useRef(onExpire);
  ref.current = onExpire;

  useEffect(() => {
    if (!running) return;
    setRemaining(minutes * 60);
  }, [minutes, running]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setRemaining((s) => {
        if (s <= 1) { ref.current(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  const label = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  const urgent = remaining <= 60;
  return { label, urgent };
}

// ─── Option button ─────────────────────────────────────────────────────────────

function OptionButton({
  label, text, selected, correct, wrong, disabled, onClick,
}: {
  label: string; text: string; selected: boolean;
  correct?: boolean; wrong?: boolean; disabled: boolean; onClick: () => void;
}) {
  let bg = "white", border = "#e2e8f0", labelBg = "#f1f5f9", labelColor = "#64748b", textColor = "#1e293b";
  if (correct)       { bg = "#f0fdf4"; border = "#86efac"; labelBg = "#16a34a"; labelColor = "white"; textColor = "#15803d"; }
  else if (wrong)    { bg = "#fef2f2"; border = "#fca5a5"; labelBg = "#dc2626"; labelColor = "white"; textColor = "#b91c1c"; }
  else if (selected) { bg = ACCENT_BG; border = ACCENT;    labelBg = ACCENT;    labelColor = "white"; textColor = ACCENT; }

  return (
    <button
      onClick={onClick} disabled={disabled}
      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 transition-all active:scale-[0.98] text-left"
      style={{ background: bg, borderColor: border }}
    >
      <span className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black"
        style={{ background: labelBg, color: labelColor }}>
        {label}
      </span>
      <span className="text-sm leading-snug font-medium flex-1" style={{ color: textColor }}
        dangerouslySetInnerHTML={{ __html: text }} />
      {correct && <CheckCircle2 size={16} className="flex-shrink-0 text-green-500" />}
      {wrong   && <XCircle     size={16} className="flex-shrink-0 text-red-500" />}
    </button>
  );
}

// ─── Fill-blank parser ─────────────────────────────────────────────────────────

type ContentPart =
  | { type: "text"; text: string }
  | { type: "blank"; index: number };

function parseFillBlankParts(content: string): ContentPart[] {
  // Strip HTML tags for display, replace {N} with blanks
  const parts: ContentPart[] = [];
  const regex = /\{(\d+)\}/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let blankIdx = 0;
  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", text: content.slice(lastIndex, match.index) });
    }
    parts.push({ type: "blank", index: blankIdx++ });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) {
    parts.push({ type: "text", text: content.slice(lastIndex) });
  }
  // If no placeholders found, treat whole content as text
  if (parts.length === 0) parts.push({ type: "text", text: content });
  return parts;
}

function hasFillBlankPlaceholders(content: string): boolean {
  return /\{\d+\}/.test(content);
}

// ─── Fill-blank inline question ────────────────────────────────────────────────

function FillBlankQuestion({
  content,
  blanks,
  disabled,
  onChange,
}: {
  content: string;
  blanks: string[];
  disabled: boolean;
  onChange: (index: number, value: string) => void;
}) {
  const parts = parseFillBlankParts(content);
  return (
    <div className="text-base font-semibold text-slate-800 leading-loose">
      {parts.map((part, i) => {
        if (part.type === "text") {
          return (
            <span key={i} dangerouslySetInnerHTML={{ __html: part.text }} />
          );
        }
        const val = blanks[part.index] ?? "";
        return (
          <input
            key={i}
            type="text"
            value={val}
            disabled={disabled}
            onChange={(e) => onChange(part.index, e.target.value)}
            placeholder={`(${part.index + 1})`}
            className="inline-block mx-1 px-2 py-0.5 border-b-2 border-pink-400 bg-pink-50 rounded-t-md text-sm font-semibold text-slate-800 outline-none focus:border-pink-600 transition-colors disabled:opacity-60"
            style={{ width: Math.max(80, (val.length + 4) * 9) + "px", minWidth: 80 }}
          />
        );
      })}
    </div>
  );
}

// ─── Inline reading passage section ───────────────────────────────────────────

function InlineReadingSection({
  passageInfo,
  fallbackUrl,
  sectionName,
}: {
  passageInfo?: PassageInfo | null;
  fallbackUrl?: string | null;
  sectionName?: string | null;
}) {
  const label = sectionName ? `Bài đọc – ${sectionName}` : "Bài đọc";

  const rawUrl = passageInfo?.absoluteUrl ?? fallbackUrl ?? null;
  const hasUrl = Boolean(rawUrl);

  const [expanded, setExpanded] = useState(false);
  // Once mounted, keep true — prevents re-loading when re-expanding
  const [everExpanded, setEverExpanded] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  function toggleExpand() {
    if (!hasUrl) return;
    const next = !expanded;
    setExpanded(next);
    if (next && !everExpanded) setEverExpanded(true);
  }

  const iframeSrc = rawUrl
    ? `https://docs.google.com/viewer?url=${encodeURIComponent(rawUrl)}&embedded=true`
    : "";

  return (
    <div className="flex-shrink-0" style={{ borderBottom: "1px solid #bbf7d0" }}>
      {/* Header row — toggle expand */}
      <button
        onClick={toggleExpand}
        className="w-full px-4 py-2 flex items-center gap-2"
        style={{ background: "#f0fdf4", opacity: hasUrl ? 1 : 0.55 }}
      >
        <FileText size={13} className="text-green-600 flex-shrink-0" />
        <span className="flex-1 text-xs font-semibold text-green-700 truncate text-left">
          {label}
          {!hasUrl && " (chưa có link)"}
        </span>
        {hasUrl && (
          <span
            className="flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-semibold"
            style={{ background: expanded ? "#dcfce7" : "#16a34a", color: expanded ? "#15803d" : "#fff" }}
          >
            {expanded ? "Đóng" : "Mở"}
          </span>
        )}
      </button>

      {/* Iframe panel — stays mounted after first expand, hidden via height */}
      {everExpanded && rawUrl && (
        <div
          style={{
            height: expanded ? 320 : 0,
            overflow: "hidden",
            transition: "height 0.25s ease",
            background: "#f8fafc",
          }}
        >
          {/* Loading spinner — shown until iframe fires onLoad */}
          {!iframeLoaded && expanded && (
            <div className="absolute inset-x-0 flex items-center justify-center" style={{ height: 320 }}>
              <div className="flex flex-col items-center gap-2">
                <div
                  className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: "#22c55e", borderTopColor: "transparent" }}
                />
                <p className="text-xs text-slate-400">Đang tải bài đọc...</p>
              </div>
            </div>
          )}
          <iframe
            src={iframeSrc}
            className="w-full border-0"
            style={{ height: 320, display: "block" }}
            onLoad={() => setIframeLoaded(true)}
            title="Bài đọc"
            allow="fullscreen"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
          />
        </div>
      )}
    </div>
  );
}

// ─── Matching question ─────────────────────────────────────────────────────────

function MatchingQuestion({
  matchingData,
  selections,
  disabled,
  onChange,
}: {
  matchingData: MatchingData;
  selections: Record<string, string>;
  disabled: boolean;
  onChange: (leftId: string, rightId: string) => void;
}) {
  const { leftItems, rightItems } = matchingData;
  const [openPickerFor, setOpenPickerFor] = useState<string | null>(null);

  // Build set of rightIds already used by OTHER left items
  const usedRightIds = useMemo(() => {
    const used = new Set<string>();
    for (const [lid, rid] of Object.entries(selections)) {
      if (lid !== openPickerFor && rid) used.add(rid);
    }
    return used;
  }, [selections, openPickerFor]);

  const activeLeft = openPickerFor ? leftItems.find((l: MatchingItem) => l.id === openPickerFor) : null;
  const currentSelection = openPickerFor ? (selections[openPickerFor] ?? "") : "";

  function handlePickerSelect(rightId: string) {
    if (!openPickerFor) return;
    // Tap same item → deselect; tap new → select
    const newVal = rightId === currentSelection ? "" : rightId;
    onChange(openPickerFor, newVal);
    setOpenPickerFor(null);
  }

  return (
    <>
      <div className="space-y-2">
        {leftItems.map((left: MatchingItem, idx: number) => {
          const selected = selections[left.id];
          const selectedLabel = selected
            ? (rightItems.find((r: MatchingItem) => r.id === selected)?.text ?? "")
            : "";
          const rowBg = idx % 2 === 0 ? "#f8fafc" : "#ffffff";

          return (
            <div
              key={left.id}
              className="rounded-xl border overflow-hidden"
              style={{ borderColor: selected ? "#fbcfe8" : "#e2e8f0", background: rowBg }}
            >
              {/* Left label */}
              <div
                className="px-3 py-2.5 text-sm font-semibold text-slate-700 border-b"
                style={{ borderColor: selected ? "#fbcfe8" : "#e2e8f0", background: "#fdf2f8" }}
              >
                {left.text}
              </div>

              {/* Select trigger */}
              <button
                disabled={disabled}
                onClick={() => setOpenPickerFor(left.id)}
                className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60"
                style={{ color: selected ? "#be185d" : "#94a3b8" }}
              >
                <span className="truncate pr-2">{selected ? selectedLabel : "— Chọn —"}</span>
                <ChevronDown size={16} className="flex-shrink-0 text-slate-400" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Custom picker bottom sheet */}
      <AnimatePresence>
        {openPickerFor && activeLeft && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-[200]"
              onClick={() => setOpenPickerFor(null)}
            />

            {/* Sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
              className="fixed left-0 right-0 bottom-0 z-[201] rounded-t-2xl bg-white overflow-hidden"
              style={{ maxHeight: "70vh" }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <p className="text-sm font-bold text-slate-700 flex-1 pr-3 line-clamp-2">{activeLeft.text}</p>
                <button
                  onClick={() => setOpenPickerFor(null)}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 flex-shrink-0"
                >
                  <X size={14} className="text-slate-500" />
                </button>
              </div>

              {/* Options list */}
              <div className="overflow-y-auto" style={{ maxHeight: "calc(70vh - 56px)" }}>
                {/* "— Chọn —" / deselect row */}
                <button
                  onClick={() => handlePickerSelect(currentSelection)}
                  className="w-full flex items-center justify-between px-4 py-3 border-b border-slate-100 text-left"
                  style={{ background: !currentSelection ? "#fdf2f8" : "#f8fafc" }}
                >
                  <span className="text-sm font-semibold text-slate-400">— Chọn —</span>
                  <div
                    className="w-5 h-5 flex-shrink-0 border-2 flex items-center justify-center"
                    style={{ borderRadius: "50%", borderColor: !currentSelection ? "#ec4899" : "#d1d5db" }}
                  >
                    {!currentSelection && (
                      <div className="w-2.5 h-2.5 bg-pink-400" style={{ borderRadius: "50%" }} />
                    )}
                  </div>
                </button>

                {rightItems.map((right: MatchingItem, idx: number) => {
                  const isSelected = right.id === currentSelection;
                  const isUsedByOther = usedRightIds.has(right.id);
                  const rowBg = idx % 2 === 0 ? "#ffffff" : "#f8fafc";

                  return (
                    <button
                      key={right.id}
                      disabled={isUsedByOther}
                      onClick={() => handlePickerSelect(right.id)}
                      className="w-full flex items-center justify-between px-4 py-3 border-b border-slate-100 text-left transition-colors"
                      style={{
                        background: isSelected ? "#fdf2f8" : rowBg,
                        opacity: isUsedByOther ? 0.38 : 1,
                      }}
                    >
                      <span
                        className="text-sm font-semibold flex-1 pr-3"
                        style={{ color: isSelected ? "#be185d" : "#374151" }}
                      >
                        {right.text}
                      </span>
                      <div
                        className="w-5 h-5 flex-shrink-0 border-2 flex items-center justify-center"
                        style={{
                          borderRadius: "50%",
                          borderColor: isSelected ? "#be185d" : "#d1d5db",
                        }}
                      >
                        {isSelected && (
                          <div className="w-2.5 h-2.5 bg-pink-600" style={{ borderRadius: "50%" }} />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

type Phase = "intro" | "taking" | "result";

// ─── Intro screen ─────────────────────────────────────────────────────────────

function IntroScreen({ examId, classId, examTitle, onStart, onClose }: {
  examId: string; classId?: string | null; examTitle: string;
  onStart: () => void; onClose: () => void;
}) {
  const { data: meta, isLoading: metaLoading } = useExamMeta(examId);
  const { data: attemptData, isLoading: attemptLoading } = useExamAttemptCount(examId, classId);
  const isLoading = metaLoading || attemptLoading;
  const attemptsUsed = attemptData?.count ?? 0;
  const maxAttempts = meta?.maxAttempts ?? null;
  const attemptsLeft = maxAttempts != null ? maxAttempts - attemptsUsed : null;
  const canTake = attemptsLeft == null || attemptsLeft > 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
        <p className="font-bold text-slate-800 text-base line-clamp-1 flex-1 pr-3">{examTitle}</p>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors flex-shrink-0">
          <X size={18} className="text-slate-500" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <Loader2 size={28} className="animate-spin" style={{ color: ACCENT }} />
            <p className="text-sm text-slate-400">Đang tải thông tin bài kiểm tra...</p>
          </div>
        ) : (
          <>
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-md"
                style={{ background: `linear-gradient(135deg, ${ACCENT}, #9d174d)` }}>
                <BookOpen size={36} className="text-white" />
              </div>
            </div>
            <h2 className="text-xl font-black text-slate-800 text-center mb-1">{meta?.title ?? examTitle}</h2>
            {(meta as unknown as Record<string, unknown>)?.["description"] && (
              <p className="text-sm text-slate-500 text-center mb-5 leading-relaxed">{(meta as unknown as Record<string, unknown>)["description"] as string}</p>
            )}
            <div className="grid grid-cols-2 gap-3 mt-5 mb-6">
              {[
                { label: "Thời gian", value: meta?.duration ? `${meta.duration} phút` : "Không giới hạn", icon: <Clock size={16} style={{ color: ACCENT }} /> },
                { label: "Số câu hỏi", value: meta?.totalQuestions != null ? `${meta.totalQuestions} câu` : "—", icon: <BookOpen size={16} style={{ color: ACCENT }} /> },
                { label: "Đã làm", value: `${attemptsUsed} lần`, icon: <RotateCcw size={16} style={{ color: ACCENT }} /> },
                { label: "Còn lại", value: attemptsLeft == null ? "Không giới hạn" : `${attemptsLeft} lần`, icon: <CheckCircle2 size={16} style={{ color: canTake ? "#16a34a" : "#dc2626" }} /> },
              ].map((item) => (
                <div key={item.label} className="flex flex-col items-center justify-center py-4 px-3 rounded-2xl text-center" style={{ background: ACCENT_BG }}>
                  {item.icon}
                  <p className="text-base font-black text-slate-800 mt-1.5">{item.value}</p>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>
            {!canTake && (
              <div className="flex items-start gap-2 px-4 py-3 rounded-2xl bg-red-50 border border-red-100 mb-4">
                <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 leading-snug">Bạn đã hết lượt làm bài cho đề kiểm tra này.</p>
              </div>
            )}
          </>
        )}
      </div>
      {!isLoading && (
        <div className="px-5 py-4 border-t border-slate-100 flex-shrink-0">
          <button onClick={onStart} disabled={!canTake}
            className="w-full h-13 py-3.5 rounded-2xl flex items-center justify-center gap-2 text-white font-bold text-base transition-all active:scale-[0.98] disabled:opacity-50"
            style={{ background: canTake ? `linear-gradient(90deg, ${ACCENT}, #9d174d)` : "#94a3b8" }}>
            <BookOpen size={18} />Bắt đầu làm bài
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Section audio component ───────────────────────────────────────────────────

function SectionAudioBar({ src, audioRef }: { src: string; audioRef: React.RefObject<HTMLAudioElement | null> }) {
  const [audioError, setAudioError] = useState(false);

  if (audioError) {
    return (
      <div className="px-4 py-2.5 flex-shrink-0 flex items-center gap-3"
        style={{ background: "#eff6ff", borderBottom: "1px solid #bfdbfe" }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#3b82f6" }}>
          <Volume2 size={13} className="text-white" />
        </div>
        <p className="flex-1 text-xs text-blue-700 font-medium">File nghe</p>
        <button
          onClick={() => openUrlSync(src)}
          className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold text-white flex-shrink-0"
          style={{ background: "#3b82f6" }}
        >
          <Headphones size={11} />
          Mở nghe
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 py-2.5 flex-shrink-0 flex items-center gap-3"
      style={{ background: "#eff6ff", borderBottom: "1px solid #bfdbfe" }}>
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#3b82f6" }}>
        <Volume2 size={13} className="text-white" />
      </div>
      <audio
        ref={audioRef as React.RefObject<HTMLAudioElement>}
        src={src}
        controls
        preload="metadata"
        className="flex-1 h-8"
        style={{ minWidth: 0 }}
        onError={() => setAudioError(true)}
      />
    </div>
  );
}

// ─── Taking screen ─────────────────────────────────────────────────────────────

const LABELS = ["A", "B", "C", "D", "E", "F"];

function TakingScreen({ examId, classId, duration, onSubmit, onClose }: {
  examId: string; classId?: string | null; duration: number;
  onSubmit: (answers: ExamAnswer[], timeTakenSeconds: number) => void;
  onClose: () => void;
}) {
  const { data: preview, isLoading } = useExamPreview(examId, true);
  const questions: ExamQuestion[] = preview?.questions ?? [];

  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const startTimeRef = useRef<number>(Date.now());
  const sectionAudioRef = useRef<HTMLAudioElement | null>(null);
  const prevSectionRef = useRef<string | null>(null);

  const { label: timerLabel, urgent } = useCountdown(
    duration > 0 ? duration : 999,
    !isLoading && questions.length > 0,
    () => handleSubmit()
  );

  // Unique ordered sections
  const sections = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const q of questions) {
      const s = q.sectionName ?? "";
      if (s && !seen.has(s)) { seen.add(s); list.push(s); }
    }
    return list;
  }, [questions]);

  // Index of first question per section
  const sectionFirstIndex = useMemo(() => {
    const map: Record<string, number> = {};
    for (let i = 0; i < questions.length; i++) {
      const s = questions[i].sectionName ?? "";
      if (s && !(s in map)) map[s] = i;
    }
    return map;
  }, [questions]);

  // Reset audio when section changes
  useEffect(() => {
    const sectionName = questions[current]?.sectionName ?? null;
    if (sectionName !== prevSectionRef.current) {
      prevSectionRef.current = sectionName;
      if (sectionAudioRef.current) {
        sectionAudioRef.current.pause();
        sectionAudioRef.current.load();
      }
    }
  }, [questions, current]);

  function isMultiple(q: ExamQuestion)  { return q.type === "multiple_choice"; }
  function isEssay(q: ExamQuestion)    { return q.type === "essay"; }
  function isFillBlank(q: ExamQuestion){ return q.type === "fill_blank"; }
  function isText(q: ExamQuestion)     { return q.type === "fill_blank" || q.type === "essay"; }
  function isMatching(q: ExamQuestion) { return q.type === "matching"; }

  function select(questionId: string, optionId: string, multi: boolean) {
    setAnswers((prev) => {
      const cur = prev[questionId] ?? [];
      if (multi) {
        return { ...prev, [questionId]: cur.includes(optionId) ? cur.filter((id) => id !== optionId) : [...cur, optionId] };
      }
      return { ...prev, [questionId]: [optionId] };
    });
  }
  function setText(questionId: string, text: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: text ? [text] : [] }));
  }
  function setBlankAnswer(questionId: string, blankIndex: number, value: string) {
    setAnswers((prev) => {
      const cur = [...(prev[questionId] ?? [])];
      cur[blankIndex] = value;
      // Remove trailing empty strings but keep array compact
      const trimmed = cur.map((v) => v ?? "");
      return { ...prev, [questionId]: trimmed };
    });
  }

  function setMatchingAnswer(questionId: string, leftId: string, rightId: string) {
    setAnswers((prev) => {
      const existing = prev[questionId] ?? [];
      // Encode as "leftId:rightId"; replace existing pair for this leftId
      const filtered = existing.filter((s) => !s.startsWith(leftId + ":"));
      const updated = rightId ? [...filtered, `${leftId}:${rightId}`] : filtered;
      return { ...prev, [questionId]: updated };
    });
  }

  function getMatchingSelections(questionId: string): Record<string, string> {
    const pairs = answers[questionId] ?? [];
    const result: Record<string, string> = {};
    for (const pair of pairs) {
      const idx = pair.indexOf(":");
      if (idx > 0) result[pair.slice(0, idx)] = pair.slice(idx + 1);
    }
    return result;
  }

  function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);
    const timeTakenSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const answerList: ExamAnswer[] = questions.map((q) => ({
      questionId: q.id,
      selectedOptionIds: answers[q.id] ?? [],
    }));
    onSubmit(answerList, timeTakenSeconds);
  }

  const q = questions[current];
  const answeredCount = Object.keys(answers).length;
  const totalCount = questions.length;
  const progress = totalCount > 0 ? (answeredCount / totalCount) * 100 : 0;

  const currentSection  = q?.sectionName    ?? null;
  const sectionAudioUrl = q?.sectionAudioUrl ? resolveAndProxy(q.sectionAudioUrl) : null;
  const sectionReadingUrl = q?.sectionReadingUrl ?? null;
  const passageInfo = q?.passageInfo ?? null;
  const hasPassage = !!(passageInfo || sectionReadingUrl);

  const essayText = q && isText(q) ? ((answers[q.id] ?? [])[0] ?? "") : "";
  const wordCount = essayText.trim() ? essayText.trim().split(/\s+/).length : 0;

  if (isLoading) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-3">
        <Loader2 size={28} className="animate-spin" style={{ color: ACCENT }} />
        <p className="text-sm text-slate-400">Đang tải câu hỏi...</p>
      </div>
    );
  }
  if (questions.length === 0) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-3 px-8 text-center">
        <AlertCircle size={32} className="text-slate-300" />
        <p className="text-slate-500 font-semibold">Không tải được câu hỏi</p>
        <button onClick={onClose} className="mt-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: ACCENT }}>Đóng</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ background: ACCENT_BG, borderBottom: `1px solid #fce7f3` }}>
        <button onClick={() => setConfirmQuit(true)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/80 transition-colors">
          <X size={16} style={{ color: ACCENT }} />
        </button>
        <div className="text-center">
          <p className="text-xs text-slate-500 font-medium">Câu {current + 1} / {totalCount}</p>
          <p className="text-[11px] text-slate-400">{answeredCount} đã trả lời</p>
        </div>
        {duration > 0 ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
            style={{ background: urgent ? "#fef2f2" : "white", border: `1px solid ${urgent ? "#fca5a5" : "#e2e8f0"}` }}>
            <Clock size={12} style={{ color: urgent ? "#dc2626" : ACCENT }} />
            <span className="text-sm font-black tabular-nums" style={{ color: urgent ? "#dc2626" : ACCENT }}>{timerLabel}</span>
          </div>
        ) : <div className="w-8" />}
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-slate-100 flex-shrink-0">
        <div className="h-full transition-all duration-300" style={{ width: `${progress}%`, background: ACCENT }} />
      </div>

      {/* Section tabs — only shown when there are 2+ sections */}
      {sections.length > 1 && (
        <div className="flex-shrink-0 border-b border-slate-100 bg-white">
          <div className="flex gap-1 px-3 py-2 overflow-x-auto no-scrollbar">
            {sections.map((sec) => {
              const isActive = currentSection === sec;
              const sectionAnswered = questions
                .filter((q) => q.sectionName === sec)
                .filter((q) => !!(answers[q.id]?.length)).length;
              const sectionTotal = questions.filter((q) => q.sectionName === sec).length;
              return (
                <button
                  key={sec}
                  onClick={() => setCurrent(sectionFirstIndex[sec] ?? 0)}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                  style={isActive
                    ? { background: ACCENT, color: "white" }
                    : { background: "#f8fafc", color: "#64748b", border: "1px solid #e2e8f0" }
                  }
                >
                  {sec}
                  <span className="text-[10px] font-semibold opacity-80">
                    {sectionAnswered}/{sectionTotal}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Section audio player */}
      {sectionAudioUrl && (
        <SectionAudioBar src={sectionAudioUrl} audioRef={sectionAudioRef} />
      )}

      {/* Section reading passage — inline expandable */}
      {hasPassage && (
        <InlineReadingSection
          passageInfo={passageInfo}
          fallbackUrl={sectionReadingUrl}
          sectionName={currentSection}
        />
      )}

      {/* Question */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
        <AnimatePresence mode="wait">
          <motion.div key={current} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.15 }}>
            {/* Question header */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-black uppercase tracking-wider" style={{ color: ACCENT }}>
                  Câu {current + 1}{q.score ? ` · ${q.score} điểm` : ""}
                </span>
                {sectionAudioUrl && (
                  <button
                    onClick={() => sectionAudioRef.current?.play().catch(() => {})}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold"
                    style={{ background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe" }}>
                    <Headphones size={11} />Nghe từ đây
                  </button>
                )}
              </div>
              {/* For fill_blank with placeholders, render inline inputs instead of raw HTML */}
              {isFillBlank(q) && hasFillBlankPlaceholders(q.content) ? (
                <FillBlankQuestion
                  content={q.content}
                  blanks={answers[q.id] ?? []}
                  disabled={submitting}
                  onChange={(idx, val) => setBlankAnswer(q.id, idx, val)}
                />
              ) : (
                <div className="text-base font-semibold text-slate-800 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: q.content }} />
              )}
            </div>

            {/* Section label */}
            {currentSection && (
              <div className="mb-3 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider"
                style={{ background: "#fdf2f8", color: ACCENT }}>
                {currentSection}
              </div>
            )}

            {/* Media image */}
            {q.mediaImageUrl && (
              <img src={q.mediaImageUrl} alt="" className="w-full rounded-xl mb-4 object-contain max-h-48" />
            )}

            {/* Question-level audio */}
            {q.mediaAudioUrl && (
              <QuestionAudio src={resolveAndProxy(q.mediaAudioUrl)} />
            )}

            {/* Multiple choice hint */}
            {isMultiple(q) && (
              <p className="text-[11px] text-slate-400 mb-3 font-medium">Chọn nhiều đáp án</p>
            )}

            {/* Matching question — full UI when matchingData available */}
            {isMatching(q) && q.matchingData && (
              <MatchingQuestion
                matchingData={q.matchingData}
                selections={getMatchingSelections(q.id)}
                disabled={submitting}
                onChange={(leftId, rightId) => setMatchingAnswer(q.id, leftId, rightId)}
              />
            )}

            {/* Matching fallback: matchingData unavailable */}
            {isMatching(q) && !q.matchingData && (
              <div className="flex flex-col items-center justify-center gap-3 py-8 px-4 rounded-2xl"
                style={{ background: "#fdf2f8", border: "1px dashed #fbcfe8" }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ background: "#fbcfe8" }}>
                  <BookOpen size={22} style={{ color: "#be185d" }} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-pink-700">Câu hỏi nối</p>
                  <p className="text-xs text-pink-500 mt-0.5">Dữ liệu nối chưa tải được từ máy chủ.<br />Vui lòng thử lại sau.</p>
                </div>
              </div>
            )}

            {/* Options (single/multiple choice) */}
            {!isText(q) && !isMatching(q) && q.options.length > 0 && (
              <div className="space-y-3">
                {q.options.map((opt, i) => (
                  <OptionButton
                    key={opt.id}
                    label={LABELS[i] ?? String(i + 1)}
                    text={opt.content}
                    selected={(answers[q.id] ?? []).includes(opt.id)}
                    disabled={submitting}
                    onClick={() => select(q.id, opt.id, isMultiple(q))}
                  />
                ))}
              </div>
            )}

            {/* Essay */}
            {isEssay(q) && (
              <div>
                <div className="mb-2 px-3 py-2 rounded-xl text-xs font-semibold text-amber-700"
                  style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
                  Viết bài làm của bạn vào ô bên dưới
                </div>
                <textarea
                  value={(answers[q.id] ?? [])[0] ?? ""}
                  onChange={(e) => setText(q.id, e.target.value)}
                  disabled={submitting}
                  placeholder="Nhập bài làm của bạn..."
                  rows={8}
                  className="w-full border-2 border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-800 resize-none outline-none focus:border-pink-300 transition-colors disabled:opacity-60"
                />
                <p className="text-xs text-slate-400 mt-1.5 font-medium">Số từ: {wordCount}</p>
              </div>
            )}

            {/* Fill-blank without placeholders — textarea fallback */}
            {isFillBlank(q) && !hasFillBlankPlaceholders(q.content) && (
              <div className="mt-3">
                <div className="mb-2 px-3 py-2 rounded-xl text-xs font-semibold text-pink-700"
                  style={{ background: "#fdf2f8", border: "1px solid #fbcfe8" }}>
                  BÀI NGHE
                </div>
                <textarea
                  value={(answers[q.id] ?? [])[0] ?? ""}
                  onChange={(e) => setText(q.id, e.target.value)}
                  disabled={submitting}
                  placeholder="Nhập câu trả lời..."
                  rows={2}
                  className="w-full border-2 border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-800 resize-none outline-none focus:border-pink-300 transition-colors disabled:opacity-60"
                />
              </div>
            )}

            {/* Fill-blank with placeholders — show answer hint label */}
            {isFillBlank(q) && hasFillBlankPlaceholders(q.content) && (
              <div className="mt-3 px-3 py-2 rounded-xl text-xs font-semibold text-pink-700"
                style={{ background: "#fdf2f8", border: "1px solid #fbcfe8" }}>
                Điền vào chỗ trống trong câu trên
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Question navigator */}
      <div className="flex-shrink-0 border-t border-slate-100" style={{ background: "#fafafa" }}>
        <div className="px-3 py-2 overflow-x-auto">
          <div className="flex gap-1.5 min-w-max">
            {questions.map((qItem, i) => {
              const answered = (answers[qItem.id] ?? []).some((v) => v.trim().length > 0);
              const isCurrent = i === current;
              return (
                <button key={i} onClick={() => setCurrent(i)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-[11px] font-bold transition-all flex-shrink-0"
                  style={isCurrent
                    ? { background: ACCENT, color: "white" }
                    : answered
                    ? { background: "#dcfce7", color: "#16a34a", border: "1px solid #86efac" }
                    : { background: "white", color: "#94a3b8", border: "1px solid #e2e8f0" }
                  }>
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom nav */}
      <div className="px-4 py-3 border-t border-slate-100 flex-shrink-0 flex items-center gap-3">
        <button onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0}
          className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 bg-white disabled:opacity-30 transition-colors flex-shrink-0">
          <ChevronLeft size={18} className="text-slate-600" />
        </button>
        {current < totalCount - 1 ? (
          <button onClick={() => setCurrent((c) => Math.min(totalCount - 1, c + 1))}
            className="flex-1 h-10 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            style={{ background: ACCENT_BG, color: ACCENT }}>
            Câu tiếp theo<ChevronRight size={15} />
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={submitting}
            className="flex-1 h-10 rounded-xl font-bold text-sm text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-80"
            style={{ background: `linear-gradient(90deg, ${ACCENT}, #9d174d)` }}>
            {submitting
              ? <><Loader2 size={15} className="animate-spin" /> Đang nộp...</>
              : <>Nộp bài ({answeredCount}/{totalCount})</>}
          </button>
        )}
      </div>

      {/* Confirm quit */}
      <AnimatePresence>
        {confirmQuit && (
          <motion.div className="absolute inset-0 flex items-center justify-center px-6"
            style={{ background: "rgba(0,0,0,0.5)", zIndex: 20 }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-white rounded-3xl p-6 w-full"
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
              <AlertCircle size={32} className="text-amber-400 mx-auto mb-3" />
              <h3 className="text-base font-black text-slate-800 text-center mb-1">Thoát bài kiểm tra?</h3>
              <p className="text-sm text-slate-500 text-center mb-5">Bài làm chưa được nộp sẽ bị mất. Bạn có chắc muốn thoát không?</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmQuit(false)}
                  className="flex-1 h-11 rounded-xl font-semibold text-sm border border-slate-200 text-slate-700">
                  Tiếp tục làm
                </button>
                <button onClick={onClose} className="flex-1 h-11 rounded-xl font-semibold text-sm text-white" style={{ background: ACCENT }}>
                  Thoát
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

// ─── Question-level audio (with openUrl fallback) ─────────────────────────────

function QuestionAudio({ src }: { src: string }) {
  const [audioError, setAudioError] = useState(false);

  if (audioError) {
    return (
      <div className="mb-4 px-3 py-2 rounded-xl flex items-center gap-2"
        style={{ background: "#eff6ff", border: "1px solid #bfdbfe" }}>
        <Headphones size={14} className="text-blue-500 flex-shrink-0" />
        <p className="flex-1 text-xs text-blue-700 font-medium">File nghe</p>
        <button
          onClick={() => openUrlSync(src)}
          className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold text-white"
          style={{ background: "#3b82f6" }}>
          <Headphones size={11} />Mở nghe
        </button>
      </div>
    );
  }

  return (
    <div className="mb-4 px-3 py-2 rounded-xl flex items-center gap-2"
      style={{ background: "#eff6ff", border: "1px solid #bfdbfe" }}>
      <Headphones size={14} className="text-blue-500 flex-shrink-0" />
      <audio src={src} controls preload="metadata" className="flex-1 h-8" style={{ minWidth: 0 }}
        onError={() => setAudioError(true)} />
    </div>
  );
}

// ─── Result screen ─────────────────────────────────────────────────────────────

function ResultScreen({ result, onClose, onRetry, canRetry: canRetryProp }: {
  result: ExamSubmissionResult; onClose: () => void; onRetry: () => void; canRetry: boolean;
}) {
  const score      = Number(result?.score      ?? 0);
  const totalScore = Number(result?.totalScore ?? 10);
  const correctCount = Number(result?.correctCount ?? 0);
  const totalCount   = Number(result?.totalCount   ?? 0);

  const pct = totalScore > 0 ? Math.round((score / totalScore) * 100) : 0;
  const passed = result?.passed != null ? result.passed : pct >= 50;
  const scoreDisplay = score % 1 === 0 ? score.toFixed(0) : score.toFixed(1);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
        <p className="font-bold text-slate-800 text-base">Kết quả bài kiểm tra</p>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors">
          <X size={18} className="text-slate-500" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6">
        <div className="flex flex-col items-center mb-8">
          <div className="w-24 h-24 rounded-full flex items-center justify-center mb-4 shadow-lg"
            style={{ background: passed ? "linear-gradient(135deg, #16a34a, #15803d)" : `linear-gradient(135deg, ${ACCENT}, #9d174d)` }}>
            {passed ? <Trophy size={40} className="text-white" /> : <BookOpen size={40} className="text-white" />}
          </div>
          <p className="text-4xl font-black mb-1" style={{ color: passed ? "#16a34a" : ACCENT }}>
            {scoreDisplay}
            <span className="text-lg font-semibold text-slate-400">/{totalScore}</span>
          </p>
          <span className="text-sm font-bold px-4 py-1.5 rounded-full mt-1"
            style={{ background: passed ? "#f0fdf4" : "#fef2f2", color: passed ? "#16a34a" : "#dc2626" }}>
            {passed ? "Đạt yêu cầu" : "Chưa đạt"}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { value: `${pct}%`,     label: "Tỉ lệ đúng", color: passed ? "#16a34a" : ACCENT },
            { value: correctCount,  label: "Câu đúng",   color: "#16a34a" },
            { value: totalCount > 0 ? totalCount - correctCount : 0, label: "Câu sai", color: "#dc2626" },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col items-center py-4 rounded-2xl" style={{ background: "#f8fafc" }}>
              <p className="text-xl font-black" style={{ color: stat.color }}>{stat.value}</p>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {result?.answers && result.answers.length > 0 && (
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Chi tiết câu trả lời</p>
            <div className="space-y-2">
              {result.answers.map((a, i) => (
                <div key={a.questionId} className="flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={{ background: a.correct ? "#f0fdf4" : "#fef2f2" }}>
                  {a.correct
                    ? <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />
                    : <XCircle     size={16} className="text-red-500 flex-shrink-0" />}
                  <span className="text-sm font-medium text-slate-700">Câu {i + 1}</span>
                  <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-lg"
                    style={{ background: a.correct ? "#dcfce7" : "#fee2e2", color: a.correct ? "#16a34a" : "#dc2626" }}>
                    {a.correct ? "Đúng" : "Sai"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="px-5 py-4 border-t border-slate-100 flex-shrink-0 flex gap-3">
        {canRetryProp && (
          <button onClick={onRetry}
            className="flex-1 h-12 rounded-2xl border-2 font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            style={{ borderColor: ACCENT, color: ACCENT }}>
            <RotateCcw size={15} />Làm lại
          </button>
        )}
        <button onClick={onClose}
          className="flex-1 h-12 rounded-2xl font-semibold text-sm text-white flex items-center justify-center transition-all active:scale-[0.98]"
          style={{ background: `linear-gradient(90deg, ${ACCENT}, #9d174d)` }}>
          Hoàn thành
        </button>
      </div>
    </div>
  );
}

// ─── Main ExamSheet ───────────────────────────────────────────────────────────

export function ExamSheet({ examId, classId, examTitle, onClose }: {
  examId: string; classId?: string | null; examTitle: string; onClose: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [result, setResult] = useState<ExamSubmissionResult | null>(null);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const { data: meta } = useExamMeta(examId);
  const { data: attemptData, refetch: refetchAttempts } = useExamAttemptCount(examId, classId);
  const submitExam = useSubmitExam();

  useEffect(() => { setPortalRoot(document.getElementById("sheet-root")); }, []);

  const duration = meta?.duration ?? 0;
  const maxAttempts = meta?.maxAttempts ?? null;
  const attemptsUsed = (attemptData?.count ?? 0) + (phase === "result" ? 1 : 0);
  const attemptsLeft = maxAttempts != null ? maxAttempts - attemptsUsed : null;
  const canRetry = attemptsLeft == null || attemptsLeft > 0;

  async function handleSubmit(answers: ExamAnswer[], timeTakenSeconds?: number) {
    try {
      const res = await submitExam.mutateAsync({ examId, classId, answers, timeTakenSeconds });
      setResult(res);
      setPhase("result");
      refetchAttempts();
    } catch {
      // Show a generic result so the user always sees the result screen
      setResult({ id: "", score: 0, totalScore: 10, correctCount: 0, totalCount: answers.length });
      setPhase("result");
    }
  }

  function handleRetry() { setResult(null); setPhase("intro"); }

  const content = (
    <div className="pointer-events-auto absolute inset-0 flex flex-col">
      <motion.div className="relative bg-white flex flex-col overflow-hidden flex-1"
        style={{ borderRadius: 0 }}
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}>
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>
        <AnimatePresence mode="wait">
          {phase === "intro" && (
            <motion.div key="intro" className="flex flex-col flex-1 overflow-hidden"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              <IntroScreen examId={examId} classId={classId} examTitle={examTitle} onStart={() => setPhase("taking")} onClose={onClose} />
            </motion.div>
          )}
          {phase === "taking" && (
            <motion.div key="taking" className="flex flex-col flex-1 overflow-hidden" style={{ position: "relative" }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              <TakingScreen examId={examId} classId={classId} duration={duration} onSubmit={handleSubmit} onClose={onClose} />
            </motion.div>
          )}
          {phase === "result" && result && (
            <motion.div key="result" className="flex flex-col flex-1 overflow-hidden"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              <ResultScreen result={result} onClose={onClose} onRetry={handleRetry} canRetry={canRetry} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );

  if (!portalRoot) return null;
  return createPortal(content, portalRoot);
}
