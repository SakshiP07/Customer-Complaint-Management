import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  History,
  Mail,
  MessageSquare,
  Paperclip,
  Play,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Upload,
  User,
  Video,
  Youtube,
} from "lucide-react";

import { api, apiErrorMessage } from "../../api/client";
import { useAuth } from "../../auth/AuthProvider";
import { Badge, BentoCard, Button, Card, Empty, ErrorState, Input, Label, Select, Spinner, Textarea } from "../ui/Primitives";
import { formatDate, slaRemaining } from "../../lib/utils";
import type { Complaint } from "../../hooks/useLookups";

export function parseYouTubeDetails(subject?: string | null, description?: string | null) {
  const text = `${subject ?? ""} ${description ?? ""}`;

  // Extract videoId from [YouTube Video ID:...], [videoId:...], URL, or standard fallback
  const idMatch =
    text.match(/\[YouTube Video ID:\s*([a-zA-Z0-9_-]+)\]/i) ||
    text.match(/\[videoId:\s*([a-zA-Z0-9_-]+)\]/i) ||
    text.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i) ||
    text.match(/\[([a-zA-Z0-9_-]{11})\]/);

  // Extract videoTitle
  let videoTitle = "Timepass";
  const titleMatch =
    text.match(/\[YouTube Video Title:\s*([^\]]+)\]/i) ||
    (subject ?? "").match(/YouTube Comment on "(.*?)"/i) ||
    (subject ?? "").match(/YouTube:\s*(.*?)(?:\s*\[|$)/i) ||
    (subject ?? "").match(/Comment on video:\s*(.*?)(?:\s*\[|$)/i);
  if (titleMatch && titleMatch[1]) {
    videoTitle = titleMatch[1].trim();
  }

  // Extract commentId if any
  const commentMatch =
    text.match(/\[YouTube Comment ID:\s*([^\]]+)\]/i) ||
    text.match(/\[commentId:\s*([^\]]+)\]/i) ||
    (subject ?? "").match(/\[([a-zA-Z0-9_-]{15,})\]/);
  const commentId = commentMatch ? commentMatch[1].trim() : null;

  // Extract comment link
  const commentLinkMatch = text.match(/\[YouTube Comment Link:\s*([^\s\]]+)\]/i);

  const videoId = idMatch ? idMatch[1] : "Rx9EwdhLptQ"; // Default channel video
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}`;
  const commentUrl = commentLinkMatch
    ? commentLinkMatch[1]
    : commentId
      ? `https://www.youtube.com/watch?v=${videoId}&lc=${commentId}`
      : null;

  return {
    videoId,
    videoTitle,
    videoUrl,
    embedUrl,
    commentId,
    commentUrl,
  };
}


