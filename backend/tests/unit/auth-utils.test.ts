import { describe, expect, it } from "vitest";
import { assertPasswordPolicy } from "../../src/utils/password.js";
import { hashRefreshToken } from "../../src/utils/jwt.js";

describe("password policy", () => {
  it("rejects short passwords", () => {
    expect(assertPasswordPolicy("Ab1")).toBeTruthy();
  });
  it("accepts strong passwords", () => {
    expect(assertPasswordPolicy("DemoPass123!")).toBeNull();
  });
});

describe("refresh token hashing", () => {
  it("is deterministic and not reversible as plaintext", () => {
    const a = hashRefreshToken("token-one");
    const b = hashRefreshToken("token-one");
    expect(a).toBe(b);
    expect(a).not.toBe("token-one");
    expect(a).toHaveLength(64);
  });
});
