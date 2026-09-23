import { useMemo, useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Globe, Mail, MessageSquare, RefreshCw, Search, User, Youtube } from "lucide-react";
import { toast } from "sonner";
import { api, apiErrorMessage } from "../../api/client";
import { Badge, Button, Empty, Input, Select, Spinner } from "../ui/Primitives";
import { slaRemaining } from "../../lib/utils";
import { useLookups, type Complaint } from "../../hooks/useLookups";

type Props = { detailBase: string; title: string; view?: "inbox" | "mine" | "escalated" | "overdue" };

function ChannelBadge({ code = "WEBSITE", name = "Website" }: { code?: string; name?: string }) {
  if (code === "YOUTUBE") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-red-500/10 dark:bg-red-500/20 px-2 py-0.5 text-[11px] font-semibold text-red-600 dark:text-red-400 border border-red-500/30">
        <Youtube className="h-3 w-3 fill-current" />
        YouTube
      </span>
    );
  }
  if (code === "EMAIL") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-500/10 dark:bg-blue-500/20 px-2 py-0.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400 border border-blue-500/30">
        <Mail className="h-3 w-3" />
        Email
      </span>
    );
  }
  if (code === "WHATSAPP") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 dark:bg-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
        <MessageSquare className="h-3 w-3" />
        WhatsApp
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-indigo-500/10 dark:bg-indigo-500/20 px-2 py-0.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
      <Globe className="h-3 w-3" />
      {name.replace(" (IMAP)", "").replace(" Comments", "")}
    </span>
  );
}

