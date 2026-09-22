import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { LoginPage } from "../pages/public/AuthPages";
import { NewComplaintPage } from "../pages/public/ComplaintPages";
import { AuthProvider } from "../auth/AuthProvider";
import { homeFor } from "../lib/utils";

vi.mock("../api/client", () => ({
  api: {
    get: vi.fn().mockResolvedValue({ data: { data: { regions: [], stores: [], categories: [] } } }),
    post: vi.fn(),
    interceptors: { request: { use: () => 0 }, response: { use: () => 0 } },
  },
  setAccessToken: vi.fn(),
  apiErrorMessage: () => "error",
}));

function wrap(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <AuthProvider>{ui}</AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("public pages", () => {
  it("renders login form", () => {
    wrap(<LoginPage />);
    expect(screen.getByRole("heading", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it("renders complaint form validation labels", () => {
    wrap(<NewComplaintPage />);
    expect(screen.getByRole("heading", { name: /submit a website complaint/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^name$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
  });
});

describe("role home routes", () => {
  it("maps roles to dashboards", () => {
    expect(homeFor("AGENT")).toBe("/agent/dashboard");
    expect(homeFor("CUSTOMER")).toBe("/customer/dashboard");
    expect(homeFor("ADMIN")).toBe("/admin/dashboard");
  });
});
