import { afterEach, describe, expect, it, vi } from "vitest";
import { isStudioOrigin, validateReturnUrl } from "@shared/fleet/studioOrigins";
import { clientStudioOriginOpts } from "./studioOriginsClient";

function localhostAllowed(): boolean {
  const opts = clientStudioOriginOpts();
  return (
    validateReturnUrl("http://localhost:5173/cb", { ...opts, fallback: "" }) !== "" &&
    isStudioOrigin("http://localhost:5173", opts)
  );
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("client studio-origin adapter", () => {
  it("rejects localhost when import.meta.env.DEV is false (production build)", () => {
    vi.stubEnv("DEV", false);
    expect(clientStudioOriginOpts().dev).toBe(false);
    expect(localhostAllowed()).toBe(false);
  });

  it("rejects localhost when import.meta.env.DEV is undefined", () => {
    vi.stubEnv("DEV", undefined as unknown as boolean);
    expect(clientStudioOriginOpts().dev).toBe(false);
    expect(localhostAllowed()).toBe(false);
  });

  it("allows localhost only when import.meta.env.DEV === true", () => {
    vi.stubEnv("DEV", true);
    expect(clientStudioOriginOpts().dev).toBe(true);
    expect(localhostAllowed()).toBe(true);
  });

  it("still accepts studio hosts and rejects attacker hosts in production", () => {
    vi.stubEnv("DEV", false);
    const opts = clientStudioOriginOpts();
    expect(validateReturnUrl("https://wallet.grudge-studio.com/cb", opts)).toBe(
      "https://wallet.grudge-studio.com/cb",
    );
    expect(validateReturnUrl("https://attacker.vercel.app/cb", opts)).toBe("");
    expect(validateReturnUrl("https://attacker.workers.dev/cb", opts)).toBe("");
  });

  it("reads optional VITE_AUTH_ALLOWED_RETURN_HOSTS as exact extra hosts", () => {
    vi.stubEnv("DEV", false);
    vi.stubEnv("VITE_AUTH_ALLOWED_RETURN_HOSTS", "partner.example.com");
    const opts = clientStudioOriginOpts();
    expect(validateReturnUrl("https://partner.example.com/cb", opts)).toBe(
      "https://partner.example.com/cb",
    );
    expect(validateReturnUrl("https://sub.partner.example.com/cb", opts)).toBe("");
  });
});