export function ComplaintTable({ detailBase, title, view }: Props) {
  const [searchParams] = useSearchParams();
  const qc = useQueryClient();
  const lookups = useLookups();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [channelCode, setChannelCode] = useState("");


  // Initialize search or channel from URL parameter
  useEffect(() => {
    const urlSearch = searchParams.get("search");
    if (urlSearch) setSearch(urlSearch);
    const urlChannel = searchParams.get("channel");
    if (urlChannel) setChannelCode(urlChannel);
  }, [searchParams]);

  const params = useMemo(
    () => ({
      page,
      pageSize: 15,
      view,
      search: search || undefined,
      status: status || undefined,
      priority: priority || undefined,
      categoryId: categoryId || undefined,
      channelCode: channelCode || undefined,
    }),
    [page, view, search, status, priority, categoryId, channelCode],
  );

  const query = useQuery({
    queryKey: ["complaints", params],
    queryFn: async () => {
      const res = await api.get("/complaints", { params });
      return {
        items: res.data.data as Complaint[],
        meta: res.data.meta as { page: number; totalPages: number; total: number },
      };
    },
    refetchInterval: 2500,
    refetchIntervalInBackground: true,
  });

  const syncMutation = useMutation({
    mutationFn: async () => (await api.post("/complaints/sync-channels")).data,
    onSuccess: (data) => {
      toast.success(data.message || "Channels synced! Checking new comments & emails.");
      qc.invalidateQueries({ queryKey: ["complaints"] });
      qc.invalidateQueries({ queryKey: ["my-summary"] });
      qc.invalidateQueries({ queryKey: ["agent-summary"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight dark:text-white text-slate-900">{title}</h1>
          <p className="text-xs dark:text-zinc-400 text-slate-500">
            {query.data?.meta.total ?? 0} total tickets in queue · Real-time live ingestion stream
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
            <RefreshCw className={`h-3.5 w-3.5 ${syncMutation.isPending ? "animate-spin text-indigo-500" : ""}`} />
            {syncMutation.isPending ? "Syncing Ingestion..." : "Sync Live Channels"}
          </Button>
        </div>
      </div>

      {/* Quick Channel Pill Filter */}
      <div className="flex flex-wrap items-center gap-2 pt-1 pb-1">
        {[
          { code: "", label: "All Channels" },
          { code: "YOUTUBE", label: "YouTube Comments", icon: Youtube, color: "text-red-600 dark:text-red-400" },
          { code: "EMAIL", label: "Inbound Email (IMAP)", icon: Mail, color: "text-blue-600 dark:text-blue-400" },
          { code: "WHATSAPP", label: "WhatsApp", icon: MessageSquare, color: "text-emerald-600 dark:text-emerald-400" },
          { code: "WEBSITE", label: "Website Portal", icon: Globe, color: "text-indigo-600 dark:text-indigo-400" },
        ].map((ch) => {
          const active = channelCode === ch.code;
          const Icon = ch.icon;
          return (
            <button
              key={ch.code}
              type="button"
              onClick={() => {
                setChannelCode(ch.code);
                setPage(1);
              }}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                active
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                  : "dark:bg-white/[0.04] bg-slate-100 dark:text-zinc-300 text-slate-700 hover:bg-slate-200 dark:hover:bg-white/[0.08]"
              }`}
            >
              {Icon ? <Icon className={`h-3.5 w-3.5 ${active ? "text-white" : ch.color}`} /> : null}
              {ch.label}
            </button>
          );
        })}
      </div>

      {/* Filter Toolbar */}
      <div className="rounded-2xl border dark:border-white/[0.08] border-slate-200 dark:bg-[#0D0D12] bg-white p-3.5 card-bevel grid gap-3 md:grid-cols-4 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 dark:text-zinc-500 text-slate-400" />
          <Input
            placeholder="Search tickets, customers, ID..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9 text-xs"
          />
        </div>
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          aria-label="All Status"
          className="text-xs"
        >
          <option value="">All Statuses</option>
          {["NEW", "CATEGORISED", "ASSIGNED", "IN_PROGRESS", "PENDING", "RESOLVED", "CLOSED", "ESCALATED", "REOPENED"].map(
            (s) => (
              <option key={s} value={s}>
                {s.replaceAll("_", " ")}
              </option>
            ),
          )}
        </Select>
        <Select
          value={priority}
          onChange={(e) => {
            setPriority(e.target.value);
            setPage(1);
          }}
          aria-label="All Priority"
          className="text-xs"
        >
          <option value="">All Priorities</option>
          {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Select
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            setPage(1);
          }}
          aria-label="All Categories"
          className="text-xs"
        >
          <option value="">All Categories</option>
          {lookups.data?.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>

      {query.isLoading ? <Spinner /> : null}

      {!query.isLoading && !query.data?.items.length ? (
        <Empty
          title="No complaints match these filters"
          body="Try clearing your search query or selecting a different status/priority filter."
        />
      ) : null}

      {query.data?.items.length ? (
        <div className="overflow-hidden rounded-2xl border dark:border-white/[0.08] border-slate-200 dark:bg-[#0D0D12] bg-white card-bevel shadow-sm">
          <div className="table-wrap border-0 rounded-none bg-transparent">
            <table className="min-w-full text-left text-xs">
              <thead className="border-b dark:border-white/[0.08] border-slate-200 dark:bg-[#12121A]/80 bg-slate-50 dark:text-zinc-400 text-slate-500 uppercase tracking-wider text-[10px]">
                <tr>
                  {["Ticket Ref", "Channel", "Customer", "Priority", "Status", "Assigned Agent", "SLA Countdown"].map((h) => (
                    <th key={h} className="px-4 py-3 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-white/[0.04] divide-slate-100">
                {query.data.items.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors group">
                    <td className="px-4 py-3 font-mono font-semibold">
                      <Link
                        to={`${detailBase}/${c.id}`}
                        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 transition-colors inline-flex items-center gap-1"
                      >
                        {c.complaintNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <ChannelBadge code={c.channel.code} name={c.channel.name} />
                    </td>
                    <td className="px-4 py-3 dark:text-zinc-200 text-slate-800 font-medium">
                      <div>{c.customer.name}</div>
                      <div className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">
                        {c.channel.code === "YOUTUBE" ? `@${c.customer.name}` : c.customer.email}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge value={c.priority} kind="priority" />
                    </td>
                    <td className="px-4 py-3">
                      <Badge value={c.status} />
                    </td>
                    <td className="px-4 py-3 dark:text-zinc-400 text-slate-600 flex items-center gap-1.5">
                      <User className="h-3 w-3 dark:text-zinc-500 text-slate-400" />
                      {c.assignedAgent?.name ?? <span className="dark:text-zinc-500 text-slate-400 italic">Unassigned</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Badge value={c.slaStatus} kind="sla" />
                        <span className="text-[11px] font-mono dark:text-zinc-400 text-slate-500">
                          {slaRemaining(c.slaDueAt, c.slaStatus)}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t dark:border-white/[0.08] border-slate-200 px-4 py-3 dark:bg-[#0A0A0F] bg-slate-50">
            <span className="text-xs dark:text-zinc-500 text-slate-500 font-mono">
              Page {page} of {query.data?.meta.totalPages || 1}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="text-xs"
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= (query.data?.meta.totalPages || 1)}
                onClick={() => setPage((p) => p + 1)}
                className="text-xs"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
