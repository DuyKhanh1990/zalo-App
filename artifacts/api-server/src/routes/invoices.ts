import { Router, type IRouter } from "express";
import * as invoicesService from "../services/invoices.service.js";
import { ListInvoicesResponse, GetInvoiceSummaryResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/invoices", (req, res) => {
  const { status } = req.query as { status?: string };
  res.json(ListInvoicesResponse.parse(invoicesService.getInvoices(status)));
});

router.get("/invoices/summary", (_req, res) => {
  res.json(GetInvoiceSummaryResponse.parse(invoicesService.getInvoicesSummary()));
});

export default router;
