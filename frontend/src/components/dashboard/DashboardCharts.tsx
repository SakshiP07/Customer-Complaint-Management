import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../../api/client";
import { Card, Kpi, Spinner } from "../ui/Primitives";

type Summary = {
  total: number;
  open?: number;
  newComplaints: number;
  pending: number;
  overdue: number;
  resolved: number;
  escalated: number;
  slaCompliance: number;
  averageResolutionHours: number;
};

export function DashboardCharts({ pathPrefix = "/dashboard" }: { pathPrefix?: string }) {
  const summary = useQuery({ queryKey: [pathPrefix, "summary"], queryFn: async () => (await api.get(`${pathPrefix}/summary`)).data.data as Summary, refetchInterval: 10000 });
  const trends = useQuery({ queryKey: [pathPrefix, "trends"], queryFn: async () => (await api.get(`${pathPrefix}/trends`)).data.data as Array<{ date: string; count: number; resolved: number }>, refetchInterval: 10000 });
  const byCategory = useQuery({ queryKey: [pathPrefix, "category"], queryFn: async () => (await api.get(`${pathPrefix}/by-category`)).data.data as Array<{ name: string; count: number }>, refetchInterval: 10000 });

  if (summary.isLoading) return <Spinner />;
  const s = summary.data;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Kpi label="Total complaints" value={s?.total ?? 0} />
        <Kpi label="Open" value={s?.open ?? s?.pending ?? 0} />
        <Kpi label="Overdue" value={s?.overdue ?? 0} />
        <Kpi label="Resolved" value={s?.resolved ?? 0} />
      </div>
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card className="space-y-3">
          <div>
            <h2 className="font-semibold">Complaint Trends</h2>
            <p className="text-sm text-slate-500">New vs resolved complaints over time</p>
          </div>
          <div className="h-48 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends.data ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" hide />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="#1d4ed8" name="Created" dot={false} />
                <Line type="monotone" dataKey="resolved" stroke="#0f766e" name="Resolved" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="space-y-3">
          <div>
            <h2 className="font-semibold">Complaints by Category</h2>
            <p className="text-sm text-slate-500">Breakdown by issue type</p>
          </div>
          <div className="h-48 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCategory.data ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" hide />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#1d4ed8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
