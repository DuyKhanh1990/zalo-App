import { Router, type IRouter } from "express";
import healthRouter from "./health";
import studentAuthRouter from "./student-auth";
import mySpaceCalendarRouter from "./my-space-calendar";
import mySpaceAssignmentsRouter from "./my-space-assignments";
import mySpaceScoreSheetRouter from "./my-space-score-sheet";
import mySpaceInvoicesRouter from "./my-space-invoices";
import mobileAuthRouter from "./mobile-auth";
import authMeRouter from "./auth-me";
import mySpaceUserTypeRouter from "./my-space-user-type";
import examsRouter from "./mock-exams";
import filesProxyRouter from "./files-proxy";

const router: IRouter = Router();

// Health check must be first — before any auth middleware
router.use(healthRouter);

// Auth
router.use(mobileAuthRouter);
router.use(authMeRouter);

// Student data — all require valid JWT + CRM token
router.use(mySpaceUserTypeRouter);
router.use(studentAuthRouter);
router.use(mySpaceCalendarRouter);
router.use(mySpaceAssignmentsRouter);
router.use(mySpaceScoreSheetRouter);
router.use(mySpaceInvoicesRouter);
router.use(examsRouter);
router.use(filesProxyRouter);

export default router;
