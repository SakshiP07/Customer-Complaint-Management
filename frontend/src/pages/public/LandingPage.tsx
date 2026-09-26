import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "../../components/ui/Primitives";
import { ThemeToggle } from "../../components/ui/ThemeToggle";

export function LandingPage() {
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
