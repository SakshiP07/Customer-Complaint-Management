import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { api } from "../../api/client";
import { DashboardCharts } from "../../components/dashboard/DashboardCharts";
import { ComplaintTable } from "../../components/complaints/ComplaintTable";
import { ComplaintDetail } from "../../components/complaints/ComplaintDetail";
import { Card, Kpi, Spinner } from "../../components/ui/Primitives";
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
        <h1 className="text-xl sm:text-2xl font-semibold">Complaint status</h1>
        <Card>
          <p className="text-sm text-slate-600">Unable to load complaints. Please try again later.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl sm:text-2xl font-semibold">Complaint status</h1>
      <Card>
        <p className="text-sm text-slate-600">You have {items.length} complaint{items.length !== 1 ? "s" : ""}.</p>
      </Card>
      <ComplaintTable title="My complaints" detailBase="/customer/complaints" />
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
      <p className="text-sm text-slate-500">Scoped to {user?.region?.name ?? "assigned region"}.</p>
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
    },
  });
  const detail = useQuery({
    queryKey: ["recurring-detail", categoryId],
    queryFn: async () => (await api.get("/analytics/recurring-issues", { params: { categoryId } })).data.data as {
      selectedCategory: string | null;
      affectedRegions: Array<{ name: string; count: number; percentage?: number }>;
      affectedStores: Array<{ name: string; count: number }>;
      affectedChannels: Array<{ name: string; count: number; percentage?: number }>;
    },
    enabled: Boolean(categoryId) || Boolean(list.data?.items[0]?.categoryId),
  });
  const focus = detail.data;
  const selected = categoryId ?? list.data?.items[0]?.categoryId ?? undefined;
  if (list.isLoading) return <Spinner />;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Recurring issues</h1>
      <p className="text-sm text-slate-500">{list.data?.note}</p>
      <div className="grid gap-3">
        {list.data?.items.map((item) => (
          <button
            key={item.categoryName}
            className="text-left"
            onClick={() => setCategoryId(item.categoryId ?? undefined)}
          >
            <Card className={selected === item.categoryId ? "ring-2 ring-blue-700" : ""}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{item.categoryName}</p>
                  <p className="text-sm text-slate-500">{item.count} complaints · {item.changePercent > 0 ? "+" : ""}{item.changePercent}%</p>
                </div>
                <span className="text-xs uppercase tracking-wide text-slate-500">{item.wording}</span>
              </div>
            </Card>
          </button>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <h2 className="font-medium">Channels {focus?.selectedCategory ? `· ${focus.selectedCategory}` : ""}</h2>
          {focus?.affectedChannels.map((r) => <p key={r.name} className="text-sm">{r.name}: {r.count} ({r.percentage ?? 0}%)</p>)}
        </Card>
        <Card>
          <h2 className="font-medium">Regions</h2>
          {focus?.affectedRegions.map((r) => <p key={r.name} className="text-sm">{r.name}: {r.count} ({r.percentage ?? 0}%)</p>)}
        </Card>
        <Card>
          <h2 className="font-medium">Stores</h2>
          {focus?.affectedStores.map((r) => <p key={r.name} className="text-sm">{r.name}: {r.count}</p>)}
        </Card>
      </div>
    </div>
  );
}

export function ReportsPage() {
  const q = useQuery({
    queryKey: ["report"],
    queryFn: async () => (await api.get("/reports", { params: { type: "weekly" } })).data.data,
  });
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Reports</h1>
        <a className="text-sm text-blue-700" href="/api/v1/reports/csv?type=weekly">Download weekly CSV</a>
      </div>
      <Card>
        <pre className="overflow-auto text-xs">{JSON.stringify(q.data, null, 2)}</pre>
      </Card>
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
          <thead className="bg-slate-50">
            <tr>
              {["Employee","Region","Assigned","In Progress","Pending","Resolved","Overdue","SLA %"].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}
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
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">SLA monitoring</h1>
      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi label="SLA compliance" value={`${summary.data?.slaCompliance ?? 0}%`} />
        <Kpi label="Overdue" value={summary.data?.overdue ?? 0} />
        <Kpi label="Avg resolution (hrs)" value={summary.data?.averageResolutionHours ?? 0} />
      </div>
      <Card>
        {(sla.data ?? []).map((row) => (
          <p key={row.name} className="flex justify-between text-sm"><span>{row.name.replaceAll("_", " ")}</span><span>{row.count}</span></p>
        ))}
      </Card>
      <ComplaintTable title="Overdue complaints" detailBase={base} view="overdue" />
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
        <button onClick={handleBack} className="text-slate-600 hover:text-slate-900">
          ← Back
        </button>
        <h1 className="text-2xl font-semibold">Notifications</h1>
      </div>
      {q.isLoading ? <Spinner /> : null}
      {q.data?.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-600">No notifications</p>
        </Card>
      ) : null}
      <div className="space-y-3">
        {q.data?.map((n) => (
          <div
            key={n.id}
            onClick={() => handleNotificationClick(n)}
            className="cursor-pointer"
          >
            <Card className={`transition-colors hover:bg-slate-50 ${!n.isRead ? "border-l-4 border-l-blue-500 bg-blue-50/30" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="font-medium">{n.title}</p>
                  <p className="text-sm text-slate-600">{n.message}</p>
                  <p className="text-xs text-slate-500 mt-1">{formatDate(n.createdAt)}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification.mutate(n.id);
                  }}
                  className="text-slate-400 hover:text-red-600"
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
      <h1 className="text-2xl font-semibold">AI Assistant</h1>
      <Card>
        <p className="text-sm text-slate-600">The AI assistant lives inside each complaint workspace. Open a complaint to get a summary, suggested category, priority, next steps, and a draft response. It never sends a message to the customer on its own.</p>
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
          <div key={detail.label} className="py-2 border-b border-slate-100 last:border-0">
            <p className="text-sm text-slate-500">{detail.label}</p>
            <p className="font-medium">{detail.value}</p>
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
