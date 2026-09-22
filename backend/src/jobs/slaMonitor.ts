import { slaService } from "../services/sla.service.js";
import { logger } from "../utils/logger.js";

let timer: NodeJS.Timeout | null = null;

export function startSlaMonitor(intervalMs = 60_000) {
  const run = async () => {
    try {
      const result = await slaService.monitor();
      if (result.approaching || result.overdue) {
        logger.info("SLA monitor", result);
      }
    } catch (error) {
      logger.error("SLA monitor failed", { message: error instanceof Error ? error.message : "unknown" });
    }
  };
  void run();
  timer = setInterval(run, intervalMs);
  timer.unref();
}

export function stopSlaMonitor() {
  if (timer) clearInterval(timer);
  timer = null;
}
