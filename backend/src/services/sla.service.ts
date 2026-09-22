import type { Prisma } from "@prisma/client";
import type { AuthUser } from "../types/express.d.ts";
import { prisma } from "../config/prisma.js";

export type SlaPolicyMatch = {
  id: string;
  responseTimeMinutes: number;
  resolutionTimeMinutes: number;
  escalationThresholdMinutes: number;
  approachingPercent: number;
};

export function pickSlaPolicy(
  policies: Array<SlaPolicyMatch & { priorityCode: string; categoryId: string | null; regionId: string | null }>,
  input: { priority: string; categoryId: string | null; regionId: string | null },
): SlaPolicyMatch | null {
  const scored = policies
    .filter((p) => p.priorityCode === input.priority)
    .map((p) => {
      if (p.categoryId && p.categoryId !== input.categoryId) return null;
      if (p.regionId && p.regionId !== input.regionId) return null;
      let score = 0;
      if (p.categoryId) score += 2;
      if (p.regionId) score += 1;
      return { policy: p, score };
    })
    .filter((x): x is { policy: SlaPolicyMatch & { priorityCode: string; categoryId: string | null; regionId: string | null }; score: number } => x !== null)
    .sort((a, b) => b.score - a.score);
  return scored[0]?.policy ?? null;
}

export const slaService = {
  async applyToComplaint(
    tx: Prisma.TransactionClient,
    complaint: { id: string; priority: string; categoryId: string | null; regionId: string; createdAt: Date },
  ) {
    const policies = await tx.sLAPolicy.findMany({ where: { isActive: true } });
    const match = pickSlaPolicy(policies, {
      priority: complaint.priority,
      categoryId: complaint.categoryId,
      regionId: complaint.regionId,
    });
    if (!match) return null;
    const responseDueAt = new Date(complaint.createdAt.getTime() + match.responseTimeMinutes * 60_000);
    const resolutionDueAt = new Date(complaint.createdAt.getTime() + match.resolutionTimeMinutes * 60_000);
    await tx.sLARecord.create({
      data: {
        complaintId: complaint.id,
        slaPolicyId: match.id,
        responseDueAt,
        resolutionDueAt,
      },
    });
    await tx.complaint.update({
      where: { id: complaint.id },
      data: { slaDueAt: resolutionDueAt, slaStatus: "ON_TRACK" },
    });
    return { responseDueAt, resolutionDueAt, policyId: match.id };
  },

  evaluate(record: {
    createdAt: Date;
    slaDueAt: Date | null;
    resolvedAt: Date | null;
    approachingPercent: number;
  }, now = new Date()) {
    if (!record.slaDueAt) return "ON_TRACK" as const;
    if (record.resolvedAt) {
      return record.resolvedAt <= record.slaDueAt ? ("MET" as const) : ("BREACHED" as const);
    }
    if (now >= record.slaDueAt) return "OVERDUE" as const;
    const windowMs = record.slaDueAt.getTime() - record.createdAt.getTime();
    const elapsed = now.getTime() - record.createdAt.getTime();
    if (windowMs > 0 && elapsed / windowMs >= record.approachingPercent / 100) return "APPROACHING" as const;
    return "ON_TRACK" as const;
  },

  async monitor(now = new Date()) {
    const open = await prisma.complaint.findMany({
      where: { status: { notIn: ["CLOSED"] }, slaDueAt: { not: null } },
      include: {
        slaRecords: { include: { slaPolicy: true }, orderBy: { createdAt: "desc" }, take: 1 },
        assignedAgent: true,
        region: true,
      },
    });
    let approaching = 0;
    let overdue = 0;
    for (const complaint of open) {
      const record = complaint.slaRecords[0];
      const percent = record?.slaPolicy.approachingPercent ?? 80;
      const status = this.evaluate(
        { createdAt: complaint.createdAt, slaDueAt: complaint.slaDueAt, resolvedAt: complaint.resolvedAt, approachingPercent: percent },
        now,
      );
      if (status === complaint.slaStatus) continue;
      if (status === "APPROACHING" || status === "OVERDUE" || status === "ON_TRACK") {
        await prisma.complaint.update({ where: { id: complaint.id }, data: { slaStatus: status } });
      }
      if (status === "APPROACHING" && record && !record.approachingNotifiedAt) {
        approaching += 1;
        await prisma.sLARecord.update({
          where: { id: record.id },
          data: { approachingNotifiedAt: now },
        });
        await notifySla(complaint, "SLA_APPROACHING", "SLA approaching", `Complaint ${complaint.complaintNumber} is approaching its resolution SLA.`);
      }
      if (status === "OVERDUE") {
        overdue += 1;
        if (record && !record.breachedNotifiedAt) {
          await prisma.sLARecord.update({
            where: { id: record.id },
            data: { resolutionBreached: true, breachedNotifiedAt: now },
          });
          await notifySla(complaint, "SLA_BREACHED", "SLA breached", `Complaint ${complaint.complaintNumber} has exceeded its resolution SLA.`);
          const existing = await prisma.escalation.findFirst({
            where: { complaintId: complaint.id, type: "SLA", status: { in: ["OPEN", "IN_PROGRESS"] } },
          });
          if (!existing) {
            await prisma.escalation.create({
              data: {
                complaintId: complaint.id,
                reason: "Automatic SLA threshold breach",
                priority: complaint.priority,
                type: "SLA",
                status: "OPEN",
              },
            });
            await prisma.complaintStatusHistory.create({
              data: {
                complaintId: complaint.id,
                actionType: "SLA_ESCALATION",
                previousStatus: complaint.status,
                newStatus: "ESCALATED",
                notes: "Automatic SLA escalation",
              },
            });
            if (complaint.status !== "RESOLVED" && complaint.status !== "CLOSED") {
              await prisma.complaint.update({
                where: { id: complaint.id },
                data: { status: "ESCALATED", slaStatus: "OVERDUE" },
              });
            }
          }
        }
      }
    }
    return { scanned: open.length, approaching, overdue };
  },
};

async function notifySla(
  complaint: { id: string; assignedAgentId: string | null; regionId: string; complaintNumber: string },
  type: string,
  title: string,
  message: string,
) {
  const recipients = new Set<string>();
  if (complaint.assignedAgentId) recipients.add(complaint.assignedAgentId);
  const managers = await prisma.user.findMany({
    where: {
      isActive: true,
      role: { code: { in: ["OPERATIONS_MANAGER", "REGIONAL_MANAGER"] } },
      OR: [{ regionId: null }, { regionId: complaint.regionId }],
    },
    select: { id: true },
  });
  managers.forEach((m) => recipients.add(m.id));
  if (recipients.size === 0) return;
  await prisma.notification.createMany({
    data: [...recipients].map((userId) => ({
      userId,
      type,
      title,
      message,
      entityType: "Complaint",
      entityId: complaint.id,
    })),
  });
}

export function assertSlaAccess(_user: AuthUser) {
  return true;
}
