import { z } from "zod";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
dotenv.config({ path: path.resolve(backendRoot, "../.env") });
dotenv.config({ path: path.resolve(backendRoot, ".env") });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  CLIENT_URL: z.string().default("http://localhost:5173"),
  API_PREFIX: z.string().default("/api/v1"),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  STORAGE_PROVIDER: z.enum(["LOCAL", "S3"]).default("LOCAL"),
  STORAGE_LOCAL_DIR: z.string().default("uploads"),
  STORAGE_BUCKET: z.string().optional().default(""),
  STORAGE_REGION: z.string().optional().default(""),
  STORAGE_ACCESS_KEY: z.string().optional().default(""),
  STORAGE_SECRET_KEY: z.string().optional().default(""),
  STORAGE_ENDPOINT: z.string().optional().default(""),
  MAX_UPLOAD_BYTES: z.coerce.number().default(5_242_880),
  AI_PROVIDER: z.enum(["MOCK", "OPENAI"]).default("MOCK"),
  AI_API_KEY: z.string().optional().default(""),
  AI_MODEL: z.string().default("gpt-4o-mini"),
  EMAIL_HOST: z.string().optional().default(""),
  EMAIL_PORT: z.coerce.number().default(587),
  EMAIL_USER: z.string().optional().default(""),
  EMAIL_PASSWORD: z.string().optional().default(""),
  EMAIL_FROM: z.string().default("noreply@example.com"),
  EMAIL_IMAP_HOST: z.string().optional().default("imap.gmail.com"),
  EMAIL_IMAP_PORT: z.coerce.number().default(993),
  EMAIL_TLS: z.string().optional().default("true"),
  YOUTUBE_API_KEY: z.string().optional().default(""),
  YOUTUBE_CHANNEL_IDS: z.string().optional().default(""),
  YOUTUBE_POLLING_INTERVAL_MINUTES: z.coerce.number().default(10),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900_000),
  RATE_LIMIT_MAX: z.coerce.number().default(300),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().default(20),
});

export const env = envSchema.parse(process.env);
export const isProduction = env.NODE_ENV === "production";
