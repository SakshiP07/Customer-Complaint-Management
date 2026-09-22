import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { env } from "../config/env.js";
import type { RoleCode } from "@prisma/client";

export type AccessClaims = {
  sub: string;
  email: string;
  role: RoleCode;
  companyId: string;
  regionId: string | null;
  storeId: string | null;
};

export function signAccessToken(claims: AccessClaims) {
  return jwt.sign(claims, env.JWT_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, env.JWT_SECRET) as AccessClaims & jwt.JwtPayload;
}

export function createRefreshToken() {
  return crypto.randomBytes(48).toString("hex");
}

export function hashRefreshToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function refreshExpiryDate() {
  const days = env.JWT_REFRESH_EXPIRES_IN.endsWith("d")
    ? Number(env.JWT_REFRESH_EXPIRES_IN.replace("d", ""))
    : 7;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}
