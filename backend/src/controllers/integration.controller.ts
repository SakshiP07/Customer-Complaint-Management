import type { Request, Response, NextFunction } from "express";
import { youtubePollingService } from "../integrations/channels/youtube.service.js";
import { emailPollingService } from "../integrations/channels/email.service.js";
import { success } from "../utils/response.js";

export const integrationController = {
  async status(req: Request, res: Response, next: NextFunction) {
    try {
      const youtubeStatus = youtubePollingService.getStatus();
      const emailStatus = emailPollingService.getStatus();
      return success(res, {
        youtube: youtubeStatus,
        email: emailStatus,
      });
    } catch (err) {
      next(err);
    }
  },

  async syncYouTube(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await youtubePollingService.syncNow();
      return success(res, result);
    } catch (err) {
      next(err);
    }
  },

  async syncEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await emailPollingService.syncNow();
      return success(res, result);
    } catch (err) {
      next(err);
    }
  },

  async syncAll(req: Request, res: Response, next: NextFunction) {
    try {
      const [youtubeResult, emailResult] = await Promise.all([
        youtubePollingService.syncNow().catch((e) => ({ fetched: 0, items: [], message: e?.message || "YouTube sync failed" })),
        emailPollingService.syncNow().catch((e) => ({ fetched: 0, items: [], message: e?.message || "Email sync failed" })),
      ]);

      const totalFetched = (youtubeResult.fetched || 0) + (emailResult.fetched || 0);

      return success(res, {
        totalFetched,
        youtube: youtubeResult,
        email: emailResult,
      }, `Sync completed: ${youtubeResult.fetched || 0} YouTube comments, ${emailResult.fetched || 0} emails.`);
    } catch (err) {
      next(err);
    }
  },
};

