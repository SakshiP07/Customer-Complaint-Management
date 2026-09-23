import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock,
  Cpu,
  Globe,
  Layers,
  Mail,
  ShieldCheck,
  Sparkles,
  Users,
  Video,
  Zap,
} from "lucide-react";
import { useAuth } from "../../auth/AuthProvider";
import { Button, BentoCard, Badge } from "../../components/ui/Primitives";
import { homeFor, type Role } from "../../lib/utils";
import { ThemeToggle } from "../../components/ui/ThemeToggle";

const SAMPLE_COMPLAINTS = [
  {
    id: "CMP-2026-0941",
    channel: "Gmail IMAP",
    channelIcon: Mail,
    channelColor: "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20",
    title: "Overcharged on monthly enterprise subscription invoice",
    customer: "Priya Sharma (priya@acmecorp.in)",
    priority: "HIGH",
    status: "IN_PROGRESS",
    sentiment: "Frustrated (-0.82)",
    aiCategory: "Billing & Invoicing",
    confidence: "99.4%",
    sla: "1h 45m left",
    agent: "Vikram Mehta (Senior Billing)",
  },
  {
    id: "CMP-2026-0942",
    channel: "YouTube Comments",
    channelIcon: Video,
    channelColor: "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20",
    title: "Order delivered with broken seal and damaged packaging",
    customer: "Rahul Deshmukh (via YouTube @rahul_vlogs)",
    priority: "CRITICAL",
    status: "ESCALATED",
    sentiment: "Negative (-0.94)",
    aiCategory: "Damaged Delivery",
    confidence: "98.7%",
    sla: "25m left",
    agent: "Logistics Response Team",
  },
  {
    id: "CMP-2026-0943",
    channel: "Web Portal",
    channelIcon: Globe,
    channelColor: "text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/20",
    title: "Store branch staff refused return within 7-day window",
    customer: "Anita Roy (Mumbai Bandra)",
    priority: "MEDIUM",
    status: "CATEGORISED",
    sentiment: "Neutral (-0.35)",
    aiCategory: "Store Experience",
    confidence: "96.1%",
    sla: "5h 10m left",
    agent: "Regional Retail Ops",
  },
];

