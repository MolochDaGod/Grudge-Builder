import { describe, expect, it } from "vitest";
import { isFleetAllowedReturnUrl } from "@shared/fleet/authReturn";
import { validateReturnUrl } from "@shared/fleet/studioOrigins";

describe("fleet return URL allowlist", () => {
  it("rejects wildcard-style attacker hosts", () => {
    expect(isFleetAllowedReturnUrl("https://attacker.workers.dev/cb", { production: true })).toBe(
      false,
    );
    expect(isFleetAllowedReturnUrl("https://attacker.vercel.app/cb", { production: true })).toBe(
      false,
    );
    expect(
      isFleetAllowedReturnUrl("https://attacker.grudge-studio.com/cb", { production: true }),
    ).toBe(false);
  });

  it("accepts explicit studio hosts only", () => {
    expect(isFleetAllowedReturnUrl("https://grudgewarlords.com/cb", { production: true })).toBe(true);
    expect(isFleetAllowedReturnUrl("https://mine-loader.vercel.app/", { production: true })).toBe(
      true,
    );
    expect(
      isFleetAllowedReturnUrl("https://warlord-genesis.vercel.app/auth/callback", {
        production: true,
      }),
    ).toBe(true);
  });

  it("keeps relative same-origin return paths", () => {
    expect(
      validateReturnUrl("/account", {
        base: "https://id.grudge-studio.com/login",
        production: true,
        fallback: "",
      }),
    ).toBe("https://id.grudge-studio.com/account");
  });
});
