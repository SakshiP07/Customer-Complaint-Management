import type { Request, Response, NextFunction } from "express";
import { authService } from "../services/auth.service.js";
import { success } from "../utils/response.js";
import { clientIp } from "../middleware/audit.js";
import { env } from "../config/env.js";

export const authController = {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.register(req.body, clientIp(req));
      res.cookie("refreshToken", result.refreshToken, authService.cookieOptions());
      return success(res, { accessToken: result.accessToken, user: result.user }, "Registered", 201);
    } catch (e) {
      next(e);
    }
  },
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      console.log('[LOGIN] Request body:', { email: req.body.email, hasPassword: !!req.body.password });
      const result = await authService.login(
        req.body.email,
        req.body.password,
        clientIp(req),
        req.get("user-agent"),
      );
      console.log('[LOGIN] Success for email:', req.body.email);
      res.cookie("refreshToken", result.refreshToken, authService.cookieOptions());
      return success(res, { accessToken: result.accessToken, user: result.user }, "Authenticated");
    } catch (e) {
      console.log('[LOGIN] Error:', e);
      next(e);
    }
  },
  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const token = (req.cookies?.refreshToken as string | undefined) || req.body.refreshToken;
      if (!token) throw new Error("Missing refresh token");
      const result = await authService.refresh(token);
      res.cookie("refreshToken", result.refreshToken, authService.cookieOptions());
      return success(res, { accessToken: result.accessToken, user: result.user }, "Token refreshed");
    } catch (e) {
      next(e);
    }
  },
  async me(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await authService.me(req.authUser!.id);
      return success(res, user);
    } catch (e) {
      next(e);
    }
  },
  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.cookies?.refreshToken as string | undefined;
      if (req.authUser) await authService.logout(req.authUser, token, clientIp(req));
      res.clearCookie("refreshToken", { path: "/", secure: env.NODE_ENV === "production", sameSite: "lax" });
      return success(res, null, "Logged out");
    } catch (e) {
      next(e);
    }
  },
};