export function LandingPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [activeSample, setActiveSample] = useState(0);
  const [loggingInRole, setLoggingInRole] = useState<string | null>(null);

  const handleQuickLogin = async (email: string, roleCode: Role) => {
    try {
      setLoggingInRole(roleCode);
      const user = await login(email, "DemoPass123!");
      navigate(homeFor(user.role.code));
    } catch {
      navigate("/login");
    } finally {
      setLoggingInRole(null);
    }
  };

  const activeTicket = SAMPLE_COMPLAINTS[activeSample];

  return (
    <div className="relative min-h-screen transition-colors duration-200 dark:bg-[#050508] bg-[#F8FAFC] dark:text-[#EDEDED] text-slate-900 overflow-x-hidden font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Ambient Mesh Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[650px] bg-radial-glow pointer-events-none opacity-90" />
      <div className="absolute top-28 left-1/2 -translate-x-1/2 w-[850px] h-[400px] dark:bg-indigo-600/20 bg-gradient-to-r from-indigo-500/15 via-purple-500/15 to-pink-500/10 blur-[130px] pointer-events-none rounded-full" />
      <div className="absolute top-96 -left-32 w-80 h-80 bg-blue-500/10 blur-[110px] pointer-events-none rounded-full" />
      <div className="absolute top-96 -right-32 w-80 h-80 bg-purple-500/10 blur-[110px] pointer-events-none rounded-full" />

      {/* Floating Glassmorphic Pill Header */}
      <header className="fixed top-5 inset-x-0 z-50 flex justify-center px-4">
        <nav className="flex items-center justify-between gap-6 px-6 py-3 rounded-full glass-pill max-w-5xl w-full border">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-glow-sm shadow-indigo-500/25">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="font-display font-bold dark:text-white text-slate-900 tracking-tight text-lg">
              Complaint<span className="text-indigo-600 dark:text-indigo-400">OS</span>
            </span>
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 px-2.5 py-0.5 text-xs font-bold text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 shadow-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              v2.4 Glass
            </span>
          </div>

          <div className="hidden md:flex items-center gap-6 text-sm font-bold dark:text-zinc-200 text-slate-700">
            <a href="#features" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Features</a>
            <a href="#demo" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Interactive Demo</a>
            <a href="#accounts" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Demo Logins</a>
            <Link to="/complaints/track" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Track Ticket</Link>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link to="/complaints/new">
              <Button size="sm" variant="secondary" className="hidden sm:inline-flex text-xs font-bold">
                Submit Ticket
              </Button>
            </Link>
            <Link to="/login">
              <Button size="sm" variant="primary" className="text-xs font-bold">
                Sign In
              </Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="relative pt-36 md:pt-48 pb-20 px-4 max-w-6xl mx-auto">
        <div className="text-center space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-indigo-200/80 dark:border-white/[0.12] bg-white/90 dark:bg-white/[0.06] shadow-sm text-xs font-bold text-indigo-700 dark:text-indigo-300 backdrop-blur-md hover:border-indigo-300 transition-all cursor-default">
            <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span>Omnichannel Resolution & SLA Automation</span>
            <ArrowRight className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
          </div>

          {/* Headline */}
          <h1 className="font-display text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-[-0.04em] dark:text-white text-slate-950 leading-[1.08] max-w-4xl mx-auto">
            Customer service,{" "}
            <span className="font-serif italic font-normal text-gradient-vibrant">reinvented</span>{" "}
            with frosted clarity.
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg md:text-xl dark:text-zinc-300 text-slate-600 max-w-2xl mx-auto leading-relaxed font-normal">
            Centralise grievances across Gmail, YouTube comments, Web & WhatsApp. Powered by instant AI triage, real-time SLA Sentinels, and glassmorphic dashboards.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link to="/login">
              <Button size="lg" variant="primary">
                Launch Workspace <ArrowRight className="h-5 w-5 ml-1 transition-transform duration-200 group-hover:translate-x-1.5" />
              </Button>
            </Link>
            <Link to="/complaints/new">
              <Button size="lg" variant="secondary">
                File a Public Complaint
              </Button>
            </Link>
          </div>
        </div>

        {/* Live Interactive Triage Widget with Frosted Glass */}
        <section id="demo" className="mt-16 md:mt-24">
          <div className="glass-card relative rounded-3xl p-4 md:p-6 shadow-2xl border">
            {/* Top Bar of the Mockup */}
            <div className="flex items-center justify-between px-4 py-3 border-b dark:border-white/[0.08] border-slate-200">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-rose-500 shadow-xs" />
                <div className="h-3 w-3 rounded-full bg-amber-500 shadow-xs" />
                <div className="h-3 w-3 rounded-full bg-emerald-500 shadow-xs" />
                <span className="ml-2 font-mono text-xs font-bold dark:text-zinc-400 text-slate-600">live-triage-stream://central-inbox</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                  Auto-sync active
                </span>
              </div>
            </div>

            {/* Content Body */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 p-2 md:p-4">
              {/* Left Column: Interactive Queue */}
              <div className="lg:col-span-5 space-y-3">
                <p className="px-2 text-xs font-bold uppercase tracking-wider dark:text-zinc-400 text-slate-500">
                  Incoming Stream (Click ticket to inspect)
                </p>
                {SAMPLE_COMPLAINTS.map((item, idx) => {
                  const Icon = item.channelIcon;
                  const isActive = activeSample === idx;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setActiveSample(idx)}
                      className={`cursor-pointer rounded-2xl p-4.5 border transition-all duration-200 ${
                        isActive
                          ? "border-indigo-500 bg-gradient-to-br from-indigo-50/90 via-white to-purple-50/50 dark:from-indigo-950/40 dark:to-[#12121E] shadow-md shadow-indigo-500/10 ring-1 ring-indigo-500/20"
                          : "border-slate-200 dark:border-white/[0.08] bg-white/90 dark:bg-[#0E0E16]/80 hover:border-indigo-300 hover:shadow-md"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{item.id}</span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${item.channelColor}`}>
                          <Icon className="h-3.5 w-3.5" />
                          {item.channel}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-bold dark:text-white text-slate-900 tracking-tight line-clamp-1">
                        {item.title}
                      </p>
                      <div className="mt-3 flex items-center justify-between text-xs font-medium">
                        <Badge value={item.priority} kind="priority" />
                        <span className="flex items-center gap-1.5 font-mono font-semibold text-amber-600 dark:text-amber-400">
                          <Clock className="h-3.5 w-3.5" />
                          {item.sla}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right Column: AI Triage Deep Dive */}
              <div className="lg:col-span-7 rounded-2xl glass-card p-6 sm:p-7 flex flex-col justify-between border shadow-lg">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b dark:border-white/[0.08] border-slate-200 pb-4">
                    <div>
                      <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400 font-bold">{activeTicket.id}</span>
                      <h3 className="text-xl font-bold dark:text-white text-slate-900 tracking-tight mt-0.5">{activeTicket.title}</h3>
                      <p className="text-sm dark:text-zinc-400 text-slate-600 mt-1 font-medium">{activeTicket.customer}</p>
                    </div>
                    <Badge value={activeTicket.status} />
                  </div>

                  {/* AI Copilot Triage Grid */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-xl dark:bg-white/[0.04] bg-slate-50/80 p-4 border dark:border-white/[0.06] border-slate-200/90 shadow-xs">
                      <span className="text-[10px] uppercase font-bold tracking-wider dark:text-zinc-400 text-slate-500 block">AI Detected Category</span>
                      <span className="mt-1 font-bold dark:text-white text-slate-900 flex items-center gap-1.5 text-sm">
                        <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        {activeTicket.aiCategory}
                      </span>
                    </div>
                    <div className="rounded-xl dark:bg-white/[0.04] bg-slate-50/80 p-4 border dark:border-white/[0.06] border-slate-200/90 shadow-xs">
                      <span className="text-[10px] uppercase font-bold tracking-wider dark:text-zinc-400 text-slate-500 block">Customer Sentiment</span>
                      <span className="mt-1 font-bold text-rose-600 dark:text-rose-400 text-sm">{activeTicket.sentiment}</span>
                    </div>
                    <div className="rounded-xl dark:bg-white/[0.04] bg-slate-50/80 p-4 border dark:border-white/[0.06] border-slate-200/90 shadow-xs">
                      <span className="text-[10px] uppercase font-bold tracking-wider dark:text-zinc-400 text-slate-500 block">Smart Assignment</span>
                      <span className="mt-1 font-bold dark:text-white text-slate-900 text-sm">{activeTicket.agent}</span>
                    </div>
                    <div className="rounded-xl dark:bg-white/[0.04] bg-slate-50/80 p-4 border dark:border-white/[0.06] border-slate-200/90 shadow-xs">
                      <span className="text-[10px] uppercase font-bold tracking-wider dark:text-zinc-400 text-slate-500 block">Confidence Score</span>
                      <span className="mt-1 font-bold text-emerald-600 dark:text-emerald-400 text-sm">{activeTicket.confidence}</span>
                    </div>
                  </div>

                  {/* Auto-Generated Resolution Draft */}
                  <div className="rounded-xl border border-indigo-200 dark:border-indigo-500/30 bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/50 dark:from-indigo-950/30 dark:to-[#131322] p-4.5 shadow-xs">
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-800 dark:text-indigo-300 mb-2">
                      <Bot className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      Auto-Generated Resolution Recommendation
                    </div>
                    <p className="text-xs dark:text-zinc-200 text-slate-700 leading-relaxed font-medium">
                      "Acknowledged customer inquiry. Verified transaction details in internal ledger. Recommended initiating an automated reversal of ₹1,499 within 2 business hours to preserve customer loyalty."
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between pt-4 border-t dark:border-white/[0.08] border-slate-200">
                  <span className="text-xs font-bold dark:text-zinc-300 text-slate-700 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    SLA Guarantee Sentinel Active
                  </span>
                  <Link to="/login">
                    <Button size="sm" variant="primary">
                      Open in Agent Console <ArrowRight className="h-4 w-4 ml-1 transition-transform duration-200 group-hover:translate-x-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Bento Grid: Architecture & Capabilities */}
        <section id="features" className="mt-28 space-y-12">
          <div className="text-center space-y-3">
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight dark:text-white text-slate-900">
              Built like an operating system for customer trust.
            </h2>
            <p className="text-base dark:text-zinc-400 text-slate-600 max-w-xl mx-auto font-medium">
              Every integration and automation required to triage, resolve, and prevent operational bottlenecks at scale.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Bento Card 1: Omnichannel Ingestion */}
            <BentoCard
              title="Omnichannel Ingestion"
              subtitle="Capture grievances where customers speak"
              glow
              className="md:col-span-2"
              badge={
                <span className="rounded-full bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1 text-xs font-bold text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20">
                  5+ Connectors
                </span>
              }
            >
              <p className="text-sm dark:text-zinc-300 text-slate-600 leading-relaxed mb-6 font-medium">
                Native integrations for Gmail IMAP, YouTube channel comments poller, Web complaint portal, WhatsApp webhooks, and phone voice logs.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { name: "Gmail IMAP", desc: "Real-time inbox sync", icon: Mail },
                  { name: "YouTube Poller", desc: "Comment sentiment", icon: Video },
                  { name: "Web Portal", desc: "Public filing & track", icon: Globe },
                  { name: "REST API", desc: "Custom ingestion", icon: Cpu },
                ].map((c) => {
                  const Icon = c.icon;
                  return (
                    <div key={c.name} className="rounded-xl dark:bg-white/[0.04] bg-slate-50/80 border dark:border-white/[0.08] border-slate-200/90 p-4 text-center shadow-xs hover:border-indigo-300 transition-colors">
                      <Icon className="h-6 w-6 text-indigo-600 dark:text-indigo-400 mx-auto mb-2" />
                      <p className="text-xs font-bold dark:text-white text-slate-900">{c.name}</p>
                      <p className="text-[11px] dark:text-zinc-400 text-slate-500 mt-0.5 font-medium">{c.desc}</p>
                    </div>
                  );
                })}
              </div>
            </BentoCard>

            {/* Bento Card 2: SLA Sentinel */}
            <BentoCard
              title="SLA Sentinel"
              subtitle="Automated breach prevention"
              badge={<Badge value="ON_TRACK" kind="sla" />}
            >
              <p className="text-sm dark:text-zinc-300 text-slate-600 leading-relaxed mb-4 font-medium">
                Configurable tiered resolution windows. Automated manager escalations before customer trust is breached.
              </p>
              <div className="rounded-xl dark:bg-white/[0.04] bg-slate-50/80 border dark:border-white/[0.08] border-slate-200/90 p-4 space-y-3 text-xs shadow-xs">
                <div className="flex justify-between items-center">
                  <span className="dark:text-zinc-400 text-slate-600 font-bold">Critical Priority SLA</span>
                  <span className="dark:text-white text-slate-900 font-mono font-bold text-sm">2 Hours</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="dark:text-zinc-400 text-slate-600 font-bold">High Priority SLA</span>
                  <span className="dark:text-white text-slate-900 font-mono font-bold text-sm">6 Hours</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="dark:text-zinc-400 text-slate-600 font-bold">Escalation Trigger</span>
                  <span className="text-rose-600 dark:text-rose-400 font-mono font-bold text-sm">75% elapsed</span>
                </div>
              </div>
            </BentoCard>

            {/* Bento Card 3: AI Intelligence Engine */}
            <BentoCard
              title="AI Triage & Intent"
              subtitle="Zero manual routing latency"
              badge={<Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />}
            >
              <p className="text-sm dark:text-zinc-300 text-slate-600 leading-relaxed mb-4 font-medium">
                Instant NLP classification, root cause clustering, and automated resolution draft generation.
              </p>
              <div className="flex items-center gap-2.5 rounded-xl bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 p-3.5 text-xs font-semibold text-purple-800 dark:text-purple-300 shadow-xs">
                <Bot className="h-5 w-5 shrink-0 text-purple-600 dark:text-purple-400" />
                <span>Processes raw text into structured ticket metadata in &lt;150ms.</span>
              </div>
            </BentoCard>

            {/* Bento Card 4: Multi-Tenant Hierarchy */}
            <BentoCard
              title="Multi-Tenant Enterprise Hierarchy"
              subtitle="Regions, Store Branches & Departments"
              className="md:col-span-2"
              badge={<Layers className="h-5 w-5 text-sky-600 dark:text-sky-400" />}
            >
              <p className="text-sm dark:text-zinc-300 text-slate-600 leading-relaxed mb-4 font-medium">
                Role-based access control partitioning data between Super Admins, Regional Directors, Store Managers, and Frontline Agents.
              </p>
              <div className="grid grid-cols-3 gap-3 text-center text-xs">
                <div className="rounded-xl dark:bg-white/[0.04] bg-slate-50/80 border dark:border-white/[0.08] border-slate-200/90 p-4 shadow-xs">
                  <Users className="h-5 w-5 text-sky-600 dark:text-sky-400 mx-auto mb-1.5" />
                  <span className="font-bold dark:text-white text-slate-900 block text-sm">Role Scopes</span>
                  <span className="text-xs dark:text-zinc-400 text-slate-500 font-medium">6 Security Levels</span>
                </div>
                <div className="rounded-xl dark:bg-white/[0.04] bg-slate-50/80 border dark:border-white/[0.08] border-slate-200/90 p-4 shadow-xs">
                  <Globe className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mx-auto mb-1.5" />
                  <span className="font-bold dark:text-white text-slate-900 block text-sm">Geographic</span>
                  <span className="text-xs dark:text-zinc-400 text-slate-500 font-medium">North, South, West</span>
                </div>
                <div className="rounded-xl dark:bg-white/[0.04] bg-slate-50/80 border dark:border-white/[0.08] border-slate-200/90 p-4 shadow-xs">
                  <ShieldCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mx-auto mb-1.5" />
                  <span className="font-bold dark:text-white text-slate-900 block text-sm">Audit Trail</span>
                  <span className="text-xs dark:text-zinc-400 text-slate-500 font-medium">Immutable Logs</span>
                </div>
              </div>
            </BentoCard>
          </div>
        </section>

        {/* Demo Accounts Quick-Login Section */}
        <section id="accounts" className="mt-28 space-y-8">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 px-3.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 shadow-xs">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              1-Click Interactive Demo Login
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight dark:text-white text-slate-900">
              Test any persona instantly.
            </h2>
            <p className="text-base dark:text-zinc-400 text-slate-600 max-w-lg mx-auto font-medium">
              Click any role card below to log directly into its dedicated dashboard with pre-seeded data.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                role: "SUPER_ADMIN" as Role,
                email: "admin@example.com",
                name: "Super Admin",
                badge: "Full System Governance",
                desc: "SLA configuration, tenant settings, employee audit logs, analytics.",
              },
              {
                role: "OPERATIONS_MANAGER" as Role,
                email: "manager@example.com",
                name: "Operations Manager",
                badge: "Escalation & SLA",
                desc: "Monitor live agent queues, manage bottlenecks, resolve escalations.",
              },
              {
                role: "AGENT" as Role,
                email: "agent@example.com",
                name: "Frontline Agent",
                badge: "Triage & Response",
                desc: "Claim incoming tickets, respond with AI drafts, update ticket status.",
              },
              {
                role: "CUSTOMER" as Role,
                email: "customer@example.com",
                name: "Customer",
                badge: "Portal & Tracking",
                desc: "Submit new grievances, review live status, receive notifications.",
              },
            ].map((acc) => (
              <div
                key={acc.email}
                className="glass-card rounded-2xl p-6 flex flex-col justify-between border hover:border-indigo-500 hover:shadow-xl hover:-translate-y-1 transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold dark:text-white text-slate-900 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{acc.name}</span>
                    <span className="text-[10px] dark:text-zinc-400 text-slate-500 font-mono font-bold uppercase">{acc.badge}</span>
                  </div>
                  <p className="mt-3 text-xs dark:text-zinc-300 text-slate-600 leading-relaxed font-medium">{acc.desc}</p>
                  <p className="mt-4 font-mono text-xs text-indigo-600 dark:text-indigo-400 font-bold truncate">{acc.email}</p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-6 w-full text-xs font-bold"
                  disabled={loggingInRole === acc.role}
                  onClick={() => handleQuickLogin(acc.email, acc.role)}
                >
                  {loggingInRole === acc.role ? "Entering..." : `Log in as ${acc.name}`}
                </Button>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom CTA with Glassmorphic Gradient */}
        <section className="mt-28 rounded-3xl glass-card p-8 md:p-14 text-center border shadow-2xl space-y-6">
          <h2 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight dark:text-white text-slate-900 max-w-2xl mx-auto">
            Ready to experience frictionless complaint management?
          </h2>
          <p className="dark:text-zinc-300 text-slate-600 max-w-xl mx-auto text-base font-medium">
            Join thousands of customer service teams delivering fast, accountable, and transparent resolutions.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-2">
            <Link to="/login">
              <Button size="lg" variant="primary">
                Open Workspace <ArrowRight className="h-5 w-5 ml-1 transition-transform duration-200 group-hover:translate-x-1.5" />
              </Button>
            </Link>
            <Link to="/complaints/new">
              <Button size="lg" variant="secondary">
                Submit a Complaint
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Glassmorphic Minimal Footer */}
      <footer className="border-t dark:border-white/[0.08] border-slate-200 py-10 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs dark:text-zinc-400 text-slate-600 font-semibold">
          <div className="flex items-center gap-2.5">
            <div className="h-6 w-6 rounded-lg bg-indigo-500 flex items-center justify-center text-white font-bold text-xs">
              C
            </div>
            <span className="dark:text-white text-slate-800 font-bold">ComplaintOS</span>
            <span>— Centralised Customer Complaint Management Platform</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/complaints/track" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Track Complaint</Link>
            <Link to="/complaints/new" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">New Complaint</Link>
            <Link to="/login" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Staff Login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
