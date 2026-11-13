import { afterEach, beforeEach, describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";
import { getJwtSecret } from "./lib/requiredSecrets";
import { verifyIslandToken } from "./lib/verifyIslandToken";

const ENV_KEYS = ["SESSION_SECRET", "JWT_SECRET", "GRUDGE_JWT_SECRET"] as const;

describe("island verify uses getJwtSecret so API-signed tokens are accepted", () => {
  let previous: Record<(typeof ENV_KEYS)[number], string | undefined>;

  beforeEach(() => {
    previous = {
      SESSION_SECRET: process.env.SESSION_SECRET,
      JWT_SECRET: process.env.JWT_SECRET,
      GRUDGE_JWT_SECRET: process.env.GRUDGE_JWT_SECRET,
    };
    process.env.SESSION_SECRET = "a";
    process.env.JWT_SECRET = "b";
    delete process.env.GRUDGE_JWT_SECRET;
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      const value = previous[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("accepts a token signed the way the API signs (getJwtSecret / jwt.sign)", () => {
    const token = jwt.sign(
      { userId: "user-1", grudgeId: "g1", username: "tester", role: "player" },
      getJwtSecret(),
      { expiresIn: "1h" },
    );
    const payload = verifyIslandToken(token) as jwt.JwtPayload;
    expect(payload.grudgeId).toBe("g1");
    expect(payload.userId).toBe("user-1");
  });

  it("rejects a token signed with the other secret (JWT_SECRET, not getJwtSecret)", () => {
    const otherSecret = process.env.JWT_SECRET;
    if (!otherSecret) throw new Error("test setup: JWT_SECRET missing");
    const token = jwt.sign(
      { userId: "user-1", grudgeId: "g1", username: "tester", role: "player" },
      otherSecret,
      { expiresIn: "1h" },
    );
    expect(() => verifyIslandToken(token)).toThrow();
  });

  it("rejects a token signed with HS512 when verify is pinned to HS256", () => {
    const token = jwt.sign(
      { userId: "user-1", grudgeId: "g1", username: "tester", role: "player" },
      getJwtSecret(),
      { expiresIn: "1h", algorithm: "HS512" },
    );
    expect(() => verifyIslandToken(token)).toThrow();
  });
});
