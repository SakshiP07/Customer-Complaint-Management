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
  regionId?: string;
  storeId?: string;
  assignedAgentId?: string;
  slaStatus?: string;
  from?: string;
  to?: string;
  view?: "inbox" | "mine" | "escalated" | "overdue";
};

export function agentReadScope(user: AuthUser): Prisma.ComplaintWhereInput {
  if (user.regionId) {
    return { AND: [{ regionId: user.regionId }, { assignedAgentId: user.id }] };
  }
  return { assignedAgentId: user.id };
}

export function scopedWhere(
  user: AuthUser,
  extra: Prisma.ComplaintWhereInput = {},
  mode: "metrics" | "read" | "inbox" = "metrics",
): Prisma.ComplaintWhereInput {
  const base: Prisma.ComplaintWhereInput = user.companyId ? { companyId: user.companyId, ...extra } : { ...extra };
  switch (user.role) {
    case "CUSTOMER":
      return { ...base, customer: { userId: user.id } };
    case "AGENT":
      return { ...base, ...agentReadScope(user) };
    case "REGIONAL_MANAGER":
      if (!user.regionId) throw ApiError.forbidden("Regional manager is not assigned to a region");
      return { ...base, regionId: user.regionId };
    case "OPERATIONS_MANAGER":
      if (user.regionId) return { ...base, regionId: user.regionId };
      return base;
    default:
      return base;
  }
}

export function buildListWhere(user: AuthUser, filters: ComplaintFilters): Prisma.ComplaintWhereInput {
  const extra: Prisma.ComplaintWhereInput = {};
  if (filters.status) extra.status = filters.status as ComplaintStatus;
  if (filters.priority) extra.priority = filters.priority;
  if (filters.categoryId) extra.categoryId = filters.categoryId;
  if (filters.channelId) extra.channelId = filters.channelId;
  if (filters.storeId) extra.storeId = filters.storeId;
  if (filters.assignedAgentId) extra.assignedAgentId = filters.assignedAgentId;
  if (filters.slaStatus) extra.slaStatus = filters.slaStatus as SlaStatus;
  if (filters.regionId) extra.regionId = filters.regionId;
  if (filters.from || filters.to) {
    extra.createdAt = {};
    if (filters.from) extra.createdAt.gte = new Date(filters.from);
    if (filters.to) extra.createdAt.lte = new Date(filters.to);
  }
  if (filters.view === "escalated") extra.status = "ESCALATED";
  if (filters.view === "overdue") extra.slaStatus = "OVERDUE";
  if (filters.search) {
    extra.OR = [
      { complaintNumber: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
      { customer: { name: { contains: filters.search, mode: "insensitive" } } },
      { customer: { email: { contains: filters.search, mode: "insensitive" } } },
      { customer: { phone: { contains: filters.search, mode: "insensitive" } } },
      { category: { name: { contains: filters.search, mode: "insensitive" } } },
      { store: { name: { contains: filters.search, mode: "insensitive" } } },
      { region: { name: { contains: filters.search, mode: "insensitive" } } },
    ];
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
