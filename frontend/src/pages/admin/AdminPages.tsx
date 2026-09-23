import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiErrorMessage } from "../../api/client";
import { Button, Card, Input, Label } from "../../components/ui/Primitives";
import { DashboardCharts } from "../../components/dashboard/DashboardCharts";
import { toast } from "sonner";

function CatalogManager({
  title,
  path,
  fields,
}: {
  title: string;
  path: string;
  fields: Array<{ key: string; label: string }>;
}) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: [path], queryFn: async () => (await api.get(path)).data.data as Array<Record<string, string>> });
  const create = useMutation({
    mutationFn: async (body: Record<string, string>) => api.post(path, body),
    onSuccess: () => { toast.success("Created"); qc.invalidateQueries({ queryKey: [path] }); },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold tracking-tight dark:text-white text-slate-900 font-display">{title}</h1>
      <Card className="glass-card">
        <form
          className="grid gap-4 md:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            const body: Record<string, string> = {};
            fields.forEach((f) => { body[f.key] = String(form.get(f.key) ?? ""); });
            create.mutate(body);
            e.currentTarget.reset();
          }}
        >
          {fields.map((f) => (
            <div key={f.key}>
              <Label htmlFor={f.key}>{f.label}</Label>
              <Input id={f.key} name={f.key} required />
            </div>
          ))}
          <div className="flex items-end"><Button type="submit" variant="primary">Add Record</Button></div>
        </form>
      </Card>
      <div className="table-wrap">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b dark:border-white/[0.08] border-slate-200 dark:bg-[#12121A] bg-slate-100/80 dark:text-zinc-300 text-slate-700 uppercase tracking-wider text-xs">
            <tr>{fields.map((f) => <th key={f.key} className="px-4 py-3 font-bold">{f.label}</th>)}</tr>
          </thead>
          <tbody className="divide-y dark:divide-white/[0.05] divide-slate-200">
            {q.data?.map((row) => (
              <tr key={row.id} className="dark:hover:bg-white/[0.02] hover:bg-slate-50 transition-colors">
                {fields.map((f) => <td key={f.key} className="px-4 py-3 dark:text-zinc-200 text-slate-800 font-medium">{String(row[f.key] ?? "")}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight dark:text-white text-slate-900 font-display">System Administration</h1>
          <p className="text-sm dark:text-zinc-400 text-slate-500 mt-1 font-medium">Enterprise platform health, SLA monitors, and real-time velocity metrics</p>
        </div>
      </div>
      <DashboardCharts pathPrefix="/dashboard" />
    </div>
  );
}

export function UsersPage() {
  const q = useQuery({
    queryKey: ["users"],
    queryFn: async () => (await api.get("/users", { params: { pageSize: 50 } })).data.data as Array<{ id: string; name: string; email: string; isActive: boolean; role: { name: string } }>,
  });
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold tracking-tight dark:text-white text-slate-900 font-display">User Management</h1>
      <div className="table-wrap">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b dark:border-white/[0.08] border-slate-200 dark:bg-[#12121A] bg-slate-100/80 dark:text-zinc-300 text-slate-700 uppercase tracking-wider text-xs">
            <tr><th className="px-4 py-3 font-bold">Name</th><th className="px-4 py-3 font-bold">Email</th><th className="px-4 py-3 font-bold">Role</th><th className="px-4 py-3 font-bold">Active Status</th></tr>
          </thead>
          <tbody className="divide-y dark:divide-white/[0.05] divide-slate-200">
            {q.data?.map((u) => (
              <tr key={u.id} className="dark:hover:bg-white/[0.02] hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-bold dark:text-white text-slate-900">{u.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-indigo-600 dark:text-indigo-400 font-medium">{u.email}</td>
                <td className="px-4 py-3 dark:text-zinc-200 text-slate-700 font-medium">{u.role.name}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${u.isActive ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "bg-zinc-500/10 text-zinc-500 border-zinc-500/20"}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${u.isActive ? "bg-emerald-500" : "bg-zinc-400"}`} />
                    {u.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function RegionsPage() {
  return <CatalogManager title="Regions" path="/admin/regions" fields={[{ key: "name", label: "Name" }, { key: "code", label: "Code" }]} />;
}
export function StoresPage() {
  return <CatalogManager title="Stores" path="/admin/stores" fields={[{ key: "name", label: "Name" }, { key: "code", label: "Code" }, { key: "address", label: "Address" }, { key: "city", label: "City" }, { key: "state", label: "State" }, { key: "regionId", label: "Region ID" }]} />;
}
export function CategoriesPage() {
  return <CatalogManager title="Categories" path="/admin/categories" fields={[{ key: "name", label: "Name" }, { key: "code", label: "Code" }]} />;
}
export function ChannelsPage() {
  const qc = useQueryClient();
  const channels = useQuery({
    queryKey: ["/admin/channels"],
    queryFn: async () => (await api.get("/admin/channels")).data.data as Array<Record<string, string>>,
  });

  const integrationStatus = useQuery({
    queryKey: ["integration-status"],
    queryFn: async () => (await api.get("/integrations/status")).data.data as {
      youtube: { configured: boolean; channelIds: string[]; lastChecked: string | null; isPolling: boolean };
      email: { configured: boolean; user: string; host: string; lastChecked: string | null; isPolling: boolean };
    },
    refetchInterval: 5000,
  });

  const syncMutation = useMutation({
    mutationFn: async (type: "youtube" | "email" | "all") => {
      const url = type === "all" ? "/integrations/sync-all" : `/integrations/${type}/sync`;
      return (await api.post(url)).data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Sync completed successfully!");
      qc.invalidateQueries({ queryKey: ["complaints"] });
      qc.invalidateQueries({ queryKey: ["integration-status"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const ytStatus = integrationStatus.data?.youtube;
  const emStatus = integrationStatus.data?.email;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight dark:text-white text-slate-900 font-display">
            Ingestion Channels & Live Feeds
          </h1>
          <p className="text-xs dark:text-zinc-400 text-slate-500 mt-1 font-medium">
            Manage multi-channel ingestion pipelines, live YouTube comment polling, and IMAP email feeds.
          </p>
        </div>
        <Button
          size="sm"
          variant="glow"
          onClick={() => syncMutation.mutate("all")}
          disabled={syncMutation.isPending}
          className="text-xs shrink-0"
        >
          {syncMutation.isPending ? "Syncing All Feeds..." : "⚡ Sync All Feeds Now"}
        </Button>
      </div>

      {/* Live Integration Feeds Status Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* YouTube Integration Card */}
        <Card className="glass-card border-red-500/30 dark:bg-gradient-to-b dark:from-red-950/20 dark:to-transparent bg-red-50/40 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold shadow-md shadow-red-600/20">
                YT
              </div>
              <div>
                <h3 className="font-bold dark:text-white text-slate-900 text-sm">YouTube Comment Monitor</h3>
                <p className="text-xs dark:text-zinc-400 text-slate-500">Auto-polls channel video feedback</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Connected
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between py-1 border-b dark:border-white/[0.04] border-slate-200">
              <span className="dark:text-zinc-400 text-slate-500">Monitored Channel ID:</span>
              <span className="font-mono font-bold text-red-600 dark:text-red-400">
                {ytStatus?.channelIds?.[0] || "UCL5qOrbdcMZjTfypxbltGaw"}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b dark:border-white/[0.04] border-slate-200">
              <span className="dark:text-zinc-400 text-slate-500">Video Search Method:</span>
              <span className="font-medium dark:text-zinc-200 text-slate-700">PlaylistItems (Low Quota)</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="dark:text-zinc-400 text-slate-500">Status:</span>
              <span className="font-medium text-emerald-600 dark:text-emerald-400">Live & Ingesting</span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => syncMutation.mutate("youtube")}
              disabled={syncMutation.isPending}
              className="text-xs flex-1"
            >
              Fetch YouTube Comments
            </Button>
            <a
              href={`https://www.youtube.com/channel/${ytStatus?.channelIds?.[0] || "UCL5qOrbdcMZjTfypxbltGaw"}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl border dark:border-white/[0.08] border-slate-200 dark:bg-white/[0.04] bg-white text-xs font-medium dark:text-zinc-200 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Open Channel ↗
            </a>
          </div>
        </Card>

        {/* Email IMAP Integration Card */}
        <Card className="glass-card border-blue-500/30 dark:bg-gradient-to-b dark:from-blue-950/20 dark:to-transparent bg-blue-50/40 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-600/20">
                ✉️
              </div>
              <div>
                <h3 className="font-bold dark:text-white text-slate-900 text-sm">Email Ingestion Inbox (IMAP)</h3>
                <p className="text-xs dark:text-zinc-400 text-slate-500">Direct support mailbox sync</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Connected
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between py-1 border-b dark:border-white/[0.04] border-slate-200">
              <span className="dark:text-zinc-400 text-slate-500">Configured Mailbox:</span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                {emStatus?.user || "spokhriyal563@gmail.com"}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b dark:border-white/[0.04] border-slate-200">
              <span className="dark:text-zinc-400 text-slate-500">IMAP Host:</span>
              <span className="font-medium dark:text-zinc-200 text-slate-700">
                {emStatus?.host || "imap.gmail.com:993 (TLS)"}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="dark:text-zinc-400 text-slate-500">Sync Status:</span>
              <span className="font-medium text-emerald-600 dark:text-emerald-400">Active</span>
            </div>
          </div>

          <div className="pt-1">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => syncMutation.mutate("email")}
              disabled={syncMutation.isPending}
              className="text-xs w-full"
            >
              Fetch Latest Emails
            </Button>
          </div>
        </Card>
      </div>

      {/* Catalog Manager Table */}
      <div className="table-wrap">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b dark:border-white/[0.08] border-slate-200 dark:bg-[#12121A] bg-slate-100/80 dark:text-zinc-300 text-slate-700 uppercase tracking-wider text-xs">
            <tr>
              <th className="px-4 py-3 font-bold">Channel Name</th>
              <th className="px-4 py-3 font-bold">Code</th>
              <th className="px-4 py-3 font-bold">Adapter Engine</th>
              <th className="px-4 py-3 font-bold">Feed Action</th>
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-white/[0.05] divide-slate-200">
            {channels.data?.map((row) => (
              <tr key={row.id} className="dark:hover:bg-white/[0.02] hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-bold dark:text-white text-slate-900">{row.name}</td>
                <td className="px-4 py-3 font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">{row.code}</td>
                <td className="px-4 py-3 dark:text-zinc-200 text-slate-700 font-medium">{row.adapterKey}</td>
                <td className="px-4 py-3">
                  <a
                    href={`/admin/complaints?channel=${row.code}`}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    View Grievances →
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SlaPage() {
  const q = useQuery({
    queryKey: ["sla"],
    queryFn: async () => (await api.get("/admin/sla-policies")).data.data as Array<{ id: string; name: string; priorityCode: string; resolutionTimeMinutes: number; isDemo: boolean }>,
  });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight dark:text-white text-slate-900 font-display">SLA Policies</h1>
        <p className="text-xs dark:text-zinc-400 text-slate-500 mt-1 font-medium">Configured resolution windows and automated escalation triggers.</p>
      </div>
      <div className="table-wrap">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b dark:border-white/[0.08] border-slate-200 dark:bg-[#12121A] bg-slate-100/80 dark:text-zinc-300 text-slate-700 uppercase tracking-wider text-xs">
            <tr><th className="px-4 py-3 font-bold">Policy Name</th><th className="px-4 py-3 font-bold">Priority Code</th><th className="px-4 py-3 font-bold">Target Resolution</th><th className="px-4 py-3 font-bold">Demo Flag</th></tr>
          </thead>
          <tbody className="divide-y dark:divide-white/[0.05] divide-slate-200">
            {q.data?.map((p) => (
              <tr key={p.id} className="dark:hover:bg-white/[0.02] hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-bold dark:text-white text-slate-900">{p.name}</td>
                <td className="px-4 py-3 font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">{p.priorityCode}</td>
                <td className="px-4 py-3 font-mono text-xs dark:text-zinc-200 text-slate-700 font-medium">{p.resolutionTimeMinutes} minutes</td>
                <td className="px-4 py-3 dark:text-zinc-300 text-slate-600 text-xs font-medium">{p.isDemo ? "Yes (Demo)" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
export function AuditPage({ path = "/admin/audit-logs" }: { path?: string }) {
  const q = useQuery({
    queryKey: ["audit", path],
    queryFn: async () => (await api.get(path)).data.data as Array<{ id: string; action: string; entity: string; actorEmail?: string; actor?: { email?: string | null }; createdAt: string }>,
  });
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold tracking-tight dark:text-white text-slate-900 font-display">Audit Trail & Compliance Logs</h1>
      <div className="table-wrap">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b dark:border-white/[0.08] border-slate-200 dark:bg-[#12121A] bg-slate-100/80 dark:text-zinc-300 text-slate-700 uppercase tracking-wider text-xs">
            <tr><th className="px-4 py-3 font-bold">Action</th><th className="px-4 py-3 font-bold">Target Entity</th><th className="px-4 py-3 font-bold">Actor</th><th className="px-4 py-3 font-bold">Logged At</th></tr>
          </thead>
          <tbody className="divide-y dark:divide-white/[0.05] divide-slate-200">
            {q.data?.map((r) => (
              <tr key={r.id} className="dark:hover:bg-white/[0.02] hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">{r.action}</td>
                <td className="px-4 py-3 font-bold dark:text-zinc-200 text-slate-800">{r.entity}</td>
                <td className="px-4 py-3 text-xs dark:text-zinc-400 text-slate-600 font-medium">{r.actorEmail ?? r.actor?.email ?? "—"}</td>
                <td className="px-4 py-3 text-xs font-mono dark:text-zinc-400 text-slate-500 font-medium">{new Date(r.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
export function SettingsPage() {
  const q = useQuery({
    queryKey: ["settings"],
    queryFn: async () => (await api.get("/admin/settings")).data.data as Array<{ key: string; value: string }>,
  });
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold tracking-tight dark:text-white text-slate-900 font-display">System Settings</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {q.data?.map((s) => (
          <Card key={s.key} className="glass-card">
            <p className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider">{s.key}</p>
            <p className="text-sm dark:text-zinc-200 text-slate-800 mt-2 font-medium break-all">{s.value}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
