import { Router } from "express";
import { integrationController } from "../controllers/integration.controller.js";
import { authenticate, authorize } from "../middleware/authenticate.js";

const STAFF_ROLES = ["AGENT", "OPERATIONS_MANAGER", "REGIONAL_MANAGER", "ADMIN", "SUPER_ADMIN"] as const;

export const integrationRouter = Router();

integrationRouter.use(authenticate, authorize(...STAFF_ROLES));

integrationRouter.get("/status", integrationController.status);
integrationRouter.post("/youtube/sync", integrationController.syncYouTube);
integrationRouter.post("/email/sync", integrationController.syncEmail);
integrationRouter.post("/sync-all", integrationController.syncAll);
