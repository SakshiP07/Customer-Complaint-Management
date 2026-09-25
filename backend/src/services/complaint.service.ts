import { Prisma, type ComplaintStatus } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { ApiError } from "../utils/ApiError.js";
import { sanitizeString } from "../utils/sanitize.js";
import { writeAudit } from "../middleware/audit.js";
import type { AuthUser } from "../types/express.d.ts";
import { buildListWhere, complaintRepo, scopedWhere, type ComplaintFilters } from "../repositories/complaint.repo.js";
import { assertTransition, statusAfterAssignment } from "./complaintLifecycle.js";
import { slaService } from "./sla.service.js";
import { notificationService } from "./notification.service.js";
import { storageService } from "../integrations/storage/storage.service.js";
import { getChannelAdapter } from "../integrations/channels/adapters.js";
import { sendEmail } from "../utils/mailer.js";

const STAFF_ROLES = ["AGENT", "OPERATIONS_MANAGER", "REGIONAL_MANAGER", "ADMIN", "SUPER_ADMIN"];
const ASSIGN_ROLES = ["OPERATIONS_MANAGER", "REGIONAL_MANAGER", "ADMIN", "SUPER_ADMIN"];
const MANAGER_ROLES = ["OPERATIONS_MANAGER", "REGIONAL_MANAGER", "ADMIN", "SUPER_ADMIN"];

async function ensureConversationMessage(
  complaintId: string,
  data: {
    senderType: "CUSTOMER" | "EMPLOYEE" | "SYSTEM" | "AI";
    authorId?: string | null;
    authorName?: string | null;
    body: string;
    deliveryStatus: "PREPARED" | "DEMO_SENT" | "SENT" | "FAILED";
    channelCode?: string | null;
  },
) {
  const conversation = await prisma.conversation.upsert({
    where: { complaintId },
    create: { complaintId },
    update: {},
  });
  return prisma.conversationMessage.create({
    data: {
      conversationId: conversation.id,
      senderType: data.senderType,
      authorId: data.authorId ?? null,
      authorName: data.authorName ?? null,
      body: data.body,
      deliveryStatus: data.deliveryStatus,
      channelCode: data.channelCode ?? null,
    },
  });
}

async function getScopedComplaint(user: AuthUser, id: string) {
  const complaint = await prisma.complaint.findFirst({
    where: scopedWhere(user, { id }, "read"),
    include: {
      ...complaintRepo.include,
      history: { orderBy: { createdAt: "asc" }, include: { changedBy: { select: { id: true, name: true } } } },
      comments: { orderBy: { createdAt: "asc" }, include: { author: { select: { id: true, name: true } } } },
      attachments: { orderBy: { createdAt: "asc" } },
      assignments: {
        orderBy: { createdAt: "asc" },
        include: {
          assignedTo: { select: { id: true, name: true } },
          assignedBy: { select: { id: true, name: true } },
        },
      },
      slaRecords: { orderBy: { createdAt: "desc" }, include: { slaPolicy: true } },
      escalations: {
        orderBy: { createdAt: "desc" },
        include: {
          escalatedBy: { select: { id: true, name: true } },
          escalatedTo: { select: { id: true, name: true } },
        },
      },
      aiAnalyses: { orderBy: { createdAt: "desc" }, take: 5 },
      conversation: { include: { messages: { orderBy: { createdAt: "asc" } } } },
    },
  });
  if (!complaint) throw ApiError.notFound("Complaint not found");
  if (user.role === "CUSTOMER") {
    return {
      ...complaint,
      comments: complaint.comments.filter((c) => c.visibility === "CUSTOMER"),
      aiAnalyses: [],
      conversation: complaint.conversation
        ? {
            ...complaint.conversation,
            messages: complaint.conversation.messages.filter(
              (m) =>
                (m.senderType === "CUSTOMER" || m.senderType === "EMPLOYEE" || m.senderType === "SYSTEM") &&
                m.deliveryStatus !== "PREPARED",
            ),
          }
        : null,
    };
  }
  return complaint;
}

