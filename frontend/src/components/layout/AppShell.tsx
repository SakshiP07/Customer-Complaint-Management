import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Bell,
  Layers,
  LogOut,
  Menu,
  Search,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthProvider";
import { api } from "../../api/client";
import { cx, homeFor } from "../../lib/utils";
import { Input } from "../ui/Primitives";
import { ThemeToggle } from "../ui/ThemeToggle";

type NavItem = { to: string; label: string; icon?: React.ElementType };

function navFor(role: string): NavItem[] {
  if (role === "CUSTOMER") {
    return [
      { to: "/customer/dashboard", label: "Dashboard" },
      { to: "/customer/complaints", label: "My Complaints" },
      { to: "/complaints/new", label: "Submit New" },
      { to: "/customer/profile", label: "Account Profile" },
    ];
  }
  if (role === "AGENT") {
    return [
      { to: "/agent/dashboard", label: "Dashboard" },
      { to: "/agent/inbox", label: "Central Inbox" },
      { to: "/agent/complaints", label: "My Queue" },
      { to: "/agent/youtube-comments", label: "YouTube Grievances" },
      { to: "/complaints/new", label: "File Grievance" },
      { to: "/agent/escalated", label: "Escalations" },
      { to: "/agent/overdue", label: "Overdue" },
      { to: "/agent/ai", label: "AI Copilot" },
      { to: "/agent/performance", label: "My Scorecard" },
    ];
  }
  if (role === "OPERATIONS_MANAGER") {
    return [
      { to: "/manager/dashboard", label: "Overview" },
      { to: "/manager/complaints", label: "All Complaints" },
      { to: "/manager/youtube-comments", label: "YouTube Grievances" },
      { to: "/complaints/new", label: "File Grievance" },
      { to: "/manager/escalations", label: "Escalation Hub" },
      { to: "/manager/sla", label: "SLA Monitoring" },
      { to: "/manager/recurring-issues", label: "Root Causes" },
      { to: "/manager/employees", label: "Agent Performance" },
      { to: "/manager/reports", label: "Operations Reports" },
      { to: "/manager/audit-logs", label: "Audit Logs" },
    ];
  }
  if (role === "REGIONAL_MANAGER") {
    return [
      { to: "/regional/dashboard", label: "Regional Hub" },
      { to: "/regional/complaints", label: "Regional Queue" },
      { to: "/regional/youtube-comments", label: "YouTube Grievances" },
      { to: "/complaints/new", label: "File Grievance" },
      { to: "/regional/escalations", label: "Escalations" },
      { to: "/regional/sla", label: "Regional SLA" },
      { to: "/regional/recurring-issues", label: "Regional Trends" },
      { to: "/regional/employees", label: "Regional Staff" },
    ];
  }
  return [
    { to: "/admin/dashboard", label: "Global Command" },
    { to: "/admin/complaints", label: "All Grievances" },
    { to: "/admin/youtube-comments", label: "YouTube Grievances" },
    { to: "/complaints/new", label: "File Grievance" },
    { to: "/admin/users", label: "User Management" },
    { to: "/admin/employees", label: "Employee Hub" },
    { to: "/admin/regions", label: "Regional Scopes" },
    { to: "/admin/stores", label: "Store Outlets" },
    { to: "/admin/categories", label: "Issue Taxonomy" },
    { to: "/admin/channels", label: "Ingestion Channels" },
    { to: "/admin/sla", label: "SLA Matrices" },
    { to: "/admin/audit-logs", label: "Audit Trails" },
    { to: "/admin/settings", label: "System Config" },
  ];
}

