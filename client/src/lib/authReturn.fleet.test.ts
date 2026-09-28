import { describe, expect, it } from "vitest";
import { isFleetAllowedReturnUrl } from "@shared/fleet/authReturn";
import { validateReturnUrl } from "@shared/fleet/studioOrigins";

describe("fleet return URL allowlist", () => {
  it("rejects wildcard-style attacker hosts", () => {
    expect(isFleetAllowedReturnUrl("https://attacker.workers.dev/cb")).toBe(false);
    expect(isFleetAllowedReturnUrl("https://attacker.vercel.app/cb")).toBe(false);
    expect(isFleetAllowedReturnUrl("https://attacker.grudge-studio.com/cb")).toBe(false);
  });

  it("accepts explicit studio hosts only", () => {
    expect(isFleetAllowedReturnUrl("https://grudgewarlords.com/cb")).toBe(true);
    expect(isFleetAllowedReturnUrl("https://mine-loader.vercel.app/")).toBe(true);
    expect(isFleetAllowedReturnUrl("https://warlord-genesis.vercel.app/auth/callback")).toBe(true);
    expect(isFleetAllowedReturnUrl("https://wallet.grudge-studio.com/cb")).toBe(true);
  });

  it("keeps relative same-origin return paths", () => {
    expect(
      validateReturnUrl("/account", {
        base: "https://id.grudge-studio.com/login",
        fallback: "",
      }),
    ).toBe("https://id.grudge-studio.com/account");
  });
});
