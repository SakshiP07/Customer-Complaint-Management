import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, setAccessToken } from "../api/client";
import type { Role } from "../lib/utils";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  isActive: boolean;
  companyId: string | null;
  regionId: string | null;
  storeId: string | null;
  role: { id: string; code: Role; name: string };
  region?: { id: string; name: string; code: string } | null;
  store?: { id: string; name: string; code: string } | null;
};

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (payload: { name: string; email: string; password: string; phone?: string }) => Promise<AuthUser>;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const token = localStorage.getItem("cmp_access");
    if (!token) {
      setLoading(false);
      setUser(null);
      return;
    }
    api
      .get("/auth/me")
      .then((res) => {
        if (!cancelled) setUser(res.data.data);
      })
      .catch(() => {
        if (!cancelled) {
          localStorage.removeItem("cmp_access");
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      async login(email, password) {
        const res = await api.post("/auth/login", { email, password });
        setAccessToken(res.data.data.accessToken);
        setUser(res.data.data.user);
        return res.data.data.user as AuthUser;
      },
      async register(payload) {
        const res = await api.post("/auth/register", payload);
        setAccessToken(res.data.data.accessToken);
        setUser(res.data.data.user);
        return res.data.data.user as AuthUser;
      },
      async logout() {
        try {
          await api.post("/auth/logout");
        } finally {
          setAccessToken(null);
          setUser(null);
        }
      },
    }),
    [user, loading],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
