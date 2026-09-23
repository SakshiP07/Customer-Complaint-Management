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
  NEW: "bg-sky-500/10 text-sky-400 border border-sky-500/20 shadow-glow-sm",
  CATEGORISED: "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20",
  ASSIGNED: "bg-violet-500/10 text-violet-400 border border-violet-500/20",
  IN_PROGRESS: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  PENDING: "bg-zinc-800 text-zinc-300 border border-zinc-700",
  RESOLVED: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-glow-sm",
  CLOSED: "bg-zinc-900 text-zinc-400 border border-zinc-800",
  ESCALATED: "bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-glow-sm",
  REOPENED: "bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20",
};

export const priorityClass: Record<string, string> = {
  LOW: "bg-zinc-800 text-zinc-300 border border-zinc-700",
  MEDIUM: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  HIGH: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  CRITICAL: "bg-rose-500/10 text-rose-400 border border-rose-500/30 animate-pulse",
};

export const slaClass: Record<string, string> = {
  ON_TRACK: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  APPROACHING: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  OVERDUE: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
  MET: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  BREACHED: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
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
