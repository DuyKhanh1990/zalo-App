import { Router, type IRouter } from "express";
import * as mySpaceInvoicesService from "../services/my-space-invoices.service.js";

const router: IRouter = Router();

router.get("/my-space/invoices", (_req, res) => {
  res.json(mySpaceInvoicesService.getMySpaceInvoices());
});

export default router;