export function parseEmailDetails(subject?: string | null, description?: string | null, customer?: { name: string; email: string }) {
  const desc = description ?? "";
  const sub = subject ?? "";

  // Extract MsgId if present in subject or desc
  const msgIdMatch = (sub + " " + desc).match(/\[MsgId:<([^>]+)>\]/) || (sub + " " + desc).match(/MsgId:\s*<([^>]+)>/);
  const cleanSubject = sub.replace(/\[MsgId:[^\]]+\]/g, "").trim() || "Inbound Customer Inquiry";

  return {
    cleanSubject,
    messageId: msgIdMatch ? msgIdMatch[1] : `msg-${Math.random().toString(36).substring(2, 9)}@mail.support`,
    fromName: customer?.name || "Customer",
    fromEmail: customer?.email || "customer@example.com",
    toEmail: "support@complaintos.in",
  };
}

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
  const navigate = useNavigate();
  const { user } = useAuth();
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
    refetchInterval: 4000,
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
      const isDemoSend = typeof vars.body === "object" && vars.body !== null && (vars.body as any).delivery === "DEMO_SEND";
      const isEmail = query.data?.channel?.code === "EMAIL";
      
      if (isDemoSend && isEmail) {
         toast.success("Mail sent successfully!");
      } else {
         toast.success(vars.path.includes("/messages") ? "Response saved" : "Updated");
      }
      
      if (vars.path.includes("/messages") || vars.path.includes("/comments")) {
         setReply("");
      }
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
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b dark:border-white/[0.08] border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
            <span>OPERATIONS DESK</span>
            <span>/</span>
            <span>{c.channel.name}</span>
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight dark:text-white text-slate-900 mt-1">{c.complaintNumber}</h1>
          <p className="text-xs dark:text-zinc-400 text-slate-500 mt-1 font-medium">
            Raised by <strong className="dark:text-zinc-200 text-slate-800 font-bold">{c.customer.name}</strong> · {c.region.name}
            {c.store ? ` · ${c.store.name}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge value={c.status} />
          <Badge value={c.priority} kind="priority" />
          <Badge value={c.slaStatus} kind="sla" />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          {/* Ticket Metadata Card */}
          <Card className="glass-card text-xs">
            <h2 className="font-bold dark:text-white text-slate-900 tracking-tight text-sm mb-3">Ticket Information</h2>
            <dl className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              <div className="rounded-xl dark:bg-white/[0.04] bg-slate-50 p-3 border dark:border-white/[0.06] border-slate-200">
                <dt className="dark:text-zinc-400 text-slate-500 text-[10px] uppercase tracking-wider font-bold">Ticket ID</dt>
                <dd className="font-mono font-bold text-indigo-600 dark:text-indigo-400 mt-1">{c.complaintNumber}</dd>
              </div>
              <div className="rounded-xl dark:bg-white/[0.04] bg-slate-50 p-3 border dark:border-white/[0.06] border-slate-200">
                <dt className="dark:text-zinc-400 text-slate-500 text-[10px] uppercase tracking-wider font-bold">Ingestion Channel</dt>
                <dd className="font-medium dark:text-white text-slate-900 mt-1">{c.channel.name}</dd>
              </div>
              <div className="rounded-xl dark:bg-white/[0.04] bg-slate-50 p-3 border dark:border-white/[0.06] border-slate-200">
                <dt className="dark:text-zinc-400 text-slate-500 text-[10px] uppercase tracking-wider font-bold">Issue Category</dt>
                <dd className="font-bold text-indigo-600 dark:text-indigo-300 mt-1">{c.category?.name ?? "Uncategorised"}</dd>
              </div>
              <div className="rounded-xl dark:bg-white/[0.04] bg-slate-50 p-3 border dark:border-white/[0.06] border-slate-200">
                <dt className="dark:text-zinc-400 text-slate-500 text-[10px] uppercase tracking-wider font-bold">Assigned Agent</dt>
                <dd className="font-medium dark:text-white text-slate-900 mt-1 flex items-center gap-1">
                  <User className="h-3 w-3 dark:text-zinc-500 text-slate-400" />
                  {c.assignedAgent?.name ?? "Unassigned"}
                </dd>
              </div>
              <div className="rounded-xl dark:bg-white/[0.04] bg-slate-50 p-3 border dark:border-white/[0.06] border-slate-200">
                <dt className="dark:text-zinc-400 text-slate-500 text-[10px] uppercase tracking-wider font-bold">Created Timestamp</dt>
                <dd className="dark:text-zinc-300 text-slate-700 mt-1 font-medium">{formatDate(c.createdAt)}</dd>
              </div>
              <div className="rounded-xl dark:bg-white/[0.04] bg-slate-50 p-3 border dark:border-white/[0.06] border-slate-200">
                <dt className="dark:text-zinc-400 text-slate-500 text-[10px] uppercase tracking-wider font-bold">Guaranteed SLA</dt>
                <dd className="text-amber-600 dark:text-amber-400 font-mono font-bold mt-1 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {slaRemaining(c.slaDueAt, c.slaStatus) || "Active"}
                </dd>
              </div>
            </dl>
          </Card>

          {/* Ingestion Channel Grievance View (YouTube Video / Verified Email / General) */}
          {c.channel.code === "YOUTUBE" || (c.subject && c.subject.toLowerCase().includes("youtube")) ? (
            (() => {
              const yt = parseYouTubeDetails(c.subject, c.description);
              return (
                <Card className="glass-card border-rose-500/30 dark:bg-rose-950/[0.04] bg-rose-50/50 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b dark:border-white/[0.08] border-rose-200 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-600 text-white shadow-md shadow-red-600/30">
                        <Youtube className="h-4 w-4 fill-current" />
                      </span>
                      <div>
                        <h2 className="text-sm font-bold dark:text-white text-slate-900 flex items-center gap-1.5">
                          YouTube Video Comment Grievance
                        </h2>
                        <p className="text-[11px] dark:text-zinc-400 text-slate-500">
                          Ingested from brand channel video thread
                        </p>
                      </div>
                    </div>
                    <a
                      href={yt.videoUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-red-500 transition-colors"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                      Watch on YouTube
                      <ExternalLink className="h-3 w-3 ml-0.5" />
                    </a>
                  </div>

                  {/* Responsive Embedded YouTube Video Player */}
                  <div className="overflow-hidden rounded-xl border dark:border-white/[0.1] border-slate-300 bg-black shadow-lg">
                    <div className="relative aspect-video w-full">
                      <iframe
                        src={`${yt.embedUrl}?rel=0`}
                        title={yt.videoTitle}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="absolute inset-0 h-full w-full border-0"
                      />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-900/90 text-white text-xs">
                      <div className="flex items-center gap-2">
                        <Video className="h-3.5 w-3.5 text-red-400" />
                        <span className="font-semibold text-slate-100">{yt.videoTitle}</span>
                      </div>
                      <span className="font-mono text-[10px] text-slate-400">Video ID: {yt.videoId}</span>
                    </div>
                  </div>

                  {/* Comment Details for This Video */}
                  <div className="rounded-xl border dark:border-white/[0.08] border-rose-200 dark:bg-white/[0.03] bg-white p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs pb-2 border-b dark:border-white/[0.06] border-slate-100">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-red-500/20 text-red-600 dark:text-red-400 font-bold flex items-center justify-center text-[10px]">
                          YT
                        </div>
                        <span className="font-bold dark:text-zinc-200 text-slate-800">
                          @{c.customer.name}
                        </span>
                        <span className="text-[10px] dark:text-zinc-400 text-slate-500 font-mono">
                          (Channel ID: {c.customer.email.replace("@youtube.com", "")})
                        </span>
                      </div>
                      <span className="text-[11px] dark:text-zinc-400 text-slate-500 font-mono">
                        {formatDate(c.createdAt)}
                      </span>
                    </div>
                    <div className="pt-1">
                      <p className="text-[11px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-1">
                        Comment Posted on this Video:
                      </p>
                      <div
                        className="text-xs dark:text-zinc-200 text-slate-800 leading-relaxed prose dark:prose-invert max-w-none font-medium bg-slate-50 dark:bg-black/30 p-3 rounded-lg border dark:border-white/[0.04] border-slate-200"
                        dangerouslySetInnerHTML={{ __html: c.description }}
                      />
                    </div>
                  </div>
                </Card>
              );
            })()
          ) : c.channel.code === "EMAIL" || c.customer.email.includes("@") ? (
            (() => {
              const em = parseEmailDetails(c.subject, c.description, c.customer);
              return (
                <Card className="glass-card border-blue-500/30 dark:bg-blue-950/[0.04] bg-blue-50/40 space-y-4">
                  {/* Email Envelope Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b dark:border-white/[0.08] border-blue-200 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/30">
                        <Mail className="h-4 w-4" />
                      </span>
                      <div>
                        <h2 className="text-sm font-bold dark:text-white text-slate-900 flex items-center gap-1.5">
                          Verified Inbound Email Grievance
                        </h2>
                        <p className="text-[11px] dark:text-zinc-400 text-slate-500">
                          Ingested via SSL IMAP mail listener
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        IMAP Authenticated
                      </span>
                    </div>
                  </div>

                  {/* Structured Email Headers */}
                  <div className="rounded-xl border dark:border-white/[0.06] border-blue-100 dark:bg-white/[0.02] bg-white p-3.5 text-xs space-y-2 shadow-sm">
                    <div className="grid grid-cols-[60px_1fr] gap-1 items-baseline">
                      <span className="font-bold text-slate-400 dark:text-zinc-500 text-[10px] uppercase tracking-wider">From:</span>
                      <div className="font-semibold dark:text-zinc-200 text-slate-800">
                        {em.fromName} <span className="font-mono text-indigo-600 dark:text-indigo-400 font-normal">&lt;{em.fromEmail}&gt;</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-[60px_1fr] gap-1 items-baseline">
                      <span className="font-bold text-slate-400 dark:text-zinc-500 text-[10px] uppercase tracking-wider">To:</span>
                      <div className="dark:text-zinc-300 text-slate-700 font-medium">
                        ComplaintOS Support Desk <span className="font-mono text-slate-500">&lt;{em.toEmail}&gt;</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-[60px_1fr] gap-1 items-baseline">
                      <span className="font-bold text-slate-400 dark:text-zinc-500 text-[10px] uppercase tracking-wider">Date:</span>
                      <div className="dark:text-zinc-300 text-slate-700 font-medium">{formatDate(c.createdAt)}</div>
                    </div>
                    <div className="grid grid-cols-[60px_1fr] gap-1 items-baseline">
                      <span className="font-bold text-slate-400 dark:text-zinc-500 text-[10px] uppercase tracking-wider">Subject:</span>
                      <div className="font-bold text-slate-900 dark:text-white">{em.cleanSubject}</div>
                    </div>
                  </div>

                  {/* Email Body */}
                  <div className="rounded-xl border dark:border-white/[0.06] border-slate-200 dark:bg-white/[0.03] bg-white p-4 space-y-2 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                      Message Content:
                    </p>
                    <div
                      className="text-xs dark:text-zinc-200 text-slate-800 leading-relaxed prose dark:prose-invert max-w-none font-medium"
                      dangerouslySetInnerHTML={{ __html: c.description }}
                    />
                  </div>
                </Card>
              );
            })()
          ) : (
            <Card className="glass-card">
              <h2 className="font-bold dark:text-white text-slate-900 tracking-tight text-sm mb-2">Customer Grievance Statement</h2>
              <div
                className="rounded-xl border dark:border-white/[0.06] border-slate-200 dark:bg-white/[0.03] bg-slate-50 p-4 text-xs dark:text-zinc-200 text-slate-800 leading-relaxed prose dark:prose-invert max-w-none font-medium"
                dangerouslySetInnerHTML={{ __html: c.description }}
              />
            </Card>
          )}

          {/* Conversation & Replies */}
          <Card className="glass-card">
            <h2 className="font-bold dark:text-white text-slate-900 tracking-tight text-sm mb-3 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-indigo-500" />
              Conversation Thread
            </h2>
            <div className="space-y-3">
              {messages.length === 0 && customerComments.length === 0 ? (
                <p className="text-xs dark:text-zinc-500 text-slate-400 italic">No conversation logged yet.</p>
              ) : null}
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`rounded-xl border p-4 text-xs ${m.senderType === "CUSTOMER"
                      ? "dark:border-white/[0.06] border-slate-200 dark:bg-white/[0.03] bg-slate-50"
                      : "border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/[0.05]"
                    }`}
                >
                  <div className="flex items-center justify-between text-[10px] dark:text-zinc-400 text-slate-500 pb-1.5 border-b dark:border-white/[0.04] border-slate-200 mb-2 font-medium">
                    <span className="font-bold dark:text-zinc-300 text-slate-800">
                      {m.senderType} · {m.authorName ?? "System"}
                    </span>
                    <span className="font-mono">{formatDate(m.createdAt)}</span>
                  </div>
                  <div className="dark:text-zinc-200 text-slate-800 leading-relaxed font-medium" dangerouslySetInnerHTML={{ __html: m.body }} />
                </div>
              ))}
              {customerComments.map((cm) => (
                <div key={cm.id} className="rounded-xl border dark:border-white/[0.06] border-slate-200 dark:bg-white/[0.03] bg-slate-50 p-3 text-xs">
                  <p className="text-[10px] dark:text-zinc-400 text-slate-500 mb-1 font-semibold">
                    {cm.authorName ?? "User"} · {formatDate(cm.createdAt)}
                  </p>
                  <div className="dark:text-zinc-200 text-slate-800" dangerouslySetInnerHTML={{ __html: cm.comment }} />
                </div>
              ))}
            </div>

            {staff ? (
              <div className="mt-5 pt-4 border-t dark:border-white/[0.08] border-slate-200 space-y-3">
                <Label htmlFor="reply">Draft Agent Response</Label>
                <Textarea
                  id="reply"
                  rows={4}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Draft customer communication..."
                  className="text-xs"
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() =>
                      mutate.mutate({ path: `/complaints/${id}/messages`, body: { body: reply, delivery: "PREPARED" } })
                    }
                  >
                    Save Prepared Response
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      mutate.mutate({ path: `/complaints/${id}/messages`, body: { body: reply, delivery: "DEMO_SEND" } })
                    }
                  >
                    {c.channel.code === "WEBSITE" ? "Send on Website Portal" : c.channel.code === "EMAIL" ? "Send via Email" : `Demo Send via ${c.channel.name}`}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-5 pt-4 border-t dark:border-white/[0.08] border-slate-200 space-y-2">
                <Textarea
                  rows={3}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Add clarification or update..."
                  className="text-xs"
                />
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() =>
                    mutate.mutate({ path: `/complaints/${id}/comments`, body: { comment: reply, visibility: "CUSTOMER" } })
                  }
                >
                  Post Customer Update
                </Button>
              </div>
            )}
          </Card>

          {/* Internal Notes */}
          {staff ? (
            <Card className="border-amber-500/20 bg-amber-500/[0.02]">
              <h2 className="font-semibold text-amber-300 tracking-tight text-sm mb-1 flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4" /> Internal Investigation Notes (Confidential)
              </h2>
              <p className="text-[11px] text-zinc-400 mb-3">Visible only to agents and operations managers.</p>
              <div className="space-y-2 mb-3">
                {internalNotes.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic">No internal notes added.</p>
                ) : null}
                {internalNotes.map((cm) => (
                  <div key={cm.id} className="rounded-xl border border-white/[0.06] bg-[#14141C] p-3 text-xs">
                    <p className="text-[10px] text-zinc-400 mb-1">
                      {cm.authorName ?? "Employee"} · {formatDate(cm.createdAt)}
                    </p>
                    <p className="text-zinc-200">{cm.comment}</p>
                  </div>
                ))}
              </div>
              <Textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Log internal finding, store call log, or escalation reason..."
                className="text-xs mb-2"
              />
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  mutate.mutate({ path: `/complaints/${id}/comments`, body: { comment: note, visibility: "INTERNAL" } })
                }
              >
                Log Internal Note
              </Button>
            </Card>
          ) : null}

          {/* Staff Quick Action Bar */}
          {staff ? (
            <Card className="flex flex-wrap items-center gap-2 bg-[#0D0D12]">
              {manager && (
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    mutate.mutate({ path: `/complaints/${id}/assign`, body: { agentId } });
                  }}
                >
                  <Select
                    value={agentId}
                    onChange={(e) => setAgentId(e.target.value)}
                    aria-label="Assign agent"
                    className="text-xs w-44"
                  >
                    <option value="">Reassign Agent</option>
                    {agents.data?.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </Select>
                  <Button size="sm" variant="secondary" type="submit">
                    Assign
                  </Button>
                </form>
              )}
              <Select
                defaultValue={c.priority}
                onChange={(e) =>
                  api.patch(`/complaints/${id}`, { priority: e.target.value }).then(() => {
                    toast.success("Priority updated");
                    refresh();
                  })
                }
                aria-label="Priority"
                className="text-xs w-32"
              >
                {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </Select>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => mutate.mutate({ path: `/complaints/${id}/status`, body: { status: "IN_PROGRESS" } })}
              >
                Start In-Progress
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => mutate.mutate({ path: `/complaints/${id}/status`, body: { status: "PENDING" } })}
              >
                Mark Pending
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  mutate.mutate({
                    path: `/complaints/${id}/status`,
                    body: { status: "CLOSED", notes: "Closed by agent" },
                  })
                }
              >
                Close Ticket
              </Button>
              {(user?.role.code === "ADMIN" || user?.role.code === "SUPER_ADMIN") && (
                <Button
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={async () => {
                    if (confirm("Are you sure you want to completely delete this complaint? This cannot be undone.")) {
                      try {
                        await api.delete(`/complaints/${id}`);
                        toast.success("Complaint deleted successfully");
                        navigate(-1);
                      } catch (err) {
                        toast.error(apiErrorMessage(err));
                      }
                    }
                  }}
                >
                  Delete Complaint
                </Button>
              )}
            </Card>
          ) : null}

          {/* Resolve & Escalate Panels */}
          {staff && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="glass-card space-y-3">
                <h3 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" /> Resolve Complaint
                </h3>
                <Textarea
                  rows={3}
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  placeholder="State resolution details (e.g. refund processed, replacement dispatched)..."
                  className="text-xs"
                />
                <Button
                  size="sm"
                  variant="primary"
                  className="w-full"
                  onClick={() => mutate.mutate({ path: `/complaints/${id}/resolve`, body: { resolution } })}
                >
                  Mark as Resolved
                </Button>
              </Card>

              <Card className="glass-card space-y-3">
                <h3 className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4" /> Escalate to Leadership
                </h3>
                <Textarea
                  rows={3}
                  value={escalateReason}
                  onChange={(e) => setEscalateReason(e.target.value)}
                  placeholder="State justification for managerial escalation..."
                  className="text-xs"
                />
                <Button
                  size="sm"
                  variant="danger"
                  className="w-full"
                  onClick={() =>
                    mutate.mutate({ path: `/complaints/${id}/escalate`, body: { reason: escalateReason } })
                  }
                >
                  Trigger Escalation
                </Button>
              </Card>
            </div>
          )}

          {/* Attachments */}
          <Card className="glass-card">
            <h2 className="font-bold dark:text-white text-slate-900 tracking-tight text-sm mb-3 flex items-center gap-1.5">
              <Paperclip className="h-4 w-4 text-indigo-500" /> Attachments
            </h2>
            <ul className="space-y-1.5 text-xs">
              {(c.attachments ?? []).length === 0 ? <p className="dark:text-zinc-500 text-slate-400 italic">No attachments.</p> : null}
              {(c.attachments ?? []).map((a) => (
                <li key={a.id} className="flex items-center gap-2 rounded-xl dark:bg-white/[0.04] bg-slate-50 p-2.5 border dark:border-white/[0.06] border-slate-200">
                  <FileText className="h-4 w-4 text-indigo-500" />
                  <span className="font-medium dark:text-zinc-200 text-slate-800">{a.fileName}</span>
                  <span className="text-[10px] dark:text-zinc-500 text-slate-400 font-mono">({Math.round(a.size / 1024)} KB)</span>
                </li>
              ))}
            </ul>
            <form
              className="mt-3 flex items-center gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                const file = (e.currentTarget.elements.namedItem("file") as HTMLInputElement).files?.[0];
                if (!file) return;
                const body = new FormData();
                body.append("file", file);
                try {
                  await api.post(`/complaints/${id}/attachments`, body);
                  toast.success("Attachment uploaded");
                  refresh();
                } catch (err) {
                  toast.error(apiErrorMessage(err));
                }
              }}
            >
              <Input id="file" name="file" type="file" className="text-xs" />
              <Button type="submit" size="sm" variant="secondary" className="shrink-0">
                <Upload className="h-3.5 w-3.5" /> Upload
              </Button>
            </form>
          </Card>
        </div>

        {/* Right Sidebar: AI Assistant & Timeline */}
        <div className="space-y-6">
          {/* AI Copilot Card */}
          {staff && (
            <BentoCard
              title="AI Assistant Copilot"
              subtitle="Real-time sentiment & auto-drafting"
              glow
              badge={<Sparkles className="h-4 w-4 text-indigo-500" />}
            >
              <Button
                size="sm"
                variant="glow"
                className="w-full text-xs"
                onClick={async () => {
                  try {
                    const res = await api.post(`/complaints/${id}/ai-analyse`);
                    setAi(res.data.data);
                  } catch (e) {
                    toast.error(apiErrorMessage(e));
                  }
                }}
              >
                <Bot className="h-3.5 w-3.5 mr-1" /> Run AI Triage & Draft
              </Button>

              {ai && (
                <div className="mt-4 space-y-3 text-xs">
                  {!ai.available ? (
                    <ErrorState message={ai.patternNotes || "AI unavailable"} />
                  ) : (
                    <>
                      <div className="rounded-xl border dark:border-white/[0.06] border-slate-200 dark:bg-white/[0.04] bg-slate-50 p-3.5">
                        <span className="text-[10px] dark:text-zinc-400 text-slate-500 uppercase tracking-wider block font-bold">AI Summary</span>
                        <p className="dark:text-zinc-200 text-slate-800 mt-1 font-medium">{ai.summary}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="rounded-xl border dark:border-white/[0.06] border-slate-200 dark:bg-white/[0.04] bg-slate-50 p-3">
                          <span className="dark:text-zinc-500 text-slate-500 text-[10px] font-bold uppercase block">Suggested Category</span>
                          <span className="text-indigo-600 dark:text-indigo-300 font-bold mt-0.5 block">{ai.suggestedCategoryName}</span>
                        </div>
                        <div className="rounded-xl border dark:border-white/[0.06] border-slate-200 dark:bg-white/[0.04] bg-slate-50 p-3">
                          <span className="dark:text-zinc-500 text-slate-500 text-[10px] font-bold uppercase block">Suggested Priority</span>
                          <span className="text-amber-600 dark:text-amber-300 font-bold mt-0.5 block">{ai.suggestedPriority}</span>
                        </div>
                      </div>
                      <div className="rounded-xl border border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/[0.08] p-3.5">
                        <span className="text-[10px] text-indigo-700 dark:text-indigo-300 uppercase tracking-wider block mb-1 font-bold">
                          Drafted Response
                        </span>
                        <p className="dark:text-zinc-200 text-slate-700 leading-relaxed text-xs font-medium">{ai.suggestedResponse}</p>
                      </div>
                      <Button size="sm" variant="secondary" className="w-full text-xs" onClick={useAiResponse}>
                        Apply Drafted Response
                      </Button>
                    </>
                  )}
                </div>
              )}
            </BentoCard>
          )}

          {/* Activity Timeline */}
          <Card className="glass-card">
            <h2 className="font-bold dark:text-white text-slate-900 tracking-tight text-sm mb-3 flex items-center gap-1.5">
              <History className="h-4 w-4 text-indigo-500" /> Audit Timeline
            </h2>
            <ol className="space-y-3 text-xs">
              {(c.history ?? []).length === 0 ? <p className="dark:text-zinc-500 text-slate-400 italic">No history logged.</p> : null}
              {(c.history ?? []).map((h) => (
                <li key={h.id} className="relative pl-4 border-l dark:border-white/[0.1] border-slate-200">
                  <span className="absolute -left-[4.5px] top-1.5 h-2 w-2 rounded-full bg-indigo-500" />
                  <p className="font-bold dark:text-zinc-200 text-slate-800">
                    {h.actionType.replaceAll("_", " ")}
                    {h.newStatus ? ` → ${h.newStatus.replaceAll("_", " ")}` : ""}
                  </p>
                  <p className="text-[10px] dark:text-zinc-400 text-slate-500 mt-0.5 font-medium">
                    {h.changedBy?.name ?? "System"} · {formatDate(h.createdAt)}
                  </p>
                  {h.notes ? <p className="dark:text-zinc-300 text-slate-600 mt-1 text-xs">{h.notes}</p> : null}
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}
