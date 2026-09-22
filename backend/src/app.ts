import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env.js";
import { authRouter } from "./routes/auth.routes.js";
import { complaintRouter } from "./routes/complaint.routes.js";
import { analyticsRouter, dashboardRouter, reportRouter } from "./routes/dashboard.routes.js";
import { adminRouter, lookupRouter, notificationRouter, userRouter } from "./routes/admin.routes.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { openApiDocument } from "./docs/openapi.js";

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(
    cors({
      origin: env.CLIENT_URL,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(
    rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      limit: env.RATE_LIMIT_MAX,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );
  const authLimiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    limit: env.AUTH_RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.get("/health", (_req, res) => res.json({ success: true, data: { status: "ok" } }));
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));

  const prefix = env.API_PREFIX;
  app.use(`${prefix}/auth/login`, authLimiter);
  app.use(`${prefix}/auth/register`, authLimiter);
  app.use(`${prefix}/auth`, authRouter);
  app.use(`${prefix}/complaints`, complaintRouter);
  app.use(`${prefix}/dashboard`, dashboardRouter);
  app.use(`${prefix}/analytics`, analyticsRouter);
  app.use(`${prefix}/reports`, reportRouter);
  app.use(`${prefix}/users`, userRouter);
  app.use(`${prefix}/lookups`, lookupRouter);
  app.use(`${prefix}/notifications`, notificationRouter);
  app.use(`${prefix}/admin`, adminRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
