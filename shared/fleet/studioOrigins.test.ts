import { describe, expect, it } from "vitest";
import {
  STUDIO_HOSTS,
  getAllowedHosts,
  isStudioOrigin,
  parseHostList,
  validateReturnUrl,
} from "./studioOrigins";

const PROD_OPTION_VARIANTS: Array<[string, Record<string, unknown> | undefined]> = [
  ["no options", undefined],
  ["{}", {}],
  ["{ dev: undefined }", { dev: undefined }],
  ["{ dev: false }", { dev: false }],
  ['{ dev: "true" } (string, not strict boolean)', { dev: "true" }],
  ["{ dev: 1 }", { dev: 1 }],
];

describe("studioOrigins: production is the default", () => {
  for (const [label, opts] of PROD_OPTION_VARIANTS) {
    it(`rejects localhost / 127.0.0.1 with ${label}`, () => {
      const o = opts as never;
      expect(validateReturnUrl("http://localhost:5173/cb", o)).toBe("");
      expect(isStudioOrigin("http://localhost:5173", o)).toBe(false);
      expect(validateReturnUrl("http://127.0.0.1:5000/cb", o)).toBe("");
      expect(isStudioOrigin("http://127.0.0.1:5000", o)).toBe(false);
      expect(getAllowedHosts(o)).not.toContain("localhost");
      expect(getAllowedHosts(o)).not.toContain("127.0.0.1");
    });
  }

  it("allows http://localhost and http://127.0.0.1 only with explicit dev === true", () => {
    expect(validateReturnUrl("http://localhost:5173/cb", { dev: true })).toBe(
      "http://localhost:5173/cb",
    );
    expect(isStudioOrigin("http://localhost:5173", { dev: true })).toBe(true);
    expect(validateReturnUrl("http://127.0.0.1:5000/cb", { dev: true })).toBe(
      "http://127.0.0.1:5000/cb",
    );
    expect(isStudioOrigin("http://127.0.0.1:5000", { dev: true })).toBe(true);
  });

  it("rejects https://localhost even in dev, and localhost look-alikes always", () => {
    expect(validateReturnUrl("https://localhost/cb", { dev: true })).toBe("");
    expect(isStudioOrigin("https://localhost", { dev: true })).toBe(false);
    expect(validateReturnUrl("http://localhost.evil.example/cb", { dev: true })).toBe("");
    expect(validateReturnUrl("http://localhost.evil.example/cb")).toBe("");
    expect(isStudioOrigin("http://localhost.evil.example", { dev: true })).toBe(false);
  });

  it("does not let extraHosts smuggle localhost into production", () => {
    expect(validateReturnUrl("http://localhost:5173/cb", { extraHosts: "localhost" })).toBe("");
    expect(isStudioOrigin("http://localhost:5173", { extraHosts: ["localhost"] })).toBe(false);
  });
});

describe("studioOrigins: exact-host allowlist (no wildcard / suffix matching)", () => {
  const rejected = [
    "https://attacker.workers.dev/cb",
    "https://attacker-probe.workers.dev/cb",
    "https://attacker.vercel.app/cb",
    "https://attacker.pages.dev/cb",
    "https://attacker.up.railway.app/cb",
    "https://attacker.puter.site/cb",
    "https://attacker.grudge-studio.com/cb",
    "https://grudge-studio.com.evil.com/cb",
    "https://wallet.grudge-studio.com.evil.com/cb",
    "https://evilgrudge-studio.com/cb",
    "https://evil.example@grudge-studio.com/cb",
    "https://grudge-studio.com@evil.example/cb",
    "https://user:pass@wallet.grudge-studio.com/cb",
    "//evil.example/cb",
    "/\\evil.example/cb",
    "\\\\evil.example/cb",
    "https:\\\\evil.example",
    "javascript:alert(1)",
    "data:text/html,hi",
    "http://grudgewarlords.com/cb",
    "https://grudgewarlords.com:8443/cb",
    " https://grudgewarlords.com/cb",
    "https://grudgewarlords.com/cb\n",
    "https://puter.com/",
    "https://www.puter.com/",
    "https://app.puter.com/",
    "https://grudge-studio.puter.site/",
    "https://account.grudge-studio.com/",
    "https://characters.grudge-studio.com/",
  ];

  for (const value of rejected) {
    it(`rejects ${JSON.stringify(value)}`, () => {
      expect(validateReturnUrl(value, { base: "https://id.grudge-studio.com/login" })).toBe("");
      expect(isStudioOrigin(value)).toBe(false);
    });
  }

  const accepted = [
    "https://wallet.grudge-studio.com/cb",
    "https://weapon-skills.grudge-studio.com/",
    "https://objectstore.grudge-studio.com/",
    "https://assets.grudge-studio.com/",
    "https://info.grudge-studio.com/",
    "https://id.grudge-studio.com/account",
    "https://grudgewarlords.com/cb",
    "https://thc-labz.xyz/",
    "https://wallet.thc-labz.xyz/",
    "https://grudge-crafting.puter.site/",
    "https://warlord-genesis.vercel.app/auth/callback",
    "https://grudge-dungeons.vercel.app/",
  ];

  for (const value of accepted) {
    it(`accepts ${value}`, () => {
      expect(validateReturnUrl(value)).toBe(new URL(value).toString());
      expect(isStudioOrigin(new URL(value).origin)).toBe(true);
    });
  }

  it("keeps safe relative paths against the provided base only", () => {
    expect(
      validateReturnUrl("/account", { base: "https://id.grudge-studio.com/login" }),
    ).toBe("https://id.grudge-studio.com/account");
    expect(validateReturnUrl("/account")).toBe("");
  });

  it("honours extraHosts as exact hosts without subdomain wildcarding", () => {
    expect(validateReturnUrl("https://partner.example.com/cb")).toBe("");
    expect(
      validateReturnUrl("https://partner.example.com/cb", { extraHosts: "partner.example.com" }),
    ).toBe("https://partner.example.com/cb");
    expect(
      validateReturnUrl("https://sub.partner.example.com/cb", {
        extraHosts: "partner.example.com",
      }),
    ).toBe("");
    expect(isStudioOrigin("https://partner.example.com", { extraHosts: ["partner.example.com"] })).toBe(
      true,
    );
    expect(parseHostList(" A.example.com , https://b.example.com/x, *.evil.com,, ")).toEqual([
      "a.example.com",
      "b.example.com",
    ]);
  });

  it("static list has no wildcard entries, no puter.com, and includes the required hosts", () => {
    for (const host of STUDIO_HOSTS) {
      expect(host).toMatch(/^[a-z0-9.-]+$/);
      expect(host.startsWith(".")).toBe(false);
    }
    const set = new Set<string>(STUDIO_HOSTS);
    for (const banned of ["puter.com", "www.puter.com", "app.puter.com", "grudge-studio.puter.site"]) {
      expect(set.has(banned)).toBe(false);
    }
    for (const required of [
      "wallet.grudge-studio.com",
      "weapon-skills.grudge-studio.com",
      "objectstore.grudge-studio.com",
      "assets.grudge-studio.com",
      "info.grudge-studio.com",
    ]) {
      expect(set.has(required)).toBe(true);
    }
  });
});
