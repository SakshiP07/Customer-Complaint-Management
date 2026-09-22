import { Router } from "express";
import { authController } from "../controllers/auth.controller.js";
import { validate } from "../middleware/validate.js";
import { loginSchema, registerSchema } from "../validators/schemas.js";
import { authenticate } from "../middleware/authenticate.js";
import { ApiError } from "../utils/ApiError.js";

export const authRouter = Router();

authRouter.post("/register", validate(registerSchema), authController.register);
authRouter.post("/login", validate(loginSchema), authController.login);
authRouter.post("/refresh", async (req, res, next) => {
  try {
    const token = (req.cookies?.refreshToken as string | undefined) || req.body?.refreshToken;
    if (!token) throw ApiError.unauthorized("Refresh token missing");
    return authController.refresh(req, res, next);
  } catch (e) {
    next(e);
  }
});
authRouter.get("/me", authenticate, authController.me);
authRouter.post("/logout", authenticate, authController.logout);
