import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { api } from "../../api/client";
import { DashboardCharts } from "../../components/dashboard/DashboardCharts";
import { ComplaintTable } from "../../components/complaints/ComplaintTable";
import { ComplaintDetail } from "../../components/complaints/ComplaintDetail";
import { Card, Kpi, Spinner, Badge, Button } from "../../components/ui/Primitives";
import { ExternalLink, MessageSquare, Play, RefreshCw, Video, Youtube } from "lucide-react";
import { useAuth } from "../../auth/AuthProvider";
import { formatDate, homeFor } from "../../lib/utils";

type Summary = {
  total: number;
  open: number;
  newComplaints: number;
  pending: number;
  overdue: number;
  resolved: number;
  resolvedToday: number;
  inProgress: number;
  escalated: number;
  slaCompliance: number;
  averageResolutionHours: number;
};

export function CustomerDashboard() {
  const list = useQuery({
    queryKey: ["my-summary"],
    queryFn: async () => (await api.get("/complaints", { params: { pageSize: 20 } })).data,
    retry: false,
    refetchInterval: 30000,
  });
  const items = (list.data?.data ?? []) as Array<{ id: string; complaintNumber: string; status: string; slaStatus: string; createdAt: string }>;

  if (list.isLoading) {
    return <Spinner />;
  }

  if (list.error) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight dark:text-white text-slate-900 font-display">Complaint Status</h1>
        <Card>
          <p className="text-sm dark:text-zinc-400 text-slate-500">Unable to load complaints. Please try again later.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl sm:text-2xl font-bold tracking-tight dark:text-white text-slate-900 font-display">Complaint Status</h1>
      <Card>
        <p className="text-sm dark:text-zinc-400 text-slate-500">You have {items.length} complaint{items.length !== 1 ? "s" : ""}.</p>
      </Card>
      <ComplaintTable title="My Complaints" detailBase="/customer/complaints" />
    </div>
  );
}

export function AgentDashboard() {
  const summary = useQuery({
    queryKey: ["agent-summary"],
    queryFn: async () => (await api.get("/dashboard/summary")).data.data as Summary,
    refetchInterval: 30000,
  });
  const s = summary.data;
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold">Agent dashboard</h1>
      </div>
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 xl:grid-cols-6">
        <Kpi label="My Open Complaints" value={s?.open ?? 0} />
        <Kpi label="New Complaints" value={s?.newComplaints ?? 0} />
        <Kpi label="In Progress" value={s?.inProgress ?? 0} />
        <Kpi label="Pending" value={s?.pending ?? 0} />
        <Kpi label="Overdue" value={s?.overdue ?? 0} />
        <Kpi label="Resolved Today" value={s?.resolvedToday ?? 0} />
      </div>
      <ComplaintTable title="My Complaints" detailBase="/agent/complaints" view="mine" />
    </div>
  );
}

export function AgentPerformancePage() {
  const q = useQuery({
    queryKey: ["perf"],
    queryFn: async () => (await api.get("/dashboard/performance")).data.data,
  });
  if (q.isLoading) return <Spinner />;
  const p = q.data as {
    assigned: number;
    resolved: number;
    pending: number;
    overdue: number;
    averageResolutionHours: number;
    averageFirstResponseHours: number;
    slaCompliance: number;
    categoriesHandled?: Array<{ name: string; count: number }>;
  };
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">My performance</h1>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Assigned" value={p.assigned} />
        <Kpi label="Resolved" value={p.resolved} />
        <Kpi label="Pending" value={p.pending} />
        <Kpi label="Overdue" value={p.overdue} />
        <Kpi label="Avg resolution (hrs)" value={p.averageResolutionHours} />
        <Kpi label="Avg first response (hrs)" value={p.averageFirstResponseHours} />
        <Kpi label="SLA compliance" value={`${p.slaCompliance}%`} />
      </div>
      <Card>
        <h2 className="font-medium">Categories handled</h2>
        {(p.categoriesHandled ?? []).map((c) => <p key={c.name} className="text-sm">{c.name}: {c.count}</p>)}
      </Card>
    </div>
  );
}

