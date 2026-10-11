import { Router, type IRouter } from "express";
import healthRouter from "./health";
import advisoriesRouter from "./advisories";
import dashboardRouter from "./dashboard";
import profileRouter from "./profile";

const router: IRouter = Router();

router.use(healthRouter);
router.use(advisoriesRouter);
router.use(dashboardRouter);
router.use(profileRouter);

export default router;
