import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./config/prisma.js";
import { startSlaMonitor } from "./jobs/slaMonitor.js";
import { emailPollingService } from "./integrations/channels/email.service.js";
import { youtubePollingService } from "./integrations/channels/youtube.service.js";
import { logger } from "./utils/logger.js";

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`API listening on ${env.PORT}`);
  if (env.NODE_ENV !== "test") startSlaMonitor();
  if (env.NODE_ENV !== "test") emailPollingService.startPolling(0.17); // ~10 seconds
  if (env.NODE_ENV !== "test") youtubePollingService.startPolling(0.25); // ~15 seconds
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
