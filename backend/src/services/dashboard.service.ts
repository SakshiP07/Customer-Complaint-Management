import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import type { AuthUser } from "../types/express.d.ts";
import { scopedWhere } from "../repositories/complaint.repo.js";
import { ApiError } from "../utils/ApiError.js";

export type DashFilters = {
  from?: Date;
  to?: Date;
  regionId?: string;
  channelId?: string;
  categoryId?: string;
};

function rangeWhere(user: AuthUser, filters: DashFilters): Prisma.ComplaintWhereInput {
  const extra: Prisma.ComplaintWhereInput = {};
  if (filters.from || filters.to) {
    extra.createdAt = {};
    if (filters.from) extra.createdAt.gte = filters.from;
    if (filters.to) extra.createdAt.lte = filters.to;
  }
  if (filters.regionId) extra.regionId = filters.regionId;
  if (filters.channelId) extra.channelId = filters.channelId;
  if (filters.categoryId) extra.categoryId = filters.categoryId;
  if (user.role === "REGIONAL_MANAGER") extra.regionId = user.regionId ?? extra.regionId;
  if (user.role === "CUSTOMER") throw ApiError.forbidden();
  return scopedWhere(user, extra);
}

function hoursBetween(a: Date, b: Date) {
  return (b.getTime() - a.getTime()) / 3_600_000;
}

