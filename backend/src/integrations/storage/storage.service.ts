import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "../../config/env.js";
import { ApiError } from "../../utils/ApiError.js";
import { sanitizeFilename } from "../../utils/sanitize.js";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export interface StorageProvider {
  save(args: { buffer: Buffer; fileName: string; mimeType: string }): Promise<{ storagePath: string; provider: string }>;
  resolveAbsolute(storagePath: string): string;
}

class LocalStorageProvider implements StorageProvider {
  constructor(private dir: string) {}
  async save(args: { buffer: Buffer; fileName: string; mimeType: string }) {
    await fs.mkdir(this.dir, { recursive: true });
    const safe = `${Date.now()}-${sanitizeFilename(args.fileName)}`;
    const abs = path.join(this.dir, safe);
    await fs.writeFile(abs, args.buffer);
    return { storagePath: safe, provider: "LOCAL" };
  }
  resolveAbsolute(storagePath: string) {
    const abs = path.resolve(this.dir, storagePath);
    if (!abs.startsWith(path.resolve(this.dir))) {
      throw ApiError.forbidden("Invalid storage path");
    }
    return abs;
  }
}

class S3StorageProvider implements StorageProvider {
  async save(_args: { buffer: Buffer; fileName: string; mimeType: string }): Promise<{ storagePath: string; provider: string }> {
    throw ApiError.unsupported("S3 storage is configured but credentials/implementation are not enabled in this environment");
  }
  resolveAbsolute(_storagePath: string): string {
    throw ApiError.unsupported("S3 download must be implemented with a signed URL");
  }
}

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const localDir = path.resolve(backendRoot, env.STORAGE_LOCAL_DIR || "uploads");

export const storageProvider: StorageProvider =
  env.STORAGE_PROVIDER === "S3" ? new S3StorageProvider() : new LocalStorageProvider(localDir);

export const storageService = {
  validate(file: { originalname: string; mimetype: string; size: number }) {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw ApiError.validation("File type is not allowed");
    }
    if (file.size > env.MAX_UPLOAD_BYTES) {
      throw ApiError.tooLarge(`File exceeds ${Math.round(env.MAX_UPLOAD_BYTES / 1024 / 1024)}MB limit`);
    }
    if (!file.originalname || file.originalname.length > 200) {
      throw ApiError.validation("Invalid file name");
    }
  },
  async save(file: { buffer: Buffer; originalname: string; mimetype: string; size: number }) {
    this.validate(file);
    return storageProvider.save({ buffer: file.buffer, fileName: file.originalname, mimeType: file.mimetype });
  },
  resolve(storagePath: string) {
    return storageProvider.resolveAbsolute(storagePath);
  },
};
