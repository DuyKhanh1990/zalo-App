import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, ChevronLeft, ChevronRight, Clock, CheckCircle2,
  XCircle, AlertCircle, Loader2, BookOpen, Trophy, RotateCcw,
} from "lucide-react";
import {
  useExamMeta,
  useExamAttemptCount,
  useExamPreview,
  useSubmitExam,
  type ExamAnswer,
  type ExamQuestion,
  type ExamSubmissionResult,
} from "@/hooks/use-exam";

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
  label,
  text,
  selected,
  correct,
  wrong,
  disabled,
  onClick,
}: {
  label: string;
  text: string;
  selected: boolean;
  correct?: boolean;
  wrong?: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  let bg = "white";
  let border = "#e2e8f0";
  let labelBg = "#f1f5f9";
  let labelColor = "#64748b";
  let textColor = "#1e293b";

  if (correct) {
    bg = "#f0fdf4"; border = "#86efac"; labelBg = "#16a34a"; labelColor = "white"; textColor = "#15803d";
  } else if (wrong) {
    bg = "#fef2f2"; border = "#fca5a5"; labelBg = "#dc2626"; labelColor = "white"; textColor = "#b91c1c";
  } else if (selected) {
    bg = ACCENT_BG; border = ACCENT; labelBg = ACCENT; labelColor = "white"; textColor = ACCENT;
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 transition-all active:scale-[0.98] text-left"
      style={{ background: bg, borderColor: border }}
    >
      <span
        className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black"
        style={{ background: labelBg, color: labelColor }}
      >
        {label}
      </span>
      <span className="text-sm leading-snug font-medium flex-1" style={{ color: textColor }}
        dangerouslySetInnerHTML={{ __html: text }}
      />
      {correct && <CheckCircle2 size={16} className="flex-shrink-0 text-green-500" />}
      {wrong && <XCircle size={16} className="flex-shrink-0 text-red-500" />}
    </button>
  );
}

// ─── Phases ───────────────────────────────────────────────────────────────────

type Phase = "intro" | "taking" | "result";

// ─── Intro screen ─────────────────────────────────────────────────────────────

