import { describe, expect, it } from "vitest";
import { ALLOWED_TRANSITIONS, assertTransition } from "../../src/services/complaintLifecycle.js";
import { ApiError } from "../../src/utils/ApiError.js";

describe("complaint lifecycle", () => {
  it("allows NEW → CATEGORISED", () => {
    expect(ALLOWED_TRANSITIONS.NEW).toContain("CATEGORISED");
    expect(() => assertTransition("NEW", "CATEGORISED", "AGENT")).not.toThrow();
  });

  it("rejects CLOSED → IN_PROGRESS", () => {
    expect(() => assertTransition("CLOSED", "IN_PROGRESS", "ADMIN")).toThrow(ApiError);
  });

  it("allows RESOLVED → CLOSED", () => {
    expect(() => assertTransition("RESOLVED", "CLOSED", "AGENT")).not.toThrow();
  });

  it("allows formal reopen from CLOSED", () => {
    expect(() => assertTransition("CLOSED", "REOPENED", "ADMIN")).not.toThrow();
  });

  it("blocks customer-role reopen", () => {
    expect(() => assertTransition("CLOSED", "REOPENED", "CUSTOMER")).toThrow(ApiError);
  });
});
