import { prisma } from "../config/prisma.js";
import { ApiError } from "../utils/ApiError.js";
import { writeAudit } from "../middleware/audit.js";
import type { AuthUser } from "../types/express.d.ts";

function assertAdmin(user: AuthUser) {
  if (!["ADMIN", "SUPER_ADMIN"].includes(user.role)) throw ApiError.forbidden();
}

async function crud<TCreate extends object, TUpdate extends object>(
  actor: AuthUser,
  entity: string,
  ip: string | null | undefined,
  ops: {
    list: () => Promise<unknown>;
    create: (data: TCreate) => Promise<{ id: string }>;
    update: (id: string, data: TUpdate) => Promise<{ id: string }>;
    remove?: (id: string) => Promise<unknown>;
  },
) {
  assertAdmin(actor);
  return {
    async list() {
      return ops.list();
    },
    async create(data: TCreate) {
      const row = await ops.create(data);
      await writeAudit({ actor, action: `${entity}_CREATE`, entity, entityId: row.id, ipAddress: ip });
      return row;
    },
    async update(id: string, data: TUpdate) {
      const row = await ops.update(id, data);
      await writeAudit({ actor, action: `${entity}_UPDATE`, entity, entityId: id, ipAddress: ip });
      return row;
    },
  };
}

export const adminService = {
  async regions(actor: AuthUser, ip?: string | null) {
    return crud(actor, "Region", ip, {
      list: () => prisma.region.findMany({ where: actor.companyId ? { companyId: actor.companyId } : undefined, orderBy: { name: "asc" } }),
      create: (data: { name: string; code: string; description?: string; isActive?: boolean }) => 
        prisma.region.create({ data: actor.companyId ? { ...data, companyId: actor.companyId } : data }),
      update: (id, data: Partial<{ name: string; code: string; description?: string; isActive?: boolean }>) =>
        prisma.region.update({ where: actor.companyId ? { id, companyId: actor.companyId } : { id }, data }),
    });
  },
  async stores(actor: AuthUser, ip?: string | null) {
    return crud(actor, "Store", ip, {
      list: () => prisma.store.findMany({ where: actor.companyId ? { companyId: actor.companyId } : undefined, include: { region: true }, orderBy: { name: "asc" } }),
      create: (data: { name: string; code: string; address: string; city: string; state: string; regionId: string; isActive?: boolean }) =>
        prisma.store.create({ data: actor.companyId ? { ...data, companyId: actor.companyId } : data }),
      update: (id, data: Partial<{ name: string; code: string; address: string; city: string; state: string; regionId: string; isActive?: boolean }>) =>
        prisma.store.update({ where: actor.companyId ? { id, companyId: actor.companyId } : { id }, data }),
    });
  },
  async categories(actor: AuthUser, ip?: string | null) {
    return crud(actor, "Category", ip, {
      list: () => prisma.complaintCategory.findMany({ where: actor.companyId ? { companyId: actor.companyId } : undefined, orderBy: { name: "asc" } }),
      create: (data: { name: string; code: string; description?: string; isActive?: boolean }) =>
        prisma.complaintCategory.create({ data: actor.companyId ? { ...data, companyId: actor.companyId } : data }),
      update: (id, data: Partial<{ name: string; code: string; description?: string; isActive?: boolean }>) =>
        prisma.complaintCategory.update({ where: actor.companyId ? { id, companyId: actor.companyId } : { id }, data }),
    });
  },
  async channels(actor: AuthUser, ip?: string | null) {
    return crud(actor, "Channel", ip, {
      list: () => prisma.complaintChannel.findMany({ where: actor.companyId ? { companyId: actor.companyId } : undefined, orderBy: { name: "asc" } }),
      create: (data: { name: string; code: string; description?: string; adapterKey: string; isActive?: boolean }) =>
        prisma.complaintChannel.create({ data: actor.companyId ? { ...data, companyId: actor.companyId } : data }),
      update: (id, data: Partial<{ name: string; code: string; description?: string; adapterKey: string; isActive?: boolean }>) =>
        prisma.complaintChannel.update({ where: actor.companyId ? { id, companyId: actor.companyId } : { id }, data }),
    });
  },
  async slaPolicies(actor: AuthUser, ip?: string | null) {
    return crud(actor, "SLAPolicy", ip, {
      list: () => prisma.sLAPolicy.findMany({ where: actor.companyId ? { companyId: actor.companyId } : undefined, include: { priority: true, category: true, region: true }, orderBy: { name: "asc" } }),
      create: (data: {
        name: string;
        priorityCode: string;
        categoryId?: string | null;
        regionId?: string | null;
        responseTimeMinutes: number;
        resolutionTimeMinutes: number;
        escalationThresholdMinutes: number;
        approachingPercent?: number;
        isActive?: boolean;
      }) => prisma.sLAPolicy.create({ data: actor.companyId ? { ...data, companyId: actor.companyId, isDemo: false } : { ...data, isDemo: false } }),
      update: (id, data: Record<string, unknown>) => prisma.sLAPolicy.update({ where: actor.companyId ? { id, companyId: actor.companyId } : { id }, data }),
    });
  },
  async auditLogs(actor: AuthUser, page: number, pageSize: number, action?: string) {
    assertAdmin(actor);
    const where = actor.companyId ? { companyId: actor.companyId, ...(action ? { action } : {}) } : action ? { action } : {};
    const [total, items] = await prisma.$transaction([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { actor: { select: { id: true, name: true, email: true } } },
      }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  },
  async settings(actor: AuthUser) {
    assertAdmin(actor);
    return prisma.systemSetting.findMany({ orderBy: { key: "asc" } });
  },
  async upsertSetting(actor: AuthUser, key: string, value: string, ip?: string | null) {
    assertAdmin(actor);
    const row = await prisma.systemSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
    await writeAudit({ actor, action: "SETTING_UPDATE", entity: "SystemSetting", entityId: row.id, metadata: { key }, ipAddress: ip });
    return row;
  },
};
