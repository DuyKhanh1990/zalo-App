import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Receipt, Calendar, CreditCard, User, Tag, Hash, Layers, Search, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatDate, formatCurrency } from "@/lib/format";

import { apiFetch } from "@/lib/api-client";
const ACCENT = "#7c6fd4";

// ─── Types ────────────────────────────────────────────────────────────────────

type InvoiceItem = {
  id: string;
  invoiceId: string;
  title: string;
  code: string;
  label: string | null;
  studentName: string;
  type: string;
  category: string | null;
  amount: string;
  status: "unpaid" | "paid" | "partial" | "overdue";
  dueDate: string | null;
  paidAt: string | null;
  createdAt: string;
  isSchedule: boolean;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_TABS = [
  { id: "all",    label: "Tất cả" },
  { id: "unpaid", label: "Chưa thanh toán" },
  { id: "paid",   label: "Đã thanh toán" },
];

const getStatusConfig = (status: string) => {
  switch (status) {
    case "unpaid":  return { label: "Chưa thanh toán", bg: "#fff7ed", color: "#ea580c" };
    case "paid":    return { label: "Đã thanh toán",   bg: "#f0fdf4", color: "#16a34a" };
    case "overdue": return { label: "Quá hạn",         bg: "#fef2f2", color: "#dc2626" };
    case "partial": return { label: "Thanh toán một phần", bg: "#eff6ff", color: "#2563eb" };
    default:        return { label: status,             bg: "#f1f5f9", color: "#64748b" };
  }
};

async function fetchInvoices(): Promise<{ invoices: InvoiceItem[] }> {
  return apiFetch<{ invoices: InvoiceItem[] }>("/api/my-space/invoices");
}

function parseAmount(s: string): number {
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Invoices() {
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["my-space-invoices"],
    queryFn: fetchInvoices,
  });

  const invoices = data?.invoices ?? [];

  const summary = useMemo(() => {
    const totalDue  = invoices.filter((i) => i.status !== "paid").reduce((s, i) => s + parseAmount(i.amount), 0);
    const totalPaid = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + parseAmount(i.amount), 0);
    const overdue   = invoices.filter((i) => i.status === "overdue").reduce((s, i) => s + parseAmount(i.amount), 0);
    return { totalDue, totalPaid, overdue };
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    let list = invoices.filter((item) => {
      if (selectedStatus === "all") return true;
      if (selectedStatus === "unpaid") return item.status === "unpaid" || item.status === "overdue" || item.status === "partial";
      return item.status === selectedStatus;
    });
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((item) =>
        item.title?.toLowerCase().includes(q) ||
        item.code?.toLowerCase().includes(q) ||
        item.studentName?.toLowerCase().includes(q) ||
        item.category?.toLowerCase().includes(q) ||
        item.label?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [invoices, selectedStatus, searchQuery]);

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "#f0f0f7" }}>
      {/* Purple gradient header — compact */}
      <div
        className="px-5 pt-7 pb-4"
        style={{
          background: "linear-gradient(160deg, #c3b8f5 0%, #a89de8 40%, #8f84d8 100%)",
        }}
      >
        <h1 className="text-xl font-black text-white mb-3">Hoá đơn học phí</h1>

        {isLoading ? (
          <Skeleton className="h-11 w-full rounded-xl bg-white/20" />
        ) : (
          <div className="flex items-center gap-0 bg-white/15 rounded-xl overflow-hidden">
            {/* Cần thanh toán */}
            <div className="flex-1 px-4 py-2.5">
              <p className="text-[10px] text-white/70 font-medium leading-none mb-1">Cần thanh toán</p>
              <p className="text-base font-black text-white leading-none">{formatCurrency(summary.totalDue)}</p>
            </div>

            <div className="w-px self-stretch bg-white/25" />

            {/* Đã thanh toán */}
            <div className="flex-1 px-4 py-2.5">
              <p className="text-[10px] text-white/70 font-medium leading-none mb-1">Đã thanh toán</p>
              <p className="text-sm font-bold text-emerald-200 leading-none">{formatCurrency(summary.totalPaid)}</p>
            </div>

            {summary.overdue > 0 && (
              <>
                <div className="w-px self-stretch bg-white/25" />
                <div className="flex-1 px-4 py-2.5">
                  <p className="text-[10px] text-white/70 font-medium leading-none mb-1">Quá hạn</p>
                  <p className="text-sm font-bold text-red-200 leading-none">{formatCurrency(summary.overdue)}</p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Invoice list — search + filter chips are sticky inside scroll so they stay visible when keyboard opens */}
      <div className="flex-1 overflow-y-auto pb-24">
        {/* Sticky search bar */}
        <div className="sticky top-0 z-10 px-4 pt-3 pb-1" style={{ background: "#f0f0f7" }}>
          <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2.5 shadow-sm border border-slate-100">
            <Search size={15} className="text-slate-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Tìm hoá đơn, mã, học viên..."
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

          {/* Filter chips */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-3 pb-2.5">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedStatus(tab.id)}
                className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-all"
                style={
                  selectedStatus === tab.id
                    ? { background: ACCENT, color: "white" }
                    : { background: "white", color: "#64748b", border: "1px solid #e2e8f0" }
                }
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-2xl" />
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center h-52 text-center px-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3" style={{ background: "#fef2f2" }}>
              <Receipt size={28} className="text-red-400" />
            </div>
            <p className="text-slate-600 font-semibold">Không thể tải hoá đơn</p>
            <p className="text-red-500 text-xs mt-1 break-all">
              {error instanceof Error ? error.message : "Lỗi không xác định"}
            </p>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-52 text-center px-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-3"
              style={{ background: ACCENT + "15" }}
            >
              <Receipt size={28} style={{ color: ACCENT + "88" }} />
            </div>
            <p className="text-slate-600 font-semibold">Không có hoá đơn nào</p>
            <p className="text-slate-400 text-sm mt-1">Không tìm thấy hoá đơn phù hợp.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filteredInvoices.map((invoice, i) => {
                const sc = getStatusConfig(invoice.status);
                const isPending = invoice.status === "unpaid" || invoice.status === "overdue" || invoice.status === "partial";
                const amount = parseAmount(invoice.amount);

                return (
                  <motion.div
                    key={invoice.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ delay: i * 0.04, duration: 0.18 }}
                  >
                    <div className="bg-white rounded-2xl shadow-sm px-4 py-4">
                      {/* Status + amount */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className="text-xs font-semibold px-2.5 py-1 rounded-full"
                            style={{ background: sc.bg, color: sc.color }}
                          >
                            {sc.label}
                          </span>
                          {invoice.isSchedule && (
                            <span
                              className="text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
                              style={{ background: ACCENT + "15", color: ACCENT }}
                            >
                              <Layers size={10} />
                              Theo đợt
                            </span>
                          )}
                        </div>
                        <span className="text-base font-black" style={{ color: ACCENT }}>
                          {formatCurrency(amount)}
                        </span>
                      </div>

                      {/* Title */}
                      <p className="text-sm font-bold text-slate-800 leading-snug mb-1">
                        {invoice.title}
                      </p>

                      {/* Meta row: type • category + label */}
                      <p className="text-xs text-slate-400 mb-2">
                        {invoice.type}
                        {invoice.category && invoice.category !== invoice.type && ` • ${invoice.category}`}
                        {invoice.label && (
                          <span className="ml-1.5 font-semibold text-slate-500">{invoice.label}</span>
                        )}
                      </p>

                      {/* Code + student name row */}
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex items-center gap-1">
                          <Hash size={11} className="text-slate-400" />
                          <span className="text-xs text-slate-400 font-mono">{invoice.code}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <User size={11} style={{ color: "#ea580c" }} />
                          <span className="text-xs font-semibold" style={{ color: "#ea580c" }}>
                            {invoice.studentName}
                          </span>
                        </div>
                      </div>

                      {/* Due date + paid date / pay button */}
                      <div className={cn("flex items-center justify-between pt-3 border-t border-slate-100")}>
                        <div
                          className={cn(
                            "flex items-center gap-1.5 text-xs font-medium",
                            invoice.status === "overdue" ? "text-red-500" : "text-slate-500"
                          )}
                        >
                          <Calendar size={13} />
                          {invoice.dueDate ? (
                            <span>Hạn: {formatDate(invoice.dueDate)}</span>
                          ) : (
                            <span className="text-slate-400">Không có hạn</span>
                          )}
                        </div>

                        {isPending && (
                          <button
                            className="h-8 px-4 rounded-full text-xs font-bold text-white transition-all active:scale-95"
                            style={{ background: ACCENT }}
                          >
                            Thanh toán
                          </button>
                        )}
                        {invoice.status === "paid" && invoice.paidAt && (
                          <span className="text-xs text-emerald-600 font-semibold">
                            Đã TT: {formatDate(invoice.paidAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