export function AppShell() {
  const { user, logout, login } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const items = navFor(user?.role.code ?? "CUSTOMER");

  const notifications = useQuery({
    queryKey: ["notifications"],
    queryFn: async () =>
      (await api.get("/notifications", { params: { unread: true } })).data.data as Array<{
        id: string;
        message: string;
        createdAt: string;
      }>,
    enabled: Boolean(user),
    refetchInterval: 30000,
  });

  useEffect(() => {
    setOpen(false);
  }, [items]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const basePath =
        user?.role.code === "CUSTOMER"
          ? "/customer/complaints"
          : user?.role.code === "AGENT"
            ? "/agent/complaints"
            : user?.role.code === "OPERATIONS_MANAGER"
              ? "/manager/complaints"
              : user?.role.code === "REGIONAL_MANAGER"
                ? "/regional/complaints"
                : "/admin/complaints";
      navigate(`${basePath}?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleRoleQuickSwitch = async (email: string) => {
    try {
      const u = await login(email, "DemoPass123!");
      navigate(homeFor(u.role.code));
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-screen flex font-sans transition-colors duration-200 dark:bg-[#050508] bg-[#F8FAFC] dark:text-[#EDEDED] text-slate-900 selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Sidebar with Glassmorphism */}
      <aside
        className={cx(
          "glass-panel w-72 flex-shrink-0 flex flex-col h-screen sticky top-0 overflow-y-auto z-40 transition-all duration-300 border-r dark:border-white/[0.08] border-slate-200",
          open ? "fixed inset-y-0 left-0" : "hidden lg:flex",
        )}
      >
        {/* Brand */}
        <div className="border-b dark:border-white/[0.08] border-slate-200 px-6 py-4 flex items-center justify-between">
          <NavLink to="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-glow-sm shrink-0">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="font-display font-bold dark:text-white text-slate-900 tracking-tight text-base">ComplaintOS</span>
              <span className="block text-[10px] dark:text-zinc-400 text-indigo-600 font-mono tracking-wider uppercase font-semibold">ENTERPRISE</span>
            </div>
          </NavLink>
          {open && (
            <button onClick={() => setOpen(false)} className="lg:hidden dark:text-zinc-400 text-slate-500 hover:text-slate-900 dark:hover:text-white p-1">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* User Identity Chip */}
        <div className="px-4 pt-4 pb-2">
          <div className="glass-card rounded-2xl p-3.5 border dark:border-white/[0.08] border-slate-200">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-500 dark:text-indigo-400 border border-indigo-500/30 font-bold text-sm shrink-0">
                {user?.name?.charAt(0) ?? "U"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold dark:text-white text-slate-900 truncate">{user?.name}</p>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-mono font-semibold tracking-wide">{user?.role.code?.replaceAll("_", " ")}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 flex flex-col gap-1 px-3.5 py-3" aria-label="Primary">
          <p className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider dark:text-zinc-400 text-slate-400">Navigation</p>
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cx(
                  "flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-150 group",
                  isActive
                    ? "dark:bg-white/[0.12] dark:text-white bg-indigo-50 text-indigo-600 font-bold border dark:border-white/[0.16] border-indigo-200 shadow-sm"
                    : "dark:text-zinc-300 text-slate-600 hover:bg-slate-100 dark:hover:bg-white/[0.05] dark:hover:text-white hover:text-slate-900",
                )
              }
            >
              <span>{item.label}</span>
              <span className="h-2 w-2 rounded-full bg-indigo-500 opacity-0 group-[.active]:opacity-100 transition-opacity" />
            </NavLink>
          ))}
        </nav>

        {/* Quick Demo Role Switcher in Sidebar Footer */}
        <div className="border-t dark:border-white/[0.08] border-slate-200 p-4 space-y-3">
          <div className="glass-card rounded-xl p-3 border dark:border-white/[0.08] border-slate-200">
            <p className="text-[11px] font-bold dark:text-zinc-400 text-slate-500 font-mono uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-indigo-500" /> Demo Switcher
            </p>
            <div className="grid grid-cols-2 gap-1.5 text-xs font-semibold">
              <button
                onClick={() => handleRoleQuickSwitch("admin@example.com")}
                className="rounded-lg dark:bg-white/[0.06] bg-slate-100 px-2.5 py-1.5 dark:text-zinc-200 text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:text-white dark:hover:bg-indigo-600/30 text-left truncate transition-colors cursor-pointer"
              >
                Admin
              </button>
              <button
                onClick={() => handleRoleQuickSwitch("manager@example.com")}
                className="rounded-lg dark:bg-white/[0.06] bg-slate-100 px-2.5 py-1.5 dark:text-zinc-200 text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:text-white dark:hover:bg-indigo-600/30 text-left truncate transition-colors cursor-pointer"
              >
                Manager
              </button>
              <button
                onClick={() => handleRoleQuickSwitch("agent@example.com")}
                className="rounded-lg dark:bg-white/[0.06] bg-slate-100 px-2.5 py-1.5 dark:text-zinc-200 text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:text-white dark:hover:bg-indigo-600/30 text-left truncate transition-colors cursor-pointer"
              >
                Agent
              </button>
              <button
                onClick={() => handleRoleQuickSwitch("customer@example.com")}
                className="rounded-lg dark:bg-white/[0.06] bg-slate-100 px-2.5 py-1.5 dark:text-zinc-200 text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:text-white dark:hover:bg-indigo-600/30 text-left truncate transition-colors cursor-pointer"
              >
                Customer
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <NavLink
              to={`/${user?.role.code?.toLowerCase()}/profile`}
              className="text-sm font-semibold dark:text-zinc-400 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Profile
            </NavLink>
            <button
              onClick={async () => {
                await logout();
                navigate("/login");
              }}
              className="flex items-center gap-1.5 text-sm font-semibold text-rose-500 hover:text-rose-600 transition-colors cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen dark:bg-[#050508] bg-[#F8FAFC]">
        {/* Sticky Glassmorphic Topbar */}
        <header className="glass-panel flex items-center justify-between border-b dark:border-white/[0.08] border-slate-200 px-6 md:px-8 py-3.5 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden dark:text-zinc-400 text-slate-600 hover:text-slate-900 dark:hover:text-white p-1"
              onClick={() => setOpen((v) => !v)}
              aria-label="Toggle navigation"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-sm font-mono">
              <span className="dark:text-zinc-500 text-slate-400 font-semibold">workspace</span>
              <span>/</span>
              <span className="dark:text-zinc-200 text-slate-800 uppercase font-bold">{user?.role.code?.replaceAll("_", " ")}</span>
            </div>
          </div>

          <form onSubmit={handleSearch} className="flex-1 max-w-lg mx-6">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 dark:text-zinc-400 text-slate-400" />
              <Input
                type="search"
                placeholder="Quick search tickets (e.g. #CMP-2026)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-12 text-sm py-2 h-10 font-medium"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs dark:text-zinc-400 text-slate-500 border dark:border-white/[0.12] border-slate-200 rounded px-1.5 py-0.5 dark:bg-white/[0.06] bg-slate-100 font-semibold">
                ⌘K
              </span>
            </div>
          </form>

          <div className="flex items-center gap-3">
            <NavLink
              to="/complaints/new"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-sm hover:from-indigo-600 hover:to-purple-700 transition-all cursor-pointer"
            >
              + File Complaint
            </NavLink>

            <ThemeToggle />

            {user?.companyId && (
              <div className="hidden md:flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 glass-card px-3 py-1.5 rounded-xl border font-bold">
                <Layers className="h-4 w-4" />
                <span className="font-mono text-xs">{user.companyId}</span>
              </div>
            )}

            <button
              onClick={() => {
                const basePath =
                  user?.role.code === "CUSTOMER"
                    ? "/customer"
                    : user?.role.code === "AGENT"
                      ? "/agent"
                      : user?.role.code === "OPERATIONS_MANAGER"
                        ? "/manager"
                        : user?.role.code === "REGIONAL_MANAGER"
                          ? "/regional"
                          : "/admin";
                navigate(`${basePath}/notifications`);
              }}
              className="relative rounded-xl border dark:border-white/[0.08] border-slate-200 glass-card p-2 text-slate-600 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-white transition-all cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {(notifications.data?.length ?? 0) > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-glow-sm">
                  {notifications.data?.length}
                </span>
              ) : null}
            </button>
          </div>
        </header>

        {/* Viewport Outlet */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
