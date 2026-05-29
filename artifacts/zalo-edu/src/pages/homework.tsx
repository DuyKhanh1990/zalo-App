import { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  useAssignmentList,
  useSubmitAssignment,
  normalizeSubmissionAttachments,
  type AssignmentRow,
} from "@/hooks/use-assignments";
import { openExamWebview } from "@/lib/zmp-sdk";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Send, Paperclip, Camera, Image, X, BookOpen, Eye,
  FileText, Star, MessageSquare, User, Search, PlayCircle, ExternalLink,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─── helpers ────────────────────────────────────────────────────────────────

function parseDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

const DOW_SHORT = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const DOW_LONG = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];

function formatGroupLabel(dateStr: string): string {
  const d = parseDate(dateStr);
  return `${DOW_LONG[d.getDay()]}, ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function formatMonthYear(month: number, year: number) {
  return `Tháng ${month}, ${year}`;
}

function toMonthParam(month: number, year: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function groupByDate(items: AssignmentRow[]): [string, AssignmentRow[]][] {
  const map = new Map<string, AssignmentRow[]>();
  for (const item of items) {
    if (!map.has(item.sessionDate)) map.set(item.sessionDate, []);
    map.get(item.sessionDate)!.push(item);
  }
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
}

function parseScore(score?: string | null): number | null {
  if (!score) return null;
  const n = parseFloat(score);
  return isNaN(n) ? null : n;
}

// ─── Badges ──────────────────────────────────────────────────────────────────

function TypeBadge({ itemType }: { itemType: AssignmentRow["itemType"] }) {
  const isBtvn = itemType === "BTVN";
  return (
    <span
      className="text-[11px] font-bold px-1.5 py-0.5 rounded"
      style={{
        background: isBtvn ? "#ede9fe" : "#fce7f3",
        color: isBtvn ? "#7c3aed" : "#be185d",
      }}
    >
      {isBtvn ? "BTVN" : "Bài kiểm tra"}
    </span>
  );
}

function StatusBadge({ status }: { status: AssignmentRow["submissionStatus"] }) {
  const map = {
    pending:   { label: "Chưa nộp", bg: "#fff7ed", color: "#ea580c" },
    submitted: { label: "Đã nộp",   bg: "#f0fdf4", color: "#16a34a" },
  } as const;
  const s = map[status] ?? map.pending;
  return (
    <span
      className="text-xs font-semibold px-2.5 py-1 rounded-full"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

// ─── Comment popup ───────────────────────────────────────────────────────────

function CommentPopup({ comment, onClose, title = "Nhận xét của giáo viên" }: { comment: string; onClose: () => void; title?: string }) {
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  useEffect(() => { setPortalRoot(document.getElementById("sheet-root")); }, []);

  if (!portalRoot) return null;
  return createPortal(
    <div className="pointer-events-auto absolute inset-0 flex flex-col justify-end">
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.45)" }}
        onClick={onClose}
      />
      <motion.div
        className="relative bg-white rounded-t-3xl flex flex-col overflow-hidden"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Star size={14} className="text-amber-400" fill="#fbbf24" />
            <span className="font-bold text-slate-800 text-base">{title}</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
          >
            <X size={18} className="text-slate-500" />
          </button>
        </div>
        <div className="px-5 py-5 overflow-y-auto">
          <div
            className="px-4 py-4 rounded-2xl"
            style={{ background: "#fffbeb", border: "1px solid #fde68a" }}
          >
            <div className="text-sm text-amber-800 leading-relaxed" dangerouslySetInnerHTML={{ __html: comment }} />
          </div>
        </div>
      </motion.div>
    </div>,
    portalRoot
  );
}

// ─── helpers ─────────────────────────────────────────────────────────────────

const API_BASE_HW = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";
function resolveAttachmentUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_BASE_HW}/${url.replace(/^\//, "")}`;
}

