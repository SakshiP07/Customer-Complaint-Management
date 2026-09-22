import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import type { Role } from "../lib/utils";
import { Spinner } from "../components/ui/Primitives";

export function Protected({ roles }: { roles?: Role[] }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role.code)) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export function GuestOnly() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) {
    const map: Record<string, string> = {
      CUSTOMER: "/customer/dashboard",
      AGENT: "/agent/dashboard",
      OPERATIONS_MANAGER: "/manager/dashboard",
      REGIONAL_MANAGER: "/regional/dashboard",
      ADMIN: "/admin/dashboard",
      SUPER_ADMIN: "/admin/dashboard",
    };
    return <Navigate to={map[user.role.code]} replace />;
  }
  return <Outlet />;
}
