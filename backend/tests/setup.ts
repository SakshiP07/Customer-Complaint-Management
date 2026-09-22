import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.resolve(process.cwd(), "../.env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

process.env.NODE_ENV ??= "test";
process.env.JWT_SECRET ??= "test-jwt-secret-key-32chars-min";
process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret-key-32ch";
process.env.CLIENT_URL ??= "http://localhost:5173";
