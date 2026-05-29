/**
 * Invoices Service — currently returns mock data.
 *
 * TO SWAP TO REAL DB:
 *   Replace each method body with a Drizzle/pg query.
 *   The route handlers and frontend never change.
 */

import { MOCK_INVOICES, type MockInvoice } from "../mock/student.js";

// In-memory mutable store (simulate DB until real DB is wired)
let invoiceStore: MockInvoice[] = [...MOCK_INVOICES];

function toDto(inv: MockInvoice) {
  return {
    id: inv.id,
    title: inv.title,
    amount: inv.amount,
    dueDate: inv.dueDate,
    status: inv.status,
    semester: inv.semester,
    category: inv.category,
    paidAt: inv.paidAt,
  };
}

export function getInvoices(status?: string) {
  let rows = [...invoiceStore].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  if (status && status !== "all") rows = rows.filter((inv) => inv.status === status);
  return rows.map(toDto);
}

export function getInvoicesSummary() {
  const totalDue = invoiceStore.filter((r) => r.status !== "paid").reduce((s, r) => s + r.amount, 0);
  const totalPaid = invoiceStore.filter((r) => r.status === "paid").reduce((s, r) => s + r.amount, 0);
  const overdue = invoiceStore.filter((r) => r.status === "overdue").reduce((s, r) => s + r.amount, 0);
  const upcoming = invoiceStore.filter((r) => r.status === "unpaid").length;
  return { totalDue, totalPaid, overdue, upcoming };
}
