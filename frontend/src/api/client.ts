import axios from "axios";

export const api = axios.create({
  baseURL: "/api/v1",
  withCredentials: true,
});

let accessToken: string | null = localStorage.getItem("cmp_access");

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (token) localStorage.setItem("cmp_access", token);
  else localStorage.removeItem("cmp_access");
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original?._retry && !String(original?.url ?? "").includes("/auth/")) {
      original._retry = true;
      try {
        const refreshed = await axios.post("/api/v1/auth/refresh", {}, { withCredentials: true });
        const token = refreshed.data?.data?.accessToken as string;
        setAccessToken(token);
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch {
        setAccessToken(null);
      }
    }
    return Promise.reject(error);
  },
);

export function apiErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.error?.message ?? error.message;
  }
  return "Unexpected error";
}
