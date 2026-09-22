import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { api, apiErrorMessage } from "../../api/client";
import { useAuth } from "../../auth/AuthProvider";
import { Badge, Button, Card, Empty, ErrorState, Input, Label, Select, Spinner, Textarea } from "../ui/Primitives";
import { formatDate, slaRemaining } from "../../lib/utils";
import type { Complaint } from "../../hooks/useLookups";
import { useLookups } from "../../hooks/useLookups";

type AiResult = {
  id?: string;
  available: boolean;
  suggestedCategoryName?: string | null;
  suggestedPriority?: string | null;
  summary?: string | null;
  suggestedResponse?: string | null;
  suggestedNextSteps?: string[];
  patternNotes?: string | null;
};

export function ComplaintDetail() {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const lookups = useLookups();
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const [reply, setReply] = useState("");
  const [resolution, setResolution] = useState("");
  const [escalateReason, setEscalateReason] = useState("");
  const [agentId, setAgentId] = useState("");
  const [ai, setAi] = useState<AiResult | null>(null);

  const query = useQuery({
    queryKey: ["complaint", id],
    queryFn: async () => (await api.get(`/complaints/${id}`)).data.data as Complaint,
  });
  const agents = useQuery({
    queryKey: ["agents"],
    queryFn: async () => (await api.get("/users", { params: { role: "AGENT", pageSize: 100 } })).data.data as Array<{ id: string; name: string }>,
    enabled: user?.role.code !== "CUSTOMER",
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["complaint", id] });

  const mutate = useMutation({
    mutationFn: async ({ path, body }: { path: string; body?: unknown }) => api.post(path, body),
    onSuccess: (_res, vars) => {
      toast.success(vars.path.includes("/messages") ? "Response saved" : "Updated");
      refresh();
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  if (query.isLoading) return <Spinner />;
  if (query.error) return <ErrorState message={apiErrorMessage(query.error)} />;
  const c = query.data;
  if (!c) return <Empty title="Complaint not found" />;

  const staff = user?.role.code !== "CUSTOMER";
  const manager = ["OPERATIONS_MANAGER", "REGIONAL_MANAGER", "ADMIN", "SUPER_ADMIN"].includes(user?.role.code ?? "");
  const messages = c.conversation?.messages ?? [];
  const internalNotes = (c.comments ?? []).filter((cm) => cm.visibility === "INTERNAL");
  const customerComments = (c.comments ?? []).filter((cm) => cm.visibility === "CUSTOMER");

  const useAiResponse = () => {
    if (ai?.suggestedResponse) setReply(ai.suggestedResponse);
    toast.success("Draft copied. Review before sending.");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Employee workspace</p>
          <h1 className="text-2xl font-semibold">{c.complaintNumber}</h1>
          <p className="text-sm text-slate-500">{c.channel.name} · {c.customer.name} · {c.region.name}{c.store ? ` · ${c.store.name}` : ""}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge value={c.status} />
          <Badge value={c.priority} kind="priority" />
          <Badge value={c.slaStatus} kind="sla" />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <Card className="space-y-3 text-sm">
            <h2 className="font-medium">Customer complaint</h2>
            <dl className="grid gap-2 sm:grid-cols-2">
              <div><dt className="text-slate-500">Complaint ID</dt><dd>{c.complaintNumber}</dd></div>
              <div><dt className="text-slate-500">Source channel</dt><dd>{c.channel.name}</dd></div>
              <div><dt className="text-slate-500">Customer</dt><dd>{c.customer.name}</dd></div>
              <div><dt className="text-slate-500">Category</dt><dd>{c.category?.name ?? "—"}</dd></div>
              <div><dt className="text-slate-500">Priority</dt><dd>{c.priority}</dd></div>
              <div><dt className="text-slate-500">Region / store</dt><dd>{c.region.name}{c.store ? ` · ${c.store.name}` : ""}</dd></div>
              <div><dt className="text-slate-500">Created</dt><dd>{formatDate(c.createdAt)}</dd></div>
              <div><dt className="text-slate-500">Assigned employee</dt><dd>{c.assignedAgent?.name ?? "Unassigned"}</dd></div>
              <div><dt className="text-slate-500">SLA due</dt><dd>{formatDate(c.slaDueAt)} · {slaRemaining(c.slaDueAt, c.slaStatus)}</dd></div>
            </dl>
          </Card>

          <Card>
            <h2 className="font-medium">Customer message</h2>
            <div className="mt-2 text-sm text-slate-700 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: c.description }} />
          </Card>

          <Card>
            <h2 className="font-medium">Conversation</h2>
            <div className="mt-3 space-y-3">
              {messages.length === 0 && customerComments.length === 0 ? <p className="text-sm text-slate-500">No conversation yet.</p> : null}
              {messages.map((m) => (
                <div key={m.id} className={`rounded-md p-3 text-sm ${m.senderType === "CUSTOMER" ? "bg-slate-50" : "bg-blue-50"}`}>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {m.senderType} · {m.authorName ?? "System"} · {formatDate(m.createdAt)}
                    {m.deliveryStatus === "PREPARED" ? " · Prepared response" : null}
                    {m.deliveryStatus === "DEMO_SEND" ? " · Demo send (channel not live)" : null}
                  </p>
                  <div className="mt-1 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: m.body }} />
                </div>
              ))}
              {customerComments.map((cm) => (
                <div key={cm.id} className="rounded-md bg-slate-50 p-3 text-sm">
                  <p className="text-xs text-slate-500">{cm.authorName ?? "User"} · customer-visible · {formatDate(cm.createdAt)}</p>
                  <div className="mt-1 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: cm.comment }} />
                </div>
              ))}
            </div>
            {staff ? (
              <div className="mt-4 space-y-2">
                <Label htmlFor="reply">Employee response</Label>
                <Textarea id="reply" rows={4} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write a customer response. AI never sends this automatically." />
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => mutate.mutate({ path: `/complaints/${id}/messages`, body: { body: reply, delivery: "PREPARED" } })}>Save prepared response</Button>
                  <Button variant="secondary" onClick={() => mutate.mutate({ path: `/complaints/${id}/messages`, body: { body: reply, delivery: "DEMO_SEND" } })}>
                    {c.channel.code === "WEBSITE" ? "Send on website conversation" : `Demo send via ${c.channel.name}`}
                  </Button>
                </div>
                {c.channel.code !== "WEBSITE" ? (
                  <p className="text-xs text-slate-500">{c.channel.name} is not live. Demo send stores the reply here and does not transmit it on the external platform.</p>
                ) : null}
              </div>
            ) : (
              <div className="mt-4">
                <Textarea rows={3} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Add an update" />
                <Button className="mt-2" onClick={() => mutate.mutate({ path: `/complaints/${id}/comments`, body: { comment: reply, visibility: "CUSTOMER" } })}>Add update</Button>
              </div>
            )}
          </Card>

          {staff ? (
            <Card className="border-amber-200 bg-amber-50/40">
              <h2 className="font-medium">Internal notes</h2>
              <p className="text-xs text-slate-500">Employees and managers only. Customers never see these notes.</p>
              <div className="mt-3 space-y-2">
                {internalNotes.length === 0 ? <p className="text-sm text-slate-500">No internal notes yet.</p> : null}
                {internalNotes.map((cm) => (
                  <div key={cm.id} className="rounded-md bg-white p-3 text-sm">
                    <p className="text-xs text-slate-500">{cm.authorName ?? "Employee"} · {formatDate(cm.createdAt)}</p>
                    <p className="mt-1">{cm.comment}</p>
                  </div>
                ))}
              </div>
              <Textarea className="mt-3" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add an internal investigation note" />
              <Button className="mt-2" variant="secondary" onClick={() => mutate.mutate({ path: `/complaints/${id}/comments`, body: { comment: note, visibility: "INTERNAL" } })}>Add internal note</Button>
            </Card>
          ) : null}

          {staff ? (
            <Card className="flex flex-wrap gap-3">
              {manager ? (
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    mutate.mutate({ path: `/complaints/${id}/assign`, body: { agentId } });
                  }}
                >
                  <Select value={agentId} onChange={(e) => setAgentId(e.target.value)} aria-label="Assign agent">
                    <option value="">Assign / reassign</option>
                    {agents.data?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </Select>
                  <Button type="submit">Assign</Button>
                </form>
              ) : (
                <p className="text-sm text-slate-500">Assigned to: {c.assignedAgent?.name ?? "Unassigned"}</p>
              )}
              <Select
                defaultValue={c.priority}
                onChange={(e) => api.patch(`/complaints/${id}`, { priority: e.target.value }).then(() => { toast.success("Priority updated"); refresh(); })}
                aria-label="Priority"
              >
                {["LOW","MEDIUM","HIGH","CRITICAL"].map((p) => <option key={p}>{p}</option>)}
              </Select>
              <Select
                defaultValue={c.category?.id}
                onChange={(e) => api.patch(`/complaints/${id}`, { categoryId: e.target.value }).then(refresh)}
                aria-label="Category"
              >
                {lookups.data?.categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </Select>
              <Button variant="secondary" onClick={() => mutate.mutate({ path: `/complaints/${id}/status`, body: { status: "IN_PROGRESS" } })}>Start investigation</Button>
              <Button variant="secondary" onClick={() => mutate.mutate({ path: `/complaints/${id}/status`, body: { status: "PENDING" } })}>Mark pending</Button>
              <Button variant="secondary" onClick={() => mutate.mutate({ path: `/complaints/${id}/status`, body: { status: "CLOSED", notes: "Closed after resolution" } })}>Close</Button>
            </Card>
          ) : null}

          {staff ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <h2 className="font-medium">Resolve</h2>
                <Textarea rows={4} value={resolution} onChange={(e) => setResolution(e.target.value)} />
                <Button className="mt-2" onClick={() => mutate.mutate({ path: `/complaints/${id}/resolve`, body: { resolution } })}>Resolve</Button>
              </Card>
              <Card>
                <h2 className="font-medium">Escalate</h2>
                <Textarea rows={4} value={escalateReason} onChange={(e) => setEscalateReason(e.target.value)} />
                <Button className="mt-2" variant="danger" onClick={() => mutate.mutate({ path: `/complaints/${id}/escalate`, body: { reason: escalateReason } })}>Escalate</Button>
              </Card>
            </div>
          ) : null}

          {c.resolution ? (
            <Card>
              <h2 className="font-medium">Resolution</h2>
              <p className="mt-2 text-sm text-slate-700">{c.resolution}</p>
            </Card>
          ) : null}

          <Card>
            <h2 className="font-medium">Attachments</h2>
            <ul className="mt-2 text-sm">
              {(c.attachments ?? []).map((a) => (
                <li key={a.id}>{a.fileName} ({Math.round(a.size / 1024)} KB)</li>
              ))}
            </ul>
            <form
              className="mt-3"
              onSubmit={async (e) => {
                e.preventDefault();
                const file = (e.currentTarget.elements.namedItem("file") as HTMLInputElement).files?.[0];
                if (!file) return;
                const body = new FormData();
                body.append("file", file);
                try {
                  await api.post(`/complaints/${id}/attachments`, body);
                  toast.success("Uploaded");
                  refresh();
                } catch (err) {
                  toast.error(apiErrorMessage(err));
                }
              }}
            >
              <Label htmlFor="file">Upload</Label>
              <Input id="file" name="file" type="file" />
              <Button type="submit" className="mt-2" variant="secondary">Upload attachment</Button>
            </form>
          </Card>
        </div>

        <div className="space-y-4">
          {staff ? (
            <Card>
              <h2 className="font-medium">AI Assistant</h2>
              <p className="text-xs text-slate-500">Uses this complaint’s description, conversation, and similar tickets. Never auto-sends a customer reply.</p>
              <Button
                className="mt-3"
                variant="secondary"
                onClick={async () => {
                  try {
                    const res = await api.post(`/complaints/${id}/ai-analyse`);
                    setAi(res.data.data);
                  } catch (e) {
                    toast.error(apiErrorMessage(e));
                  }
                }}
              >
                Analyse this complaint
              </Button>
              {ai ? (
                <div className="mt-3 space-y-2 text-sm">
                  {!ai.available ? <ErrorState message={ai.patternNotes || "AI unavailable"} /> : null}
                  {ai.available ? (
                    <>
                      <p><strong>Complaint summary</strong><br />{ai.summary}</p>
                      <p><strong>Suggested category</strong><br />{ai.suggestedCategoryName}</p>
                      <p><strong>Suggested priority</strong><br />{ai.suggestedPriority}</p>
                      {(ai.suggestedNextSteps ?? []).length ? (
                        <div>
                          <strong>Suggested next steps</strong>
                          <ol className="mt-1 list-decimal pl-4">
                            {ai.suggestedNextSteps?.map((step) => <li key={step}>{step}</li>)}
                          </ol>
                        </div>
                      ) : null}
                      <p><strong>Suggested response</strong><br />{ai.suggestedResponse}</p>
                      {ai.patternNotes ? <p className="text-slate-600">{ai.patternNotes}</p> : null}
                      {ai.id ? (
                        <div className="flex flex-wrap gap-2">
                          <Button onClick={useAiResponse}>Use response</Button>
                          <Button variant="secondary" onClick={() => api.post(`/complaints/${id}/ai-review/${ai.id}`, { status: "EDITED", suggestedResponse: reply || ai.suggestedResponse }).then(() => toast.success("Kept as edited draft"))}>Edit</Button>
                          <Button variant="ghost" onClick={() => api.post(`/complaints/${id}/ai-review/${ai.id}`, { status: "REJECTED" }).then(() => toast.success("Rejected"))}>Reject</Button>
                        </div>
                      ) : null}
                    </>
                  ) : null}
                </div>
              ) : null}
            </Card>
          ) : null}

          <Card>
            <h2 className="font-medium">Activity timeline</h2>
            <ol className="mt-3 space-y-2 text-sm">
              {(c.history ?? []).map((h) => (
                <li key={h.id} className="border-l-2 border-slate-200 pl-3">
                  <p className="font-medium">{h.actionType.replaceAll("_", " ")} {h.newStatus ? `→ ${h.newStatus.replaceAll("_", " ")}` : ""}</p>
                  <p className="text-slate-500">{h.changedBy?.name ?? "System"} · {formatDate(h.createdAt)}</p>
                  {h.notes ? <p>{h.notes}</p> : null}
                </li>
              ))}
            </ol>
          </Card>

          <Card>
            <h2 className="font-medium">SLA</h2>
            {(c.slaRecords ?? []).slice(0, 1).map((s) => (
              <div key={s.responseDueAt} className="mt-2 space-y-1 text-sm">
                <p>{s.slaPolicy.name}</p>
                <p>Response due {formatDate(s.responseDueAt)}</p>
                <p>Resolution due {formatDate(s.resolutionDueAt)}</p>
              </div>
            ))}
            <h2 className="mt-4 font-medium">Escalations</h2>
            {(c.escalations ?? []).length === 0 ? <p className="text-sm text-slate-500">None</p> : null}
            {(c.escalations ?? []).map((e) => (
              <p key={e.id} className="text-sm">{e.type} · {e.status} · {e.reason}</p>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
