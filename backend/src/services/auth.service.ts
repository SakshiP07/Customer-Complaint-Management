import type { RoleCode } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";
import { hashPassword, verifyPassword, assertPasswordPolicy } from "../utils/password.js";
import {
  createRefreshToken,
  hashRefreshToken,
  refreshExpiryDate,
  signAccessToken,
} from "../utils/jwt.js";
import { writeAudit } from "../middleware/audit.js";
import type { AuthUser } from "../types/express.d.ts";

const SAFE_USER = {
  id: true,
  name: true,
  email: true,
  phone: true,
  isActive: true,
  regionId: true,
  storeId: true,
  companyId: true,
  createdAt: true,
  lastLoginAt: true,
  role: { select: { id: true, code: true, name: true } },
  region: { select: { id: true, name: true, code: true } },
  store: { select: { id: true, name: true, code: true } },
} as const;

function toAuthUser(user: {
  id: string;
  name: string;
  email: string;
  regionId: string | null;
  storeId: string | null;
  companyId: string | null;
  role: { code: RoleCode };
}): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role.code,
    regionId: user.regionId,
    storeId: user.storeId,
    companyId: user.companyId,
  };
}

export const authService = {
  async register(input: { name: string; email: string; phone?: string; password: string }, ip?: string | null) {
    const policy = assertPasswordPolicy(input.password);
    if (policy) throw ApiError.validation(policy);
    const existing = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    if (existing) throw ApiError.conflict("An account with this email already exists");
    const role = await prisma.role.findUnique({ where: { code: "CUSTOMER" } });
    if (!role) throw ApiError.unprocessable("Customer role is not configured");
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email.toLowerCase(),
        phone: input.phone || null,
        passwordHash: await hashPassword(input.password),
        roleId: role.id,
        customerProfile: {
          create: {
            name: input.name,
            email: input.email.toLowerCase(),
            phone: input.phone || null,
            preferredContactMethod: "EMAIL",
          },
        },
      },
      include: { role: true },
    });
    // Add companyId to user object for toAuthUser
    (user as any).companyId = null;
    await writeAudit({
      actor: toAuthUser(user),
      action: "USER_REGISTER",
      entity: "User",
      entityId: user.id,
      ipAddress: ip,
    });
    return this.issueSession(user);
  },

  async login(email: string, password: string, ip?: string | null, userAgent?: string | null) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { role: true },
    });
    if (!user || !user.isActive) throw ApiError.unauthorized("Invalid email or password");
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) throw ApiError.unauthorized("Invalid email or password");
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    // Add companyId to user object for toAuthUser
    (user as any).companyId = (user as any).companyId || null;
    await writeAudit({
      actor: toAuthUser(user),
      action: "LOGIN",
      entity: "User",
      entityId: user.id,
      ipAddress: ip,
      userAgent,
    });
    return this.issueSession(user);
  },

  async issueSession(user: {
    id: string;
    name: string;
    email: string;
    regionId: string | null;
    storeId: string | null;
    companyId: string | null;
    role: { code: RoleCode };
  }) {
    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role.code,
      companyId: user.companyId || '',
      regionId: user.regionId,
      storeId: user.storeId,
    });
    const refreshToken = createRefreshToken();
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashRefreshToken(refreshToken),
        expiresAt: refreshExpiryDate(),
      },
    });
    const safe = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: SAFE_USER });
    return { accessToken, refreshToken, user: safe };
  },

  async refresh(refreshToken: string) {
    const tokenHash = hashRefreshToken(refreshToken);
    const stored = await prisma.refreshToken.findFirst({
      where: { tokenHash, revokedAt: null, expiresAt: { gt: new Date() } },
      include: { user: { include: { role: true } } },
    });
    if (!stored || !stored.user.isActive) throw ApiError.unauthorized("Refresh token is invalid");
    await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
    return this.issueSession(stored.user);
  },

  async logout(user: AuthUser, refreshToken?: string, ip?: string | null) {
    if (refreshToken) {
      await prisma.refreshToken.updateMany({
        where: { userId: user.id, tokenHash: hashRefreshToken(refreshToken), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } else {
      await prisma.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    await writeAudit({ actor: user, action: "LOGOUT", entity: "User", entityId: user.id, ipAddress: ip });
  },

  async me(userId: string) {
    return prisma.user.findUniqueOrThrow({ where: { id: userId }, select: SAFE_USER });
  },

  cookieOptions() {
    return {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };
  },
};
