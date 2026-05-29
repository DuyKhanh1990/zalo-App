import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCalendarMonth,
  useSessionDetail,
  useUserType,
  useOnlineCheckin,
  useOnlineCheckout,
  normalizeSessionContent,
  type CalendarSession,
  type SessionContent,
} from "@/hooks/use-calendar";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MapPin,
  User,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  BookOpen,
  MessageSquare,
  Users,
  Wifi,
  WifiOff,
  Layers,
  X,
  FileText,
  ImageIcon,
  Video,
  ExternalLink,
  Paperclip,
  BookMarked,
  ClipboardList,
  Star,
  Search,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const WEEKDAY_SHORT = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const WEEKDAY_VN_FULL = [
  "Chủ Nhật",
  "Thứ Hai",
  "Thứ Ba",
  "Thứ Tư",
  "Thứ Năm",
  "Thứ Sáu",
  "Thứ Bảy",
];

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatMonthParam(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthYear(d: Date): string {
  return `Tháng ${d.getMonth() + 1}, ${d.getFullYear()}`;
}

function formatFullDate(d: Date): string {
  return `${WEEKDAY_VN_FULL[d.getDay()]}, ${d.getDate()} Tháng ${d.getMonth() + 1} năm ${d.getFullYear()}`;
}

function formatDisplayDate(dateStr: string): string {
  const [y, m, day] = dateStr.split("-");
  return `${day}/${m}/${y}`;
}

function attendanceLabel(status: CalendarSession["attendanceStatus"]): {
  label: string;
  color: string;
} {
  switch (status) {
    case "present":
      return { label: "Có mặt", color: "#22c55e" };
    case "absent":
      return { label: "Vắng mặt", color: "#ef4444" };
    case "late":
      return { label: "Đi trễ", color: "#f59e0b" };
    case "makeup_wait":
      return { label: "Chờ học bù", color: "#8b5cf6" };
    case "makeup_done":
      return { label: "Đã học bù", color: "#0891b2" };
    case "pending":
    default:
      return { label: "Chưa điểm danh", color: "#94a3b8" };
  }
}

function sessionStatusLabel(status: CalendarSession["sessionStatus"]): {
  label: string;
  color: string;
} {
  switch (status) {
    case "completed":
      return { label: "Đã hoàn thành", color: "#22c55e" };
    case "cancelled":
      return { label: "Đã huỷ", color: "#ef4444" };
    default:
      return { label: "Sắp diễn ra", color: "#6366f1" };
  }
}

function formatLabel(format: CalendarSession["learningFormat"]): {
  label: string;
  icon: React.ReactNode;
} {
  switch (format) {
    case "online":
      return { label: "Online", icon: <Wifi size={11} /> };
    case "hybrid":
      return { label: "Hybrid", icon: <Layers size={11} /> };
    default:
      return { label: "Offline", icon: <WifiOff size={11} /> };
  }
}

const ACCENT = "#7c6fd4";

// ─── Content type helpers ──────────────────────────────────────────────────────

function contentTypeIcon(type: string): React.ReactNode {
  const t = type.toLowerCase();
  if (t.includes("slide") || t.includes("bài học")) return <BookMarked size={16} style={{ color: ACCENT }} />;
  if (t.includes("bài tập") || t.includes("kiểm tra")) return <ClipboardList size={16} className="text-amber-500" />;
  if (t.includes("video")) return <Video size={16} className="text-red-400" />;
  return <BookOpen size={16} className="text-slate-400" />;
}

function fileIcon(url: string): React.ReactNode {
  const lower = url.toLowerCase();
  if (lower.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) return <ImageIcon size={18} className="text-emerald-500" />;
  if (lower.match(/\.(mp4|mov|avi|webm|mkv)$/)) return <Video size={18} className="text-red-500" />;
  if (lower.match(/\.(pdf)$/)) return <FileText size={18} className="text-red-500" />;
  return <Paperclip size={18} style={{ color: ACCENT }} />;
}

function fileLabel(url: string): string {
  const lower = url.toLowerCase();
  if (lower.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) return "Xem ảnh";
  if (lower.match(/\.(mp4|mov|avi|webm|mkv)$/)) return "Xem video";
  if (lower.match(/\.(pdf)$/)) return "Xem PDF";
  return "Mở tài liệu";
}

function fileTypeLabel(url: string): string {
  const lower = url.toLowerCase();
  if (lower.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) return "Hình ảnh";
  if (lower.match(/\.(mp4|mov|avi|webm|mkv)$/)) return "Video";
  if (lower.match(/\.(pdf)$/)) return "PDF";
  return "Tài liệu";
}

// ─── Content popup (bottom sheet) ─────────────────────────────────────────────

function normalizeResourceUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const base = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";
  return `${base}/${url.replace(/^\//, "")}`;
}

