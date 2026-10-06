import { afterEach, describe, expect, it, vi } from "vitest";
import { isStudioOrigin, validateReturnUrl } from "@shared/fleet/studioOrigins";
import { serverStudioOriginOpts } from "./studioOriginsEnv";

afterEach(() => {
  vi.unstubAllEnvs();
});

function localhostAllowed(): boolean {
  const opts = serverStudioOriginOpts();
  return (
    validateReturnUrl("http://localhost:5173/cb", opts) !== "" &&
    isStudioOrigin("http://localhost:5173", opts)
  );
}

describe("server studio-origin adapter", () => {
  for (const nodeEnv of [undefined, "", "production", "test", "staging", "DEVELOPMENT-ish"]) {
    it(`rejects localhost when NODE_ENV=${JSON.stringify(nodeEnv)}`, () => {
      vi.stubEnv("NODE_ENV", nodeEnv as string);
      expect(serverStudioOriginOpts().dev).toBe(false);
      expect(localhostAllowed()).toBe(false);
    });
  }

  it("allows localhost only when NODE_ENV === 'development'", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(serverStudioOriginOpts().dev).toBe(true);
    expect(localhostAllowed()).toBe(true);
  });

  it("reads AUTH_ALLOWED_RETURN_HOSTS (and legacy names) as exact extra hosts", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_ALLOWED_RETURN_HOSTS", "partner.example.com");
    vi.stubEnv("AUTH_EXTRA_RETURN_HOSTS", "legacy.example.com");
    const opts = serverStudioOriginOpts();
    expect(validateReturnUrl("https://partner.example.com/cb", opts)).toBe(
      "https://partner.example.com/cb",
    );
    expect(validateReturnUrl("https://legacy.example.com/cb", opts)).toBe(
      "https://legacy.example.com/cb",
    );
    expect(validateReturnUrl("https://sub.partner.example.com/cb", opts)).toBe("");
  });
});
