import { z } from "zod";

export const emailSchema = z.string().trim().email().max(180).toLowerCase();
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^[0-9+\-() ]{8,20}$/, "Enter a valid phone number")
  .optional()
  .or(z.literal(""));

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: emailSchema,
  phone: phoneSchema,
  password: z.string().min(10).max(100),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

export const createComplaintSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: emailSchema,
  phone: phoneSchema,
  regionId: z.string().uuid(),
  storeId: z.string().uuid().optional().nullable(),
  categoryId: z.string().uuid(),
  description: z.string().trim().min(20).max(8000),
  subject: z.string().trim().max(200).optional(),
  preferredContactMethod: z.enum(["EMAIL", "PHONE", "SMS"]).optional(),
});

export const trackComplaintSchema = z.object({
  complaintNumber: z.string().trim().min(8).max(32),
  email: emailSchema,
});

export const listComplaintsQuery = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  channelId: z.string().uuid().optional(),
  regionId: z.string().uuid().optional(),
  storeId: z.string().uuid().optional(),
  assignedAgentId: z.string().uuid().optional(),
  slaStatus: z.string().optional(),
  view: z.enum(["inbox", "mine", "escalated", "overdue"]).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  sort: z.enum(["createdAt", "slaDueAt", "priority", "status", "updatedAt"]).optional(),
  order: z.enum(["asc", "desc"]).optional(),
});

export const assignSchema = z.object({
  agentId: z.string().uuid(),
  reason: z.string().trim().max(1000).optional(),
});

export const statusSchema = z.object({
  status: z.enum([
    "NEW",
    "CATEGORISED",
    "ASSIGNED",
    "IN_PROGRESS",
    "PENDING",
    "RESOLVED",
    "CLOSED",
    "ESCALATED",
    "REOPENED",
  ]),
  notes: z.string().trim().max(2000).optional(),
});

export const escalateSchema = z.object({
  reason: z.string().trim().min(8).max(2000),
  escalatedToId: z.string().uuid().optional(),
  type: z.enum(["AGENT", "MANAGER"]).optional(),
});

export const resolveSchema = z.object({
  resolution: z.string().trim().min(10).max(4000),
});

export const closeSchema = z.object({
  closureReason: z.string().trim().min(5).max(2000),
});

export const commentSchema = z.object({
  comment: z.string().trim().min(1).max(4000),
  visibility: z.enum(["CUSTOMER", "INTERNAL"]),
});

export const patchComplaintSchema = z.object({
  categoryId: z.string().uuid().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  description: z.string().trim().min(20).max(8000).optional(),
  additionalInformation: z.string().trim().min(5).max(4000).optional(),
});

export const reopenSchema = z.object({
  reason: z.string().trim().min(8).max(2000),
});

export const userStatusSchema = z.object({
  isActive: z.boolean(),
});

export const patchUserSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  phone: phoneSchema,
  roleId: z.string().uuid().optional(),
  regionId: z.string().uuid().nullable().optional(),
  storeId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: emailSchema,
  phone: phoneSchema,
  password: z.string().min(10).max(100),
  roleId: z.string().uuid(),
  regionId: z.string().uuid().optional().nullable(),
  storeId: z.string().uuid().optional().nullable(),
});

export const regionSchema = z.object({
  name: z.string().trim().min(2).max(80),
  code: z.string().trim().min(2).max(20).toUpperCase(),
  description: z.string().trim().max(500).optional(),
  isActive: z.boolean().optional(),
});

export const storeSchema = z.object({
  name: z.string().trim().min(2).max(120),
  code: z.string().trim().min(2).max(20).toUpperCase(),
  address: z.string().trim().min(5).max(300),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  regionId: z.string().uuid(),
  isActive: z.boolean().optional(),
});

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  code: z.string().trim().min(2).max(40).toUpperCase(),
  description: z.string().trim().max(500).optional(),
  isActive: z.boolean().optional(),
});

export const channelSchema = z.object({
  name: z.string().trim().min(2).max(80),
  code: z.string().trim().min(2).max(40).toUpperCase(),
  description: z.string().trim().max(500).optional(),
  adapterKey: z.string().trim().min(2).max(40),
  isActive: z.boolean().optional(),
});

export const slaPolicySchema = z.object({
  name: z.string().trim().min(2).max(120),
  priorityCode: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  categoryId: z.string().uuid().nullable().optional(),
  regionId: z.string().uuid().nullable().optional(),
  responseTimeMinutes: z.number().int().positive(),
  resolutionTimeMinutes: z.number().int().positive(),
  escalationThresholdMinutes: z.number().int().positive(),
  approachingPercent: z.number().int().min(1).max(99).optional(),
  isActive: z.boolean().optional(),
});

export const dashboardQuery = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  regionId: z.string().uuid().optional(),
  channelId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
});

export const aiReviewSchema = z.object({
  status: z.enum(["ACCEPTED", "EDITED", "REJECTED"]),
  suggestedCategoryId: z.string().uuid().optional(),
  suggestedPriority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  suggestedResponse: z.string().max(4000).optional(),
});

export const messageSchema = z.object({
  body: z.string().trim().min(1).max(4000),
  delivery: z.enum(["PREPARED", "DEMO_SEND"]).default("PREPARED"),
});
