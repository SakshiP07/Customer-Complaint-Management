import type { Request, Response, NextFunction } from "express";
import { dashboardService, type DashFilters } from "../services/dashboard.service.js";
import { analyticsService } from "../services/analytics.service.js";
import { reportService } from "../services/report.service.js";
import { success } from "../utils/response.js";

function filters(req: Request): DashFilters {
  return {
    from: req.query.from ? new Date(String(req.query.from)) : undefined,
    to: req.query.to ? new Date(String(req.query.to)) : undefined,
    regionId: req.query.regionId ? String(req.query.regionId) : undefined,
    channelId: req.query.channelId ? String(req.query.channelId) : undefined,
    categoryId: req.query.categoryId ? String(req.query.categoryId) : undefined,
  };
}

export const dashboardController = {
  async summary(req: Request, res: Response, next: NextFunction) {
    try {
      return success(res, await dashboardService.summary(req.authUser!, filters(req)));
    } catch (e) {
      next(e);
    }
  },
  async trends(req: Request, res: Response, next: NextFunction) {
    try {
      return success(res, await dashboardService.trends(req.authUser!, filters(req)));
    } catch (e) {
      next(e);
    }
  },
  async byChannel(req: Request, res: Response, next: NextFunction) {
    try {
      return success(res, await dashboardService.byChannel(req.authUser!, filters(req)));
    } catch (e) {
      next(e);
    }
  },
  async byCategory(req: Request, res: Response, next: NextFunction) {
    try {
      return success(res, await dashboardService.byCategory(req.authUser!, filters(req)));
    } catch (e) {
      next(e);
    }
  },
  async byRegion(req: Request, res: Response, next: NextFunction) {
    try {
      return success(res, await dashboardService.byRegion(req.authUser!, filters(req)));
    } catch (e) {
      next(e);
    }
  },
  async byStore(req: Request, res: Response, next: NextFunction) {
    try {
      return success(res, await dashboardService.byStore(req.authUser!, filters(req)));
    } catch (e) {
      next(e);
    }
  },
  async byAgent(req: Request, res: Response, next: NextFunction) {
    try {
      return success(res, await dashboardService.byAgent(req.authUser!, filters(req)));
    } catch (e) {
      next(e);
    }
  },
  async sla(req: Request, res: Response, next: NextFunction) {
    try {
      return success(res, await dashboardService.sla(req.authUser!, filters(req)));
    } catch (e) {
      next(e);
    }
  },
  async performance(req: Request, res: Response, next: NextFunction) {
    try {
      return success(res, await dashboardService.agentPerformance(req.authUser!, req.query.agentId as string | undefined));
    } catch (e) {
      next(e);
    }
  },
};

export const analyticsController = {
  async recurring(req: Request, res: Response, next: NextFunction) {
    try {
      return success(res, await analyticsService.recurringIssues(req.authUser!, filters(req)));
    } catch (e) {
      next(e);
    }
  },
  async categories(req: Request, res: Response, next: NextFunction) {
    try {
      return success(res, await analyticsService.categories(req.authUser!, filters(req)));
    } catch (e) {
      next(e);
    }
  },
  async regions(req: Request, res: Response, next: NextFunction) {
    try {
      return success(res, await analyticsService.regions(req.authUser!, filters(req)));
    } catch (e) {
      next(e);
    }
  },
  async stores(req: Request, res: Response, next: NextFunction) {
    try {
      return success(res, await analyticsService.stores(req.authUser!, filters(req)));
    } catch (e) {
      next(e);
    }
  },
  async employees(req: Request, res: Response, next: NextFunction) {
    try {
      return success(res, await analyticsService.employees(req.authUser!));
    } catch (e) {
      next(e);
    }
  },
  async audit(req: Request, res: Response, next: NextFunction) {
    try {
      return success(res, await analyticsService.auditLogs());
    } catch (e) {
      next(e);
    }
  },
};

export const reportController = {
  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const type = (req.query.type as "daily" | "weekly" | "monthly") || "weekly";
      return success(res, await reportService.generate(req.authUser!, type, filters(req)));
    } catch (e) {
      next(e);
    }
  },
  async csv(req: Request, res: Response, next: NextFunction) {
    try {
      const type = (req.query.type as "daily" | "weekly" | "monthly") || "weekly";
      const csv = await reportService.csv(req.authUser!, type, filters(req));
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="${type}-report.csv"`);
      return res.send(csv);
    } catch (e) {
      next(e);
    }
  },
};
