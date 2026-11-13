import { describe, expect, it, beforeEach, afterEach } from "vitest";
import jwt from "jsonwebtoken";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Request, Response, NextFunction } from "express";
import {
  readEnvSecret,
  getJwtSecret,
  jwtSecretsConfigured,
  jwtVerifyCandidates,
  mintSecretsConfigured,
  mintDidSucceed,
  requireAuthFailClosed,
  requireMintConfigured,
  isGuestProductIdentity,
  authenticatedUserId,
  ownedByAccount,
} from "./failClosedAuth";

const SECRET = "test-only-fail-closed-secret-not-for-prod";
const DIR = dirname(fileURLToPath(import.meta.url));

function mockReq(
  headers: Record<string, string> = {},
  extra: Record<string, unknown> = {},
): Request {
  const lower: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) lower[k.toLowerCase()] = v;
  return {
    get: (name: string) => lower[name.toLowerCase()] ?? undefined,
    body: extra.body ?? {},
    ...extra,
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
    expect(readEnvSecret("JWT_SECRET")).toBe("");
  });

  it("jwtSecretsConfigured is true when SESSION_SECRET or JWT_SECRET is set", () => {
    process.env.SESSION_SECRET = SECRET;
    expect(jwtSecretsConfigured()).toBe(true);
    delete process.env.SESSION_SECRET;
    process.env.JWT_SECRET = SECRET;
    expect(jwtSecretsConfigured()).toBe(true);
  });

  it("does not accept GRUDGE_JWT_SECRET by itself", () => {
    process.env.GRUDGE_JWT_SECRET = SECRET;
    expect(jwtSecretsConfigured()).toBe(false);
    // Hitch's getJwtSecret may return GRUDGE as the third candidate; the
    // fail-closed auth gate still 503s when SESSION_SECRET and JWT_SECRET
    // are both unset.
    expect(getJwtSecret()).toBe(SECRET);
    const res = mockRes();
    let nextCalled = false;
    const token = jwt.sign({ userId: "user-1" }, SECRET);
    requireAuthFailClosed(
      mockReq({ Authorization: `Bearer ${token}` }),
      res,
      (() => {
        nextCalled = true;
      }) as NextFunction,
    );
    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({ error: "auth_misconfigured" });
  });

  it("getJwtSecret throws when no candidate is set", () => {
    expect(() => getJwtSecret()).toThrow(/SESSION_SECRET or JWT_SECRET/);
  });

  it("getJwtSecret returns SESSION_SECRET first, then JWT_SECRET (Hitch candidate order)", () => {
    process.env.SESSION_SECRET = "session-val";
    process.env.JWT_SECRET = "jwt-val";
    process.env.GRUDGE_JWT_SECRET = "grudge-val";
    expect(getJwtSecret()).toBe("session-val");
    expect(jwtVerifyCandidates()).toEqual(["session-val", "jwt-val", "grudge-val"]);
    delete process.env.SESSION_SECRET;
    expect(getJwtSecret()).toBe("jwt-val");
  });

  it("getJwtSecret and jwtVerifyCandidates are live (not a module-load snapshot)", () => {
    process.env.JWT_SECRET = "first";
    expect(getJwtSecret()).toBe("first");
    process.env.JWT_SECRET = "second";
    expect(getJwtSecret()).toBe("second");
    expect(jwtVerifyCandidates()).toEqual(["second"]);
  });

  it("mintSecretsConfigured is false when Crossmint keys are unset", () => {
    expect(mintSecretsConfigured()).toBe(false);
  });

  it("mintSecretsConfigured is true when a Crossmint key is set (request-time, no exit)", () => {
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

  it("requireAuthFailClosed rejects tokens not signed with HS256", () => {
    process.env.JWT_SECRET = SECRET;
    const noneTok = jwt.sign({ userId: "user-1" }, SECRET, { algorithm: "HS384" });
    const res = mockRes();
    let nextCalled = false;
    requireAuthFailClosed(
      mockReq({ Authorization: `Bearer ${noneTok}` }),
      res,
      (() => {
        nextCalled = true;
      }) as NextFunction,
    );
    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(401);
  });

  it("requireAuthFailClosed calls next and sets userId for a valid HS256 token", () => {
    process.env.JWT_SECRET = SECRET;
    const token = jwt.sign({ userId: "user-42", grudgeId: "GRUDGE_X" }, SECRET, {
      algorithm: "HS256",
    });
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

describe("1. resolve-drops account comes from req.userId only", () => {
  it("authenticatedUserId uses req.userId and ignores body.accountId and req.accountId", () => {
    const req = mockReq(
      {},
      {
        userId: "user-real",
        accountId: "attacker-account",
        body: { accountId: "attacker-account" },
      },
    );
    expect(authenticatedUserId(req)).toBe("user-real");
  });

  it("authenticatedUserId does not fall back to body.accountId or guest when userId is missing", () => {
    const req = mockReq(
      {},
      {
        accountId: "from-req",
        body: { accountId: "from-body" },
      },
    );
    expect(authenticatedUserId(req)).toBeNull();
    expect(authenticatedUserId(mockReq({}, { userId: "guest", body: { accountId: "x" } }))).toBeNull();
  });

  it("POST /api/island/resolve-drops looks up the account from authenticatedUserId, not the body", () => {
    const src = readFileSync(join(DIR, "routes.ts"), "utf8");
    const start = src.indexOf('app.post("/api/island/resolve-drops"');
    expect(start).toBeGreaterThan(-1);
    const chunk = src.slice(start, start + 900);
    expect(chunk).toContain("requireAuthFailClosed");
    expect(chunk).toContain("authenticatedUserId(req)");
    expect(chunk).toContain("getAccountByUserId");
    expect(chunk).not.toMatch(/req\.accountId\s*\|\|/);
    expect(chunk).not.toMatch(/[=|]\s*req\.body\.accountId/);
  });
});

describe("2. generate-island is fail-closed and uses req.userId", () => {
  it("POST /api/characters/:id/generate-island is gated and has no guest fallback", () => {
    const src = readFileSync(join(DIR, "routes.ts"), "utf8");
    const start = src.indexOf('app.post("/api/characters/:id/generate-island"');
    expect(start).toBeGreaterThan(-1);
    const chunk = src.slice(start, start + 800);
    expect(chunk).toContain("requireAuthFailClosed");
    expect(chunk).toContain("authenticatedUserId(req)");
    expect(chunk).not.toContain("getUserId(req)");
    expect(chunk).not.toContain('extractUserId');
    expect(chunk).not.toContain('"guest"');
  });
});

describe("3. gated handlers use req.userId, not getUserId guest fallback", () => {
  const gated = [
    'app.get("/api/islands/:id"',
    'app.post("/api/islands/:id/regenerate"',
    'app.get("/api/island"',
    'app.get("/api/island/status"',
    'app.post("/api/island/commit"',
    'app.post("/api/island/initialize"',
    'app.patch("/api/island/state"',
    'app.post("/api/island/export-from-rts"',
    'app.patch("/api/island"',
    'app.post("/api/island/boss-clear"',
    'app.post("/api/island/generate-map"',
    'app.post("/api/nfts/mint"',
    'app.post("/api/nfts/:nftId/check-status"',
    'app.post("/api/nfts/poll-pending"',
    'app.post("/api/nfts/:nftId/claim"',
    'app.post("/api/nfts/:nftId/sync-metadata"',
    'app.get("/api/island-nfts"',
    'app.get("/api/island-nfts/island/:islandId"',
    'app.post("/api/island-nfts/mint"',
    'app.post("/api/island-nfts/:nftId/check-status"',
    'app.post("/api/island/resolve-drops"',
    'app.post("/api/characters/:id/generate-island"',
  ];

  it("every gated island/mint handler uses requireAuthFailClosed and authenticatedUserId", () => {
    const src = readFileSync(join(DIR, "routes.ts"), "utf8");
    const missing: string[] = [];
    for (const sig of gated) {
      const start = src.indexOf(sig);
      if (start < 0) {
        missing.push(`missing route ${sig}`);
        continue;
      }
      // Take through the next `});` that closes the app.METHOD after the handler try starts
      const chunk = src.slice(start, start + 1600);
      if (!chunk.includes("requireAuthFailClosed")) missing.push(`${sig} missing requireAuthFailClosed`);
      if (!chunk.includes("authenticatedUserId(req)")) missing.push(`${sig} missing authenticatedUserId`);
      if (chunk.includes("getUserId(req)") || chunk.includes("extractUserId(req)")) {
        missing.push(`${sig} still calls getUserId/extractUserId`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("failClosedAuth imports getJwtSecret from jwtSecret.ts, not requiredSecrets.ts", () => {
    const auth = readFileSync(join(DIR, "failClosedAuth.ts"), "utf8");
    expect(auth).toMatch(/from ["']\.\/lib\/jwtSecret["']/);
    expect(auth).not.toMatch(/from ["']\.\/lib\/requiredSecrets["']/);
    const boot = readFileSync(join(DIR, "lib/requiredSecrets.ts"), "utf8");
    expect(boot).toMatch(/from ["']\.\/jwtSecret["']/);
    expect(boot).toContain("dotenv");
    const pure = readFileSync(join(DIR, "lib/jwtSecret.ts"), "utf8");
    expect(pure).not.toMatch(/from\s+["']dotenv["']/);
    expect(pure).not.toMatch(/process\.exit\s*\(/);
    expect(pure).toContain("JWT_SECRET_CANDIDATE_ENVS");
    expect(pure).toContain("export function getJwtSecret");
  });

  it("routes.ts JWT verify uses live candidates, not a module-load snapshot", () => {
    const src = readFileSync(join(DIR, "routes.ts"), "utf8");
    expect(src).not.toMatch(
      /const JWT_SECRET_CANDIDATES = \[\s*process\.env\.SESSION_SECRET/,
    );
    expect(src).toContain("jwtVerifyCandidates()");
    expect(src).toContain("jwtSecretsConfigured()");
  });
});

describe("4. NFT write/spend gates and island-NFT ownership", () => {
  it("ownedByAccount is a strict equality check (403/404 when false)", () => {
    expect(ownedByAccount("acc-1", "acc-1")).toBe(true);
    expect(ownedByAccount("acc-1", "acc-2")).toBe(false);
    expect(ownedByAccount(null, "acc-1")).toBe(false);
    expect(ownedByAccount("acc-1", undefined)).toBe(false);
  });

  it("character NFT write/spend routes are gated with requireAuthFailClosed", () => {
    const src = readFileSync(join(DIR, "routes.ts"), "utf8");
    for (const sig of [
      'app.post("/api/nfts/:nftId/claim"',
      'app.post("/api/nfts/:nftId/check-status"',
      'app.post("/api/nfts/poll-pending"',
      'app.post("/api/nfts/:nftId/sync-metadata"',
    ]) {
      const start = src.indexOf(sig);
      expect(start, sig).toBeGreaterThan(-1);
      const chunk = src.slice(start, start + 1200);
      expect(chunk, sig).toContain("requireAuthFailClosed");
      expect(chunk, sig).toContain("authenticatedUserId(req)");
    }
  });

  it("GET island-nfts/island/:islandId and POST check-status enforce ownership", () => {
    const src = readFileSync(join(DIR, "routes.ts"), "utf8");
    const getStart = src.indexOf('app.get("/api/island-nfts/island/:islandId"');
    const getChunk = src.slice(getStart, getStart + 1600);
    expect(getChunk).toContain("ownedByAccount");
    expect(getChunk).toContain('status(403)');
    expect(getChunk).toContain("authenticatedUserId(req)");

    const postStart = src.indexOf('app.post("/api/island-nfts/:nftId/check-status"');
    const postChunk = src.slice(postStart, postStart + 1800);
    expect(postChunk).toContain("ownedByAccount");
    expect(postChunk).toContain('status(403)');
    expect(postChunk).toContain("authenticatedUserId(req)");
  });

  it("POST /api/nfts/:nftId/check-status checks ownership before mutating", () => {
    const src = readFileSync(join(DIR, "routes.ts"), "utf8");
    const start = src.indexOf('app.post("/api/nfts/:nftId/check-status"');
    const chunk = src.slice(start, start + 1600);
    expect(chunk).toContain("ownedByAccount");
    const ownIdx = chunk.indexOf("ownedByAccount");
    const mutateIdx = chunk.indexOf("checkAndUpdateMintStatus");
    expect(ownIdx).toBeGreaterThan(-1);
    expect(mutateIdx).toBeGreaterThan(ownIdx);
  });
});
