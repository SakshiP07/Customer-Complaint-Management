import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";
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
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <Card>
        <form
          className="grid gap-3 md:grid-cols-3"
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
          <div className="flex items-end"><Button type="submit">Add</Button></div>
        </form>
      </Card>
      <div className="table-wrap">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50">
            <tr>{fields.map((f) => <th key={f.key} className="px-3 py-2">{f.label}</th>)}</tr>
          </thead>
          <tbody>
            {q.data?.map((row) => (
              <tr key={row.id} className="border-t">
                {fields.map((f) => <td key={f.key} className="px-3 py-2">{String(row[f.key] ?? "")}</td>)}
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
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Administration</h1>
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
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Users</h1>
      <div className="table-wrap">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50"><tr><th className="px-3 py-2">Name</th><th className="px-3 py-2">Email</th><th className="px-3 py-2">Role</th><th className="px-3 py-2">Active</th></tr></thead>
          <tbody>
            {q.data?.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="px-3 py-2">{u.name}</td>
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2">{u.role.name}</td>
                <td className="px-3 py-2">{u.isActive ? "Yes" : "No"}</td>
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
  return <CatalogManager title="Channels" path="/admin/channels" fields={[{ key: "name", label: "Name" }, { key: "code", label: "Code" }, { key: "adapterKey", label: "Adapter" }]} />;
}
export function SlaPage() {
  const q = useQuery({
    queryKey: ["sla"],
    queryFn: async () => (await api.get("/admin/sla-policies")).data.data as Array<{ id: string; name: string; priorityCode: string; resolutionTimeMinutes: number; isDemo: boolean }>,
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">SLA policies</h1>
      <p className="text-sm text-slate-500">Seeded values are demo configuration and should be replaced before production.</p>
      <div className="table-wrap">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50"><tr><th className="px-3 py-2">Name</th><th className="px-3 py-2">Priority</th><th className="px-3 py-2">Resolution minutes</th><th className="px-3 py-2">Demo</th></tr></thead>
          <tbody>
            {q.data?.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-3 py-2">{p.name}</td>
                <td className="px-3 py-2">{p.priorityCode}</td>
                <td className="px-3 py-2">{p.resolutionTimeMinutes}</td>
                <td className="px-3 py-2">{p.isDemo ? "Yes" : "No"}</td>
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
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Audit logs</h1>
      <div className="table-wrap">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50"><tr><th className="px-3 py-2">Action</th><th className="px-3 py-2">Entity</th><th className="px-3 py-2">Actor</th><th className="px-3 py-2">When</th></tr></thead>
          <tbody>
            {q.data?.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">{r.action}</td>
                <td className="px-3 py-2">{r.entity}</td>
                <td className="px-3 py-2">{r.actorEmail ?? r.actor?.email ?? "—"}</td>
                <td className="px-3 py-2">{new Date(r.createdAt).toLocaleString()}</td>
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
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Settings</h1>
      {q.data?.map((s) => (
        <Card key={s.key}><p className="text-sm font-medium">{s.key}</p><p className="text-sm text-slate-600">{s.value}</p></Card>
      ))}
    </div>
  );
}
