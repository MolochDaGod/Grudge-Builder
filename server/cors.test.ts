import { describe, expect, it } from "vitest";
import { GRUDGE_CORS_OPTIONS, isAllowedOrigin } from "./cors";

function resolveCorsOrigin(origin: string | undefined): Promise<boolean | string | undefined> {
  return new Promise((resolve, reject) => {
    const originOption = GRUDGE_CORS_OPTIONS.origin;
    if (typeof originOption !== "function") {
      resolve(originOption);
      return;
    }
    originOption(origin, (err, allow) => {
      if (err) reject(err);
      else resolve(allow);
    });
  });
}

describe("server CORS allowlist", () => {
  it("does not allow wildcard attacker origins", async () => {
    expect(isAllowedOrigin("https://attacker.workers.dev", true)).toBe(false);
    expect(isAllowedOrigin("https://attacker.vercel.app", true)).toBe(false);
    expect(isAllowedOrigin("http://localhost.evil.example", false)).toBe(false);

    await expect(resolveCorsOrigin("https://attacker.workers.dev")).resolves.toBe(false);
    await expect(resolveCorsOrigin("https://attacker.vercel.app")).resolves.toBe(false);
    await expect(resolveCorsOrigin("http://localhost.evil.example")).resolves.toBe(false);
  });

  it("reflects trusted studio origins", async () => {
    expect(isAllowedOrigin("https://grudgewarlords.com", true)).toBe(true);
    await expect(resolveCorsOrigin("https://grudgewarlords.com")).resolves.toBe(
      "https://grudgewarlords.com",
    );
  });

  it("leaves no-Origin requests unaffected", async () => {
    expect(isAllowedOrigin(undefined, true)).toBe(true);
    await expect(resolveCorsOrigin(undefined)).resolves.toBe(true);
  });

  it("allows localhost only outside production", () => {
    expect(isAllowedOrigin("http://localhost:5173", false)).toBe(true);
    expect(isAllowedOrigin("http://localhost:5173", true)).toBe(false);
  });
});