export function ManagerDashboard() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold">Manager dashboard</h1>
      </div>
      <DashboardCharts pathPrefix="/dashboard" />
    </div>
  );
}

export function RegionalDashboard() {
  const { user } = useAuth();
  return (
    <div className="space-y-4">
      <h1 className="text-xl sm:text-2xl font-semibold">Regional operations</h1>
      <p className="text-xs text-zinc-400">Scoped to {user?.region?.name ?? "assigned region"}.</p>
      <DashboardCharts pathPrefix="/dashboard" />
    </div>
  );
}

export function RecurringIssuesPage() {
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const list = useQuery({
    queryKey: ["recurring-list"],
    queryFn: async () => (await api.get("/analytics/recurring-issues")).data.data as {
      items: Array<{ categoryId: string | null; categoryName: string; count: number; changePercent: number; wording: string }>;
      note: string;
      selectedCategory?: string | null;
      affectedRegions?: Array<{ name: string; count: number; percentage?: number }>;
      affectedStores?: Array<{ name: string; count: number }>;
      affectedChannels?: Array<{ name: string; count: number; percentage?: number }>;
    },
  });

  const selectedCategory = categoryId ?? list.data?.items[0]?.categoryId ?? undefined;

  const detail = useQuery({
    queryKey: ["recurring-detail", selectedCategory],
    queryFn: async () => (await api.get("/analytics/recurring-issues", { params: { categoryId: selectedCategory } })).data.data as {
      selectedCategory: string | null;
      affectedRegions: Array<{ name: string; count: number; percentage?: number }>;
      affectedStores: Array<{ name: string; count: number }>;
      affectedChannels: Array<{ name: string; count: number; percentage?: number }>;
    },
    enabled: Boolean(selectedCategory),
  });

  const focus = detail.data ?? list.data;
  const items = list.data?.items ?? [];

  if (list.isLoading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight dark:text-white text-slate-900">Root Causes & Recurring Issues</h1>
          <p className="text-xs dark:text-zinc-400 text-slate-500 mt-0.5">
            {list.data?.note || "Automated frequency cluster and root cause analysis across regional channels."}
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <Card className="text-center py-10">
          <p className="text-sm dark:text-zinc-400 text-slate-500">No recurring issue patterns detected in this reporting window.</p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const isSelected = (selectedCategory ?? items[0]?.categoryId) === item.categoryId;
            return (
              <button
                key={item.categoryName}
                className="text-left transition-all group"
                onClick={() => setCategoryId(item.categoryId ?? undefined)}
              >
                <div
                  className={`p-4 rounded-xl border transition-all ${
                    isSelected
                      ? "border-blue-500 dark:border-blue-500/80 bg-blue-50/50 dark:bg-blue-950/20 shadow-sm ring-1 ring-blue-500/40"
                      : "border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0D0D12] hover:border-slate-300 dark:hover:border-white/[0.15]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-sm dark:text-white text-slate-900 leading-snug">{item.categoryName}</p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                        item.changePercent > 0
                          ? "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400"
                          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                      }`}
                    >
                      {item.changePercent > 0 ? `+${item.changePercent}%` : `${item.changePercent}%`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-3 text-xs dark:text-zinc-400 text-slate-500">
                    <span>{item.count} grievances</span>
                    <span className="text-[10px] uppercase tracking-wider dark:text-zinc-500 text-slate-400">Recurring Pattern</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Breakdown Panels */}
      <div className="grid gap-5 md:grid-cols-3">
        <div className="rounded-2xl border dark:border-white/[0.08] border-slate-200 dark:bg-[#0D0D12] bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm dark:text-white text-slate-900">
              Affected Channels {focus?.selectedCategory ? `· ${focus.selectedCategory}` : ""}
            </h2>
            <span className="text-xs text-blue-500 font-medium">By Volume</span>
          </div>
          <div className="space-y-3">
            {(focus?.affectedChannels ?? []).length === 0 ? (
              <p className="text-xs dark:text-zinc-500 text-slate-400 py-3">No channel correlation data available.</p>
            ) : (
              (focus?.affectedChannels ?? []).map((c) => (
                <div key={c.name} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="dark:text-zinc-300 text-slate-700 font-medium">{c.name}</span>
                    <span className="dark:text-zinc-400 text-slate-500">{c.count} ({c.percentage ?? 0}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${Math.min(c.percentage ?? 0, 100)}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border dark:border-white/[0.08] border-slate-200 dark:bg-[#0D0D12] bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm dark:text-white text-slate-900">Regional Distribution</h2>
            <span className="text-xs text-indigo-500 font-medium">Zones</span>
          </div>
          <div className="space-y-3">
            {(focus?.affectedRegions ?? []).length === 0 ? (
              <p className="text-xs dark:text-zinc-500 text-slate-400 py-3">No regional distribution data available.</p>
            ) : (
              (focus?.affectedRegions ?? []).map((r) => (
                <div key={r.name} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="dark:text-zinc-300 text-slate-700 font-medium">{r.name}</span>
                    <span className="dark:text-zinc-400 text-slate-500">{r.count} ({r.percentage ?? 0}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-indigo-500 h-1.5 rounded-full transition-all" style={{ width: `${Math.min(r.percentage ?? 0, 100)}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border dark:border-white/[0.08] border-slate-200 dark:bg-[#0D0D12] bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm dark:text-white text-slate-900">Impacted Outlets / Stores</h2>
            <span className="text-xs text-amber-500 font-medium">Clusters</span>
          </div>
          <div className="space-y-2.5">
            {(focus?.affectedStores ?? []).length === 0 ? (
              <p className="text-xs dark:text-zinc-500 text-slate-400 py-3">No specific store correlation reported.</p>
            ) : (
              (focus?.affectedStores ?? []).map((s) => (
                <div key={s.name} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-white/[0.03] text-xs">
                  <span className="dark:text-zinc-300 text-slate-700 truncate mr-2 font-medium">{s.name}</span>
                  <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold shrink-0">
                    {s.count}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ReportsPage() {
  const q = useQuery({
    queryKey: ["resolved-queries"],
    queryFn: async () => (await api.get("/complaints", { params: { status: "RESOLVED", pageSize: 50 } })).data.data as Array<any>,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Resolved Queries Report</h1>
      </div>
      <div className="table-wrap">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b dark:border-white/[0.08] border-slate-200 dark:bg-[#12121A] bg-slate-100/80 dark:text-zinc-300 text-slate-700 uppercase tracking-wider text-xs">
            <tr>
              <th className="px-4 py-3 font-bold">Ticket Ref</th>
              <th className="px-4 py-3 font-bold">Customer</th>
              <th className="px-4 py-3 font-bold">Resolved By (Agent)</th>
              <th className="px-4 py-3 font-bold">Resolved At</th>
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-white/[0.05] divide-slate-200">
            {q.data?.map((c) => (
              <tr key={c.id} className="dark:hover:bg-white/[0.02] hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  <Link to={`/complaints/${c.id}`}>{c.complaintNumber}</Link>
                </td>
                <td className="px-4 py-3 dark:text-zinc-200 text-slate-800 font-medium">{c.customer?.name}</td>
                <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400">{c.assignedAgent?.name || "System/Unknown"}</td>
                <td className="px-4 py-3 text-xs dark:text-zinc-400 text-slate-500 font-medium">
                  {c.resolvedAt ? new Date(c.resolvedAt).toLocaleString() : new Date(c.updatedAt).toLocaleString()}
                </td>
              </tr>
            ))}
            {q.data?.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm dark:text-zinc-400 text-slate-500">
                  No resolved queries found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type EmployeeRow = {
  id: string;
  name: string;
  email: string;
  region: string;
  assigned: number;
  inProgress: number;
  pending: number;
  resolved: number;
  overdue: number;
  slaPercent: number;
};

export function EmployeesPage() {
  const q = useQuery({
    queryKey: ["employees-workload"],
    queryFn: async () => (await api.get("/analytics/employees")).data.data as EmployeeRow[],
  });
  const base = window.location.pathname.replace(/\/employees.*/, "/employees");
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Employees</h1>
      <div className="table-wrap">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-white/[0.08] bg-[#12121A] text-zinc-400">
            <tr>
              {["Employee", "Region", "Assigned", "In Progress", "Pending", "Resolved", "Overdue", "SLA %"].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {q.data?.map((a) => (
              <tr key={a.id} className="border-t">
                <td className="px-3 py-2"><Link className="text-blue-800" to={`${base}/${a.id}`}>{a.name}</Link></td>
                <td className="px-3 py-2">{a.region}</td>
                <td className="px-3 py-2">{a.assigned}</td>
                <td className="px-3 py-2">{a.inProgress}</td>
                <td className="px-3 py-2">{a.pending}</td>
                <td className="px-3 py-2">{a.resolved}</td>
                <td className="px-3 py-2">{a.overdue}</td>
                <td className="px-3 py-2">{a.slaPercent}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function EmployeePerformancePage() {
  const { id = "" } = useParams();
  const q = useQuery({
    queryKey: ["employee-perf", id],
    queryFn: async () => (await api.get("/dashboard/performance", { params: { agentId: id } })).data.data as {
      assigned: number;
      resolved: number;
      pending: number;
      overdue: number;
      averageResolutionHours: number;
      slaCompliance: number;
      categoriesHandled: Array<{ name: string; count: number }>;
    },
  });
  if (q.isLoading) return <Spinner />;
  const p = q.data;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Employee performance</h1>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Current workload" value={p?.assigned ?? 0} />
        <Kpi label="Resolved" value={p?.resolved ?? 0} />
        <Kpi label="Pending" value={p?.pending ?? 0} />
        <Kpi label="Overdue" value={p?.overdue ?? 0} />
        <Kpi label="Avg resolution (hrs)" value={p?.averageResolutionHours ?? 0} />
        <Kpi label="SLA compliance" value={`${p?.slaCompliance ?? 0}%`} />
      </div>
      <Card>
        <h2 className="font-medium">Complaint categories handled</h2>
        {(p?.categoriesHandled ?? []).map((c) => <p key={c.name} className="text-sm">{c.name}: {c.count}</p>)}
      </Card>
    </div>
  );
}

export function SlaMonitoringPage() {
  const sla = useQuery({
    queryKey: ["sla-monitor"],
    queryFn: async () => (await api.get("/dashboard/sla")).data.data as Array<{ name: string; count: number }>,
  });
  const summary = useQuery({
    queryKey: ["sla-summary"],
    queryFn: async () => (await api.get("/dashboard/summary")).data.data as Summary,
  });
  const base = window.location.pathname.startsWith("/regional") ? "/regional/complaints" : "/manager/complaints";

  const slaMap = new Map((sla.data ?? []).map((r) => [r.name, r.count]));
  const onTrack = slaMap.get("ON_TRACK") ?? 0;
  const approaching = slaMap.get("APPROACHING") ?? 0;
  const overdue = slaMap.get("OVERDUE") ?? 0;
  const met = slaMap.get("MET") ?? 0;
  const breached = slaMap.get("BREACHED") ?? 0;
  const totalTracked = onTrack + approaching + overdue + met + breached || 1;

  const statuses = [
    { label: "On Track", count: onTrack, color: "bg-emerald-500", text: "text-emerald-500", border: "border-emerald-500/20", bg: "bg-emerald-500/10" },
    { label: "Approaching Breach", count: approaching, color: "bg-amber-500", text: "text-amber-500", border: "border-amber-500/20", bg: "bg-amber-500/10" },
    { label: "Overdue", count: overdue, color: "bg-rose-500", text: "text-rose-500", border: "border-rose-500/20", bg: "bg-rose-500/10" },
    { label: "Met SLA", count: met, color: "bg-blue-500", text: "text-blue-500", border: "border-blue-500/20", bg: "bg-blue-500/10" },
    { label: "Breached SLA", count: breached, color: "bg-red-600", text: "text-red-500", border: "border-red-500/20", bg: "bg-red-500/10" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight dark:text-white text-slate-900">SLA Health & Escalation Matrix</h1>
        <p className="text-xs dark:text-zinc-400 text-slate-500 mt-0.5">
          Real-time compliance tracking across first-response and full resolution thresholds.
        </p>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Kpi label="SLA Compliance Rate" value={`${summary.data?.slaCompliance ?? 0}%`} trend={summary.data?.slaCompliance && summary.data.slaCompliance >= 90 ? "Target Met" : "Requires Attention"} />
        <Kpi label="Overdue SLA Breaches" value={summary.data?.overdue ?? 0} />
        <Kpi label="Avg Resolution Time" value={`${summary.data?.averageResolutionHours ?? 0} hrs`} />
        <Kpi label="Active In Queue" value={summary.data?.inProgress ?? summary.data?.open ?? 0} />
      </div>

      {/* SLA Distribution Breakdown */}
      <div className="rounded-2xl border dark:border-white/[0.08] border-slate-200 dark:bg-[#0D0D12] bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="font-semibold text-sm dark:text-white text-slate-900">SLA Status Distribution</h2>
          <span className="text-xs dark:text-zinc-400 text-slate-500">Live Ticket Thresholds</span>
        </div>

        {/* Aggregate Progress Bar */}
        <div className="w-full bg-slate-100 dark:bg-zinc-800/80 rounded-full h-2.5 flex overflow-hidden">
          {statuses.map((st) => {
            const widthPct = (st.count / totalTracked) * 100;
            if (widthPct === 0) return null;
            return <div key={st.label} className={`${st.color} h-full transition-all`} style={{ width: `${widthPct}%` }} title={`${st.label}: ${st.count}`} />;
          })}
        </div>

        {/* Status Pills Grid */}
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 pt-1">
          {statuses.map((st) => (
            <div key={st.label} className={`p-3 rounded-xl border ${st.border} ${st.bg} space-y-1`}>
              <div className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${st.color}`} />
                <span className="text-xs dark:text-zinc-300 text-slate-600 font-medium truncate">{st.label}</span>
              </div>
              <p className={`text-xl font-bold font-display ${st.text}`}>{st.count}</p>
            </div>
          ))}
        </div>
      </div>

      <ComplaintTable title="Overdue & Breached Complaints" detailBase={base} view="overdue" />
    </div>
  );
}

export function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["notifications-all"],
    queryFn: async () => (await api.get("/notifications")).data.data as Array<{ id: string; title: string; message: string; createdAt: string; isRead: boolean; complaintId?: string }>,
  });

  const markAsRead = useMutation({
    mutationFn: async (id: string) => api.post(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications-all"] }),
  });

  const deleteNotification = useMutation({
    mutationFn: async (id: string) => api.delete(`/notifications/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications-all"] }),
  });

  const handleNotificationClick = (n: { id: string; isRead: boolean; complaintId?: string }) => {
    if (!n.isRead) {
      markAsRead.mutate(n.id);
    }
    if (n.complaintId) {
      navigate(`/complaints/${n.complaintId}`);
    }
  };

  const handleBack = () => {
    navigate(homeFor(user?.role.code ?? "CUSTOMER"));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={handleBack} className="dark:text-zinc-400 text-slate-500 hover:text-slate-900 dark:hover:text-white font-medium text-sm">
          ← Back
        </button>
        <h1 className="text-xl font-bold tracking-tight dark:text-white text-slate-900 font-display">Notifications</h1>
      </div>
      {q.isLoading ? <Spinner /> : null}
      {q.data?.length === 0 ? (
        <Card>
          <p className="text-sm dark:text-zinc-400 text-slate-500">No notifications</p>
        </Card>
      ) : null}
      <div className="space-y-3">
        {q.data?.map((n) => (
          <div
            key={n.id}
            onClick={() => handleNotificationClick(n)}
            className="cursor-pointer"
          >
            <Card className={`transition-colors dark:hover:bg-white/[0.04] hover:bg-slate-50 ${!n.isRead ? "border-l-4 border-l-indigo-500 bg-indigo-500/[0.04]" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                 <div className="flex-1">
                  <p className="font-medium dark:text-zinc-200 text-slate-800">{n.title}</p>
                  <p className="text-sm dark:text-zinc-400 text-slate-600">{n.message}</p>
                  <p className="text-xs dark:text-zinc-500 text-slate-400 mt-1">{formatDate(n.createdAt)}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification.mutate(n.id);
                  }}
                  className="dark:text-zinc-500 text-slate-400 hover:text-rose-500"
                >
                  ×
                </button>
              </div>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AiAssistantPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight dark:text-white text-slate-900 font-display">AI Assistant</h1>
      <Card>
        <p className="text-sm dark:text-zinc-400 text-slate-600">The AI assistant lives inside each complaint workspace. Open a complaint to get a summary, suggested category, priority, next steps, and a draft response. It never sends a message to the customer on its own.</p>
      </Card>
      <ComplaintTable title="Choose a complaint to analyse" detailBase="/agent/inbox" view="inbox" />
    </div>
  );
}

export function ProfilePage() {
  const { user } = useAuth();
  if (!user) return null;

  const roleDetails: Record<string, Array<{ label: string; value: string }>> = {
    CUSTOMER: [
      { label: "Name", value: user.name },
      { label: "Email", value: user.email },
      { label: "Phone", value: user.phone || "Not provided" },
      { label: "Role", value: user.role.name },
    ],
    AGENT: [
      { label: "Name", value: user.name },
      { label: "Email", value: user.email },
      { label: "Phone", value: user.phone || "Not provided" },
      { label: "Role", value: user.role.name },
      { label: "Region", value: user.region?.name || "Not assigned" },
      { label: "Store", value: user.store?.name || "Not assigned" },
    ],
    OPERATIONS_MANAGER: [
      { label: "Name", value: user.name },
      { label: "Email", value: user.email },
      { label: "Phone", value: user.phone || "Not provided" },
      { label: "Role", value: user.role.name },
    ],
    REGIONAL_MANAGER: [
      { label: "Name", value: user.name },
      { label: "Email", value: user.email },
      { label: "Phone", value: user.phone || "Not provided" },
      { label: "Role", value: user.role.name },
      { label: "Region", value: user.region?.name || "Not assigned" },
    ],
    ADMIN: [
      { label: "Name", value: user.name },
      { label: "Email", value: user.email },
      { label: "Phone", value: user.phone || "Not provided" },
      { label: "Role", value: user.role.name },
    ],
    SUPER_ADMIN: [
      { label: "Name", value: user.name },
      { label: "Email", value: user.email },
      { label: "Phone", value: user.phone || "Not provided" },
      { label: "Role", value: user.role.name },
    ],
  };

  const details = roleDetails[user.role.code] || roleDetails.CUSTOMER;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Profile</h1>
      <Card>
        {details.map((detail) => (
          <div key={detail.label} className="py-2 border-b border-white/[0.06] last:border-0">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">{detail.label}</p>
            <p className="text-sm text-zinc-200 font-medium">{detail.value}</p>
          </div>
        ))}
      </Card>
    </div>
  );
}

export function ComplaintsListPage({ title, base, view }: { title: string; base: string; view?: "inbox" | "mine" | "escalated" | "overdue" }) {
  return <ComplaintTable title={title} detailBase={base} view={view} />;
}

export function ComplaintDetailPage() {
  return <ComplaintDetail />;
}

export function YouTubeCommentsPage({ detailBase = "/admin/complaints" }: { detailBase?: string }) {
  const qc = useQueryClient();
  const { user } = useAuth();

  const base = detailBase || (
    user?.role.code === "CUSTOMER"
      ? "/customer/complaints"
      : user?.role.code === "AGENT"
      ? "/agent/complaints"
      : user?.role.code === "OPERATIONS_MANAGER"
      ? "/manager/complaints"
      : user?.role.code === "REGIONAL_MANAGER"
      ? "/regional/complaints"
      : "/admin/complaints"
  );

  const query = useQuery({
    queryKey: ["complaints", { channelCode: "YOUTUBE", pageSize: 100 }],
    queryFn: async () => {
      const res = await api.get("/complaints", { params: { channelCode: "YOUTUBE", pageSize: 100 } });
      return res.data.data as Array<any>;
    },
    refetchInterval: 2500,
    refetchIntervalInBackground: true,
  });

  const syncMutation = useMutation({
    mutationFn: async () => (await api.post("/complaints/sync-channels")).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["complaints"] });
    },
  });

  if (query.isLoading) return <Spinner />;

  const items = query.data ?? [];

  // Group complaints by Video ID
  const videoGroups = items.reduce((acc: Record<string, { videoId: string; videoTitle: string; videoUrl: string; embedUrl: string; complaints: any[] }>, c) => {
    const text = `${c.subject ?? ""} ${c.description ?? ""}`;
    const idMatch =
      text.match(/\[videoId:([a-zA-Z0-9_-]+)\]/i) ||
      text.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i) ||
      text.match(/\[([a-zA-Z0-9_-]{11})\]/);

    let videoTitle = "Official Brand Channel Video";
    const titleMatch =
      (c.subject ?? "").match(/YouTube:\s*(.*?)(?:\s*\[|$)/i) ||
      (c.subject ?? "").match(/Comment on video:\s*(.*?)(?:\s*\[|$)/i);
    if (titleMatch && titleMatch[1]) {
      videoTitle = titleMatch[1].trim();
    }

    const videoId = idMatch ? idMatch[1] : "dQw4w9WgXcQ";
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const embedUrl = `https://www.youtube.com/embed/${videoId}`;

    if (!acc[videoId]) {
      acc[videoId] = { videoId, videoTitle, videoUrl, embedUrl, complaints: [] };
    }
    acc[videoId].complaints.push(c);
    return acc;
  }, {});

  const groups = Object.values(videoGroups);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b dark:border-white/[0.08] border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-red-600 dark:text-red-400">
            <Youtube className="h-4 w-4 fill-current" />
            <span>YOUTUBE CHANNEL GRIEVANCE DESK</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight dark:text-white text-slate-900 mt-1">
            YouTube Video Comments Tracker
          </h1>
          <p className="text-xs dark:text-zinc-400 text-slate-500 mt-1">
            Real-time grievance ingestion grouped by published brand video · Ingesting channel ID: <span className="font-mono font-semibold text-slate-800 dark:text-zinc-200">UCL5qOrbdcMZjTfypxbltGaw</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="text-xs flex items-center gap-1.5 shadow-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncMutation.isPending ? "animate-spin text-red-500" : ""}`} />
            {syncMutation.isPending ? "Polling YouTube API..." : "Sync YouTube Comments"}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <Kpi label="Total Video Comments" value={items.length} />
        <Kpi label="Videos With Grievances" value={groups.length} />
        <Kpi
          label="Open Action Items"
          value={items.filter((c) => !["RESOLVED", "CLOSED"].includes(c.status)).length}
        />
        <Kpi
          label="Critical Priority"
          value={items.filter((c) => c.priority === "HIGH" || c.priority === "CRITICAL").length}
        />
      </div>

      {groups.length === 0 ? (
        <Card className="p-8 text-center glass-card">
          <Youtube className="h-10 w-10 text-red-500 mx-auto mb-3" />
          <h3 className="font-bold text-base dark:text-white text-slate-900">No YouTube Grievances Found</h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-md mx-auto mt-1 mb-4">
            Click &quot;Sync YouTube Comments&quot; to fetch the latest comment threads from your configured YouTube channel.
          </p>
          <Button size="sm" variant="primary" onClick={() => syncMutation.mutate()}>
            Sync YouTube Now
          </Button>
        </Card>
      ) : null}

      {/* Grouped Video Cards */}
      <div className="space-y-8">
        {groups.map((group) => (
          <div
            key={group.videoId}
            className="rounded-2xl border dark:border-white/[0.08] border-slate-200 dark:bg-[#0D0D12] bg-white overflow-hidden shadow-sm card-bevel"
          >
            {/* Video Card Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b dark:border-white/[0.08] border-slate-200 dark:bg-[#12121A]/80 bg-slate-50">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600 text-white shadow-md shadow-red-600/30">
                  <Youtube className="h-5 w-5 fill-current" />
                </span>
                <div>
                  <h2 className="text-base font-bold dark:text-white text-slate-900 flex items-center gap-2">
                    {group.videoTitle}
                  </h2>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400 font-mono">
                    <span>ID: {group.videoId}</span>
                    <span>·</span>
                    <span className="text-red-600 dark:text-red-400 font-semibold">
                      {group.complaints.length} customer grievance comment{group.complaints.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </div>
              <a
                href={group.videoUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-red-500 transition-colors"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                Watch on YouTube
                <ExternalLink className="h-3 w-3 ml-0.5" />
              </a>
            </div>

            {/* Video Player + Associated Comments Split Grid */}
            <div className="grid gap-6 p-5 lg:grid-cols-[480px_1fr]">
              {/* Left: Embedded YouTube Video */}
              <div className="space-y-3">
                <div className="overflow-hidden rounded-xl border dark:border-white/[0.1] border-slate-300 bg-black shadow-md">
                  <div className="relative aspect-video w-full">
                    <iframe
                      src={`${group.embedUrl}?rel=0`}
                      title={group.videoTitle}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="absolute inset-0 h-full w-full border-0"
                    />
                  </div>
                </div>
                <div className="rounded-xl border dark:border-white/[0.06] border-slate-200 dark:bg-white/[0.02] bg-slate-50 p-3 text-xs">
                  <p className="font-semibold dark:text-zinc-300 text-slate-700 flex items-center gap-1.5 mb-1">
                    <Video className="h-3.5 w-3.5 text-red-500" />
                    Video Context &amp; Channel Stream
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                    Grievances filed in the comment section of this video are automatically ingested, parsed for sentiment, and routed to customer support.
                  </p>
                </div>
              </div>

              {/* Right: Comments Filed on This Specific Video */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-indigo-500" />
                    Comments Filed on this Video ({group.complaints.length})
                  </h3>
                </div>

                <div className="space-y-3">
                  {group.complaints.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-xl border dark:border-white/[0.08] border-slate-200 dark:bg-white/[0.03] bg-slate-50/70 p-4 transition-all hover:border-indigo-500/40 hover:shadow-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b dark:border-white/[0.06] border-slate-200">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500/20 text-red-600 dark:text-red-400 font-bold text-[10px]">
                            YT
                          </span>
                          <span className="font-bold text-xs dark:text-white text-slate-900">
                            @{c.customer?.name}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500">
                            {formatDate(c.createdAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Badge value={c.priority} kind="priority" />
                          <Badge value={c.status} />
                        </div>
                      </div>

                      <div className="pt-2.5 pb-2">
                        <p className="text-xs dark:text-zinc-200 text-slate-800 leading-relaxed font-medium">
                          {c.description}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t dark:border-white/[0.04] border-slate-100 text-[11px]">
                        <div className="text-slate-500 dark:text-zinc-400 font-mono">
                          Ticket: <strong className="text-indigo-600 dark:text-indigo-400">{c.complaintNumber}</strong>
                        </div>
                        <Link
                          to={`${base}/${c.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500"
                        >
                          View &amp; Resolve Grievance &rarr;
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
