import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import type { AuthUser } from "../types/express.d.ts";
import { scopedWhere } from "../repositories/complaint.repo.js";
import { ApiError } from "../utils/ApiError.js";
import type { DashFilters } from "./dashboard.service.js";

function rangeWhere(user: AuthUser, filters: DashFilters): Prisma.ComplaintWhereInput {
  if (user.role === "CUSTOMER") throw ApiError.forbidden();
  const extra: Prisma.ComplaintWhereInput = {};
  if (filters.from || filters.to) {
    extra.createdAt = {};
    if (filters.from) extra.createdAt.gte = filters.from;
    if (filters.to) extra.createdAt.lte = filters.to;
  }
  if (filters.regionId) extra.regionId = filters.regionId;
  if (filters.channelId) extra.channelId = filters.channelId;
  if (filters.categoryId) extra.categoryId = filters.categoryId;
  return scopedWhere(user, extra);
}

function previousPeriod(filters: DashFilters): DashFilters {
  if (!filters.from || !filters.to) return filters;
  const span = filters.to.getTime() - filters.from.getTime();
  return { ...filters, from: new Date(filters.from.getTime() - span), to: filters.from };
}

export const analyticsService = {
  async recurringIssues(user: AuthUser, filters: DashFilters) {
    const to = filters.to ?? new Date();
    const from = filters.from ?? new Date(to.getTime() - 30 * 24 * 3_600_000);
    const currentWhere = rangeWhere(user, { ...filters, from, to });
    const prevWhere = rangeWhere(user, previousPeriod({ ...filters, from, to }));
    const [current, previous] = await Promise.all([
      prisma.complaint.groupBy({ by: ["categoryId"], where: currentWhere, _count: { _all: true } }),
      prisma.complaint.groupBy({ by: ["categoryId"], where: prevWhere, _count: { _all: true } }),
    ]);
    const cats = await prisma.complaintCategory.findMany();
    const catMap = new Map(cats.map((c) => [c.id, c]));
    const prevMap = new Map(previous.map((p) => [p.categoryId, p._count._all]));

    const items = current
      .map((row) => {
        const prev = prevMap.get(row.categoryId) ?? 0;
        const delta = prev === 0 ? (row._count._all > 0 ? 100 : 0) : ((row._count._all - prev) / prev) * 100;
        return {
          categoryId: row.categoryId,
          categoryName: catMap.get(row.categoryId ?? "")?.name ?? "Uncategorised",
          count: row._count._all,
          previousCount: prev,
          changePercent: Math.round(delta * 10) / 10,
          wording: "Potential recurring pattern detected",
        };
      })
      .sort((a, b) => b.count - a.count);

    const focusId = filters.categoryId ?? items[0]?.categoryId;
    const focusCategory = items.find((i) => i.categoryId === focusId) ?? items[0];

    async function breakdown(categoryId: string | null | undefined) {
      if (!categoryId) return { channels: [], regions: [], stores: [] };
      const catWhere = { ...currentWhere, categoryId };
      const [ch, rg, st] = await Promise.all([
        prisma.complaint.groupBy({ by: ["channelId"], where: catWhere, _count: { _all: true } }),
        prisma.complaint.groupBy({ by: ["regionId"], where: catWhere, _count: { _all: true } }),
        prisma.complaint.groupBy({
          by: ["storeId"],
          where: { ...catWhere, storeId: { not: null } },
          _count: { _all: true },
        }),
      ]);
      const channels = await prisma.complaintChannel.findMany();
      const regions = await prisma.region.findMany();
      const stores = await prisma.store.findMany();
      const cmap = new Map(channels.map((c) => [c.id, c.name]));
      const rmap = new Map(regions.map((r) => [r.id, r.name]));
      const smap = new Map(stores.map((s) => [s.id, s.name]));
      const chTotal = ch.reduce((s, x) => s + x._count._all, 0) || 1;
      const rgTotal = rg.reduce((s, x) => s + x._count._all, 0) || 1;
      return {
        channels: ch
          .map((x) => ({ name: cmap.get(x.channelId) ?? "Unknown", count: x._count._all, percentage: Math.round((x._count._all / chTotal) * 1000) / 10 }))
          .sort((a, b) => b.count - a.count),
        regions: rg
          .map((x) => ({ name: rmap.get(x.regionId) ?? "Unknown", count: x._count._all, percentage: Math.round((x._count._all / rgTotal) * 1000) / 10 }))
          .sort((a, b) => b.count - a.count),
        stores: st
          .map((x) => ({ name: smap.get(x.storeId ?? "") ?? "Unknown", count: x._count._all }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 8),
      };
    }

    const detail = await breakdown(focusId);

    return {
      items,
      selectedCategory: focusCategory?.categoryName ?? null,
      affectedRegions: detail.regions,
      affectedStores: detail.stores,
      affectedChannels: detail.channels,
      note: "Potential recurring pattern detected. Figures show volume correlation only. Root cause is not confirmed until a human review.",
    };
  },

  async categories(user: AuthUser, filters: DashFilters) {
    return this.recurringIssues(user, filters);
  },

  async regions(user: AuthUser, filters: DashFilters) {
    const where = rangeWhere(user, filters);
    const grouped = await prisma.complaint.groupBy({ by: ["regionId"], where, _count: { _all: true } });
    const regions = await prisma.region.findMany();
    const map = new Map(regions.map((r) => [r.id, r]));
    return grouped.map((g) => ({
      regionId: g.regionId,
      name: map.get(g.regionId)?.name ?? "Unknown",
      count: g._count._all,
    }));
  },

  async stores(user: AuthUser, filters: DashFilters) {
    const where = rangeWhere(user, filters);
    const grouped = await prisma.complaint.groupBy({
      by: ["storeId"],
      where: { ...where, storeId: { not: null } },
      _count: { _all: true },
    });
    const stores = await prisma.store.findMany({ include: { region: true } });
    const map = new Map(stores.map((s) => [s.id, s]));
    return grouped
      .map((g) => {
        const store = map.get(g.storeId ?? "");
        return {
          storeId: g.storeId,
          name: store?.name ?? "Unknown",
          region: store?.region.name ?? null,
          count: g._count._all,
        };
      })
      .sort((a, b) => b.count - a.count);
  },

  async employees(user: AuthUser) {
    if (user.role === "CUSTOMER" || user.role === "AGENT") throw ApiError.forbidden();
    const regionFilter = user.role === "REGIONAL_MANAGER" ? { regionId: user.regionId } : {};
    const agents = await prisma.user.findMany({
      where: { isActive: true, role: { code: "AGENT" }, ...regionFilter },
      select: { id: true, name: true, email: true, region: { select: { name: true } } },
      orderBy: { name: "asc" },
    });
    const rows = await Promise.all(
      agents.map(async (agent) => {
        const where = { assignedAgentId: agent.id };
        const [assigned, inProgress, pending, resolved, overdue, met, closed] = await Promise.all([
          prisma.complaint.count({ where }),
          prisma.complaint.count({ where: { ...where, status: "IN_PROGRESS" } }),
          prisma.complaint.count({ where: { ...where, status: { in: ["ASSIGNED", "PENDING", "ESCALATED"] } } }),
          prisma.complaint.count({ where: { ...where, status: { in: ["RESOLVED", "CLOSED"] } } }),
          prisma.complaint.count({ where: { ...where, slaStatus: "OVERDUE" } }),
          prisma.complaint.count({ where: { ...where, slaStatus: "MET" } }),
          prisma.complaint.count({ where: { ...where, slaStatus: { in: ["MET", "BREACHED"] } } }),
        ]);
        return {
          id: agent.id,
          name: agent.name,
          email: agent.email,
          region: agent.region?.name ?? "—",
          assigned,
          inProgress,
          pending,
          resolved,
          overdue,
          slaPercent: closed === 0 ? 100 : Math.round((met / closed) * 1000) / 10,
        };
      }),
    );
    return rows;
  },

  async auditLogs() {
    return prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { actor: { select: { id: true, name: true, email: true } } },
    });
  },
};
