import type { Request, Response, NextFunction } from "express";
import { userService, catalogService } from "../services/user.service.js";
import { adminService } from "../services/admin.service.js";
import { notificationService } from "../services/notification.service.js";
import { aiService } from "../integrations/ai/ai.service.js";
import { success, successWithMeta } from "../utils/response.js";
import { parsePagination, routeParam } from "../utils/pagination.js";
import { clientIp } from "../middleware/audit.js";
import { ApiError } from "../utils/ApiError.js";

export const userController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, pageSize } = parsePagination(req.query);
      const result = await userService.list(req.authUser!, {
        page,
        pageSize,
        search: req.query.search as string | undefined,
        role: req.query.role as string | undefined,
        regionId: req.query.regionId as string | undefined,
      });
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
      return success(res, await userService.get(req.authUser!, routeParam(req.params.id)));
    } catch (e) {
      next(e);
    }
  },
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      return success(res, await userService.create(req.authUser!, req.body, clientIp(req)), "User created", 201);
    } catch (e) {
      next(e);
    }
  },
  async patch(req: Request, res: Response, next: NextFunction) {
    try {
      return success(res, await userService.patch(req.authUser!, routeParam(req.params.id), req.body, clientIp(req)), "User updated");
    } catch (e) {
      next(e);
    }
  },
  async status(req: Request, res: Response, next: NextFunction) {
    try {
      return success(res, await userService.setStatus(req.authUser!, routeParam(req.params.id), req.body.isActive, clientIp(req)));
    } catch (e) {
      next(e);
    }
  },
};

export const lookupController = {
  async all(_req: Request, res: Response, next: NextFunction) {
    try {
      return success(res, await catalogService.lookups());
    } catch (e) {
      next(e);
    }
  },
};

export const notificationController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      return success(res, await notificationService.list(req.authUser!, req.query.unread === "true"));
    } catch (e) {
      next(e);
    }
  },
  async read(req: Request, res: Response, next: NextFunction) {
    try {
      const row = await notificationService.markRead(req.authUser!, routeParam(req.params.id));
      if (!row) throw ApiError.notFound("Notification not found");
      return success(res, row);
    } catch (e) {
      next(e);
    }
  },
  async readAll(req: Request, res: Response, next: NextFunction) {
    try {
      await notificationService.markAllRead(req.authUser!);
      return success(res, null, "Notifications marked read");
    } catch (e) {
      next(e);
    }
  },
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const deleted = await notificationService.delete(req.authUser!, routeParam(req.params.id));
      if (!deleted) throw ApiError.notFound("Notification not found");
      return success(res, null, "Notification deleted");
    } catch (e) {
      next(e);
    }
  },
};

export const aiController = {
  async analyse(req: Request, res: Response, next: NextFunction) {
    try {
      return success(res, await aiService.analyseComplaint(req.authUser!, routeParam(req.params.id)));
    } catch (e) {
      next(e);
    }
  },
  async review(req: Request, res: Response, next: NextFunction) {
    try {
      return success(res, await aiService.review(req.authUser!, routeParam(req.params.analysisId, "analysisId"), req.body));
    } catch (e) {
      next(e);
    }
  },
};

async function handleCrud(
  req: Request,
  res: Response,
  next: NextFunction,
  factory: () => Promise<{
    list: () => Promise<unknown>;
    create: (data: never) => Promise<unknown>;
    update: (id: string, data: never) => Promise<unknown>;
  }>,
) {
  try {
    const svc = await factory();
    if (req.method === "GET") return success(res, await svc.list());
    if (req.method === "POST") return success(res, await svc.create(req.body as never), "Created", 201);
    return success(res, await svc.update(routeParam(req.params.id), req.body as never), "Updated");
  } catch (e) {
    next(e);
  }
}

export const adminController = {
  regions: (req: Request, res: Response, next: NextFunction) =>
    handleCrud(req, res, next, () => adminService.regions(req.authUser!, clientIp(req))),
  stores: (req: Request, res: Response, next: NextFunction) =>
    handleCrud(req, res, next, () => adminService.stores(req.authUser!, clientIp(req))),
  categories: (req: Request, res: Response, next: NextFunction) =>
    handleCrud(req, res, next, () => adminService.categories(req.authUser!, clientIp(req))),
  channels: (req: Request, res: Response, next: NextFunction) =>
    handleCrud(req, res, next, () => adminService.channels(req.authUser!, clientIp(req))),
  sla: (req: Request, res: Response, next: NextFunction) =>
    handleCrud(req, res, next, () => adminService.slaPolicies(req.authUser!, clientIp(req))),
  async audit(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, pageSize } = parsePagination(req.query);
      const result = await adminService.auditLogs(req.authUser!, page, pageSize, req.query.action as string | undefined);
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
  async settings(req: Request, res: Response, next: NextFunction) {
    try {
      if (req.method === "GET") return success(res, await adminService.settings(req.authUser!));
      return success(res, await adminService.upsertSetting(req.authUser!, req.body.key, req.body.value, clientIp(req)));
    } catch (e) {
      next(e);
    }
  },
};
