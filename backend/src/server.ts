import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./config/prisma.js";
import { startSlaMonitor } from "./jobs/slaMonitor.js";
import { emailPollingService } from "./integrations/channels/email.service.js";
import { youtubePollingService } from "./integrations/channels/youtube.service.js";
import { logger } from "./utils/logger.js";

const app = createApp();

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled Rejection:", { reason: String(reason) });
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", { error: error.message, stack: error.stack });
});

const server = app.listen(env.PORT, () => {
  logger.info(`API listening on ${env.PORT}`);
  if (env.NODE_ENV !== "test") {
    startSlaMonitor();
    emailPollingService.startPolling(8).catch((err) => logger.warn("Email polling error on init:", err));
    youtubePollingService.startPolling(8);
  }
});

async function shutdown() {
  server.close();
  emailPollingService.stopPolling();
  youtubePollingService.stopPolling();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

