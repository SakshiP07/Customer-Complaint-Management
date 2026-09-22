export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export function slaRemaining(due?: string | null, slaStatus?: string) {
  if (slaStatus === "OVERDUE" || slaStatus === "BREACHED") return "OVERDUE";
  if (slaStatus === "APPROACHING") {
    if (!due) return "Approaching SLA";
  }
  if (!due) return "—";
  const ms = new Date(due).getTime() - Date.now();
  if (ms <= 0) return "OVERDUE";
  const hours = Math.round(ms / 3_600_000);
  if (hours < 24) return `${hours}h remaining`;
  return `${Math.round(hours / 24)}d remaining`;
}

export const statusClass: Record<string, string> = {
  NEW: "bg-sky-50 text-sky-800",
  CATEGORISED: "bg-indigo-50 text-indigo-800",
  ASSIGNED: "bg-violet-50 text-violet-800",
  IN_PROGRESS: "bg-amber-50 text-amber-800",
  PENDING: "bg-slate-100 text-slate-700",
  RESOLVED: "bg-emerald-50 text-emerald-800",
  CLOSED: "bg-slate-200 text-slate-700",
  ESCALATED: "bg-orange-50 text-orange-800",
  REOPENED: "bg-fuchsia-50 text-fuchsia-800",
};

export const priorityClass: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-700",
  MEDIUM: "bg-blue-50 text-blue-800",
  HIGH: "bg-amber-50 text-amber-800",
  CRITICAL: "bg-red-50 text-red-800",
};

export const slaClass: Record<string, string> = {
  ON_TRACK: "bg-emerald-50 text-emerald-800",
  APPROACHING: "bg-amber-50 text-amber-800",
  OVERDUE: "bg-red-50 text-red-800",
  MET: "bg-emerald-50 text-emerald-800",
  BREACHED: "bg-red-50 text-red-800",
};

export type Role =
  | "CUSTOMER"
  | "AGENT"
  | "OPERATIONS_MANAGER"
  | "REGIONAL_MANAGER"
  | "ADMIN"
  | "SUPER_ADMIN";

export function homeFor(role: Role) {
  switch (role) {
    case "CUSTOMER":
      return "/customer/dashboard";
    case "AGENT":
      return "/agent/dashboard";
    case "OPERATIONS_MANAGER":
      return "/manager/dashboard";
    case "REGIONAL_MANAGER":
      return "/regional/dashboard";
    default:
      return "/admin/dashboard";
  }
}