function fileIconByName(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) return <Image size={14} style={{ color: "#7c3aed" }} />;
  if (["mp4", "webm", "mov"].includes(ext)) return <PlayCircle size={14} style={{ color: "#7c3aed" }} />;
  return <FileText size={14} style={{ color: "#7c3aed" }} />;
}

// ─── Submit bottom sheet ─────────────────────────────────────────────────────

function SubmitSheet({
  item,
  monthParam,
  onClose,
}: {
  item: AssignmentRow;
  monthParam: string;
  onClose: () => void;
}) {
  const [text, setText] = useState(item.submissionContent ?? "");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [activeTab, setActiveTab] = useState<"text" | "camera" | "gallery">("text");
  const [done, setDone] = useState(false);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const mutation = useSubmitAssignment();

  useEffect(() => {
    setPortalRoot(document.getElementById("sheet-root"));
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setSelectedFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name + f.size));
      const added = files.filter((f) => !existing.has(f.name + f.size));
      return [...prev, ...added];
    });
    e.target.value = "";
  }

  function removeFile(index: number) {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function handleTabClick(tab: "text" | "camera" | "gallery") {
    if (tab === "camera") {
      cameraInputRef.current?.click();
    } else if (tab === "gallery") {
      galleryInputRef.current?.click();
    } else {
      setActiveTab("text");
    }
  }

  function handleSubmit() {
    const fileNames = selectedFiles.map((f) => f.name);
    mutation.mutate(
      {
        homeworkId: item.homeworkId,
        submissionContent: text,
        submissionAttachments: fileNames,
        month: monthParam,
      },
      {
        onSuccess: () => {
          setDone(true);
          setTimeout(onClose, 1200);
        },
      }
    );
  }

  const prevSubmittedFiles = normalizeSubmissionAttachments(item.submissionAttachments);

  const tabs = [
    { id: "text" as const, icon: <BookOpen size={13} />, label: "Bài làm của bạn" },
    { id: "camera" as const, icon: <Camera size={13} />, label: "Chụp ảnh" },
    { id: "gallery" as const, icon: <Image size={13} />, label: "Thư viện" },
  ];

  const content = (
    <div className="pointer-events-auto absolute inset-0 flex flex-col justify-end">
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.45)" }}
        onClick={onClose}
      />
      <motion.div
        className="relative bg-white rounded-t-3xl flex flex-col overflow-hidden"
        style={{ maxHeight: "90%" }}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 flex-shrink-0">
          <div>
            <p className="font-bold text-slate-800 text-base">
              {item.submissionStatus === "submitted" ? "Nộp lại" : "Nộp bài"}
            </p>
            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{item.homeworkTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
          >
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Teacher's assignment description */}
          <div className="px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-1.5 mb-2">
              <BookOpen size={13} style={{ color: "#7c3aed" }} />
              <span className="text-xs font-bold tracking-wider uppercase" style={{ color: "#7c3aed" }}>
                Nội dung giáo viên
              </span>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">{item.homeworkDescription}</p>

            {/* Teacher's attachments */}
            {item.homeworkAttachments.length > 0 && (
              <div className="mt-3 flex flex-col gap-2">
                {item.homeworkAttachments.map((att, i) => (
                  <button
                    key={i}
                    onClick={() => att.url && window.open(resolveAttachmentUrl(att.url), "_blank", "noopener,noreferrer")}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-violet-100 bg-violet-50 hover:bg-violet-100 active:scale-[0.98] transition-all text-left"
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#7c3aed20" }}>
                      <FileText size={14} style={{ color: "#7c3aed" }} />
                    </div>
                    <span className="flex-1 min-w-0 text-[12px] font-semibold truncate" style={{ color: "#7c3aed" }}>
                      {att.name}
                    </span>
                    <ExternalLink size={12} style={{ color: "#7c3aed" }} className="flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Previously submitted files */}
          {prevSubmittedFiles.length > 0 && (
            <div className="px-5 py-3 border-b border-slate-100 bg-indigo-50">
              <div className="flex items-center gap-1.5 mb-2">
                <Paperclip size={12} className="text-indigo-500" />
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">File đã nộp trước</span>
              </div>
              <div className="flex flex-col gap-1.5">
                {prevSubmittedFiles.map((att, i) => (
                  <button
                    key={i}
                    onClick={() => att.url && window.open(att.url, "_blank", "noopener,noreferrer")}
                    className="w-full flex items-center gap-2.5 p-2 rounded-lg border border-indigo-100 bg-white active:bg-indigo-50 transition-all text-left"
                  >
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#6366f115" }}>
                      {fileIconByName(att.name)}
                    </div>
                    <span className="flex-1 min-w-0 text-[11px] font-semibold text-indigo-700 truncate">{att.name}</span>
                    <ExternalLink size={11} className="text-indigo-400 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Teacher's comment (if already graded) */}
          {item.comment && (
            <div className="px-5 py-3 border-b border-slate-100 bg-amber-50">
              <div className="flex items-center gap-1.5 mb-1">
                <MessageSquare size={12} className="text-amber-500" />
                <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Nhận xét giáo viên</span>
              </div>
              <div className="text-sm text-amber-800 leading-relaxed" dangerouslySetInnerHTML={{ __html: item.comment! }} />
            </div>
          )}

          {/* Student's answer area */}
          <div className="px-5 pt-4 pb-3">
            <div className="flex gap-4 mb-3 border-b border-slate-100 pb-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className="flex items-center gap-1 text-xs font-semibold pb-1 transition-colors"
                  style={{
                    color: activeTab === tab.id ? "#7c3aed" : "#94a3b8",
                    borderBottom: activeTab === tab.id ? "2px solid #7c3aed" : "2px solid transparent",
                  }}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
            <textarea
              className="w-full text-sm text-slate-700 placeholder-slate-300 resize-none outline-none bg-transparent"
              rows={5}
              placeholder="Nhập nội dung bài làm..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          {/* Selected files */}
          {selectedFiles.length > 0 && (
            <div className="px-5 pb-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                File đính kèm ({selectedFiles.length})
              </p>
              <div className="flex flex-col gap-1.5">
                {selectedFiles.map((file, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2.5 p-2 rounded-lg border border-slate-100 bg-slate-50"
                  >
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#7c3aed15" }}>
                      {fileIconByName(file.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-slate-700 truncate">{file.name}</p>
                      <p className="text-[10px] text-slate-400">{(file.size / 1024).toFixed(0)} KB</p>
                    </div>
                    <button
                      onClick={() => removeFile(i)}
                      className="w-6 h-6 flex items-center justify-center rounded-full bg-slate-200 hover:bg-red-100 transition-colors flex-shrink-0"
                    >
                      <X size={11} className="text-slate-500" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="px-5 pb-4 flex items-center gap-2 text-xs text-slate-400">
            <Paperclip size={13} />
            <span>Chọn ảnh/file bằng tab "Chụp ảnh" hoặc "Thư viện" (tối đa 10MB mỗi file)</span>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-slate-100 flex-shrink-0">
          <button
            onClick={handleSubmit}
            disabled={mutation.isPending || done}
            className="w-full h-12 rounded-2xl flex items-center justify-center gap-2 text-white font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-80"
            style={{ background: done ? "#16a34a" : "linear-gradient(90deg, #7c3aed, #a855f7)" }}
          >
            <Send size={15} />
            {done ? "Đã nộp thành công!" : mutation.isPending ? "Đang nộp..." : item.submissionStatus === "submitted" ? "Nộp lại" : "Nộp bài"}
          </button>
        </div>
      </motion.div>
    </div>
  );

  if (!portalRoot) return null;
  return createPortal(content, portalRoot);
}

// ─── Card ────────────────────────────────────────────────────────────────────

function HomeworkCard({
  item,
  onSubmit,
  onExam,
}: {
  item: AssignmentRow;
  onSubmit: (item: AssignmentRow) => void;
  onExam: (examId: string, classId: string, title: string) => void;
}) {
  const isBtvn = item.itemType === "BTVN";
  const isSubmitted = item.submissionStatus === "submitted";
  const canSubmit = item.submissionStatus === "pending" && isBtvn;
  const canResubmit = isSubmitted && isBtvn;
  const [expanded, setExpanded] = useState(false);
  const [commentTruncated, setCommentTruncated] = useState(false);
  const [showCommentPopup, setShowCommentPopup] = useState(false);
  const [showSubmissionPopup, setShowSubmissionPopup] = useState(false);
  const commentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = commentRef.current;
    if (el) setCommentTruncated(el.scrollHeight > el.clientHeight + 1);
  }, [item.comment]);

  const d = parseDate(item.sessionDate);
  const dateMeta = `${DOW_SHORT[d.getDay()]}, ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;

  const accentColor = isBtvn ? "#7c3aed" : "#be185d";
  const scoreNum = parseScore(item.score);

  return (
    <div
      className="bg-white rounded-2xl overflow-hidden shadow-sm"
      style={{ borderLeft: `4px solid ${accentColor}` }}
    >
      {/* Main content row */}
      <div className="flex items-stretch">
        {/* Left: info */}
        <div className="flex-1 px-3.5 pt-3.5 pb-3 min-w-0">
          {/* Meta line */}
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <TypeBadge itemType={item.itemType} />
            {item.isPersonalized && (
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                style={{ background: "#fef3c7", color: "#d97706" }}
              >
                Cá nhân hoá
              </span>
            )}
            <span className="text-xs text-slate-400">
              {item.classCode} · {dateMeta}
            </span>
            {item.startTime && (
              <span className="text-xs text-slate-400">
                {item.startTime}–{item.endTime}
              </span>
            )}
          </div>

          {/* Title */}
          <p className="text-sm font-bold text-slate-800 leading-snug mb-2">{item.homeworkTitle}</p>

          {/* Student info */}
          <div className="flex items-center gap-1 mb-1.5">
            <User size={11} className="flex-shrink-0" style={{ color: "#ea580c" }} />
            <span className="text-xs font-semibold" style={{ color: "#ea580c" }}>{item.studentName}</span>
          </div>

          {/* Status + badges row */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <StatusBadge status={item.submissionStatus} />

            {/* Submission eye button */}
            {isSubmitted && item.submissionContent && (
              <button
                onClick={(e) => { e.stopPropagation(); setShowSubmissionPopup(true); }}
                className="text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 bg-indigo-50 text-indigo-600 transition-all active:scale-[0.96]"
              >
                <Eye size={11} />
                Bài nộp
              </button>
            )}

            {/* Attachment count badge */}
            {item.homeworkAttachments.length > 0 && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 bg-slate-50 text-slate-500">
                <Paperclip size={11} />
                {item.homeworkAttachments.length} tệp
              </span>
            )}

            {/* Exam button */}
            {item.examId && (
              <button
                onClick={(e) => { e.stopPropagation(); onExam(item.examId!, item.classId, item.homeworkTitle); }}
                className="text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 transition-all active:scale-[0.96]"
                style={{ background: "#fdf2f8", color: "#be185d", border: "1px solid #fce7f3" }}
              >
                <PlayCircle size={11} />
                Làm bài kiểm tra
              </button>
            )}
          </div>
        </div>

        {/* Right: score + expand toggle */}
        <div className="flex flex-col items-center justify-between flex-shrink-0">
          {/* Score box */}
          {scoreNum != null ? (
            <div className="mt-3 mr-3 flex flex-col items-center justify-center w-14 h-14 rounded-2xl bg-emerald-50">
              <span className="text-lg font-black leading-none text-emerald-600">
                {scoreNum % 1 === 0 ? scoreNum.toFixed(0) : scoreNum.toFixed(1)}
              </span>
              <span className="text-[10px] font-semibold text-emerald-500 mt-0.5">điểm</span>
            </div>
          ) : (
            <div className="mt-3 mr-3 w-14 h-14" />
          )}

          {/* Expand toggle */}
          {(canSubmit || canResubmit) && (
            <button
              className="mr-3 mb-3 text-slate-400 active:text-slate-600 transition-colors"
              onClick={() => setExpanded((e) => !e)}
            >
              {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          )}
        </div>
      </div>


      {/* Teacher comment preview (not in expand area) */}
      {item.comment && !expanded && (
        <div
          className="mx-3.5 mb-3 px-3 py-2 rounded-xl"
          style={{ background: "#fffbeb", border: "1px solid #fde68a" }}
        >
          <div className="flex items-center gap-1 mb-0.5">
            <Star size={10} className="text-amber-400" fill="#fbbf24" />
            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Nhận xét</span>
          </div>
          <div
            ref={commentRef}
            className="text-xs text-amber-800 leading-relaxed line-clamp-2"
            dangerouslySetInnerHTML={{ __html: item.comment! }}
          />
          {commentTruncated && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowCommentPopup(true); }}
              className="mt-1 text-[11px] font-semibold text-amber-600 hover:text-amber-700 transition-colors"
            >
              ...xem thêm
            </button>
          )}
        </div>
      )}

      {/* Comment full-content popup */}
      <AnimatePresence>
        {showCommentPopup && item.comment && (
          <CommentPopup
            comment={item.comment}
            onClose={() => setShowCommentPopup(false)}
          />
        )}
      </AnimatePresence>

      {/* Submission popup */}
      <AnimatePresence>
        {showSubmissionPopup && item.submissionContent && (
          <CommentPopup
            title="Bài nộp của bạn"
            comment={item.submissionContent}
            onClose={() => setShowSubmissionPopup(false)}
          />
        )}
      </AnimatePresence>

      {/* Expand area: nộp / nộp lại */}
      <AnimatePresence initial={false}>
        {expanded && (canSubmit || canResubmit) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: "hidden" }}
          >
            <div className="px-4 pb-3.5 pt-1 border-t border-slate-50">
              <button
                onClick={(e) => { e.stopPropagation(); onSubmit(item); }}
                className="w-full h-10 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-all active:scale-[0.98]"
                style={
                  canResubmit
                    ? { background: "#eff6ff", color: "#2563eb" }
                    : { background: "linear-gradient(90deg, #7c3aed, #a855f7)", color: "white" }
                }
              >
                <Send size={13} />
                {canResubmit ? "Nộp lại" : "Nộp bài"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Filter chips ─────────────────────────────────────────────────────────────

const FILTERS = [
  { id: "all",       label: "Tất cả" },
  { id: "btvn",      label: "BTVN" },
  { id: "kiem_tra",  label: "Kiểm tra" },
  { id: "pending",   label: "Chưa nộp" },
  { id: "submitted", label: "Đã nộp" },
];

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Homework() {
  const today = new Date();
  const [month, setMonth] = useState(() => {
    const param = new URLSearchParams(window.location.search).get("month");
    if (param) {
      const m = parseInt(param.split("-")[1], 10);
      if (m >= 1 && m <= 12) return m;
    }
    return today.getMonth() + 1;
  });
  const [year, setYear] = useState(() => {
    const param = new URLSearchParams(window.location.search).get("month");
    if (param) {
      const y = parseInt(param.split("-")[0], 10);
      if (y > 2000) return y;
    }
    return today.getFullYear();
  });
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [submitItem, setSubmitItem] = useState<AssignmentRow | null>(null);

  const monthParam = toMonthParam(month, year);
  const { data: apiData, isLoading } = useAssignmentList(monthParam);

  const allRows = apiData?.rows ?? [];

  const items = useMemo<AssignmentRow[]>(() => {
    let list = [...allRows];
    if (filter === "btvn")           list = list.filter((i) => i.itemType === "BTVN");
    else if (filter === "kiem_tra")  list = list.filter((i) => i.itemType === "Bài kiểm tra");
    else if (filter === "pending")   list = list.filter((i) => i.submissionStatus === "pending");
    else if (filter === "submitted") list = list.filter((i) => i.submissionStatus === "submitted");
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((i) =>
        i.homeworkTitle?.toLowerCase().includes(q) ||
        i.classCode?.toLowerCase().includes(q) ||
        i.studentName?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allRows, filter, searchQuery]);

  const stats = useMemo(() => {
    const btvns = allRows.filter((i) => i.itemType === "BTVN");
    return {
      btvnDone:  btvns.filter((i) => i.submissionStatus === "submitted").length,
      btvnTotal: btvns.length,
      kiemTra:   allRows.filter((i) => i.itemType === "Bài kiểm tra").length,
    };
  }, [allRows]);

  const groups = useMemo(() => groupByDate(items), [items]);

  const progressPct = stats.btvnTotal > 0
    ? Math.round((stats.btvnDone / stats.btvnTotal) * 100)
    : 0;

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  return (
    <div className="flex flex-col h-full" style={{ background: "#f5f5fb" }}>
      {/* Header */}
      <div
        className="px-4 pt-10 pb-5"
        style={{ background: "linear-gradient(160deg, #c3b8f5 0%, #a89de8 40%, #8f84d8 100%)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={prevMonth}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors text-white"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-white font-semibold text-base">{formatMonthYear(month, year)}</span>
          <button
            onClick={nextMonth}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors text-white"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-between px-1 mb-3">
          <span className="text-white/90 text-sm font-medium">
            {stats.btvnDone}/{stats.btvnTotal} BTVN đã nộp
          </span>
          <span className="text-white/90 text-sm font-medium">
            {stats.kiemTra} bài kiểm tra
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 rounded-full bg-white/30 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-white"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Search bar */}
      <div className="px-4 pt-3 pb-1">
        <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2.5 shadow-sm border border-slate-100">
          <Search size={15} className="text-slate-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Tìm bài tập, mã lớp, học viên..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 text-sm text-slate-700 placeholder-slate-400 outline-none bg-transparent"
            style={{ fontSize: '16px' }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="text-slate-400 hover:text-slate-600 transition-colors">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Filter chips */}
      <div className="px-4 py-3">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-all"
              style={
                filter === f.id
                  ? { background: "#7c3aed", color: "white" }
                  : { background: "white", color: "#64748b", border: "1px solid #e2e8f0" }
              }
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pb-24">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-52 text-center px-4">
            <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center mb-3">
              <BookOpen size={28} className="text-purple-200" />
            </div>
            <p className="text-slate-600 font-semibold">Không có bài tập</p>
            <p className="text-slate-400 text-sm mt-1">Tháng này không có BTVN hay bài kiểm tra.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {groups.map(([dateKey, groupItems]) => (
              <div key={dateKey}>
                {/* Group label */}
                <div className="flex items-center gap-2 mb-2.5 px-1">
                  <span className="text-sm font-bold" style={{ color: "#7c3aed" }}>
                    {formatGroupLabel(dateKey)}
                  </span>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: "#ede9fe", color: "#7c3aed" }}
                  >
                    {groupItems.length} bài
                  </span>
                </div>

                <div className="space-y-2.5">
                  <AnimatePresence mode="popLayout">
                    {groupItems.map((item, i) => (
                      <motion.div
                        key={item.homeworkId}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.97 }}
                        transition={{ delay: i * 0.04, duration: 0.18 }}
                      >
                        <HomeworkCard
                          item={item}
                          onSubmit={setSubmitItem}
                          onExam={(examId, classId, title) => openExamWebview(examId, classId, title)}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit sheet */}
      <AnimatePresence>
        {submitItem && (
          <SubmitSheet
            item={submitItem}
            monthParam={monthParam}
            onClose={() => setSubmitItem(null)}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
