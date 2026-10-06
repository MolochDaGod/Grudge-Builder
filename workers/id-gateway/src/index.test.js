import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import worker, { sanitizeApi } from "./index.js";

const PROD_ENV = {
  ENVIRONMENT: "production",
  UPSTREAM: "https://upstream.example.test",
  PUBLIC_HOST: "https://id.grudge-studio.com",
  AUTH_ALLOWED_RETURN_HOSTS: "",
};

let upstreamCalls;

beforeEach(() => {
  upstreamCalls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (target) => {
      upstreamCalls.push(String(target));
      return new Response("ok", { status: 200, headers: { "Content-Type": "text/plain" } });
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function preflight(origin, env = PROD_ENV, path = "/api/auth/login") {
  return worker.fetch(
    new Request(`https://id.grudge-studio.com${path}`, {
      method: "OPTIONS",
      headers: { Origin: origin },
    }),
    env,
  );
}

async function upstreamQueryFor(path, env = PROD_ENV) {
  await worker.fetch(new Request(`https://id.grudge-studio.com${path}`), env);
  expect(upstreamCalls.length).toBe(1);
  return new URL(upstreamCalls[0]).searchParams;
}

describe("id-gateway CORS", () => {
  it("does not reflect attacker origins or send credentials", async () => {
    for (const origin of [
      "https://attacker-probe.workers.dev",
      "https://attacker.vercel.app",
      "https://grudge-studio.com.evil.com",
      "https://puter.com",
    ]) {
      const res = await preflight(origin);
      expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
      expect(res.headers.get("Access-Control-Allow-Credentials")).toBeNull();
    }
  });

  it("reflects wallet.grudge-studio.com exactly with credentials and Vary", async () => {
    const res = await preflight("https://wallet.grudge-studio.com");
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://wallet.grudge-studio.com");
    expect(res.headers.get("Access-Control-Allow-Credentials")).toBe("true");
    expect(res.headers.get("Vary")).toBe("Origin");
  });

  it("honours env.AUTH_ALLOWED_RETURN_HOSTS as exact extra hosts", async () => {
    const without = await preflight("https://partner.example.com");
    expect(without.headers.get("Access-Control-Allow-Origin")).toBeNull();
    const env = { ...PROD_ENV, AUTH_ALLOWED_RETURN_HOSTS: "partner.example.com" };
    const withExtra = await preflight("https://partner.example.com", env);
    expect(withExtra.headers.get("Access-Control-Allow-Origin")).toBe("https://partner.example.com");
    const sub = await preflight("https://sub.partner.example.com", env);
    expect(sub.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("rejects localhost in production (and when ENVIRONMENT is missing), allows it in explicit development", async () => {
    const prod = await preflight("http://localhost:5173");
    expect(prod.headers.get("Access-Control-Allow-Origin")).toBeNull();
    const missing = await preflight("http://localhost:5173", { UPSTREAM: PROD_ENV.UPSTREAM });
    expect(missing.headers.get("Access-Control-Allow-Origin")).toBeNull();
    const dev = await preflight("http://localhost:5173", { ...PROD_ENV, ENVIRONMENT: "development" });
    expect(dev.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:5173");
  });
});

describe("id-gateway return URL sanitising", () => {
  it("strips attacker redirect_uri before proxying /login", async () => {
    const q = await upstreamQueryFor("/login?redirect_uri=https://attacker-probe.vercel.app/cb");
    expect(q.get("redirect_uri")).toBeNull();
    expect(q.get("redirect")).toBeNull();
  });

  it("strips //evil, /\\evil, userinfo and look-alike hosts", async () => {
    for (const bad of [
      "//evil.example/cb",
      "/\\evil.example/cb",
      "https://evil.example@grudge-studio.com/cb",
      "https://grudge-studio.com@evil.example/cb",
      "https://grudge-studio.com.evil.com/cb",
      "https://attacker.workers.dev/cb",
    ]) {
      upstreamCalls = [];
      const q = await upstreamQueryFor(`/login?redirect_uri=${encodeURIComponent(bad)}`);
      expect(q.get("redirect_uri")).toBeNull();
      expect(q.get("redirect")).toBeNull();
    }
  });

  it("keeps an allowlisted return and origin", async () => {
    const q = await upstreamQueryFor(
      `/login?redirect_uri=${encodeURIComponent("https://wallet.grudge-studio.com/cb")}&origin=${encodeURIComponent("https://wallet.grudge-studio.com")}`,
    );
    expect(q.get("redirect_uri")).toBe("https://wallet.grudge-studio.com/cb");
    expect(q.get("redirect")).toBe("https://wallet.grudge-studio.com/cb");
    expect(q.get("origin")).toBe("https://wallet.grudge-studio.com");
  });

  it("drops localhost returns in production but keeps them in explicit development", async () => {
    const prod = await upstreamQueryFor("/login?redirect_uri=http://localhost:5173/cb");
    expect(prod.get("redirect_uri")).toBeNull();
    upstreamCalls = [];
    const dev = await upstreamQueryFor("/login?redirect_uri=http://localhost:5173/cb", {
      ...PROD_ENV,
      ENVIRONMENT: "development",
    });
    expect(dev.get("redirect_uri")).toBe("http://localhost:5173/cb");
  });
});

describe("id-gateway api param sanitization", () => {
  const opts = { publicHost: "https://id.grudge-studio.com" };

  it("accepts same-origin (id.grudge-studio.com)", () => {
    const result = sanitizeApi("https://id.grudge-studio.com", opts);
    expect(result).toBe("https://id.grudge-studio.com");
  });

  it("accepts the canonical Railway API origin", () => {
    const result = sanitizeApi("https://grudge-api-production-0d46.up.railway.app", opts);
    expect(result).toBe("https://grudge-api-production-0d46.up.railway.app");
  });

  it("rejects attacker hosts", () => {
    for (const bad of [
      "https://evil.example/api",
      "https://grudge-api.evil.example/api",
      "https://grudge-studio.com.evil.com",
      "https://attacker.workers.dev",
    ]) {
      const result = sanitizeApi(bad, opts);
      expect(result).toBe("");
    }
  });

  it("rejects http downgrade of canonical host", () => {
    const result = sanitizeApi("http://grudge-api-production-0d46.up.railway.app", opts);
    expect(result).toBe("");
  });

  it("rejects userinfo tricks (evil@host)", () => {
    for (const bad of [
      "https://evil@grudge-api-production-0d46.up.railway.app",
      "https://user:pass@grudge-api-production-0d46.up.railway.app",
      "https://evil@id.grudge-studio.com",
    ]) {
      const result = sanitizeApi(bad, opts);
      expect(result).toBe("");
    }
  });

  it("rejects good host with evil userinfo (canonical@evil)", () => {
    const result = sanitizeApi("https://grudge-api-production-0d46.up.railway.app@evil.example", opts);
    expect(result).toBe("");
  });

  it("rejects percent-encoded variants", () => {
    const result = sanitizeApi("https://evil.example%2f@grudge-studio.com", opts);
    expect(result).toBe("");
  });

  it("rejects backslash tricks", () => {
    const result = sanitizeApi("https://grudge-studio.com\\@evil.example", opts);
    expect(result).toBe("");
  });

  it("rejects protocol-relative (//evil)", () => {
    const result = sanitizeApi("//evil.example/api", opts);
    expect(result).toBe("");
  });

  it("rejects non-443 port", () => {
    const result = sanitizeApi("https://grudge-api-production-0d46.up.railway.app:8080", opts);
    expect(result).toBe("");
  });

  it("rejects javascript: protocol", () => {
    const result = sanitizeApi("javascript:alert(1)", opts);
    expect(result).toBe("");
  });

  it("rejects data: protocol", () => {
    const result = sanitizeApi("data:text/html,<script>alert(1)</script>", opts);
    expect(result).toBe("");
  });

  it("returns empty string for empty input", () => {
    expect(sanitizeApi("", opts)).toBe("");
    expect(sanitizeApi(null, opts)).toBe("");
    expect(sanitizeApi(undefined, opts)).toBe("");
  });
});
