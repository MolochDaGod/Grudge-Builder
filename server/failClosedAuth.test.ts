import { describe, expect, it, beforeEach, afterEach } from "vitest";
import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import {
  jwtSecretsConfigured,
  mintSecretsConfigured,
  mintDidSucceed,
  requireAuthFailClosed,
  requireMintConfigured,
  isGuestProductIdentity,
} from "./failClosedAuth";

const SECRET = "test-only-fail-closed-secret-not-for-prod";

function mockReq(headers: Record<string, string> = {}): Request {
  const lower: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) lower[k.toLowerCase()] = v;
  return {
    get: (name: string) => lower[name.toLowerCase()] ?? undefined,
  } as unknown as Request;
}

function mockRes(): Response & { statusCode: number; body: unknown } {
  const res: any = {
    statusCode: 200,
    body: undefined,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(payload: unknown) {
      res.body = payload;
      return res;
    },
  };
  return res;
}

describe("fail-closed auth and mint gates", () => {
  const envKeys = [
    "SESSION_SECRET",
    "JWT_SECRET",
    "GRUDGE_JWT_SECRET",
    "CROSSMINT_SERVER_API_KEY",
    "CROSSMINT_SECRET_KEY",
    "CROSSMINT_API_KEY",
  ] as const;
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const k of envKeys) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
  });

  afterEach(() => {
    for (const k of envKeys) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it("jwtSecretsConfigured is false when every candidate is empty or whitespace", () => {
    process.env.JWT_SECRET = "   ";
    expect(jwtSecretsConfigured()).toBe(false);
  });

  it("jwtSecretsConfigured is true when a candidate is set", () => {
    process.env.SESSION_SECRET = SECRET;
    expect(jwtSecretsConfigured()).toBe(true);
  });

  it("mintSecretsConfigured is false when Crossmint keys are unset", () => {
    expect(mintSecretsConfigured()).toBe(false);
  });

  it("mintSecretsConfigured is true when a Crossmint key is set", () => {
    process.env.CROSSMINT_SERVER_API_KEY = "test-key-not-real";
    expect(mintSecretsConfigured()).toBe(true);
  });

  it("mintDidSucceed rejects empty, failed, or action-less results (no mock success)", () => {
    expect(mintDidSucceed(null)).toBe(false);
    expect(mintDidSucceed(undefined)).toBe(false);
    expect(mintDidSucceed({})).toBe(false);
    expect(mintDidSucceed({ success: true })).toBe(false);
    expect(mintDidSucceed({ success: false, actionId: "x", error: "nope" })).toBe(false);
    expect(mintDidSucceed({ success: true, actionId: "act_1" })).toBe(true);
    expect(mintDidSucceed({ actionId: "act_2" })).toBe(true);
  });

  it("isGuestProductIdentity catches guest and guest_* ids", () => {
    expect(isGuestProductIdentity("guest")).toBe(true);
    expect(isGuestProductIdentity("guest_abc")).toBe(true);
    expect(isGuestProductIdentity("user-1")).toBe(false);
  });

  it("requireAuthFailClosed returns 503 when JWT secrets are missing (does not skip auth)", () => {
    const res = mockRes();
    let nextCalled = false;
    requireAuthFailClosed(mockReq(), res, (() => {
      nextCalled = true;
    }) as NextFunction);
    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({ error: "auth_misconfigured" });
    expect(JSON.stringify(res.body)).not.toMatch(/secret|key|token=/i);
  });

  it("requireAuthFailClosed returns 401 when no token is provided", () => {
    process.env.JWT_SECRET = SECRET;
    const res = mockRes();
    let nextCalled = false;
    requireAuthFailClosed(mockReq(), res, (() => {
      nextCalled = true;
    }) as NextFunction);
    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: "Authentication required" });
  });

  it("requireAuthFailClosed returns 401 for an invalid signature", () => {
    process.env.JWT_SECRET = SECRET;
    const bad = jwt.sign({ userId: "user-1" }, "wrong-secret");
    const res = mockRes();
    let nextCalled = false;
    requireAuthFailClosed(
      mockReq({ Authorization: `Bearer ${bad}` }),
      res,
      (() => {
        nextCalled = true;
      }) as NextFunction,
    );
    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(401);
  });

  it("requireAuthFailClosed returns 401 for a guest identity", () => {
    process.env.JWT_SECRET = SECRET;
    const token = jwt.sign({ userId: "guest" }, SECRET);
    const res = mockRes();
    let nextCalled = false;
    requireAuthFailClosed(
      mockReq({ Authorization: `Bearer ${token}` }),
      res,
      (() => {
        nextCalled = true;
      }) as NextFunction,
    );
    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(401);
  });

  it("requireAuthFailClosed calls next and sets userId for a valid token", () => {
    process.env.JWT_SECRET = SECRET;
    const token = jwt.sign({ userId: "user-42", grudgeId: "GRUDGE_X" }, SECRET);
    const req = mockReq({ Authorization: `Bearer ${token}` });
    const res = mockRes();
    let nextCalled = false;
    requireAuthFailClosed(req, res, (() => {
      nextCalled = true;
    }) as NextFunction);
    expect(nextCalled).toBe(true);
    expect(res.statusCode).toBe(200);
    expect((req as any).userId).toBe("user-42");
    expect((req as any).grudgeId).toBe("GRUDGE_X");
  });

  it("requireMintConfigured returns 503 when mint secrets are missing", () => {
    const res = mockRes();
    let nextCalled = false;
    requireMintConfigured(mockReq(), res, (() => {
      nextCalled = true;
    }) as NextFunction);
    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({ error: "mint_misconfigured" });
  });

  it("requireMintConfigured calls next when a mint key is present", () => {
    process.env.CROSSMINT_SERVER_API_KEY = "test-key-not-real";
    const res = mockRes();
    let nextCalled = false;
    requireMintConfigured(mockReq(), res, (() => {
      nextCalled = true;
    }) as NextFunction);
    expect(nextCalled).toBe(true);
    expect(res.statusCode).toBe(200);
  });
});