async function history(
  tx: Prisma.TransactionClient,
  data: {
    complaintId: string;
    changedById?: string | null;
    actionType: string;
    previousStatus?: string | null;
    newStatus?: string | null;
    previousPriority?: string | null;
    newPriority?: string | null;
    previousAssigneeId?: string | null;
    newAssigneeId?: string | null;
    notes?: string | null;
  },
) {
  await tx.complaintStatusHistory.create({ data });
}

export const complaintService = {
  async createFromWebsite(
    input: {
      name: string;
      email: string;
      phone?: string | null;
      regionId: string;
      storeId?: string | null;
      categoryId: string;
      description: string;
      subject?: string | null;
      preferredContactMethod?: string;
    },
    actor: AuthUser | null,
    ip?: string | null,
  ) {
    const adapter = getChannelAdapter("WEBSITE");
    if (!adapter?.live) throw ApiError.unsupported("Website channel is unavailable");
    const normalised = await adapter.ingest(input);
    const [region, category, channel] = await Promise.all([
      prisma.region.findFirst({ where: { id: input.regionId, isActive: true } }),
      prisma.complaintCategory.findFirst({ where: { id: input.categoryId, isActive: true } }),
      prisma.complaintChannel.findFirst({ where: { code: "WEBSITE", isActive: true } }),
    ]);
    if (!region) throw ApiError.validation("Region is invalid");
    if (!category) throw ApiError.validation("Category is invalid");
    if (!channel) throw ApiError.unprocessable("WEBSITE channel is not configured");
    if (input.storeId) {
      const store = await prisma.store.findFirst({ where: { id: input.storeId, regionId: region.id, isActive: true } });
      if (!store) throw ApiError.validation("Store does not belong to the selected region");
    }

    const email = normalised.email.toLowerCase();
    const complaint = await prisma.$transaction(async (tx) => {
      let profile = actor
        ? await tx.customerProfile.findUnique({ where: { userId: actor.id } })
        : await tx.customerProfile.findFirst({ where: { email } });
      if (actor && !profile) {
        profile = await tx.customerProfile.create({
          data: {
            userId: actor.id,
            name: actor.name,
            email: actor.email,
            phone: input.phone || null,
            preferredContactMethod: input.preferredContactMethod ?? "EMAIL",
          },
        });
      }
      if (!profile) {
        profile = await tx.customerProfile.create({
          data: {
            name: sanitizeString(input.name),
            email,
            phone: input.phone || null,
            preferredContactMethod: input.preferredContactMethod ?? "EMAIL",
          },
        });
      }
      const year = new Date().getFullYear();
      const complaintNumber = await complaintRepo.nextNumber(tx, year);
      const created = await tx.complaint.create({
        data: {
          complaintNumber,
          customerId: profile.id,
          channelId: channel.id,
          categoryId: category.id,
          priority: "MEDIUM",
          status: "CATEGORISED",
          subject: input.subject || category.name,
          description: sanitizeString(input.description),
          regionId: region.id,
          storeId: input.storeId || null,
        },
      });
      await history(tx, {
        complaintId: created.id,
        changedById: actor?.id,
        actionType: "CREATED",
        newStatus: "CATEGORISED",
        notes: "Complaint submitted via website",
      });
      await slaService.applyToComplaint(tx, {
        id: created.id,
        priority: created.priority,
        categoryId: created.categoryId,
        regionId: created.regionId,
        createdAt: created.createdAt,
      });
      await tx.conversation.create({
        data: {
          complaintId: created.id,
          messages: {
            create: {
              senderType: "CUSTOMER",
              authorName: input.name,
              body: sanitizeString(input.description),
              deliveryStatus: "SENT",
              channelCode: "WEBSITE",
            },
          },
        },
      });
      return tx.complaint.findUniqueOrThrow({
        where: { id: created.id },
        include: complaintRepo.include,
      });
    });

    await writeAudit({
      actor,
      action: "COMPLAINT_CREATE",
      entity: "Complaint",
      entityId: complaint.id,
      metadata: { complaintNumber: complaint.complaintNumber, channel: "WEBSITE" },
      ipAddress: ip,
    });

    // Notify agents and managers about new complaint
    const agents = await prisma.user.findMany({
      where: {
        role: { code: { in: ["AGENT", "OPERATIONS_MANAGER", "REGIONAL_MANAGER"] } },
        isActive: true,
      },
      select: { id: true },
    });
    if (agents.length > 0) {
      await notificationService.dispatchMany(
        agents.map((a) => a.id),
        {
          type: "NEW_COMPLAINT",
          title: "New complaint received",
          message: `Complaint #${complaint.complaintNumber} has been submitted`,
          entityType: "Complaint",
          entityId: complaint.id,
        },
      );
    }

    return complaint;
  },

  async track(complaintNumber: string, email: string) {
    const complaint = await prisma.complaint.findFirst({
      where: {
        complaintNumber: complaintNumber.toUpperCase(),
        customer: { email: email.toLowerCase() },
      },
      include: {
        ...complaintRepo.include,
        comments: { where: { visibility: "CUSTOMER" }, orderBy: { createdAt: "asc" } },
        history: { orderBy: { createdAt: "asc" } },
        slaRecords: { orderBy: { createdAt: "desc" }, take: 1 },
        conversation: {
          include: {
            messages: {
              where: {
                OR: [
                  { senderType: "CUSTOMER" },
                  { senderType: "EMPLOYEE", deliveryStatus: { in: ["SENT", "DEMO_SENT"] } },
                ],
              },
              orderBy: { createdAt: "asc" },
            },
          },
        },
      },
    });
    if (!complaint) throw ApiError.notFound("No complaint matched that number and email");
    return complaint;
  },

  async list(user: AuthUser, filters: ComplaintFilters, page: number, pageSize: number, sort = "createdAt", order: "asc" | "desc" = "desc") {
    const where = buildListWhere(user, filters);
    const [total, items] = await prisma.$transaction([
      prisma.complaint.count({ where }),
      prisma.complaint.findMany({
        where,
        include: complaintRepo.include,
        orderBy: { [sort]: order } as Prisma.ComplaintOrderByWithRelationInput,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  },

  async getById(user: AuthUser, id: string) {
    return getScopedComplaint(user, id);
  },

  async patch(
    user: AuthUser,
    id: string,
    input: { categoryId?: string; priority?: string; description?: string; additionalInformation?: string },
    ip?: string | null,
  ) {
    const current = await getScopedComplaint(user, id);
    if (user.role === "CUSTOMER") {
      if (current.customer.userId !== user.id) throw ApiError.forbidden();
      if (!input.additionalInformation && !input.description) {
        throw ApiError.forbidden("Customers may only add additional information");
      }
    }
    const data: Prisma.ComplaintUpdateInput = {};
    if (input.categoryId && STAFF_ROLES.includes(user.role)) {
      data.category = { connect: { id: input.categoryId } };
      if (current.status === "NEW") data.status = "CATEGORISED";
    }
    if (input.priority && STAFF_ROLES.includes(user.role)) {
      data.priority = input.priority;
    }
    if (input.description && (user.role === "CUSTOMER" || STAFF_ROLES.includes(user.role))) {
      data.description = sanitizeString(
        input.additionalInformation
          ? `${current.description}\n\nAdditional information (${new Date().toISOString()}):\n${input.additionalInformation}`
          : input.description,
      );
    } else if (input.additionalInformation) {
      data.description = `${current.description}\n\nAdditional information (${new Date().toISOString()}):\n${sanitizeString(input.additionalInformation)}`;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.complaint.update({ where: { id }, data });
      if (input.priority && input.priority !== current.priority) {
        await history(tx, {
          complaintId: id,
          changedById: user.id,
          actionType: "PRIORITY_CHANGE",
          previousPriority: current.priority,
          newPriority: input.priority,
        });
        await slaService.applyToComplaint(tx, {
          id,
          priority: input.priority,
          categoryId: next.categoryId,
          regionId: next.regionId,
          createdAt: current.createdAt,
        });
      }
      if (input.categoryId && input.categoryId !== current.categoryId) {
        await history(tx, {
          complaintId: id,
          changedById: user.id,
          actionType: "CATEGORY_CHANGE",
          previousStatus: current.status,
          newStatus: next.status,
          notes: "Category updated",
        });
      }
      if (input.additionalInformation) {
        await history(tx, {
          complaintId: id,
          changedById: user.id,
          actionType: "CUSTOMER_UPDATE",
          notes: "Additional information added",
        });
      }
      return next;
    });
    if (input.priority && input.priority !== current.priority) {
      await writeAudit({ actor: user, action: "PRIORITY_CHANGE", entity: "Complaint", entityId: id, ipAddress: ip });
    }
    return this.getById(user, updated.id);
  },

  async assign(user: AuthUser, id: string, agentId: string, reason?: string, ip?: string | null) {
    if (!ASSIGN_ROLES.includes(user.role)) {
      throw ApiError.forbidden("Only managers and admins can assign complaints");
    }
    const complaint = await getScopedComplaint(user, id);
    const agent = await prisma.user.findFirst({
      where: { id: agentId, isActive: true, role: { code: "AGENT" } },
    });
    if (!agent) throw ApiError.validation("Assignee must be an active agent");
    if (user.role === "REGIONAL_MANAGER" && agent.regionId !== user.regionId) {
      throw ApiError.forbidden("You can only assign agents in your region");
    }
    const nextStatus = statusAfterAssignment(complaint.status);
    if (nextStatus !== complaint.status) {
      assertTransition(complaint.status, nextStatus, user.role);
    }
    await prisma.$transaction(async (tx) => {
      await tx.complaint.update({
        where: { id },
        data: { assignedAgentId: agentId, status: nextStatus },
      });
      await tx.complaintAssignment.create({
        data: { complaintId: id, assignedToId: agentId, assignedById: user.id, reason },
      });
      await history(tx, {
        complaintId: id,
        changedById: user.id,
        actionType: complaint.assignedAgentId ? "REASSIGNED" : "ASSIGNED",
        previousStatus: complaint.status,
        newStatus: nextStatus,
        previousAssigneeId: complaint.assignedAgentId,
        newAssigneeId: agentId,
        notes: reason,
      });
    });
    await notificationService.dispatch({
      userId: agentId,
      type: complaint.assignedAgentId ? "COMPLAINT_REASSIGNED" : "COMPLAINT_ASSIGNED",
      title: complaint.assignedAgentId ? "Complaint reassigned" : "Complaint assigned",
      message: `${complaint.complaintNumber} has been assigned to you.`,
      entityType: "Complaint",
      entityId: id,
    });
    await writeAudit({
      actor: user,
      action: complaint.assignedAgentId ? "REASSIGN" : "ASSIGN",
      entity: "Complaint",
      entityId: id,
      metadata: { agentId },
      ipAddress: ip,
    });
    return this.getById(user, id);
  },

  async changeStatus(user: AuthUser, id: string, status: ComplaintStatus, notes?: string, ip?: string | null) {
    const complaint = await getScopedComplaint(user, id);
    if (user.role === "CUSTOMER") throw ApiError.forbidden();
    if (status === "REOPENED") {
      return this.reopen(user, id, notes || "Reopened", ip);
    }
    assertTransition(complaint.status, status, user.role);
    if (status === "RESOLVED") throw ApiError.validation("Use the resolve endpoint with a resolution note");
    if (status === "CLOSED" && !MANAGER_ROLES.includes(user.role) && user.role !== "AGENT") {
      throw ApiError.forbidden();
    }
    const data: Prisma.ComplaintUpdateInput = { status };
    if (status === "IN_PROGRESS" && !complaint.firstResponseAt) data.firstResponseAt = new Date();
    if (status === "CLOSED") data.closedAt = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.complaint.update({ where: { id }, data });
      await history(tx, {
        complaintId: id,
        changedById: user.id,
        actionType: "STATUS_CHANGE",
        previousStatus: complaint.status,
        newStatus: status,
        notes,
      });
      if (status === "IN_PROGRESS" && !complaint.firstResponseAt) {
        const record = await tx.sLARecord.findFirst({ where: { complaintId: id }, orderBy: { createdAt: "desc" } });
        if (record) {
          await tx.sLARecord.update({
            where: { id: record.id },
            data: { firstRespondedAt: new Date(), responseBreached: new Date() > record.responseDueAt },
          });
        }
      }
    });
    
    // Notify customer about status changes
    const customerUserId = complaint.customer.userId;
    if (customerUserId && status === "IN_PROGRESS") {
      await notificationService.dispatch({
        userId: customerUserId,
        type: "COMPLAINT_IN_PROGRESS",
        title: "We're looking into your complaint",
        message: `${complaint.complaintNumber} is now being reviewed by our team.`,
        entityType: "Complaint",
        entityId: id,
      });
    }
    
    await writeAudit({ actor: user, action: "STATUS_CHANGE", entity: "Complaint", entityId: id, metadata: { status }, ipAddress: ip });
    return this.getById(user, id);
  },

  async resolve(user: AuthUser, id: string, resolution: string, ip?: string | null) {
    const complaint = await getScopedComplaint(user, id);
    if (user.role === "CUSTOMER") throw ApiError.forbidden();
    assertTransition(complaint.status, "RESOLVED", user.role);
    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.complaint.update({
        where: { id },
        data: { status: "RESOLVED", resolution: sanitizeString(resolution), resolvedAt: now, slaStatus: complaint.slaDueAt && now > complaint.slaDueAt ? "BREACHED" : "MET" },
      });
      await history(tx, {
        complaintId: id,
        changedById: user.id,
        actionType: "RESOLVED",
        previousStatus: complaint.status,
        newStatus: "RESOLVED",
        notes: resolution,
      });
      const record = await tx.sLARecord.findFirst({ where: { complaintId: id }, orderBy: { createdAt: "desc" } });
      if (record) {
        await tx.sLARecord.update({
          where: { id: record.id },
          data: { resolvedAt: now, resolutionBreached: now > record.resolutionDueAt },
        });
      }
      await tx.escalation.updateMany({
        where: { complaintId: id, status: { in: ["OPEN", "IN_PROGRESS"] } },
        data: { status: "RESOLVED", resolvedAt: now },
      });
    });
    const customerUserId = complaint.customer.userId;
    if (customerUserId) {
      await notificationService.dispatch({
        userId: customerUserId,
        type: "COMPLAINT_RESOLVED",
        title: "Complaint resolved",
        message: `${complaint.complaintNumber} has been marked resolved.`,
        entityType: "Complaint",
        entityId: id,
      });
    }
    if (complaint.channel.code === "EMAIL" && complaint.customer.email) {
      await sendEmail(
        complaint.customer.email,
        `Re: Complaint ${complaint.complaintNumber} Resolved`,
        `Your complaint ${complaint.complaintNumber} has been resolved.\n\nResolution details:\n${resolution}\n\nThank you,\nCustomer Support Team`
      );
    }
    await writeAudit({ actor: user, action: "RESOLVE", entity: "Complaint", entityId: id, ipAddress: ip });
    return this.getById(user, id);
  },

  async close(user: AuthUser, id: string, closureReason: string, ip?: string | null) {
    const complaint = await getScopedComplaint(user, id);
    if (user.role === "CUSTOMER") throw ApiError.forbidden();
    assertTransition(complaint.status, "CLOSED", user.role);
    await prisma.$transaction(async (tx) => {
      await tx.complaint.update({
        where: { id },
        data: { status: "CLOSED", closureReason: sanitizeString(closureReason), closedAt: new Date() },
      });
      await history(tx, {
        complaintId: id,
        changedById: user.id,
        actionType: "CLOSED",
        previousStatus: complaint.status,
        newStatus: "CLOSED",
        notes: closureReason,
      });
    });
    await writeAudit({ actor: user, action: "CLOSE", entity: "Complaint", entityId: id, ipAddress: ip });
    return this.getById(user, id);
  },

  async reopen(user: AuthUser, id: string, reason: string, ip?: string | null) {
    if (!MANAGER_ROLES.includes(user.role)) throw ApiError.forbidden();
    const complaint = await getScopedComplaint(user, id);
    assertTransition(complaint.status, "REOPENED", user.role);
    await prisma.$transaction(async (tx) => {
      await tx.complaint.update({
        where: { id },
        data: { status: "REOPENED", reopenReason: sanitizeString(reason), closedAt: null, resolvedAt: null, slaStatus: "ON_TRACK" },
      });
      await history(tx, {
        complaintId: id,
        changedById: user.id,
        actionType: "REOPENED",
        previousStatus: complaint.status,
        newStatus: "REOPENED",
        notes: reason,
      });
    });
    await writeAudit({ actor: user, action: "REOPEN", entity: "Complaint", entityId: id, ipAddress: ip });
    return this.getById(user, id);
  },

  async escalate(user: AuthUser, id: string, input: { reason: string; escalatedToId?: string; type?: "AGENT" | "MANAGER" }, ip?: string | null) {
    const complaint = await getScopedComplaint(user, id);
    if (user.role === "CUSTOMER") throw ApiError.forbidden();
    assertTransition(complaint.status, "ESCALATED", user.role);
    let targetId = input.escalatedToId ?? null;
    if (!targetId) {
      const manager = await prisma.user.findFirst({
        where: {
          isActive: true,
          role: { code: user.role === "AGENT" ? "OPERATIONS_MANAGER" : "ADMIN" },
          OR: [{ regionId: null }, { regionId: complaint.regionId }],
        },
      });
      targetId = manager?.id ?? null;
    }
    await prisma.$transaction(async (tx) => {
      await tx.complaint.update({ where: { id }, data: { status: "ESCALATED" } });
      await tx.escalation.create({
        data: {
          complaintId: id,
          escalatedById: user.id,
          escalatedToId: targetId,
          reason: sanitizeString(input.reason),
          priority: complaint.priority,
          type: input.type ?? (user.role === "AGENT" ? "AGENT" : "MANAGER"),
        },
      });
      await history(tx, {
        complaintId: id,
        changedById: user.id,
        actionType: "ESCALATED",
        previousStatus: complaint.status,
        newStatus: "ESCALATED",
        notes: input.reason,
      });
    });
    if (targetId) {
      await notificationService.dispatch({
        userId: targetId,
        type: "COMPLAINT_ESCALATED",
        title: "Complaint escalated",
        message: `${complaint.complaintNumber} was escalated: ${input.reason}`,
        entityType: "Complaint",
        entityId: id,
      });
    }
    await writeAudit({ actor: user, action: "ESCALATE", entity: "Complaint", entityId: id, ipAddress: ip });
    return this.getById(user, id);
  },

  async addComment(user: AuthUser, id: string, comment: string, visibility: "CUSTOMER" | "INTERNAL", ip?: string | null) {
    const complaint = await getScopedComplaint(user, id);
    if (user.role === "CUSTOMER" && visibility !== "CUSTOMER") {
      throw ApiError.forbidden("Customers cannot create internal notes");
    }
    const created = await prisma.complaintComment.create({
      data: {
        complaintId: id,
        authorId: user.id,
        authorName: user.name,
        comment: sanitizeString(comment),
        visibility,
      },
    });
    if (visibility === "CUSTOMER") {
      await ensureConversationMessage(id, {
        senderType: user.role === "CUSTOMER" ? "CUSTOMER" : "EMPLOYEE",
        authorId: user.id,
        authorName: user.name,
        body: sanitizeString(comment),
        deliveryStatus: user.role === "CUSTOMER" ? "SENT" : "PREPARED",
        channelCode: complaint.channel.code,
      });
    }
    if (!complaint.firstResponseAt && user.role !== "CUSTOMER") {
      await prisma.complaint.update({ where: { id }, data: { firstResponseAt: new Date() } });
    }
    if (visibility === "CUSTOMER" && user.role !== "CUSTOMER" && complaint.customer.userId) {
      await notificationService.dispatch({
        userId: complaint.customer.userId,
        type: "CUSTOMER_COMMENT",
        title: "New update on your complaint",
        message: `${complaint.complaintNumber} has a new comment.`,
        entityType: "Complaint",
        entityId: id,
      });
    }
    if (visibility === "CUSTOMER" && user.role !== "CUSTOMER" && complaint.channel.code === "EMAIL" && complaint.customer.email) {
      await sendEmail(
        complaint.customer.email,
        `Re: Update on Complaint ${complaint.complaintNumber}`,
        `We have an update regarding your complaint ${complaint.complaintNumber}:\n\n${comment}\n\nThank you,\nCustomer Support Team`
      );
    }
    if (visibility === "CUSTOMER" && user.role === "CUSTOMER" && complaint.assignedAgentId) {
      await notificationService.dispatch({
        userId: complaint.assignedAgentId,
        type: "CUSTOMER_COMMENT",
        title: "Customer added a comment",
        message: `${complaint.complaintNumber}: customer comment added.`,
        entityType: "Complaint",
        entityId: id,
      });
    }
    await writeAudit({ actor: user, action: "COMMENT", entity: "Complaint", entityId: id, metadata: { visibility }, ipAddress: ip });
    return created;
  },

  async addMessage(user: AuthUser, id: string, body: string, delivery: "PREPARED" | "DEMO_SEND", ip?: string | null) {
    const complaint = await getScopedComplaint(user, id);
    if (user.role === "CUSTOMER") throw ApiError.forbidden();
    const liveChannel = complaint.channel.code === "WEBSITE" || complaint.channel.code === "EMAIL";
    const status = delivery === "DEMO_SEND" ? (liveChannel ? "SENT" : "DEMO_SENT") : "PREPARED";
    
    if (status === "SENT" && complaint.channel.code === "EMAIL" && complaint.customer.email) {
      // Extract original message ID from subject for threading
      const messageIdMatch = complaint.subject?.match(/\[(.*?)\]$/);
      const originalMessageId = messageIdMatch ? messageIdMatch[1] : undefined;
      const cleanSubject = complaint.subject ? complaint.subject.replace(/\s*\[.*?\]$/, '') : `Complaint ${complaint.complaintNumber}`;

      // Fire and forget so the API responds instantly
      sendEmail(
        complaint.customer.email,
        `Re: ${cleanSubject}`,
        body,
        undefined,
        originalMessageId
      ).catch(e => logger.error("Background email send failed", e));
    }
    const message = await ensureConversationMessage(id, {
      senderType: "EMPLOYEE",
      authorId: user.id,
      authorName: user.name,
      body: sanitizeString(body),
      deliveryStatus: status,
      channelCode: complaint.channel.code,
    });
    if (!complaint.firstResponseAt) {
      await prisma.complaint.update({ where: { id }, data: { firstResponseAt: new Date() } });
    }
    await prisma.complaintStatusHistory.create({
      data: {
        complaintId: id,
        changedById: user.id,
        actionType: status === "PREPARED" ? "RESPONSE_PREPARED" : "EMPLOYEE_RESPONDED",
        notes: status === "DEMO_SENT"
          ? `Prepared/demo send via ${complaint.channel.name} — live ${complaint.channel.code} integration is not connected.`
          : undefined,
      },
    });
    await writeAudit({ actor: user, action: "CONVERSATION_MESSAGE", entity: "Complaint", entityId: id, metadata: { delivery: status }, ipAddress: ip });
    return { ...message, deliveryNote: status === "DEMO_SENT" ? `Not sent through ${complaint.channel.name}. Stored as a demo/prepared response because that channel is not live.` : status === "SENT" ? "Recorded on the website conversation." : "Saved as a prepared response. Not sent to the customer yet." };
  },

  async history(user: AuthUser, id: string) {
    await getScopedComplaint(user, id);
    const rows = await prisma.complaintStatusHistory.findMany({
      where: { complaintId: id },
      orderBy: { createdAt: "asc" },
      include: { changedBy: { select: { id: true, name: true, email: true } } },
    });
    return rows;
  },

  async addAttachment(
    user: AuthUser,
    id: string,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
  ) {
    await getScopedComplaint(user, id);
    const saved = await storageService.save(file);
    return prisma.complaintAttachment.create({
      data: {
        complaintId: id,
        uploadedById: user.id,
        fileName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        storagePath: saved.storagePath,
        storageProvider: saved.provider,
      },
    });
  },

  async getAttachment(user: AuthUser, complaintId: string, attachmentId: string) {
    await getScopedComplaint(user, complaintId);
    const attachment = await prisma.complaintAttachment.findFirst({
      where: { id: attachmentId, complaintId },
    });
    if (!attachment) throw ApiError.notFound("Attachment not found");
    return { attachment, absolutePath: storageService.resolve(attachment.storagePath) };
  },
};
