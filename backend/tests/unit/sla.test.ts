import { describe, expect, it } from "vitest";
import { pickSlaPolicy, slaService } from "../../src/services/sla.service.js";

const policies = [
  { id: "p-pri", priorityCode: "HIGH", categoryId: null, regionId: null, responseTimeMinutes: 240, resolutionTimeMinutes: 1440, escalationThresholdMinutes: 960, approachingPercent: 80 },
  { id: "p-cat", priorityCode: "HIGH", categoryId: "cat-1", regionId: null, responseTimeMinutes: 120, resolutionTimeMinutes: 720, escalationThresholdMinutes: 480, approachingPercent: 80 },
  { id: "p-all", priorityCode: "HIGH", categoryId: "cat-1", regionId: "reg-1", responseTimeMinutes: 60, resolutionTimeMinutes: 360, escalationThresholdMinutes: 240, approachingPercent: 80 },
];

describe("SLA matching", () => {
  it("prefers priority + category + region", () => {
    const match = pickSlaPolicy(policies, { priority: "HIGH", categoryId: "cat-1", regionId: "reg-1" });
    expect(match?.id).toBe("p-all");
  });

  it("falls back to priority + category", () => {
    const match = pickSlaPolicy(policies, { priority: "HIGH", categoryId: "cat-1", regionId: "reg-9" });
    expect(match?.id).toBe("p-cat");
  });

  it("falls back to priority only", () => {
    const match = pickSlaPolicy(policies, { priority: "HIGH", categoryId: "other", regionId: "other" });
    expect(match?.id).toBe("p-pri");
  });
});

describe("SLA evaluation", () => {
  const createdAt = new Date("2026-01-01T00:00:00Z");
  const slaDueAt = new Date("2026-01-01T10:00:00Z");

  it("marks approaching after threshold", () => {
    const status = slaService.evaluate(
      { createdAt, slaDueAt, resolvedAt: null, approachingPercent: 80 },
      new Date("2026-01-01T08:01:00Z"),
    );
    expect(status).toBe("APPROACHING");
  });

  it("marks overdue after due", () => {
    const status = slaService.evaluate(
      { createdAt, slaDueAt, resolvedAt: null, approachingPercent: 80 },
      new Date("2026-01-01T11:00:00Z"),
    );
    expect(status).toBe("OVERDUE");
  });

  it("marks met when resolved before due", () => {
    const status = slaService.evaluate(
      { createdAt, slaDueAt, resolvedAt: new Date("2026-01-01T09:00:00Z"), approachingPercent: 80 },
      new Date("2026-01-01T12:00:00Z"),
    );
    expect(status).toBe("MET");
  });
});
