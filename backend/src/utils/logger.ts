export const logger = {
  info: (message: string, extra?: Record<string, unknown>) => {
    console.log(JSON.stringify({ level: "info", message, ...extra, ts: new Date().toISOString() }));
  },
  warn: (message: string, extra?: Record<string, unknown>) => {
    console.warn(JSON.stringify({ level: "warn", message, ...extra, ts: new Date().toISOString() }));
  },
  error: (message: string, extra?: Record<string, unknown>) => {
    console.error(JSON.stringify({ level: "error", message, ...extra, ts: new Date().toISOString() }));
  },
};
