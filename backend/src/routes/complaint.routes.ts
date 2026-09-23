import { Router } from "express";
import multer from "multer";
import { complaintController } from "../controllers/complaint.controller.js";
import { aiController } from "../controllers/admin.controller.js";
import { authenticate, optionalAuthenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authenticate.js";
import { validate } from "../middleware/validate.js";
import {
  assignSchema,
  commentSchema,
  createComplaintSchema,
  escalateSchema,
  listComplaintsQuery,
  patchComplaintSchema,
  resolveSchema,
  statusSchema,
  aiReviewSchema,
  messageSchema,
} from "../validators/schemas.js";
import { env } from "../config/env.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: env.MAX_UPLOAD_BYTES } });

export const complaintRouter = Router();

complaintRouter.post("/", optionalAuthenticate, validate(createComplaintSchema), complaintController.create);
complaintRouter.get("/track", complaintController.track);
complaintRouter.get("/", authenticate, validate(listComplaintsQuery, "query"), complaintController.list);
complaintRouter.post("/sync-channels", authenticate, complaintController.syncChannels);
complaintRouter.get("/:id", authenticate, complaintController.get);
complaintRouter.patch("/:id", authenticate, validate(patchComplaintSchema), complaintController.patch);
complaintRouter.post(
  "/:id/assign",
  authenticate,
  authorize("AGENT", "OPERATIONS_MANAGER", "REGIONAL_MANAGER", "ADMIN", "SUPER_ADMIN"),
  validate(assignSchema),
  complaintController.assign,
);
complaintRouter.post("/:id/status", authenticate, validate(statusSchema), complaintController.status);
complaintRouter.post("/:id/escalate", authenticate, validate(escalateSchema), complaintController.escalate);
complaintRouter.post("/:id/resolve", authenticate, validate(resolveSchema), complaintController.resolve);
complaintRouter.post("/:id/comments", authenticate, validate(commentSchema), complaintController.comments);
complaintRouter.post(
  "/:id/messages",
  authenticate,
  authorize("AGENT", "OPERATIONS_MANAGER", "REGIONAL_MANAGER", "ADMIN", "SUPER_ADMIN"),
  validate(messageSchema),
  complaintController.messages,
);
complaintRouter.get("/:id/history", authenticate, complaintController.history);
complaintRouter.post("/:id/attachments", authenticate, upload.single("file"), complaintController.attachments);
complaintRouter.get("/:id/attachments/:attachmentId", authenticate, complaintController.downloadAttachment);
complaintRouter.post(
  "/:id/ai-analyse",
  authenticate,
  authorize("AGENT", "OPERATIONS_MANAGER", "REGIONAL_MANAGER", "ADMIN", "SUPER_ADMIN"),
  aiController.analyse,
);
complaintRouter.post(
  "/:id/ai-review/:analysisId",
  authenticate,
  authorize("AGENT", "OPERATIONS_MANAGER", "REGIONAL_MANAGER", "ADMIN", "SUPER_ADMIN"),
  validate(aiReviewSchema),
  aiController.review,
);
