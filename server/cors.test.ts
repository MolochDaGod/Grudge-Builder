import { describe, expect, it } from "vitest";
import cors from "cors";
import type { CorsOptions } from "cors";
import { GRUDGE_CORS_OPTIONS, corsOptionsForOrigin, isAllowedOrigin } from "./cors";

const PROD = { dev: false } as const;
const DEV = { dev: true } as const;

function resolveDelegate(origin: string | undefined): Promise<CorsOptions | undefined> {
  return new Promise((resolve, reject) => {
    GRUDGE_CORS_OPTIONS(
      { method: "GET", headers: origin ? { origin } : {} },
      (err, options) => (err ? reject(err) : resolve(options)),
    );
  });
}

/** Run the real `cors` middleware and capture the response headers it sets. */
function runCors(origin: string | undefined, method = "GET"): Promise<Record<string, string>> {
  return new Promise((resolve) => {
    const headers: Record<string, string> = {};
    const req = { method, headers: origin ? { origin } : {} } as never;
    const res = {
      statusCode: 200,
      setHeader: (k: string, v: string) => {
        headers[k.toLowerCase()] = String(v);
      },
      getHeader: (k: string) => headers[k.toLowerCase()],
      end: () => resolve(headers),
    } as never;
    cors(GRUDGE_CORS_OPTIONS)(req, res, () => resolve(headers));
  });
}

describe("server CORS allowlist", () => {
  it("does not allow wildcard attacker origins", async () => {
    expect(isAllowedOrigin("https://attacker.workers.dev", PROD)).toBe(false);
    expect(isAllowedOrigin("https://attacker.vercel.app", PROD)).toBe(false);
    expect(isAllowedOrigin("https://grudge-studio.com.evil.com", PROD)).toBe(false);
    expect(isAllowedOrigin("http://localhost.evil.example", DEV)).toBe(false);

    for (const origin of [
      "https://attacker.workers.dev",
      "https://attacker.vercel.app",
      "https://grudge-studio.com.evil.com",
      "https://puter.com",
    ]) {
      const opts = await resolveDelegate(origin);
      expect(opts?.origin).toBe(false);
      expect(opts?.credentials).toBe(false);
    }
  });

  it("never sends Access-Control-Allow-Credentials to an arbitrary origin", async () => {
    for (const method of ["GET", "OPTIONS"]) {
      const headers = await runCors("https://attacker-probe.workers.dev", method);
      expect(headers["access-control-allow-origin"]).toBeUndefined();
      expect(headers["access-control-allow-credentials"]).toBeUndefined();
    }
  });

  it("reflects trusted studio origins with credentials", async () => {
    expect(isAllowedOrigin("https://grudgewarlords.com", PROD)).toBe(true);
    expect(isAllowedOrigin("https://wallet.grudge-studio.com", PROD)).toBe(true);
    const opts = await resolveDelegate("https://wallet.grudge-studio.com");
    expect(opts?.origin).toBe("https://wallet.grudge-studio.com");
    expect(opts?.credentials).toBe(true);
    const headers = await runCors("https://wallet.grudge-studio.com");
    expect(headers["access-control-allow-origin"]).toBe("https://wallet.grudge-studio.com");
    expect(headers["access-control-allow-credentials"]).toBe("true");
    expect(headers["vary"]).toContain("Origin");
  });

  it("leaves no-Origin requests unaffected", async () => {
    expect(isAllowedOrigin(undefined, PROD)).toBe(true);
    const opts = await resolveDelegate(undefined);
    expect(opts?.credentials).toBe(false);
  });

  it("allows localhost only with explicit dev", () => {
    expect(isAllowedOrigin("http://localhost:5173", DEV)).toBe(true);
    expect(isAllowedOrigin("http://localhost:5173", PROD)).toBe(false);
    expect(isAllowedOrigin("http://localhost:5173", {})).toBe(false);
    expect(corsOptionsForOrigin("http://localhost:5173", PROD).credentials).toBe(false);
    expect(corsOptionsForOrigin("http://localhost:5173", DEV).credentials).toBe(true);
    // Module default is computed from NODE_ENV (vitest sets "test") => production
    expect(isAllowedOrigin("http://localhost:5173")).toBe(false);
  });
});
