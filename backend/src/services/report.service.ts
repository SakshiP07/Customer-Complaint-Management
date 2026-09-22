import { prisma } from "../config/prisma.js";
import type { AuthUser } from "../types/express.d.ts";
import { scopedWhere } from "../repositories/complaint.repo.js";
import { dashboardService, type DashFilters } from "./dashboard.service.js";
import { analyticsService } from "./analytics.service.js";
import { ApiError } from "../utils/ApiError.js";

function csvEscape(value: unknown) {
  const s = String(value ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(headers: string[], rows: Array<Array<unknown>>) {
  return [headers.join(","), ...rows.map((r) => r.map(csvEscape).join(","))].join("\n");
}

export const reportService = {
  async generate(user: AuthUser, type: "daily" | "weekly" | "monthly", filters: DashFilters) {
    if (["CUSTOMER", "AGENT"].includes(user.role)) throw ApiError.forbidden();
    const now = filters.to ?? new Date();
    const from =
      filters.from ??
      (type === "daily"
        ? new Date(now.getTime() - 24 * 3600_000)
        : type === "weekly"
          ? new Date(now.getTime() - 7 * 24 * 3600_000)
          : new Date(now.getTime() - 30 * 24 * 3600_000));
    const f = { ...filters, from, to: now };
    const where = scopedWhere(user, {
      createdAt: { gte: from, lte: now },
      ...(f.regionId ? { regionId: f.regionId } : {}),
    });

    const [summary, byCategory, byChannel, byRegion, recurring, critical, overdue] = await Promise.all([
      dashboardService.summary(user, f),
      dashboardService.byCategory(user, f),
      dashboardService.byChannel(user, f),
      dashboardService.byRegion(user, f),
      analyticsService.recurringIssues(user, f),
      prisma.complaint.count({ where: { ...where, priority: "CRITICAL" } }),
      prisma.complaint.count({ where: { ...where, slaStatus: "OVERDUE" } }),
    ]);

    return {
      type,
      period: { from, to: now },
      summary: { ...summary, critical, overdue },
      byCategory,
      byChannel,
      byRegion,
      recurringIssues: recurring.items.slice(0, 8),
    };
  },

  async csv(user: AuthUser, type: "daily" | "weekly" | "monthly", filters: DashFilters) {
    const report = await this.generate(user, type, filters);
    const rows = [
      ["Metric", "Value"],
      ["Total", report.summary.total],
      ["New", report.summary.newComplaints],
      ["Pending", report.summary.pending],
      ["Overdue", report.summary.overdue],
      ["Resolved", report.summary.resolved],
      ["Critical", report.summary.critical],
      ["SLA compliance %", report.summary.slaCompliance],
      ["Avg resolution hours", report.summary.averageResolutionHours],
      [],
      ["Category", "Count"],
      ...report.byCategory.map((c) => [c.name, c.count]),
      [],
      ["Channel", "Count"],
      ...report.byChannel.map((c) => [c.name, c.count]),
    ];
    return toCsv(
      ["field_a", "field_b"],
      rows as Array<Array<unknown>>,
    );
  },
};
