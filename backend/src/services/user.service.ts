import { prisma } from "../config/prisma.js";
import { ApiError } from "../utils/ApiError.js";
import { hashPassword, assertPasswordPolicy } from "../utils/password.js";
import { writeAudit } from "../middleware/audit.js";
import type { AuthUser } from "../types/express.d.ts";

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"];
const SAFE = {
  id: true,
  name: true,
  email: true,
  phone: true,
  isActive: true,
  regionId: true,
  storeId: true,
  createdAt: true,
  role: { select: { id: true, code: true, name: true } },
  region: { select: { id: true, name: true, code: true } },
  store: { select: { id: true, name: true, code: true } },
} as const;

function assertAdmin(user: AuthUser) {
  if (!ADMIN_ROLES.includes(user.role)) throw ApiError.forbidden();
}

export const userService = {
  async list(actor: AuthUser, query: { page: number; pageSize: number; search?: string; role?: string; regionId?: string }) {
    if (actor.role === "CUSTOMER") throw ApiError.forbidden();
    const where = {
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" as const } },
              { email: { contains: query.search, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(query.role ? { role: { code: query.role as never } } : {}),
      ...(query.regionId ? { regionId: query.regionId } : {}),
      ...(actor.role === "REGIONAL_MANAGER" ? { regionId: actor.regionId } : {}),
      ...(actor.role === "AGENT" ? { id: actor.id } : {}),
    };
    const [total, items] = await prisma.$transaction([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: SAFE,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize, totalPages: Math.ceil(total / query.pageSize) };
  },

  async get(actor: AuthUser, id: string) {
    if (actor.role === "CUSTOMER" && actor.id !== id) throw ApiError.forbidden();
    if (actor.role === "AGENT" && actor.id !== id) throw ApiError.forbidden();
    const user = await prisma.user.findUnique({ where: { id }, select: SAFE });
    if (!user) throw ApiError.notFound("User not found");
    if (actor.role === "REGIONAL_MANAGER" && user.regionId !== actor.regionId) throw ApiError.forbidden();
    return user;
  },

  async create(actor: AuthUser, input: {
    name: string;
    email: string;
    phone?: string;
    password: string;
    roleId: string;
    regionId?: string | null;
    storeId?: string | null;
  }, ip?: string | null) {
    if (!ADMIN_ROLES.includes(actor.role)) {
      if (actor.role === "OPERATIONS_MANAGER") {
        const role = await prisma.role.findUnique({ where: { id: input.roleId } });
        if (!role || (role.code !== "AGENT" && role.code !== "CUSTOMER")) {
          throw ApiError.forbidden("Managers can only create Agents or Customers");
        }
      } else {
        throw ApiError.forbidden();
      }
    }
    const policy = assertPasswordPolicy(input.password);
    if (policy) throw ApiError.validation(policy);
    const created = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email.toLowerCase(),
        phone: input.phone || null,
        passwordHash: await hashPassword(input.password),
        roleId: input.roleId,
        regionId: input.regionId ?? null,
        storeId: input.storeId ?? null,
      },
      select: SAFE,
    });
    await writeAudit({ actor, action: "USER_CREATE", entity: "User", entityId: created.id, ipAddress: ip });
    return created;
  },

  async patch(actor: AuthUser, id: string, input: Record<string, unknown>, ip?: string | null) {
    if (actor.id !== id) assertAdmin(actor);
    if (actor.role === "CUSTOMER" && (input.roleId || input.regionId || input.isActive !== undefined)) {
      throw ApiError.forbidden();
    }
    const updated = await prisma.user.update({
      where: { id },
      data: {
        name: input.name as string | undefined,
        phone: (input.phone as string | undefined) || undefined,
        roleId: ADMIN_ROLES.includes(actor.role) ? (input.roleId as string | undefined) : undefined,
        regionId: ADMIN_ROLES.includes(actor.role) ? (input.regionId as string | null | undefined) : undefined,
        storeId: ADMIN_ROLES.includes(actor.role) ? (input.storeId as string | null | undefined) : undefined,
        isActive: ADMIN_ROLES.includes(actor.role) ? (input.isActive as boolean | undefined) : undefined,
      },
      select: SAFE,
    });
    await writeAudit({ actor, action: "USER_UPDATE", entity: "User", entityId: id, ipAddress: ip });
    return updated;
  },

  async setStatus(actor: AuthUser, id: string, isActive: boolean, ip?: string | null) {
    assertAdmin(actor);
    const updated = await prisma.user.update({ where: { id }, data: { isActive }, select: SAFE });
    await writeAudit({ actor, action: "USER_STATUS", entity: "User", entityId: id, metadata: { isActive }, ipAddress: ip });
    return updated;
  },
};

export const catalogService = {
  lookups() {
    return Promise.all([
      prisma.region.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
      prisma.store.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
      prisma.complaintCategory.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
      prisma.complaintChannel.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
      prisma.priorityConfig.findMany({ where: { isActive: true }, orderBy: { rank: "asc" } }),
      prisma.role.findMany({ orderBy: { name: "asc" } }),
    ]).then(([regions, stores, categories, channels, priorities, roles]) => ({
      regions,
      stores,
      categories,
      channels,
      priorities,
      roles,
    }));
  },
};
