import { afterEach, describe, expect, it } from "vitest";
import {
  canonicalSsoReturnOrigin,
  isEphemeralVercelHost,
  isFleetAllowedReturnUrl,
} from "./authReturn";
import { validateReturnUrl } from "./studioOrigins";

const originalAllowedHosts = process.env.AUTH_ALLOWED_RETURN_HOSTS;

afterEach(() => {
  process.env.AUTH_ALLOWED_RETURN_HOSTS = originalAllowedHosts;
});

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
      isFleetAllowedReturnUrl(
        "https://grudge-builder-4ou1a2tv6-grudgenexus.vercel.app/account",
        { production: true },
      ),
    ).toBe(false);
    expect(isFleetAllowedReturnUrl("https://grudgewarlords.com/account", { production: true })).toBe(
      true,
    );
    expect(
      isFleetAllowedReturnUrl("https://client.grudge-studio.com/account", { production: true }),
    ).toBe(true);
    expect(
      isFleetAllowedReturnUrl("https://warlord-genesis.vercel.app/auth/callback", {
        production: true,
      }),
    ).toBe(true);
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

describe("strict return URL validation", () => {
  it("rejects malicious and wildcard-only hosts in production", () => {
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
    ];
    for (const value of rejected) {
      expect(isFleetAllowedReturnUrl(value, { production: true })).toBe(false);
    }
  });

  it("accepts explicit fleet hosts and non-production localhost", () => {
    expect(isFleetAllowedReturnUrl("https://grudgewarlords.com/cb", { production: true })).toBe(true);
    expect(isFleetAllowedReturnUrl("https://id.grudge-studio.com/account", { production: true })).toBe(
      true,
    );
    expect(isFleetAllowedReturnUrl("https://mine-loader.vercel.app/", { production: true })).toBe(
      true,
    );
    expect(
      isFleetAllowedReturnUrl("https://warlord-genesis.vercel.app/auth/callback", {
        production: true,
      }),
    ).toBe(true);
    expect(isFleetAllowedReturnUrl("https://grudge-crafting.puter.site/", { production: true })).toBe(
      true,
    );
    expect(
      validateReturnUrl("/account", {
        base: "https://id.grudge-studio.com/login",
        production: true,
        fallback: "",
      }),
    ).toBe("https://id.grudge-studio.com/account");
    expect(isFleetAllowedReturnUrl("http://localhost:5173", { production: false })).toBe(true);
    expect(isFleetAllowedReturnUrl("http://localhost:5173", { production: true })).toBe(false);
  });

  it("extends host allowlist from AUTH_ALLOWED_RETURN_HOSTS without subdomain wildcarding", () => {
    process.env.AUTH_ALLOWED_RETURN_HOSTS = "world-foo.example.com";
    expect(isFleetAllowedReturnUrl("https://world-foo.example.com/cb", { production: true })).toBe(
      true,
    );
    expect(
      isFleetAllowedReturnUrl("https://sub.world-foo.example.com/cb", { production: true }),
    ).toBe(false);
  });
});
