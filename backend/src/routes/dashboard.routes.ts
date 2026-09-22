import { Router } from "express";
import { analyticsController, dashboardController, reportController } from "../controllers/dashboard.controller.js";
import { authenticate, authorize } from "../middleware/authenticate.js";

const staff = ["AGENT", "OPERATIONS_MANAGER", "REGIONAL_MANAGER", "ADMIN", "SUPER_ADMIN"] as const;
const managers = ["OPERATIONS_MANAGER", "REGIONAL_MANAGER", "ADMIN", "SUPER_ADMIN"] as const;

export const dashboardRouter = Router();
dashboardRouter.use(authenticate, authorize(...staff));
dashboardRouter.get("/summary", dashboardController.summary);
dashboardRouter.get("/trends", dashboardController.trends);
dashboardRouter.get("/by-channel", dashboardController.byChannel);
dashboardRouter.get("/by-category", dashboardController.byCategory);
dashboardRouter.get("/by-region", dashboardController.byRegion);
dashboardRouter.get("/by-store", dashboardController.byStore);
dashboardRouter.get("/by-agent", authorize(...managers), dashboardController.byAgent);
dashboardRouter.get("/sla", dashboardController.sla);
dashboardRouter.get("/performance", dashboardController.performance);

export const analyticsRouter = Router();
analyticsRouter.use(authenticate, authorize(...managers));
analyticsRouter.get("/recurring-issues", analyticsController.recurring);
analyticsRouter.get("/categories", analyticsController.categories);
analyticsRouter.get("/regions", analyticsController.regions);
analyticsRouter.get("/stores", analyticsController.stores);
analyticsRouter.get("/employees", analyticsController.employees);
analyticsRouter.get("/audit-logs", analyticsController.audit);

export const reportRouter = Router();
reportRouter.use(authenticate, authorize(...managers));
reportRouter.get("/", reportController.get);
reportRouter.get("/csv", reportController.csv);
