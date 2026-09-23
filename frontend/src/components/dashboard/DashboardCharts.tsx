import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../../api/client";
import { BentoCard, Kpi, Spinner } from "../ui/Primitives";
import { useTheme } from "../../context/ThemeContext";

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
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const summary = useQuery({
    queryKey: [pathPrefix, "summary"],
    queryFn: async () => (await api.get(`${pathPrefix}/summary`)).data.data as Summary,
    refetchInterval: 10000,
  });
  const trends = useQuery({
    queryKey: [pathPrefix, "trends"],
    queryFn: async () =>
      (await api.get(`${pathPrefix}/trends`)).data.data as Array<{ date: string; count: number; resolved: number }>,
    refetchInterval: 10000,
  });
  const byCategory = useQuery({
    queryKey: [pathPrefix, "category"],
    queryFn: async () =>
      (await api.get(`${pathPrefix}/by-category`)).data.data as Array<{ name: string; count: number }>,
    refetchInterval: 10000,
  });

  if (summary.isLoading) return <Spinner />;
  const s = summary.data;

  const tooltipStyle = {
    backgroundColor: isDark ? "#0D0D12" : "#FFFFFF",
    borderColor: isDark ? "rgba(255,255,255,0.15)" : "#E2E8F0",
    borderRadius: "12px",
    color: isDark ? "#EDEDED" : "#0F172A",
    fontSize: "12px",
    boxShadow: isDark ? "0 10px 25px -5px rgba(0,0,0,0.5)" : "0 10px 25px -5px rgba(0,0,0,0.1)",
  };

  const gridStroke = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const tickColor = isDark ? "#71717A" : "#64748B";

  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Kpi label="Total Grievances" value={s?.total ?? 0} trend="+12% this week" />
        <Kpi label="Active In Queue" value={s?.open ?? s?.pending ?? 0} />
        <Kpi label="Overdue SLA" value={s?.overdue ?? 0} />
        <Kpi label="Resolved Cases" value={s?.resolved ?? 0} trend="94.2% SLA" />
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <BentoCard title="Complaint Velocity Trends" subtitle="Incoming volume vs resolved completions">
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends.data ?? []}>
                <defs>
                  <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="date" stroke={tickColor} tick={{ fontSize: 10, fill: tickColor }} hide />
                <YAxis stroke={tickColor} tick={{ fontSize: 10, fill: tickColor }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#6366F1"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCreated)"
                  name="Created"
                />
                <Area
                  type="monotone"
                  dataKey="resolved"
                  stroke="#10B981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorResolved)"
                  name="Resolved"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </BentoCard>

        <BentoCard title="Volume by Issue Category" subtitle="Root cause distribution across all stores">
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCategory.data ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="name" stroke={tickColor} hide />
                <YAxis stroke={tickColor} tick={{ fontSize: 10, fill: tickColor }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="#6366F1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </BentoCard>
      </div>
    </div>
  );
}
