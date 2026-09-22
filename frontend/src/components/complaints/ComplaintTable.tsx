import { useMemo, useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/client";
import { Badge, Button, Card, Empty, Input, Select, Spinner } from "../ui/Primitives";
import { slaRemaining } from "../../lib/utils";
import { useLookups, type Complaint } from "../../hooks/useLookups";

type Props = { detailBase: string; title: string; view?: "inbox" | "mine" | "escalated" | "overdue" };

export function ComplaintTable({ detailBase, title, view }: Props) {
  const [searchParams] = useSearchParams();
  const lookups = useLookups();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [categoryId, setCategoryId] = useState("");

  // Initialize search from URL parameter
  useEffect(() => {
    const urlSearch = searchParams.get("search");
    if (urlSearch) {
      setSearch(urlSearch);
    }
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
    }),
    [page, view, search, status, priority, categoryId],
  );

  const query = useQuery({
    queryKey: ["complaints", params],
    queryFn: async () => {
      const res = await api.get("/complaints", { params });
      return { items: res.data.data as Complaint[], meta: res.data.meta as { page: number; totalPages: number; total: number } };
    },
    refetchInterval: 30000,
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="text-sm text-slate-500">{query.data?.meta.total ?? 0} complaints</p>
      </div>
      <Card className="grid gap-3 md:grid-cols-4">
        <Input placeholder="Search complaints..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="All Status">
          <option value="">All Status</option>
          {["NEW","CATEGORISED","ASSIGNED","IN_PROGRESS","PENDING","RESOLVED","CLOSED","ESCALATED","REOPENED"].map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
        <Select value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1); }} aria-label="All Priority">
          <option value="">All Priority</option>
          {["LOW","MEDIUM","HIGH","CRITICAL"].map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
        <Select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPage(1); }} aria-label="All Categories">
          <option value="">All Categories</option>
          {lookups.data?.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </Card>
      {query.isLoading ? <Spinner /> : null}
      {!query.isLoading && !query.data?.items.length ? <Empty title="No complaints match these filters" /> : null}
      {query.data?.items.length ? (
        <div className="table-wrap">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                {["Complaint ID","Customer","Priority","Status","Assigned To","SLA"].map((h) => (
                  <th key={h} className="px-3 py-2 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {query.data.items.map((c) => (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-medium"><Link to={`${detailBase}/${c.id}`} className="text-blue-800 hover:underline">{c.complaintNumber}</Link></td>
                  <td className="px-3 py-2">{c.customer.name}</td>
                  <td className="px-3 py-2"><Badge value={c.priority} kind="priority" /></td>
                  <td className="px-3 py-2"><Badge value={c.status} /></td>
                  <td className="px-3 py-2">{c.assignedAgent?.name ?? "Unassigned"}</td>
                  <td className="px-3 py-2"><Badge value={c.slaStatus} kind="sla" /> <span className="text-xs text-slate-500">{slaRemaining(c.slaDueAt, c.slaStatus)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <div className="flex items-center gap-2">
        <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
        <span className="text-sm text-slate-600">Page {page} of {query.data?.meta.totalPages || 1}</span>
        <Button variant="secondary" disabled={page >= (query.data?.meta.totalPages || 1)} onClick={() => setPage((p) => p + 1)}>Next</Button>
      </div>
    </div>
  );
}