function IntroScreen({
  examId,
  examTitle,
  onStart,
  onClose,
}: {
  examId: string;
  examTitle: string;
  onStart: () => void;
  onClose: () => void;
}) {
  const { data: meta, isLoading: metaLoading } = useExamMeta(examId);
  const { data: attemptData, isLoading: attemptLoading } = useExamAttemptCount(examId);

  const isLoading = metaLoading || attemptLoading;
  const attemptsUsed = attemptData?.count ?? 0;
  const maxAttempts = meta?.maxAttempts ?? null;
  const attemptsLeft = maxAttempts != null ? maxAttempts - attemptsUsed : null;
  const canTake = attemptsLeft == null || attemptsLeft > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
        <p className="font-bold text-slate-800 text-base line-clamp-1 flex-1 pr-3">{examTitle}</p>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors flex-shrink-0"
        >
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
            {/* Exam icon */}
            <div className="flex justify-center mb-6">
              <div
                className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-md"
                style={{ background: `linear-gradient(135deg, ${ACCENT}, #9d174d)` }}
              >
                <BookOpen size={36} className="text-white" />
              </div>
            </div>

            {/* Title */}
            <h2 className="text-xl font-black text-slate-800 text-center mb-1">
              {meta?.title ?? examTitle}
            </h2>
            {meta?.description && (
              <p className="text-sm text-slate-500 text-center mb-5 leading-relaxed">{meta.description}</p>
            )}

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3 mt-5 mb-6">
              {[
                {
                  label: "Thời gian",
                  value: meta?.duration ? `${meta.duration} phút` : "Không giới hạn",
                  icon: <Clock size={16} style={{ color: ACCENT }} />,
                },
                {
                  label: "Số câu hỏi",
                  value: meta?.totalQuestions != null ? `${meta.totalQuestions} câu` : "—",
                  icon: <BookOpen size={16} style={{ color: ACCENT }} />,
                },
                {
                  label: "Đã làm",
                  value: `${attemptsUsed} lần`,
                  icon: <RotateCcw size={16} style={{ color: ACCENT }} />,
                },
                {
                  label: "Còn lại",
                  value: attemptsLeft == null ? "Không giới hạn" : `${attemptsLeft} lần`,
                  icon: <CheckCircle2 size={16} style={{ color: canTake ? "#16a34a" : "#dc2626" }} />,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex flex-col items-center justify-center py-4 px-3 rounded-2xl text-center"
                  style={{ background: ACCENT_BG }}
                >
                  {item.icon}
                  <p className="text-base font-black text-slate-800 mt-1.5">{item.value}</p>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>

            {/* No attempts left warning */}
            {!canTake && (
              <div className="flex items-start gap-2 px-4 py-3 rounded-2xl bg-red-50 border border-red-100 mb-4">
                <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 leading-snug">
                  Bạn đã hết lượt làm bài cho đề kiểm tra này.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* CTA */}
      {!isLoading && (
        <div className="px-5 py-4 border-t border-slate-100 flex-shrink-0">
          <button
            onClick={onStart}
            disabled={!canTake}
            className="w-full h-13 py-3.5 rounded-2xl flex items-center justify-center gap-2 text-white font-bold text-base transition-all active:scale-[0.98] disabled:opacity-50"
            style={{ background: canTake ? `linear-gradient(90deg, ${ACCENT}, #9d174d)` : "#94a3b8" }}
          >
            <BookOpen size={18} />
            Bắt đầu làm bài
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Taking screen ─────────────────────────────────────────────────────────────

const LABELS = ["A", "B", "C", "D", "E", "F"];

function TakingScreen({
  examId,
  duration,
  onSubmit,
  onClose,
}: {
  examId: string;
  duration: number;
  onSubmit: (answers: ExamAnswer[]) => void;
  onClose: () => void;
}) {
  const { data: preview, isLoading } = useExamPreview(examId, true);
  const questions: ExamQuestion[] = preview?.questions ?? [];

  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [confirmQuit, setConfirmQuit] = useState(false);

  const { label: timerLabel, urgent } = useCountdown(
    duration > 0 ? duration : 999,
    !isLoading && questions.length > 0,
    () => handleSubmit()
  );

  function select(questionId: string, optionId: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: [optionId] }));
  }

  function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);
    const answerList: ExamAnswer[] = questions.map((q) => ({
      questionId: q.id,
      selectedOptionIds: answers[q.id] ?? [],
    }));
    onSubmit(answerList);
  }

  const q = questions[current];
  const answeredCount = Object.keys(answers).length;
  const totalCount = questions.length;
  const progress = totalCount > 0 ? (answeredCount / totalCount) * 100 : 0;

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
        <button
          onClick={onClose}
          className="mt-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ background: ACCENT }}
        >
          Đóng
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ background: ACCENT_BG, borderBottom: `1px solid #fce7f3` }}
      >
        <button
          onClick={() => setConfirmQuit(true)}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white/80 transition-colors"
        >
          <X size={16} style={{ color: ACCENT }} />
        </button>

        <div className="text-center">
          <p className="text-xs text-slate-500 font-medium">
            Câu {current + 1} / {totalCount}
          </p>
          <p className="text-[11px] text-slate-400">{answeredCount} đã trả lời</p>
        </div>

        {/* Timer */}
        {duration > 0 && (
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
            style={{ background: urgent ? "#fef2f2" : "white", border: `1px solid ${urgent ? "#fca5a5" : "#e2e8f0"}` }}
          >
            <Clock size={12} style={{ color: urgent ? "#dc2626" : ACCENT }} />
            <span
              className="text-sm font-black tabular-nums"
              style={{ color: urgent ? "#dc2626" : ACCENT }}
            >
              {timerLabel}
            </span>
          </div>
        )}
        {duration <= 0 && <div className="w-8" />}
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-slate-100 flex-shrink-0">
        <div
          className="h-full transition-all duration-300"
          style={{ width: `${progress}%`, background: ACCENT }}
        />
      </div>

      {/* Question */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.15 }}
          >
            {/* Question number + content */}
            <div className="mb-5">
              <span
                className="text-xs font-black uppercase tracking-wider"
                style={{ color: ACCENT }}
              >
                Câu {current + 1}
              </span>
              <div
                className="mt-1.5 text-base font-semibold text-slate-800 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: q.content }}
              />
            </div>

            {/* Options */}
            <div className="space-y-3">
              {q.options.map((opt, i) => {
                const selected = (answers[q.id] ?? []).includes(opt.id);
                return (
                  <OptionButton
                    key={opt.id}
                    label={LABELS[i] ?? String(i + 1)}
                    text={opt.content}
                    selected={selected}
                    disabled={submitting}
                    onClick={() => select(q.id, opt.id)}
                  />
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom nav */}
      <div className="px-4 py-4 border-t border-slate-100 flex-shrink-0 flex items-center gap-3">
        <button
          onClick={() => setCurrent((c) => Math.max(0, c - 1))}
          disabled={current === 0}
          className="w-11 h-11 flex items-center justify-center rounded-xl border border-slate-200 bg-white disabled:opacity-30 transition-colors"
        >
          <ChevronLeft size={18} className="text-slate-600" />
        </button>

        {current < totalCount - 1 ? (
          <button
            onClick={() => setCurrent((c) => Math.min(totalCount - 1, c + 1))}
            className="flex-1 h-11 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            style={{ background: ACCENT_BG, color: ACCENT }}
          >
            Câu tiếp theo
            <ChevronRight size={15} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 h-11 rounded-xl font-bold text-sm text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-80"
            style={{ background: `linear-gradient(90deg, ${ACCENT}, #9d174d)` }}
          >
            {submitting ? (
              <><Loader2 size={15} className="animate-spin" /> Đang nộp...</>
            ) : (
              <>Nộp bài ({answeredCount}/{totalCount})</>
            )}
          </button>
        )}
      </div>

      {/* Confirm quit dialog */}
      <AnimatePresence>
        {confirmQuit && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center px-6"
            style={{ background: "rgba(0,0,0,0.5)", zIndex: 20 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-3xl p-6 w-full"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <AlertCircle size={32} className="text-amber-400 mx-auto mb-3" />
              <h3 className="text-base font-black text-slate-800 text-center mb-1">Thoát bài kiểm tra?</h3>
              <p className="text-sm text-slate-500 text-center mb-5">
                Bài làm chưa được nộp sẽ bị mất. Bạn có chắc muốn thoát không?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmQuit(false)}
                  className="flex-1 h-11 rounded-xl font-semibold text-sm border border-slate-200 text-slate-700"
                >
                  Tiếp tục làm
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 h-11 rounded-xl font-semibold text-sm text-white"
                  style={{ background: ACCENT }}
                >
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

// ─── Result screen ─────────────────────────────────────────────────────────────

function ResultScreen({
  result,
  onClose,
  onRetry,
  canRetry: canRetryProp,
}: {
  result: ExamSubmissionResult;
  onClose: () => void;
  onRetry: () => void;
  canRetry: boolean;
}) {
  const pct = result.totalScore > 0
    ? Math.round((result.score / result.totalScore) * 100)
    : 0;
  const passed = result.passed ?? pct >= 50;
  const scoreDisplay = result.score % 1 === 0 ? result.score.toFixed(0) : result.score.toFixed(1);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
        <p className="font-bold text-slate-800 text-base">Kết quả bài kiểm tra</p>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
        >
          <X size={18} className="text-slate-500" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6">
        {/* Trophy icon + score */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center mb-4 shadow-lg"
            style={{
              background: passed
                ? "linear-gradient(135deg, #16a34a, #15803d)"
                : `linear-gradient(135deg, ${ACCENT}, #9d174d)`,
            }}
          >
            {passed ? (
              <Trophy size={40} className="text-white" />
            ) : (
              <BookOpen size={40} className="text-white" />
            )}
          </div>

          <p
            className="text-4xl font-black mb-1"
            style={{ color: passed ? "#16a34a" : ACCENT }}
          >
            {scoreDisplay}
            <span className="text-lg font-semibold text-slate-400">/{result.totalScore}</span>
          </p>

          <span
            className="text-sm font-bold px-4 py-1.5 rounded-full mt-1"
            style={{
              background: passed ? "#f0fdf4" : "#fef2f2",
              color: passed ? "#16a34a" : "#dc2626",
            }}
          >
            {passed ? "Đạt yêu cầu" : "Chưa đạt"}
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { value: `${pct}%`, label: "Tỉ lệ đúng", color: passed ? "#16a34a" : ACCENT },
            { value: result.correctCount, label: "Câu đúng", color: "#16a34a" },
            { value: result.totalCount - result.correctCount, label: "Câu sai", color: "#dc2626" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center py-4 rounded-2xl"
              style={{ background: "#f8fafc" }}
            >
              <p className="text-xl font-black" style={{ color: stat.color }}>{stat.value}</p>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Per-question review */}
        {result.answers && result.answers.length > 0 && (
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Chi tiết câu trả lời</p>
            <div className="space-y-2">
              {result.answers.map((a, i) => (
                <div
                  key={a.questionId}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={{ background: a.correct ? "#f0fdf4" : "#fef2f2" }}
                >
                  {a.correct
                    ? <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />
                    : <XCircle size={16} className="text-red-500 flex-shrink-0" />
                  }
                  <span className="text-sm font-medium text-slate-700">Câu {i + 1}</span>
                  <span
                    className="ml-auto text-xs font-bold px-2 py-0.5 rounded-lg"
                    style={{
                      background: a.correct ? "#dcfce7" : "#fee2e2",
                      color: a.correct ? "#16a34a" : "#dc2626",
                    }}
                  >
                    {a.correct ? "Đúng" : "Sai"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-5 py-4 border-t border-slate-100 flex-shrink-0 flex gap-3">
        {canRetryProp && (
          <button
            onClick={onRetry}
            className="flex-1 h-12 rounded-2xl border-2 font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            style={{ borderColor: ACCENT, color: ACCENT }}
          >
            <RotateCcw size={15} />
            Làm lại
          </button>
        )}
        <button
          onClick={onClose}
          className="flex-1 h-12 rounded-2xl font-semibold text-sm text-white flex items-center justify-center transition-all active:scale-[0.98]"
          style={{ background: `linear-gradient(90deg, ${ACCENT}, #9d174d)` }}
        >
          Hoàn thành
        </button>
      </div>
    </div>
  );
}

// ─── Main ExamSheet ───────────────────────────────────────────────────────────

export function ExamSheet({
  examId,
  examTitle,
  onClose,
}: {
  examId: string;
  examTitle: string;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [result, setResult] = useState<ExamSubmissionResult | null>(null);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const { data: meta } = useExamMeta(examId);
  const { data: attemptData, refetch: refetchAttempts } = useExamAttemptCount(examId);
  const submitExam = useSubmitExam();

  useEffect(() => {
    setPortalRoot(document.getElementById("sheet-root"));
  }, []);

  const duration = meta?.duration ?? 0;
  const maxAttempts = meta?.maxAttempts ?? null;
  const attemptsUsed = (attemptData?.count ?? 0) + (phase === "result" ? 1 : 0);
  const attemptsLeft = maxAttempts != null ? maxAttempts - attemptsUsed : null;
  const canRetry = attemptsLeft == null || attemptsLeft > 0;

  async function handleSubmit(answers: ExamAnswer[]) {
    try {
      const res = await submitExam.mutateAsync({ examId, answers });
      setResult(res);
      setPhase("result");
      refetchAttempts();
    } catch {
      setResult({
        id: "",
        score: 0,
        totalScore: 10,
        correctCount: 0,
        totalCount: answers.length,
        passed: false,
      });
      setPhase("result");
    }
  }

  function handleRetry() {
    setResult(null);
    setPhase("intro");
  }

  const content = (
    <div className="pointer-events-auto absolute inset-0 flex flex-col justify-end">
      <div
        className="absolute inset-0"
        onClick={phase === "taking" ? undefined : onClose}
        style={{ background: "rgba(0,0,0,0.5)" }}
      />
      <motion.div
        className="relative bg-white flex flex-col overflow-hidden"
        style={{ borderRadius: "24px 24px 0 0", maxHeight: "95%" }}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        <AnimatePresence mode="wait">
          {phase === "intro" && (
            <motion.div
              key="intro"
              className="flex flex-col flex-1 overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <IntroScreen
                examId={examId}
                examTitle={examTitle}
                onStart={() => setPhase("taking")}
                onClose={onClose}
              />
            </motion.div>
          )}

          {phase === "taking" && (
            <motion.div
              key="taking"
              className="flex flex-col flex-1 overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{ position: "relative" }}
            >
              <TakingScreen
                examId={examId}
                duration={duration}
                onSubmit={handleSubmit}
                onClose={onClose}
              />
            </motion.div>
          )}

          {phase === "result" && result && (
            <motion.div
              key="result"
              className="flex flex-col flex-1 overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <ResultScreen
                result={result}
                onClose={onClose}
                onRetry={handleRetry}
                canRetry={canRetry}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );

  if (!portalRoot) return null;
  return createPortal(content, portalRoot);
}