export const dashboardService = {
  async summary(user: AuthUser, filters: DashFilters) {
    const where = rangeWhere(user, filters);
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const [total, newCount, pending, overdue, resolved, inProgress, escalated, slaMet, slaBreached, resolvedToday, open] = await Promise.all([
      prisma.complaint.count({ where }),
      prisma.complaint.count({ where: { ...where, status: "NEW" } }),
      prisma.complaint.count({ where: { ...where, status: { in: ["PENDING", "ASSIGNED", "CATEGORISED"] } } }),
      prisma.complaint.count({ where: { ...where, slaStatus: "OVERDUE" } }),
      prisma.complaint.count({ where: { ...where, status: { in: ["RESOLVED", "CLOSED"] } } }),
      prisma.complaint.count({ where: { ...where, status: "IN_PROGRESS" } }),
      prisma.complaint.count({ where: { ...where, status: "ESCALATED" } }),
      prisma.complaint.count({ where: { ...where, slaStatus: { in: ["MET"] } } }),
      prisma.complaint.count({ where: { ...where, slaStatus: { in: ["BREACHED", "OVERDUE"] } } }),
      prisma.complaint.count({ where: { ...where, resolvedAt: { gte: startOfDay } } }),
      prisma.complaint.count({ where: { ...where, status: { notIn: ["RESOLVED", "CLOSED"] } } }),
    ]);
    const resolvedRows = await prisma.complaint.findMany({
      where: { ...where, resolvedAt: { not: null } },
      select: { createdAt: true, resolvedAt: true, firstResponseAt: true },
      take: 2000,
    });
    const avgResolution =
      resolvedRows.length === 0
        ? 0
        : resolvedRows.reduce((sum, r) => sum + hoursBetween(r.createdAt, r.resolvedAt as Date), 0) / resolvedRows.length;
    const slaClosed = slaMet + slaBreached;
    return {
      total,
      newComplaints: newCount,
      pending,
      inProgress,
      overdue,
      resolved,
      escalated,
      resolvedToday,
      open,
      slaCompliance: slaClosed === 0 ? 100 : Math.round((slaMet / slaClosed) * 1000) / 10,
      averageResolutionHours: Math.round(avgResolution * 10) / 10,
    };
  },

  async trends(user: AuthUser, filters: DashFilters) {
    const where = rangeWhere(user, filters);
    const rows = await prisma.complaint.findMany({
      where,
      select: { createdAt: true, status: true },
    });
    const buckets = new Map<string, { date: string; count: number; resolved: number }>();
    for (const row of rows) {
      const date = row.createdAt.toISOString().slice(0, 10);
      const current = buckets.get(date) ?? { date, count: 0, resolved: 0 };
      current.count += 1;
      if (row.status === "RESOLVED" || row.status === "CLOSED") current.resolved += 1;
      buckets.set(date, current);
    }
    return [...buckets.values()].sort((a, b) => a.date.localeCompare(b.date));
  },

  async byChannel(user: AuthUser, filters: DashFilters) {
    const where = rangeWhere(user, filters);
    const [grouped, openGrouped, resolvedGrouped, total] = await Promise.all([
      prisma.complaint.groupBy({ by: ["channelId"], where, _count: { _all: true } }),
      prisma.complaint.groupBy({
        by: ["channelId"],
        where: { ...where, status: { notIn: ["RESOLVED", "CLOSED"] } },
        _count: { _all: true },
      }),
      prisma.complaint.groupBy({
        by: ["channelId"],
        where: { ...where, status: { in: ["RESOLVED", "CLOSED"] } },
        _count: { _all: true },
      }),
      prisma.complaint.count({ where }),
    ]);
    const channels = await prisma.complaintChannel.findMany();
    const map = new Map(channels.map((c) => [c.id, c.name]));
    const openMap = new Map(openGrouped.map((g) => [g.channelId, g._count._all]));
    const resolvedMap = new Map(resolvedGrouped.map((g) => [g.channelId, g._count._all]));
    return grouped
      .map((g) => ({
        name: map.get(g.channelId) ?? "Unknown",
        count: g._count._all,
        open: openMap.get(g.channelId) ?? 0,
        resolved: resolvedMap.get(g.channelId) ?? 0,
        percentage: total === 0 ? 0 : Math.round((g._count._all / total) * 1000) / 10,
      }))
      .sort((a, b) => b.count - a.count);
  },

  async byCategory(user: AuthUser, filters: DashFilters) {
    const where = rangeWhere(user, filters);
    const grouped = await prisma.complaint.groupBy({
      by: ["categoryId"],
      where,
      _count: { _all: true },
    });
    const cats = await prisma.complaintCategory.findMany();
    const map = new Map(cats.map((c) => [c.id, c.name]));
    return grouped
      .map((g) => ({ name: map.get(g.categoryId ?? "") ?? "Uncategorised", count: g._count._all }))
      .sort((a, b) => b.count - a.count);
  },

  async byRegion(user: AuthUser, filters: DashFilters) {
    const where = rangeWhere(user, filters);
    const grouped = await prisma.complaint.groupBy({
      by: ["regionId"],
      where,
      _count: { _all: true },
    });
    const regions = await prisma.region.findMany();
    const map = new Map(regions.map((r) => [r.id, r.name]));
    return grouped.map((g) => ({ name: map.get(g.regionId) ?? "Unknown", count: g._count._all }));
  },

  async byStore(user: AuthUser, filters: DashFilters) {
    const where = rangeWhere(user, filters);
    const grouped = await prisma.complaint.groupBy({
      by: ["storeId"],
      where,
      _count: { _all: true },
    });
    const stores = await prisma.store.findMany();
    const map = new Map(stores.map((s) => [s.id, s.name]));
    return grouped
      .filter((g) => g.storeId)
      .map((g) => ({ name: map.get(g.storeId ?? "") ?? "Unknown", count: g._count._all }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
  },

  async byAgent(user: AuthUser, filters: DashFilters) {
    if (user.role === "AGENT") throw ApiError.forbidden();
    const where = rangeWhere(user, filters);
    const grouped = await prisma.complaint.groupBy({
      by: ["assignedAgentId"],
      where: { ...where, assignedAgentId: { not: null } },
      _count: { _all: true },
    });
    const agents = await prisma.user.findMany({
      where: { role: { code: "AGENT" } },
      select: { id: true, name: true },
    });
    const map = new Map(agents.map((a) => [a.id, a.name]));
    return grouped
      .map((g) => ({ name: map.get(g.assignedAgentId ?? "") ?? "Unassigned", count: g._count._all }))
      .sort((a, b) => b.count - a.count);
  },

  async sla(user: AuthUser, filters: DashFilters) {
    const where = rangeWhere(user, filters);
    const grouped = await prisma.complaint.groupBy({
      by: ["slaStatus"],
      where,
      _count: { _all: true },
    });
    return grouped.map((g) => ({ name: g.slaStatus, count: g._count._all }));
  },

  async agentPerformance(user: AuthUser, agentId?: string) {
    const targetId = user.role === "AGENT" ? user.id : agentId ?? user.id;
    if (user.role === "AGENT" && agentId && agentId !== user.id) throw ApiError.forbidden();
    if (user.role === "REGIONAL_MANAGER") {
      const agent = await prisma.user.findUnique({ where: { id: targetId } });
      if (agent?.regionId !== user.regionId && targetId !== user.id) throw ApiError.forbidden();
    }
    const where: Prisma.ComplaintWhereInput = { assignedAgentId: targetId };
    const [assigned, resolved, pending, overdue, rows] = await Promise.all([
      prisma.complaint.count({ where }),
      prisma.complaint.count({ where: { ...where, status: { in: ["RESOLVED", "CLOSED"] } } }),
      prisma.complaint.count({ where: { ...where, status: { in: ["ASSIGNED", "IN_PROGRESS", "PENDING", "ESCALATED"] } } }),
      prisma.complaint.count({ where: { ...where, slaStatus: "OVERDUE" } }),
      prisma.complaint.findMany({
        where: { ...where, resolvedAt: { not: null } },
        select: { createdAt: true, resolvedAt: true, firstResponseAt: true, slaStatus: true },
      }),
    ]);
    const avgRes = rows.length
      ? rows.reduce((s, r) => s + hoursBetween(r.createdAt, r.resolvedAt as Date), 0) / rows.length
      : 0;
    const firsts = rows.filter((r) => r.firstResponseAt);
    const avgFirst = firsts.length
      ? firsts.reduce((s, r) => s + hoursBetween(r.createdAt, r.firstResponseAt as Date), 0) / firsts.length
      : 0;
    const met = rows.filter((r) => r.slaStatus === "MET").length;
    const categoryGroups = await prisma.complaint.groupBy({
      by: ["categoryId"],
      where,
      _count: { _all: true },
    });
    const cats = await prisma.complaintCategory.findMany();
    const cmap = new Map(cats.map((c) => [c.id, c.name]));
    const categoriesHandled = categoryGroups
      .map((g) => ({ name: cmap.get(g.categoryId ?? "") ?? "Uncategorised", count: g._count._all }))
      .sort((a, b) => b.count - a.count);
    const trendMap = new Map<string, number>();
    const recent = await prisma.complaint.findMany({
      where: { ...where, resolvedAt: { not: null } },
      select: { resolvedAt: true },
      orderBy: { resolvedAt: "desc" },
      take: 90,
    });
    for (const r of recent) {
      const d = (r.resolvedAt as Date).toISOString().slice(0, 10);
      trendMap.set(d, (trendMap.get(d) ?? 0) + 1);
    }
    return {
      assigned,
      resolved,
      pending,
      overdue,
      averageResolutionHours: Math.round(avgRes * 10) / 10,
      averageFirstResponseHours: Math.round(avgFirst * 10) / 10,
      slaCompliance: rows.length ? Math.round((met / rows.length) * 1000) / 10 : 100,
      categoriesHandled,
      resolutionTrend: [...trendMap.entries()].map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date)),
    };
  },
};