function ContentPopup({
  item: rawItem,
  onClose,
}: {
  item: SessionContent;
  onClose: () => void;
}) {
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  useEffect(() => { setPortalRoot(document.getElementById("sheet-root")); }, []);

  const item = normalizeSessionContent(rawItem);
  const hasAttachments = item.attachments && item.attachments.length > 0;

  if (!portalRoot) return null;

  return createPortal(
    <div className="pointer-events-auto absolute inset-0 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.45)" }}
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 340, damping: 34 }}
        className="relative bg-white rounded-t-3xl overflow-hidden flex flex-col"
        style={{ maxHeight: "82%" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-2 pb-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex-1 min-w-0 pr-3">
            <span
              className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-2"
              style={{ background: ACCENT + "18", color: ACCENT }}
            >
              {contentTypeIcon(item.type)}
              {item.type}
            </span>
            <h2 className="text-base font-bold text-slate-800 leading-snug">
              {item.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition-colors flex-shrink-0 mt-1"
          >
            <X size={16} className="text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-5 py-4 flex flex-col gap-4 pb-8">
          {/* Description */}
          {item.description && (
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Mô tả
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">{item.description}</p>
            </div>
          )}

          {/* Attempt info */}
          {item.maxAttempts != null && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
              <ClipboardList size={15} className="text-amber-500 flex-shrink-0" />
              <p className="text-xs text-amber-700">
                Số lần làm tối đa: <span className="font-bold">{item.maxAttempts}</span>
              </p>
            </div>
          )}

          {/* Available at */}
          {item.availableAt && (
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Có thể xem từ
              </p>
              <p className="text-sm text-slate-600">
                {new Date(item.availableAt).toLocaleString("vi-VN", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          )}

          {/* File attachments */}
          {hasAttachments && (
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Tệp đính kèm
              </p>
              <div className="flex flex-col gap-2">
                {item.attachments!.map((att, i) => (
                  <button
                    key={i}
                    onClick={() => window.open(normalizeResourceUrl(att.url), "_blank", "noopener,noreferrer")}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 active:scale-[0.98] transition-all"
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: ACCENT + "15" }}
                    >
                      {fileIcon(att.url)}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-semibold text-slate-700 truncate">
                        {att.name}
                      </p>
                      <p className="text-xs text-slate-400">{fileTypeLabel(att.url)}</p>
                    </div>
                    <div
                      className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg flex-shrink-0"
                      style={{ background: ACCENT, color: "white" }}
                    >
                      <ExternalLink size={11} />
                      {fileLabel(att.url)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!item.description && !hasAttachments && (
            <p className="text-sm text-slate-400 text-center py-6">
              Chưa có nội dung chi tiết.
            </p>
          )}
        </div>
      </motion.div>
    </div>,
    portalRoot
  );
}

// ─── Teacher popup ────────────────────────────────────────────────────────────

function TeacherPopup({ teachers, onClose }: { teachers: string[]; onClose: () => void }) {
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
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 340, damping: 34 }}
        className="relative bg-white rounded-t-3xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <User size={16} className="text-slate-400" />
            <span className="font-bold text-slate-800 text-base">Giáo viên</span>
            <span
              className="text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: ACCENT + "18", color: ACCENT }}
            >
              {teachers.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
          >
            <X size={16} className="text-slate-500" />
          </button>
        </div>

        {/* List */}
        <div className="py-2 pb-8">
          {teachers.map((name, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-5 py-3 border-b border-slate-50 last:border-b-0"
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: ACCENT + "15" }}
              >
                <User size={16} style={{ color: ACCENT }} />
              </div>
              <span className="text-sm text-slate-700 flex-1">{name}</span>
              <span className="text-xs text-slate-400 font-semibold">#{i + 1}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>,
    portalRoot
  );
}

// ─── Detail panel ─────────────────────────────────────────────────────────────

function OnlineActions({ classSessionId, onlineLink, onlineClickedAt, onlineEndedAt }: {
  classSessionId: string;
  onlineLink?: string;
  onlineClickedAt?: string | null;
  onlineEndedAt?: string | null;
}) {
  const checkin = useOnlineCheckin();
  const checkout = useOnlineCheckout();

  const hasCheckedIn = Boolean(onlineClickedAt);
  const hasCheckedOut = Boolean(onlineEndedAt);

  function fmtTime(iso?: string | null) {
    if (!iso) return null;
    return new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-50">
        <Wifi size={15} className="text-slate-400" />
        <span className="text-xs font-bold text-slate-500 tracking-wider uppercase">Lớp học online</span>
      </div>
      <div className="px-4 py-3 flex flex-col gap-3">
        {/* Status row */}
        <div className="flex gap-2">
          <div className="flex-1 rounded-xl bg-slate-50 px-3 py-2 text-center">
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-0.5">Vào lớp</p>
            <p className="text-xs font-bold" style={{ color: hasCheckedIn ? "#22c55e" : "#94a3b8" }}>
              {hasCheckedIn ? fmtTime(onlineClickedAt) : "Chưa check-in"}
            </p>
          </div>
          <div className="flex-1 rounded-xl bg-slate-50 px-3 py-2 text-center">
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-0.5">Kết thúc</p>
            <p className="text-xs font-bold" style={{ color: hasCheckedOut ? "#6366f1" : "#94a3b8" }}>
              {hasCheckedOut ? fmtTime(onlineEndedAt) : "Chưa check-out"}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          {onlineLink && (
            <a
              href={onlineLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                if (!hasCheckedIn) {
                  checkin.mutate({ classSessionId });
                }
              }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-white text-xs font-bold shadow-sm transition-opacity"
              style={{ background: ACCENT, opacity: hasCheckedOut ? 0.5 : 1 }}
            >
              <Wifi size={13} />
              Vào lớp
            </a>
          )}
          <button
            disabled={!hasCheckedIn || hasCheckedOut || checkout.isPending}
            onClick={() => checkout.mutate({ classSessionId })}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold border transition-all disabled:opacity-40"
            style={{
              borderColor: hasCheckedOut ? "#22c55e44" : "#e2e8f0",
              color: hasCheckedOut ? "#22c55e" : "#64748b",
              background: hasCheckedOut ? "#f0fdf4" : "#f8fafc",
            }}
          >
            {checkout.isPending ? "..." : hasCheckedOut ? "Đã kết thúc" : "Kết thúc lớp"}
          </button>
        </div>

        {/* Error feedback */}
        {checkout.isError && (
          <p className="text-xs text-red-500 text-center">{checkout.error?.message}</p>
        )}
        {checkin.isError && (
          <p className="text-xs text-red-500 text-center">{checkin.error?.message}</p>
        )}
      </div>
    </div>
  );
}

function ReviewPopup({
  detail,
  studentName,
  onClose,
}: {
  detail: import("../hooks/use-calendar").SessionDetail;
  studentName?: string;
  onClose: () => void;
}) {
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
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 340, damping: 34 }}
        className="relative bg-white rounded-t-3xl flex flex-col overflow-hidden"
        style={{ maxHeight: "80%" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center">
              <Star size={15} className="text-amber-400" fill="#fbbf24" />
            </span>
            <span className="font-bold text-slate-800 text-base">
              Nhận xét: {studentName ?? "Học viên"}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
          >
            <X size={16} className="text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          {detail.reviewData && detail.reviewData.length > 0 ? (
            <div className="space-y-5">
              {detail.reviewData.map((teacher, ti) => (
                <div key={ti}>
                  {detail.reviewData!.length > 1 && (
                    <p className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-2">
                      {teacher.teacherName}
                    </p>
                  )}
                  {teacher.criteria?.map((criterion, ci) => (
                    <div key={ci} className="mb-4">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                        {criterion.criteriaName}
                      </p>
                      <div className="space-y-2">
                        {criterion.items?.filter((item) => item.comment?.trim()).map((item, ii) => (
                          <div key={ii} className="bg-slate-50 rounded-xl px-3 py-2.5">
                            <p className="text-xs font-semibold text-slate-500 mb-1">
                              {item.subCriteriaName}
                            </p>
                            <div
                              className="text-sm text-slate-700 leading-relaxed"
                              dangerouslySetInnerHTML={{ __html: item.comment }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <MessageSquare size={32} className="text-slate-200 mb-3" />
              <p className="text-slate-500 text-sm">Chưa có nội dung nhận xét</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>,
    portalRoot
  );
}

function DetailPanel({
  session,
  onBack,
}: {
  session: CalendarSession;
  onBack: () => void;
}) {
  const qc = useQueryClient();
  const { data: detail, isLoading } = useSessionDetail(session.classSessionId);
  const [selectedContent, setSelectedContent] = useState<SessionContent | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [showTeacherPopup, setShowTeacherPopup] = useState(false);

  function handleBack() {
    qc.invalidateQueries({ queryKey: ["calendar-month"] });
    onBack();
  }

  const attendance = attendanceLabel(session.attendanceStatus);
  const fmt = formatLabel(session.learningFormat);
  const sessionSt = sessionStatusLabel(session.sessionStatus);

  return (
    <motion.div
      key="detail"
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", stiffness: 320, damping: 32 }}
      className="absolute inset-0 z-20 flex flex-col overflow-y-auto"
      style={{ background: "#f5f5fb" }}
    >
      {/* Header — gradient background covers both topbar and meta */}
      <div
        className="sticky top-0 z-10"
        style={{ background: "linear-gradient(160deg, #eef2ff 0%, #e0f2fe 100%)" }}
      >
        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 pt-10 pb-3">
          <button
            onClick={handleBack}
            className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
            style={{ background: "rgba(255,255,255,0.6)" }}
          >
            <ChevronLeft size={20} className="text-slate-600" />
          </button>
          <div className="flex-1 flex flex-wrap items-center gap-2">
            <span className="text-xl font-bold text-slate-800">
              {session.className}
            </span>
            <span
              className="text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1"
              style={{ background: "rgba(255,255,255,0.7)", color: "#64748b" }}
            >
              {fmt.icon}
              {fmt.label}
            </span>
            <span
              className="text-xs px-2.5 py-1 rounded-full font-medium"
              style={{ background: attendance.color + "20", color: attendance.color }}
            >
              {attendance.label}
            </span>
          </div>
        </div>

        {/* Meta */}
        <div className="px-4 pb-4">
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-1.5">
              <Clock size={13} className="text-slate-400" />
              <span className="font-semibold text-slate-700">
                {session.startTime} – {session.endTime}
              </span>
            </div>
            {session.locationName && (
              <div className="flex items-center gap-1">
                <MapPin size={13} className="text-slate-400" />
                <span className="text-xs text-slate-500">{session.locationName}</span>
              </div>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {formatDisplayDate(session.sessionDate)}
            {session.classCode ? ` · ${session.classCode}` : ""}
          </p>
          {(session.studentName || session.studentCode) && (
            <div className="flex items-center gap-1.5 mt-2">
              <User size={12} style={{ color: "#ea580c" }} />
              <span className="text-sm font-semibold" style={{ color: "#ea580c" }}>
                {session.studentName}
                {session.studentCode ? ` · ${session.studentCode}` : ""}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 p-4">
        {isLoading ? (
          <>
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
          </>
        ) : (
          <>
            {/* Teachers */}
            {(() => {
              const teachers = (detail?.teacherNames && detail.teacherNames.length > 0)
                ? detail.teacherNames
                : (session.teacherNames && session.teacherNames.length > 0)
                ? session.teacherNames
                : null;
              const hasMany = (teachers?.length ?? 0) > 1;
              return (
                <>
                  <button
                    className="w-full text-left bg-white rounded-2xl overflow-hidden shadow-sm active:scale-[0.99] transition-transform"
                    onClick={() => hasMany && setShowTeacherPopup(true)}
                    disabled={!teachers}
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-50">
                      <div className="flex items-center gap-2">
                        <User size={15} className="text-slate-400" />
                        <span className="text-xs font-bold text-slate-500 tracking-wider uppercase">
                          Giáo viên
                        </span>
                      </div>
                      {teachers && (
                        <span
                          className="text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center"
                          style={{ background: ACCENT + "18", color: ACCENT }}
                        >
                          {teachers.length}
                        </span>
                      )}
                    </div>
                    {teachers ? (
                      <div className="flex items-center justify-between px-4 py-3">
                        <span className="text-sm text-slate-600 truncate flex-1">
                          {teachers.join(", ")}
                        </span>
                        {hasMany && <ChevronRight size={16} className="text-slate-300 flex-shrink-0 ml-2" />}
                      </div>
                    ) : (
                      <p className="px-4 py-3 text-sm text-slate-400">
                        Chưa có thông tin giáo viên.
                      </p>
                    )}
                  </button>

                  {/* Teacher list popup */}
                  <AnimatePresence>
                    {showTeacherPopup && teachers && (
                      <TeacherPopup
                        teachers={teachers}
                        onClose={() => setShowTeacherPopup(false)}
                      />
                    )}
                  </AnimatePresence>
                </>
              );
            })()}

            {/* General contents */}
            {detail?.generalContents && detail.generalContents.length > 0 && (
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-50">
                  <BookOpen size={15} className="text-slate-400" />
                  <span className="text-xs font-bold text-slate-500 tracking-wider uppercase">
                    Nội dung buổi học
                  </span>
                </div>
                <div className="divide-y divide-slate-50">
                  {detail.generalContents.map((item, i) => (
                    <button
                      key={item.id}
                      className="w-full text-left flex items-center gap-3 px-4 py-3 active:bg-slate-50 transition-colors"
                      onClick={() => setSelectedContent(item)}
                    >
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ background: ACCENT }}
                      >
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mb-0.5">
                          {item.type}
                        </p>
                        <p className="text-sm text-slate-700 leading-snug">
                          {item.title}
                        </p>
                        {item.description && (
                          <p className="text-xs text-slate-400 mt-0.5 leading-snug line-clamp-1">
                            {item.description}
                          </p>
                        )}
                        {(() => { const n = normalizeSessionContent(item); return n.attachments && n.attachments.length > 0 ? (
                          <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: ACCENT + "15", color: ACCENT }}>
                            <Paperclip size={9} />
                            {n.attachments.length} tệp đính kèm
                          </span>
                        ) : null; })()}
                      </div>
                      <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Personal contents */}
            {detail?.personalContents && detail.personalContents.length > 0 && (
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-50">
                  <BookOpen size={15} className="text-slate-400" />
                  <span className="text-xs font-bold text-slate-500 tracking-wider uppercase">
                    Nội dung cá nhân
                  </span>
                </div>
                <div className="divide-y divide-slate-50">
                  {detail.personalContents.map((item, i) => (
                    <button
                      key={item.id}
                      className="w-full text-left flex items-center gap-3 px-4 py-3 active:bg-slate-50 transition-colors"
                      onClick={() => setSelectedContent(item)}
                    >
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ background: "#f59e0b" }}
                      >
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mb-0.5">
                          {item.type}
                        </p>
                        <p className="text-sm text-slate-700 leading-snug">
                          {item.title}
                        </p>
                        {(() => { const n = normalizeSessionContent(item); return n.attachments && n.attachments.length > 0 ? (
                          <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600">
                            <Paperclip size={9} />
                            {n.attachments.length} tệp đính kèm
                          </span>
                        ) : null; })()}
                      </div>
                      <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Teacher review card */}
            {detail?.reviewPublished ? (
              <button
                className="w-full text-left rounded-2xl overflow-hidden shadow-sm active:scale-[0.98] transition-transform"
                style={{ background: "#fffbeb", border: "1px solid #fde68a" }}
                onClick={() => setShowReview(true)}
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-amber-100">
                  <div className="flex items-center gap-2">
                    <MessageSquare size={15} className="text-amber-500" />
                    <span className="text-xs font-bold text-amber-700 tracking-wider uppercase">
                      Nhận xét từ giáo viên
                    </span>
                  </div>
                  <ChevronRight size={16} className="text-amber-400" />
                </div>
                <p className="px-4 py-3 text-sm text-amber-700 leading-relaxed">
                  Giáo viên đã có nhận xét cho buổi học này. Nhấn để xem chi tiết.
                </p>
              </button>
            ) : (
              <div
                className="rounded-2xl overflow-hidden shadow-sm"
                style={{ background: "#f8f8fc", border: "1px solid #e8e8f0" }}
              >
                <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
                  <MessageSquare size={15} className="text-slate-300" />
                  <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">
                    Nhận xét từ giáo viên
                  </span>
                </div>
                <p className="px-4 py-3 text-sm text-slate-400">
                  Chưa có nhận xét từ giáo viên cho buổi học này.
                </p>
              </div>
            )}

            {/* Online check-in / check-out */}
            {session.learningFormat !== "offline" && (
              <OnlineActions
                classSessionId={session.classSessionId}
                onlineLink={detail?.onlineLink}
                onlineClickedAt={detail?.onlineClickedAt}
                onlineEndedAt={detail?.onlineEndedAt}
              />
            )}

            {/* Attendance note */}
            {detail?.attendanceNote && (
              <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
                <p className="text-xs text-amber-600 font-semibold mb-0.5">Ghi chú điểm danh</p>
                <p className="text-sm text-amber-800">{detail.attendanceNote}</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Content detail popup */}
      <AnimatePresence>
        {selectedContent && (
          <ContentPopup
            item={selectedContent}
            onClose={() => setSelectedContent(null)}
          />
        )}
      </AnimatePresence>

      {/* Review popup */}
      <AnimatePresence>
        {showReview && detail && (
          <ReviewPopup
            detail={detail}
            studentName={session.studentName}
            onClose={() => setShowReview(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function Schedule() {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const deepLinkDate = useMemo(() => {
    const param = new URLSearchParams(window.location.search).get("date");
    if (!param) return null;
    const d = new Date(param + "T00:00:00");
    return isNaN(d.getTime()) ? null : d;
  }, []);

  const [selectedDate, setSelectedDate] = useState<Date>(deepLinkDate ?? today);
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(deepLinkDate ?? today));
  const [detail, setDetail] = useState<CalendarSession | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const currentMonth = useMemo(() => formatMonthParam(selectedDate), [selectedDate]);

  const { profile } = useAuth();
  const { data: userTypeData } = useUserType();
  const { data: calendarData, isLoading } = useCalendarMonth(currentMonth);

  const datesInWeek = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const daysWithClasses = useMemo(() => {
    if (!calendarData) return new Set<string>();
    return new Set(calendarData.datesWithSessions);
  }, [calendarData]);

  const filteredSessions = useMemo(() => {
    if (!calendarData) return [];
    const key = formatDateKey(selectedDate);
    let sessions = calendarData.sessions
      .filter((s) => s.sessionDate === key)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      sessions = sessions.filter((s) =>
        s.className?.toLowerCase().includes(q) ||
        s.classCode?.toLowerCase().includes(q) ||
        s.locationName?.toLowerCase().includes(q) ||
        s.teacherNames?.some((t) => t.toLowerCase().includes(q)) ||
        s.studentName?.toLowerCase().includes(q)
      );
    }
    return sessions;
  }, [calendarData, selectedDate, searchQuery]);

  const weekMonth = useMemo(() => formatMonthYear(datesInWeek[3]), [datesInWeek]);

  function handleWeekChange(dir: -1 | 1) {
    const newWeekStart = addDays(weekStart, dir * 7);
    setWeekStart(newWeekStart);
    const midWeek = addDays(newWeekStart, 3);
    if (
      midWeek.getMonth() !== selectedDate.getMonth() ||
      midWeek.getFullYear() !== selectedDate.getFullYear()
    ) {
      setSelectedDate(midWeek);
    }
  }

  return (
    <div
      className="relative flex flex-col h-full overflow-hidden"
      style={{ background: "#f0f0f7" }}
    >
      {/* Purple gradient header */}
      <div
        className="px-4 pt-10 pb-5"
        style={{
          background:
            "linear-gradient(160deg, #c3b8f5 0%, #a89de8 40%, #8f84d8 100%)",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => handleWeekChange(-1)}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors text-white"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-white font-semibold text-base tracking-wide">
            {weekMonth}
          </span>
          <button
            onClick={() => handleWeekChange(1)}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors text-white"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {datesInWeek.map((date, i) => {
            const isSelected = isSameDay(date, selectedDate);
            const dateKey = formatDateKey(date);
            const hasClass = daysWithClasses.has(dateKey);
            return (
              <button
                key={i}
                onClick={() => setSelectedDate(date)}
                className="flex flex-col items-center py-1.5 rounded-xl transition-colors"
                style={{
                  background: isSelected
                    ? "rgba(255,255,255,0.95)"
                    : "transparent",
                }}
              >
                <span
                  className="text-xs font-medium mb-1"
                  style={{
                    color: isSelected
                      ? "#7c6fd4"
                      : "rgba(255,255,255,0.8)",
                  }}
                >
                  {WEEKDAY_SHORT[date.getDay()]}
                </span>
                <span
                  className="text-sm font-bold leading-none"
                  style={{ color: isSelected ? "#7c6fd4" : "white" }}
                >
                  {date.getDate()}
                </span>
                <span
                  className="mt-1.5 w-1.5 h-1.5 rounded-full"
                  style={{
                    background: hasClass
                      ? isSelected
                        ? "#7c6fd4"
                        : "#ff6b6b"
                      : "transparent",
                  }}
                />
              </button>
            );
          })}
        </div>

        <div className="flex justify-center mt-3">
          <ChevronRight size={16} className="text-white/60 rotate-90" />
        </div>
      </div>

      {/* Date label */}
      <div className="flex items-center gap-2 px-4 py-3">
        <Calendar size={15} className="text-indigo-500" />
        <span className="text-sm font-semibold text-slate-700">
          {formatFullDate(selectedDate)}
        </span>
      </div>

      {/* Search bar */}
      <div className="px-3 pb-2">
        <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2.5 shadow-sm border border-slate-100">
          <Search size={15} className="text-slate-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Tìm lớp, giáo viên, địa điểm..."
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

      {/* Session list */}
      <div className="flex-1 overflow-y-auto px-3 pb-24">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 w-full rounded-2xl" />
            ))}
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-52 text-center px-4">
            <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mb-3">
              <Calendar size={28} className="text-indigo-300" />
            </div>
            <p className="text-slate-600 font-semibold">Không có lịch học</p>
            <p className="text-slate-400 text-sm mt-1">
              Ngày này không có tiết học nào.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filteredSessions.map((session, i) => {
                const fmt = formatLabel(session.learningFormat);
                const attendance = attendanceLabel(session.attendanceStatus);

                // Pick card accent color based on learning format
                const borderColor =
                  session.isTestSession
                    ? "#ef4444"
                    : session.learningFormat === "online"
                    ? "#06b6d4"
                    : ACCENT;

                // Format badge colors
                const fmtBg =
                  session.learningFormat === "online" ? "#e0f7fa" : "#f1f5f9";
                const fmtColor =
                  session.learningFormat === "online" ? "#0891b2" : "#64748b";

                return (
                  <motion.div
                    key={session.classSessionId}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ delay: i * 0.05, duration: 0.2 }}
                  >
                    <button
                      className="w-full text-left bg-white rounded-2xl shadow-sm overflow-hidden flex active:scale-[0.98] transition-transform"
                      style={{ borderLeft: `4px solid ${borderColor}` }}
                      onClick={() => setDetail(session)}
                    >
                      {/* Left: time block */}
                      <div className="flex flex-col items-center justify-center px-3 py-4 min-w-[68px]">
                        <div
                          className="flex flex-col items-center justify-center rounded-xl px-2 py-2 min-w-[52px]"
                          style={{ background: borderColor + "12" }}
                        >
                          <span
                            className="text-[15px] font-bold leading-none"
                            style={{ color: borderColor }}
                          >
                            {session.startTime}
                          </span>
                          <span className="text-[11px] text-slate-400 mt-1 leading-none font-medium">
                            {session.endTime}
                          </span>
                        </div>
                        {session.isTestSession && (
                          <span className="mt-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-50 text-red-500 border border-red-100">
                            Thi
                          </span>
                        )}
                      </div>

                      {/* Right: content */}
                      <div className="flex-1 py-3 pr-3 min-w-0 border-l border-slate-50">
                        {/* Class name + chevron */}
                        <div className="flex items-start justify-between gap-1 mb-1.5">
                          <p className="text-[15px] font-bold text-slate-800 leading-tight">
                            {session.classCode || session.className}
                          </p>
                          <ChevronRight size={17} className="text-slate-300 mt-0.5 flex-shrink-0" />
                        </div>

                        {/* Location */}
                        {session.locationName && (
                          <div className="flex items-center gap-1.5 mb-1">
                            <MapPin size={11} className="text-slate-400 flex-shrink-0" />
                            <span className="text-xs text-slate-500 truncate">
                              {session.locationName}
                            </span>
                          </div>
                        )}

                        {/* Teachers */}
                        {session.teacherNames && session.teacherNames.length > 0 && (
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <User size={11} className="text-slate-400 flex-shrink-0" />
                            <span className="text-xs text-slate-500 truncate">
                              {session.teacherNames.join(", ")}
                            </span>
                          </div>
                        )}

                        {/* Student + enrolled count row */}
                        {(() => {
                          const displayName = session.studentName ?? profile?.fullName;
                          const displayCode = session.studentCode ?? profile?.code;
                          return (
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                              <div className="flex items-center gap-1">
                                <User size={11} className="text-amber-500 flex-shrink-0" />
                                <span className="text-xs font-bold text-amber-500">
                                  {displayName ?? "Học viên"}
                                </span>
                                {displayCode && (
                                  <span className="text-xs text-slate-400 font-medium">
                                    · {displayCode}
                                  </span>
                                )}
                              </div>
                              {session.enrolledCount != null && (
                                <div className="flex items-center gap-1">
                                  <Users size={11} className="text-slate-400 flex-shrink-0" />
                                  <span className="text-xs text-slate-500">
                                    Sĩ số: <span className="font-bold text-slate-700">{session.enrolledCount}</span>
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* Status badges */}
                        <div className="flex gap-1.5 flex-wrap">
                          <span
                            className="text-xs px-2.5 py-1 rounded-full font-medium border"
                            style={{
                              borderColor: attendance.color + "40",
                              color: attendance.color,
                              background: attendance.color + "0d",
                            }}
                          >
                            {attendance.label}
                          </span>
                          <span
                            className="text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1"
                            style={{ background: fmtBg, color: fmtColor }}
                          >
                            {fmt.icon}
                            {fmt.label}
                          </span>
                        </div>
                      </div>
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Detail slide-in panel */}
      <AnimatePresence>
        {detail && (
          <DetailPanel session={detail} onBack={() => setDetail(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
