import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Bell, Menu, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthProvider";
import { api } from "../../api/client";
import { cx } from "../../lib/utils";
import { Input } from "../ui/Primitives";

type NavItem = { to: string; label: string };

function navFor(role: string): NavItem[] {
  if (role === "CUSTOMER") {
    return [
      { to: "/customer/dashboard", label: "Dashboard" },
      { to: "/customer/complaints", label: "My Complaints" },
      { to: "/complaints/new", label: "New Complaint" },
    ];
  }
  if (role === "AGENT") {
    return [
      { to: "/agent/dashboard", label: "Dashboard" },
      { to: "/agent/inbox", label: "Inbox" },
      { to: "/agent/complaints", label: "My Complaints" },
    ];
  }
  if (role === "OPERATIONS_MANAGER" || role === "REGIONAL_MANAGER") {
    return [
      { to: role === "OPERATIONS_MANAGER" ? "/manager/dashboard" : "/regional/dashboard", label: "Dashboard" },
      { to: role === "OPERATIONS_MANAGER" ? "/manager/complaints" : "/regional/complaints", label: "All Complaints" },
    ];
  }
  return [
    { to: "/admin/dashboard", label: "Dashboard" },
    { to: "/admin/complaints", label: "All Complaints" },
    { to: "/admin/users", label: "Users" },
    { to: "/admin/categories", label: "Categories" },
  ];
}

export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const items = navFor(user?.role.code ?? "CUSTOMER");
  const notifications = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => (await api.get("/notifications", { params: { unread: true } })).data.data as Array<{ id: string; message: string; createdAt: string }>,
    enabled: Boolean(user),
    refetchInterval: 30000,
  });

  useEffect(() => {
    setOpen(false);
  }, [items]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const basePath = user?.role.code === "CUSTOMER" ? "/customer/complaints" : 
                       user?.role.code === "AGENT" ? "/agent/complaints" :
                       user?.role.code === "OPERATIONS_MANAGER" ? "/manager/complaints" :
                       user?.role.code === "REGIONAL_MANAGER" ? "/regional/complaints" : "/admin/complaints";
      navigate(`${basePath}?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className={cx("bg-slate-900 text-white w-56 flex-shrink-0 flex flex-col h-screen sticky top-0 overflow-y-auto", open ? "block" : "hidden lg:flex")}>
        <div className="border-b border-white/10 px-4 py-3">
          <p className="text-sm font-semibold">Complaint Management</p>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 px-2 py-3" aria-label="Primary">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cx("rounded-md px-3 py-2 text-sm", isActive ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5")
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/10 px-2 py-3">
          <NavLink
            to={`/${user?.role.code?.toLowerCase()}/profile`}
            className={({ isActive }) =>
              cx("rounded-md px-3 py-2 text-sm", isActive ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5")
            }
          >
            Profile
          </NavLink>
          <button
            onClick={async () => {
              await logout();
              navigate("/login");
            }}
            className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-300 hover:bg-white/5"
          >
            Logout
          </button>
        </div>
      </aside>
      <div className="flex-1 min-w-0">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sticky top-0 z-10">
          <button className="lg:hidden" onClick={() => setOpen((v) => !v)} aria-label="Toggle navigation">
            <Menu className="h-5 w-5" />
          </button>
          <form onSubmit={handleSearch} className="flex-1 max-w-md mx-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="search"
                placeholder="Search complaints..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </form>
          <div className="flex items-center gap-4">
            {user?.companyId && (
              <div className="hidden md:flex items-center gap-2 text-sm text-slate-600 bg-slate-100 px-3 py-1.5 rounded-md">
                <span className="font-medium">Company:</span>
                <span className="text-slate-900">{user.companyId}</span>
              </div>
            )}
            <button
              onClick={() => {
                const basePath = user?.role.code === "CUSTOMER" ? "/customer" :
                                 user?.role.code === "AGENT" ? "/agent" :
                                 user?.role.code === "OPERATIONS_MANAGER" ? "/manager" :
                                 user?.role.code === "REGIONAL_MANAGER" ? "/regional" : "/admin";
                navigate(`${basePath}/notifications`);
              }}
              className="relative text-slate-600 hover:text-slate-900"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {(notifications.data?.length ?? 0) > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                  {notifications.data?.length}
                </span>
              ) : null}
            </button>
          </div>
        </header>
        <main className="p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
