import { describe, expect, it } from "vitest";
import {
  canonicalSsoReturnOrigin,
  isEphemeralVercelHost,
  isFleetAllowedReturnUrl,
  resolveFleetReturnUrl,
} from "./authReturn";
import { validateReturnUrl } from "./studioOrigins";

describe("ephemeral Vercel SSO hosts", () => {
  it("flags unique deploy hashes and git branch aliases", () => {
    expect(isEphemeralVercelHost("grudge-builder-4ou1a2tv6-grudgenexus.vercel.app")).toBe(true);
    expect(
      isEphemeralVercelHost(
        "grudge-builder-git-feat-lava-caesar-boss-grudgenexus.vercel.app",
      ),
    ).toBe(true);
  });

  it("keeps stable production Vercel aliases", () => {
    expect(isEphemeralVercelHost("grudge-builder.vercel.app")).toBe(false);
    expect(isEphemeralVercelHost("grudge-builder-grudgenexus.vercel.app")).toBe(false);
    expect(isEphemeralVercelHost("gameopen.vercel.app")).toBe(false);
    expect(isEphemeralVercelHost("grudgewarlords.com")).toBe(false);
  });

  it("rejects hash preview as an SSO return URL", () => {
    expect(
      isFleetAllowedReturnUrl("https://grudge-builder-4ou1a2tv6-grudgenexus.vercel.app/account"),
    ).toBe(false);
    expect(isFleetAllowedReturnUrl("https://grudgewarlords.com/account")).toBe(true);
    expect(isFleetAllowedReturnUrl("https://client.grudge-studio.com/account")).toBe(true);
    expect(isFleetAllowedReturnUrl("https://warlord-genesis.vercel.app/auth/callback")).toBe(true);
  });

  it("rewrites preview origin to Warlords apex", () => {
    expect(
      canonicalSsoReturnOrigin("https://grudge-builder-4ou1a2tv6-grudgenexus.vercel.app"),
    ).toBe("https://grudgewarlords.com");
    expect(canonicalSsoReturnOrigin("https://client.grudge-studio.com")).toBe(
      "https://grudgewarlords.com",
    );
  });
});

describe("strict return URL validation (production default)", () => {
  it("rejects malicious and wildcard-only hosts", () => {
    const rejected = [
      "https://attacker.workers.dev/cb",
      "https://attacker.vercel.app/cb",
      "https://attacker.pages.dev",
      "https://attacker.up.railway.app",
      "https://grudge-studio.com.evil.com/cb",
      "https://evilgrudge-studio.com",
      "https://evil.example@grudge-studio.com/cb",
      "https://grudge-studio.com@evil.example/cb",
      "//evil.example/cb",
      "/\\evil.example/cb",
      "\\\\evil.example",
      "https:\\\\evil.example",
      "javascript:alert(1)",
      "http://grudgewarlords.com",
      "http://localhost:5173",
      "https://attacker.grudge-studio.com",
      "https://puter.com/",
    ];
    for (const value of rejected) {
      expect(isFleetAllowedReturnUrl(value)).toBe(false);
      expect(isFleetAllowedReturnUrl(value, { dev: false })).toBe(false);
    }
  });

  it("accepts explicit fleet hosts; localhost only with explicit dev", () => {
    expect(isFleetAllowedReturnUrl("https://grudgewarlords.com/cb")).toBe(true);
    expect(isFleetAllowedReturnUrl("https://id.grudge-studio.com/account")).toBe(true);
    expect(isFleetAllowedReturnUrl("https://wallet.grudge-studio.com/cb")).toBe(true);
    expect(isFleetAllowedReturnUrl("https://mine-loader.vercel.app/")).toBe(true);
    expect(isFleetAllowedReturnUrl("https://grudge-crafting.puter.site/")).toBe(true);
    expect(
      validateReturnUrl("/account", {
        base: "https://id.grudge-studio.com/login",
        fallback: "",
      }),
    ).toBe("https://id.grudge-studio.com/account");
    expect(isFleetAllowedReturnUrl("http://localhost:5173")).toBe(false);
    expect(isFleetAllowedReturnUrl("http://localhost:5173", { dev: true })).toBe(true);
  });

  it("extends the allowlist via extraHosts without subdomain wildcarding", () => {
    const extraHosts = "world-foo.example.com";
    expect(isFleetAllowedReturnUrl("https://world-foo.example.com/cb")).toBe(false);
    expect(isFleetAllowedReturnUrl("https://world-foo.example.com/cb", { extraHosts })).toBe(true);
    expect(isFleetAllowedReturnUrl("https://sub.world-foo.example.com/cb", { extraHosts })).toBe(
      false,
    );
  });

  it("resolveFleetReturnUrl skips unsafe aliases and falls back", () => {
    expect(
      resolveFleetReturnUrl({ return: "https://attacker.vercel.app/", redirect_uri: "https://wallet.grudge-studio.com/cb" }),
    ).toBe("https://wallet.grudge-studio.com/cb");
    expect(resolveFleetReturnUrl({ return: "//evil.example/" }, "https://grudgewarlords.com/")).toBe(
      "https://grudgewarlords.com/",
    );
  });
});
