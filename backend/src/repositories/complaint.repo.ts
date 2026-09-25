import { prisma } from "../config/prisma.js";
import type { AuthUser } from "../types/express.d.ts";
import { Prisma, type ComplaintStatus, type SlaStatus } from "@prisma/client";
import { ApiError } from "../utils/ApiError.js";

export type ComplaintFilters = {
  search?: string;
  status?: string;
  priority?: string;
  categoryId?: string;
  channelId?: string;
  channelCode?: string;
  regionId?: string;
  storeId?: string;
  assignedAgentId?: string;
  slaStatus?: string;
  from?: string;
  to?: string;
  view?: "inbox" | "mine" | "escalated" | "overdue";
};

export function agentReadScope(user: AuthUser, mode: "metrics" | "read" | "inbox" = "metrics"): Prisma.ComplaintWhereInput {
  const agentCondition = mode === "inbox"
    ? { OR: [{ assignedAgentId: user.id }, { assignedAgentId: null }] }
    : { assignedAgentId: user.id };

  if (user.regionId) {
    return { AND: [{ regionId: user.regionId }, agentCondition] };
  }
  return agentCondition;
}

export function scopedWhere(
  user: AuthUser,
  extra: Prisma.ComplaintWhereInput = {},
  mode: "metrics" | "read" | "inbox" = "metrics",
): Prisma.ComplaintWhereInput {
  const base: Prisma.ComplaintWhereInput =
    user.role === "SUPER_ADMIN" || !user.companyId
      ? { ...extra }
      : { OR: [{ companyId: user.companyId }, { companyId: null }], ...extra };
  switch (user.role) {
    case "CUSTOMER":
      return { ...base, customer: { userId: user.id } };
    case "AGENT":
      return { ...base, ...agentReadScope(user, mode) };
    case "REGIONAL_MANAGER":
      if (!user.regionId) throw ApiError.forbidden("Regional manager is not assigned to a region");
      return { ...base, regionId: user.regionId };
    case "OPERATIONS_MANAGER":
    case "ADMIN":
    case "SUPER_ADMIN":
    default:
      return base;
  }
}

export function buildListWhere(user: AuthUser, filters: ComplaintFilters): Prisma.ComplaintWhereInput {
  const andClauses: Prisma.ComplaintWhereInput[] = [];
  const extra: Prisma.ComplaintWhereInput = {};

  if (filters.status) extra.status = filters.status as ComplaintStatus;
  if (filters.priority) extra.priority = filters.priority;
  if (filters.categoryId) extra.categoryId = filters.categoryId;
  if (filters.channelId) extra.channelId = filters.channelId;
  if (filters.channelCode) extra.channel = { code: filters.channelCode };
  if (filters.storeId) extra.storeId = filters.storeId;
  if (filters.assignedAgentId) extra.assignedAgentId = filters.assignedAgentId;
  if (filters.slaStatus) extra.slaStatus = filters.slaStatus as SlaStatus;
  if (filters.regionId) extra.regionId = filters.regionId;
  if (filters.from || filters.to) {
    extra.createdAt = {};
    if (filters.from) extra.createdAt.gte = new Date(filters.from);
    if (filters.to) extra.createdAt.lte = new Date(filters.to);
  }

  if (filters.view === "escalated" && !filters.status) {
    andClauses.push({
      OR: [
        { status: "ESCALATED" },
        { escalations: { some: { status: { in: ["OPEN", "IN_PROGRESS"] } } } },
      ],
    });
  }

  if (filters.view === "overdue" && !filters.slaStatus) {
    andClauses.push({
      OR: [
        { slaStatus: { in: ["OVERDUE", "BREACHED"] } },
        { slaDueAt: { lt: new Date() }, status: { notIn: ["RESOLVED", "CLOSED"] } },
      ],
    });
  }

  if (filters.search) {
    andClauses.push({
      OR: [
        { complaintNumber: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
        { customer: { name: { contains: filters.search, mode: "insensitive" } } },
        { customer: { email: { contains: filters.search, mode: "insensitive" } } },
        { customer: { phone: { contains: filters.search, mode: "insensitive" } } },
        { category: { name: { contains: filters.search, mode: "insensitive" } } },
        { store: { name: { contains: filters.search, mode: "insensitive" } } },
        { region: { name: { contains: filters.search, mode: "insensitive" } } },
      ],
    });
  }

  if (andClauses.length > 0) {
    extra.AND = andClauses;
  }

  const mode = filters.view === "inbox" || filters.view === "escalated" || filters.view === "overdue" ? "inbox" : "metrics";
  return scopedWhere(user, extra, mode);
}

const complaintInclude = {
  customer: true,
  channel: true,
  category: true,
  region: true,
  store: true,
  assignedAgent: { select: { id: true, name: true, email: true } },
} as const;

export const complaintRepo = {
  include: complaintInclude,
  async nextNumber(tx: Prisma.TransactionClient, year: number) {
    const row = await tx.complaintSequence.upsert({
      where: { year },
      create: { year, lastNumber: 1 },
      update: { lastNumber: { increment: 1 } },
    });
    return `CMP-${year}-${String(row.lastNumber).padStart(6, "0")}`;
  },
};

export { prisma };
