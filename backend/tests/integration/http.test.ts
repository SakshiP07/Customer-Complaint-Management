import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";

const app = createApp();

describe("health and auth validation", () => {
  it("returns health", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("rejects weak registration payloads", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({
      name: "A",
      email: "not-an-email",
      password: "short",
    });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects unauthenticated complaint list", async () => {
    const res = await request(app).get("/api/v1/complaints");
    expect(res.status).toBe(401);
  });
});
