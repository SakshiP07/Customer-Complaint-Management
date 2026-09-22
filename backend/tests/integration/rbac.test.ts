import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";

const app = createApp();
const password = "DemoPass123!";

describe("seeded RBAC and complaint APIs", () => {
  it("logs in admin and lists complaints from PostgreSQL", async () => {
    const login = await request(app).post("/api/v1/auth/login").send({
      email: "admin@example.com",
      password,
    });
    expect(login.status).toBe(200);
    const token = login.body.data.accessToken as string;
    expect(token).toBeTruthy();

    const list = await request(app)
      .get("/api/v1/complaints")
      .set("Authorization", `Bearer ${token}`)
      .query({ pageSize: 5 });
    expect(list.status).toBe(200);
    expect(list.body.success).toBe(true);
    expect(Array.isArray(list.body.data)).toBe(true);
    expect(list.body.meta.total).toBeGreaterThan(0);
  });

  it("prevents customers from listing other customers' complaints", async () => {
    const login = await request(app).post("/api/v1/auth/login").send({
      email: "customer@example.com",
      password,
    });
    const token = login.body.data.accessToken as string;
    const list = await request(app).get("/api/v1/complaints").set("Authorization", `Bearer ${token}`);
    expect(list.status).toBe(200);
    for (const row of list.body.data as Array<{ customer: { email: string } }>) {
      expect(row.customer.email).toBe("customer@example.com");
    }
  });

  it("rejects CLOSED → IN_PROGRESS through the API", async () => {
    const login = await request(app).post("/api/v1/auth/login").send({
      email: "admin@example.com",
      password,
    });
    const token = login.body.data.accessToken as string;
    const list = await request(app)
      .get("/api/v1/complaints")
      .set("Authorization", `Bearer ${token}`)
      .query({ status: "CLOSED", pageSize: 1 });
    const id = list.body.data[0]?.id as string | undefined;
    if (!id) return;
    const res = await request(app)
      .post(`/api/v1/complaints/${id}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "IN_PROGRESS" });
    expect(res.status).toBe(422);
  });

  it("returns dashboard summary calculated from the database", async () => {
    const login = await request(app).post("/api/v1/auth/login").send({
      email: "manager@example.com",
      password,
    });
    const token = login.body.data.accessToken as string;
    const res = await request(app).get("/api/v1/dashboard/summary").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBeGreaterThan(50);
  });

  it("returns employee workload from PostgreSQL for managers", async () => {
    const login = await request(app).post("/api/v1/auth/login").send({
      email: "manager@example.com",
      password,
    });
    const token = login.body.data.accessToken as string;
    const res = await request(app).get("/api/v1/analytics/employees").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(10);
    expect(res.body.data[0]).toHaveProperty("assigned");
    expect(res.body.data[0]).toHaveProperty("slaPercent");
  });

  it("lets an agent open the regional inbox", async () => {
    const login = await request(app).post("/api/v1/auth/login").send({
      email: "agent@example.com",
      password,
    });
    const token = login.body.data.accessToken as string;
    const inbox = await request(app)
      .get("/api/v1/complaints")
      .set("Authorization", `Bearer ${token}`)
      .query({ view: "inbox", pageSize: 5 });
    expect(inbox.status).toBe(200);
    expect(inbox.body.meta.total).toBeGreaterThan(0);
  });
});
