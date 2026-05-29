import { Router, type IRouter } from "express";
import healthRouter from "./health";
import scheduleRouter from "./schedule";
import homeworkRouter from "./homework";
import gradesRouter from "./grades";
import invoicesRouter from "./invoices";
import studentAuthRouter from "./student-auth";
import mySpaceCalendarRouter from "./my-space-calendar";
import mySpaceAssignmentsRouter from "./my-space-assignments";
import mySpaceScoreSheetRouter from "./my-space-score-sheet";
import mySpaceInvoicesRouter from "./my-space-invoices";
import mobileAuthRouter from "./mobile-auth";
import authMeRouter from "./auth-me";
import mySpaceUserTypeRouter from "./my-space-user-type";
import mobileAssignmentsRouter from "./mobile-assignments";
import mockExamsRouter from "./mock-exams";

const router: IRouter = Router();

router.use(mobileAuthRouter);
router.use(authMeRouter);
router.use(mySpaceUserTypeRouter);
router.use(studentAuthRouter);
router.use(mySpaceCalendarRouter);
router.use(mySpaceAssignmentsRouter);
router.use(mobileAssignmentsRouter);
router.use(mySpaceScoreSheetRouter);
router.use(mySpaceInvoicesRouter);
router.use(mockExamsRouter);
router.use(healthRouter);
router.use(scheduleRouter);
router.use(homeworkRouter);
router.use(gradesRouter);
router.use(invoicesRouter);

export default router;
