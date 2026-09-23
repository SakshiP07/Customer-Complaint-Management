import type { Request, Response, NextFunction } from "express";
import { complaintService } from "../services/complaint.service.js";
import { emailPollingService } from "../integrations/channels/email.service.js";
import { youtubePollingService } from "../integrations/channels/youtube.service.js";
import { success, successWithMeta } from "../utils/response.js";
import { parsePagination, routeParam } from "../utils/pagination.js";
import { clientIp } from "../middleware/audit.js";
import { ApiError } from "../utils/ApiError.js";

export const complaintController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await complaintService.createFromWebsite(req.body, req.authUser ?? null, clientIp(req));
      return success(res, data, "Complaint submitted successfully", 201);
    } catch (e) {
      next(e);
    }
  },
  async track(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await complaintService.track(String(req.query.complaintNumber), String(req.query.email));
      return success(res, data);
    } catch (e) {
      next(e);
    }
  },
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, pageSize } = parsePagination(req.query);
      const result = await complaintService.list(
        req.authUser!,
        req.query as never,
        page,
        pageSize,
        (req.query.sort as string) || "createdAt",
        ((req.query.order as string) === "asc" ? "asc" : "desc"),
      );
      return successWithMeta(res, result.items, {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: result.totalPages,
      });
    } catch (e) {
      next(e);
    }
  },
  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await complaintService.getById(req.authUser!, routeParam(req.params.id));
      return success(res, data);
    } catch (e) {
      next(e);
    }
  },
  async patch(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await complaintService.patch(req.authUser!, routeParam(req.params.id), req.body, clientIp(req));
      return success(res, data, "Complaint updated");
    } catch (e) {
      next(e);
    }
  },
  async assign(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await complaintService.assign(req.authUser!, routeParam(req.params.id), req.body.agentId, req.body.reason, clientIp(req));
      return success(res, data, "Complaint assigned");
    } catch (e) {
      next(e);
    }
  },
  async status(req: Request, res: Response, next: NextFunction) {
    try {
      if (req.body.status === "CLOSED") {
        const data = await complaintService.close(req.authUser!, routeParam(req.params.id), req.body.notes || "Closed", clientIp(req));
        return success(res, data, "Complaint closed");
      }
      const data = await complaintService.changeStatus(req.authUser!, routeParam(req.params.id), req.body.status, req.body.notes, clientIp(req));
      return success(res, data, "Status updated");
    } catch (e) {
      next(e);
    }
  },
  async escalate(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await complaintService.escalate(req.authUser!, routeParam(req.params.id), req.body, clientIp(req));
      return success(res, data, "Complaint escalated");
    } catch (e) {
      next(e);
    }
  },
  async resolve(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await complaintService.resolve(req.authUser!, routeParam(req.params.id), req.body.resolution, clientIp(req));
      return success(res, data, "Complaint resolved");
    } catch (e) {
      next(e);
    }
  },
  async comments(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await complaintService.addComment(
        req.authUser!,
        routeParam(req.params.id),
        req.body.comment,
        req.body.visibility,
        clientIp(req),
      );
      return success(res, data, "Comment added", 201);
    } catch (e) {
      next(e);
    }
  },
  async messages(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await complaintService.addMessage(
        req.authUser!,
        routeParam(req.params.id),
        req.body.body,
        req.body.delivery ?? "PREPARED",
        clientIp(req),
      );
      return success(res, data, data.deliveryNote, 201);
    } catch (e) {
      next(e);
    }
  },
  async history(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await complaintService.history(req.authUser!, routeParam(req.params.id));
      return success(res, data);
    } catch (e) {
      next(e);
    }
  },
  async attachments(req: Request, res: Response, next: NextFunction) {
    try {
      const file = req.file;
      if (!file) throw ApiError.validation("Attachment file is required");
      const data = await complaintService.addAttachment(req.authUser!, routeParam(req.params.id), {
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      });
      return success(res, data, "Attachment uploaded", 201);
    } catch (e) {
      next(e);
    }
  },
  async downloadAttachment(req: Request, res: Response, next: NextFunction) {
    try {
      const { attachment, absolutePath } = await complaintService.getAttachment(
        req.authUser!,
        routeParam(req.params.id),
        routeParam(req.params.attachmentId, "attachmentId"),
      );
      res.setHeader("Content-Type", attachment.mimeType);
      res.setHeader("Content-Disposition", `attachment; filename="${attachment.fileName}"`);
      return res.sendFile(absolutePath);
    } catch (e) {
      next(e);
    }
  },
  async syncChannels(req: Request, res: Response, next: NextFunction) {
    try {
      const [emailResult, ytResult] = await Promise.all([
        emailPollingService.syncNow().catch((err: any) => ({ fetched: 0, items: [], message: err.message })),
        youtubePollingService.syncNow().catch((err: any) => ({ fetched: 0, items: [], message: err.message })),
      ]);

      const totalFetched = (emailResult.fetched || 0) + (ytResult.fetched || 0);
      return success(
        res,
        { email: emailResult, youtube: ytResult, totalFetched },
        `Sync completed in seconds! Fetched ${ytResult.fetched || 0} YouTube comments & ${emailResult.fetched || 0} new emails.`
      );
    } catch (e) {
      next(e);
    }
  },
};

