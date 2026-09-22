import { Router } from "express";
import { adminController, lookupController, notificationController, userController } from "../controllers/admin.controller.js";
import { authenticate, authorize } from "../middleware/authenticate.js";
import { validate } from "../middleware/validate.js";
import {
  categorySchema,
  channelSchema,
  createUserSchema,
  patchUserSchema,
  regionSchema,
  slaPolicySchema,
  storeSchema,
  userStatusSchema,
} from "../validators/schemas.js";

const admins = ["ADMIN", "SUPER_ADMIN"] as const;

export const userRouter = Router();
userRouter.use(authenticate);
userRouter.get("/", userController.list);
userRouter.post("/", authorize(...admins), validate(createUserSchema), userController.create);
userRouter.get("/:id", userController.get);
userRouter.patch("/:id", validate(patchUserSchema), userController.patch);
userRouter.patch("/:id/status", authorize(...admins), validate(userStatusSchema), userController.status);

export const lookupRouter = Router();
lookupRouter.get("/", lookupController.all);

export const notificationRouter = Router();
notificationRouter.use(authenticate);
notificationRouter.get("/", notificationController.list);
notificationRouter.post("/read-all", notificationController.readAll);
notificationRouter.post("/:id/read", notificationController.read);
notificationRouter.delete("/:id", notificationController.delete);

export const adminRouter = Router();
adminRouter.use(authenticate, authorize(...admins));
adminRouter.get("/regions", adminController.regions);
adminRouter.post("/regions", validate(regionSchema), adminController.regions);
adminRouter.patch("/regions/:id", validate(regionSchema.partial()), adminController.regions);
adminRouter.get("/stores", adminController.stores);
adminRouter.post("/stores", validate(storeSchema), adminController.stores);
adminRouter.patch("/stores/:id", validate(storeSchema.partial()), adminController.stores);
adminRouter.get("/categories", adminController.categories);
adminRouter.post("/categories", validate(categorySchema), adminController.categories);
adminRouter.patch("/categories/:id", validate(categorySchema.partial()), adminController.categories);
adminRouter.get("/channels", adminController.channels);
adminRouter.post("/channels", validate(channelSchema), adminController.channels);
adminRouter.patch("/channels/:id", validate(channelSchema.partial()), adminController.channels);
adminRouter.get("/sla-policies", adminController.sla);
adminRouter.post("/sla-policies", validate(slaPolicySchema), adminController.sla);
adminRouter.patch("/sla-policies/:id", validate(slaPolicySchema.partial()), adminController.sla);
adminRouter.get("/audit-logs", adminController.audit);
adminRouter.get("/settings", adminController.settings);
adminRouter.post("/settings", adminController.settings);
