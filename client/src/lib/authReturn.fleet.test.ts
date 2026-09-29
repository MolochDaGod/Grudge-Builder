import { describe, expect, it } from "vitest";
import {
  canonicalSsoReturnOrigin,
  isEphemeralVercelHost,
  isFleetAllowedReturnUrl,
} from "@shared/fleet/authReturn";

describe("ephemeral Vercel SSO hosts", () => {
  it("flags unique deploy hashes and git branch aliases", () => {
    expect(isEphemeralVercelHost("grudge-builder-4ou1a2tv6-grudgenexus.vercel.app")).toBe(
      true,
    );
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
      ),
    ).toBe(false);
    expect(isFleetAllowedReturnUrl("https://grudgewarlords.com/account")).toBe(true);
    expect(isFleetAllowedReturnUrl("https://client.grudge-studio.com/account")).toBe(true);
    expect(isFleetAllowedReturnUrl("https://warlord-genesis.vercel.app/auth/callback")).toBe(
      true,
    );
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
