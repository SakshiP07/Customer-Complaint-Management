import type { ComplaintStatus } from "@prisma/client";
import { ApiError } from "../utils/ApiError.js";

export const ALLOWED_TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  NEW: ["CATEGORISED", "ASSIGNED"],
  CATEGORISED: ["ASSIGNED"],
  ASSIGNED: ["IN_PROGRESS", "ESCALATED"],
  IN_PROGRESS: ["PENDING", "RESOLVED", "ESCALATED"],
  PENDING: ["IN_PROGRESS", "RESOLVED", "ESCALATED"],
  ESCALATED: ["IN_PROGRESS", "PENDING", "RESOLVED"],
  RESOLVED: ["CLOSED", "REOPENED"],
  CLOSED: ["REOPENED"],
  REOPENED: ["ASSIGNED", "IN_PROGRESS"],
};

export const REOPEN_ROLES = ["OPERATIONS_MANAGER", "REGIONAL_MANAGER", "ADMIN", "SUPER_ADMIN"] as const;

export function assertTransition(
  from: ComplaintStatus,
  to: ComplaintStatus,
  role: string,
) {
  const allowed = ALLOWED_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw ApiError.unprocessable(`Status change ${from} → ${to} is not allowed`, [
      { from, to, allowed },
    ]);
  }
  if (to === "REOPENED" && !REOPEN_ROLES.includes(role as (typeof REOPEN_ROLES)[number])) {
    throw ApiError.forbidden("Only managers or administrators can reopen a complaint");
  }
  if (from === "CLOSED" && to !== "REOPENED") {
    throw ApiError.unprocessable("Closed complaints can only be reopened through the formal reopen workflow");
  }
}

export function statusAfterAssignment(current: ComplaintStatus): ComplaintStatus {
  if (current === "NEW" || current === "CATEGORISED" || current === "REOPENED") {
    return "ASSIGNED";
  }
  return current;
}
