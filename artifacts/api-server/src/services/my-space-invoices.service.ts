import { MOCK_STUDENT, datePlus, todayStr } from "../mock/student.js";

const TODAY = todayStr();

interface InvoiceItem {
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
}

const STUDENT = MOCK_STUDENT.studentName;

function isoDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00Z").toISOString();
}

function buildInvoices(): InvoiceItem[] {
  const items: InvoiceItem[] = [
    // ── Học phí chia đợt (isSchedule: true) ──────────────────────────────
    {
      id: "sched-toan-dot1",
      invoiceId: "inv-toan-a1",
      title: "Học phí Toán nâng cao A1",
      code: "HD-2026-001",
      label: "Đợt 1",
      studentName: STUDENT,
      type: "Học phí",
      category: "Học phí lớp",
      amount: "2500000",
      status: "paid",
      dueDate: datePlus(TODAY, -60),
      paidAt: isoDate(datePlus(TODAY, -62)),
      createdAt: isoDate(datePlus(TODAY, -90)),
      isSchedule: true,
    },
    {
      id: "sched-toan-dot2",
      invoiceId: "inv-toan-a1",
      title: "Học phí Toán nâng cao A1",
      code: "HD-2026-001",
      label: "Đợt 2",
      studentName: STUDENT,
      type: "Học phí",
      category: "Học phí lớp",
      amount: "2500000",
      status: "overdue",
      dueDate: datePlus(TODAY, -10),
      paidAt: null,
      createdAt: isoDate(datePlus(TODAY, -90)),
      isSchedule: true,
    },
    {
      id: "sched-toan-dot3",
      invoiceId: "inv-toan-a1",
      title: "Học phí Toán nâng cao A1",
      code: "HD-2026-001",
      label: "Đợt 3",
      studentName: STUDENT,
      type: "Học phí",
      category: "Học phí lớp",
      amount: "2500000",
      status: "unpaid",
      dueDate: datePlus(TODAY, 20),
      paidAt: null,
      createdAt: isoDate(datePlus(TODAY, -90)),
      isSchedule: true,
    },

    // ── Học phí Tiếng Anh B2 – một lần ──────────────────────────────────
    {
      id: "inv-eng-b2",
      invoiceId: "inv-eng-b2",
      title: "Học phí Tiếng Anh B2",
      code: "HD-2026-002",
      label: null,
      studentName: STUDENT,
      type: "Học phí",
      category: "Học phí lớp",
      amount: "6000000",
      status: "paid",
      dueDate: datePlus(TODAY, -45),
      paidAt: isoDate(datePlus(TODAY, -47)),
      createdAt: isoDate(datePlus(TODAY, -75)),
      isSchedule: false,
    },

    // ── Học phí Vật lý chia đợt ──────────────────────────────────────────
    {
      id: "sched-vl-dot1",
      invoiceId: "inv-vl-du",
      title: "Học phí Vật lý đại cương",
      code: "HD-2026-003",
      label: "Đợt 1",
      studentName: STUDENT,
      type: "Học phí",
      category: "Học phí lớp",
      amount: "2000000",
      status: "paid",
      dueDate: datePlus(TODAY, -30),
      paidAt: isoDate(datePlus(TODAY, -32)),
      createdAt: isoDate(datePlus(TODAY, -60)),
      isSchedule: true,
    },
    {
      id: "sched-vl-dot2",
      invoiceId: "inv-vl-du",
      title: "Học phí Vật lý đại cương",
      code: "HD-2026-003",
      label: "Đợt 2",
      studentName: STUDENT,
      type: "Học phí",
      category: "Học phí lớp",
      amount: "2000000",
      status: "unpaid",
      dueDate: datePlus(TODAY, 15),
      paidAt: null,
      createdAt: isoDate(datePlus(TODAY, -60)),
      isSchedule: true,
    },

    // ── Phí tài liệu – một lần ───────────────────────────────────────────
    {
      id: "inv-tailieuB2",
      invoiceId: "inv-tailieuB2",
      title: "Phí tài liệu & giáo trình Tiếng Anh B2",
      code: "HD-2026-004",
      label: null,
      studentName: STUDENT,
      type: "Tài liệu",
      category: "Phí tài liệu",
      amount: "350000",
      status: "paid",
      dueDate: datePlus(TODAY, -50),
      paidAt: isoDate(datePlus(TODAY, -52)),
      createdAt: isoDate(datePlus(TODAY, -70)),
      isSchedule: false,
    },

    // ── Phí bảo hiểm – quá hạn ───────────────────────────────────────────
    {
      id: "inv-baohiem",
      invoiceId: "inv-baohiem",
      title: "Phí bảo hiểm sinh viên 2025-2026",
      code: "HD-2026-005",
      label: null,
      studentName: STUDENT,
      type: "Bảo hiểm",
      category: "Bảo hiểm",
      amount: "680000",
      status: "overdue",
      dueDate: datePlus(TODAY, -15),
      paidAt: null,
      createdAt: isoDate(datePlus(TODAY, -60)),
      isSchedule: false,
    },

    // ── Phí thực hành Hóa học ────────────────────────────────────────────
    {
      id: "inv-lab-hoa",
      invoiceId: "inv-lab-hoa",
      title: "Phí phòng Lab Hóa học",
      code: "HD-2026-006",
      label: null,
      studentName: STUDENT,
      type: "Thực hành",
      category: "Phí thực hành",
      amount: "250000",
      status: "unpaid",
      dueDate: datePlus(TODAY, 10),
      paidAt: null,
      createdAt: isoDate(datePlus(TODAY, -20)),
      isSchedule: false,
    },

    // ── Học phí Python – một lần ─────────────────────────────────────────
    {
      id: "inv-python",
      invoiceId: "inv-python",
      title: "Học phí Lập trình Python",
      code: "HD-2026-007",
      label: null,
      studentName: STUDENT,
      type: "Học phí",
      category: "Học phí lớp",
      amount: "5500000",
      status: "partial",
      dueDate: datePlus(TODAY, 5),
      paidAt: null,
      createdAt: isoDate(datePlus(TODAY, -40)),
      isSchedule: false,
    },
  ];
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getMySpaceInvoices(): { invoices: InvoiceItem[] } {
  return { invoices: buildInvoices() };
}
