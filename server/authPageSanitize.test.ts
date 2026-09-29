import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { canonicalAuthPageQuery, injectAuthPageConfig } from "./authPageSanitize";

const BASE = "https://id.grudge-studio.com";
const PROD = { base: BASE, dev: false };

function templateGuard(html: string): { dev: unknown; hosts: Set<string> } {
  const devLine = html.match(/const STUDIO_DEV = ([^;]+);/);
  const hostsLine = html.match(/const ALLOWED_RETURN_HOSTS = (new Set\([^\n]+\));/);
  expect(devLine).not.toBeNull();
  expect(hostsLine).not.toBeNull();
  // eslint-disable-next-line no-new-func
  const dev = new Function(`return (${devLine![1]});`)();
  // eslint-disable-next-line no-new-func
  const hosts = new Function(`return (${hostsLine![1]});`)() as Set<string>;
  return { dev, hosts };
}

describe("auth page config injection", () => {
  const template = fs.readFileSync(path.resolve(__dirname, "templates", "auth-page.html"), "utf8");

  it("template defaults to production (STUDIO_DEV literal false)", () => {
    expect(template).toContain("const STUDIO_DEV = /*__GRUDGE_STUDIO_DEV__*/false;");
  });

  it("injects the full allowlist (every placeholder) and keeps production in prod", () => {
    const html = injectAuthPageConfig(template, { dev: false });
    expect(html).not.toContain("__GRUDGE_ALLOWED_RETURN_HOSTS__");
    expect(html).not.toContain("__GRUDGE_STUDIO_DEV__");
    const { dev, hosts } = templateGuard(html);
    expect(dev).toBe(false);
    expect(hosts.has("wallet.grudge-studio.com")).toBe(true);
    expect(hosts.has("grudgewarlords.com")).toBe(true);
    expect(hosts.has("localhost")).toBe(false);
    expect(hosts.has("puter.com")).toBe(false);
  });

  it("only flips the dev flag when dev === true", () => {
    const html = injectAuthPageConfig(template, { dev: true });
    const { dev, hosts } = templateGuard(html);
    expect(dev).toBe(true);
    expect(hosts.has("localhost")).toBe(true);
    const notDev = templateGuard(injectAuthPageConfig(template, { dev: "true" as never }));
    expect(notDev.dev).toBe(false);
  });
});

describe("auth page query canonicalisation", () => {
  it("is a no-op for the id-gateway Worker's canonical query (no redirect loop)", () => {
    const q = new URLSearchParams();
    q.set("redirect_uri", "https://wallet.grudge-studio.com/cb");
    q.set("redirect", "https://wallet.grudge-studio.com/cb");
    q.set("app", "wallet");
    q.set("origin", "https://wallet.grudge-studio.com");
    q.set("handoff", "1");
    q.set("api", "https://grudge-api-production-0d46.up.railway.app");
    q.set("state", "abc");
    q.set("scope", "profile");
    const res = canonicalAuthPageQuery(q.toString(), PROD);
    expect(res.changed).toBe(false);
    const again = canonicalAuthPageQuery(res.query, PROD);
    expect(again.changed).toBe(false);
  });

  it("preserves unrelated params (state, scope, view, error)", () => {
    const res = canonicalAuthPageQuery("view=account&state=s1&scope=x&error=denied", PROD);
    expect(res.changed).toBe(false);
  });

  it("drops attacker returns / origins and redirects once to a stable query", () => {
    for (const bad of [
      "https://attacker.vercel.app/cb",
      "https://attacker.workers.dev/cb",
      "https://grudge-studio.com.evil.com/cb",
      "https://evil.example@grudge-studio.com/cb",
      "//evil.example/cb",
      "/\\evil.example/cb",
      "http://localhost:5173/cb",
    ]) {
      const q = new URLSearchParams({ redirect_uri: bad, origin: bad, state: "keep" });
      const res = canonicalAuthPageQuery(q.toString(), PROD);
      expect(res.changed).toBe(true);
      const out = new URLSearchParams(res.query);
      expect(out.get("redirect_uri")).toBeNull();
      expect(out.get("redirect")).toBeNull();
      expect(out.get("origin")).toBeNull();
      expect(out.get("state")).toBe("keep");
      expect(canonicalAuthPageQuery(res.query, PROD).changed).toBe(false);
    }
  });

  it("collapses legacy aliases to redirect_uri + redirect", () => {
    const res = canonicalAuthPageQuery("return=https://grudgewarlords.com/cb&audience=https://grudgewarlords.com", PROD);
    expect(res.changed).toBe(true);
    const out = new URLSearchParams(res.query);
    expect(out.get("redirect_uri")).toBe("https://grudgewarlords.com/cb");
    expect(out.get("redirect")).toBe("https://grudgewarlords.com/cb");
    expect(out.get("origin")).toBe("https://grudgewarlords.com");
    expect(canonicalAuthPageQuery(res.query, PROD).changed).toBe(false);
  });

  it("keeps localhost only in explicit dev", () => {
    const q = "redirect_uri=http%3A%2F%2Flocalhost%3A5173%2Fcb&redirect=http%3A%2F%2Flocalhost%3A5173%2Fcb";
    expect(canonicalAuthPageQuery(q, { base: BASE, dev: true }).changed).toBe(false);
    expect(canonicalAuthPageQuery(q, PROD).changed).toBe(true);
  });

  it("drops attacker api hosts (token leak prevention)", () => {
    // Test various attacker payloads
    for (const bad of [
      "https://evil.example/api",
      "https://grudge-api.evil.example/api",
      "http://grudge-api-production-0d46.up.railway.app", // http downgrade
      "https://evil@grudge-api-production-0d46.up.railway.app", // userinfo
      "https://grudge-api-production-0d46.up.railway.app@evil.example", // canonical@evil
      "https://evil.example%2f@grudge-studio.com", // percent-encoded
      "//evil.example/api", // protocol-relative
      "https://grudge-studio.com.evil.example", // suffix look-alike
    ]) {
      const q = new URLSearchParams({ api: bad, state: "keep" });
      const res = canonicalAuthPageQuery(q.toString(), PROD);
      expect(res.changed).toBe(true);
      const out = new URLSearchParams(res.query);
      expect(out.get("api")).toBeNull();
      expect(out.get("state")).toBe("keep");
    }
  });

  it("accepts same-origin api (localhost dev)", () => {
    const res = canonicalAuthPageQuery("api=https://id.grudge-studio.com", PROD);
    expect(res.changed).toBe(false);
    const out = new URLSearchParams(res.query);
    expect(out.get("api")).toBe("https://id.grudge-studio.com");
  });

  it("accepts canonical Railway API host", () => {
    const res = canonicalAuthPageQuery("api=https://grudge-api-production-0d46.up.railway.app", PROD);
    expect(res.changed).toBe(false);
    const out = new URLSearchParams(res.query);
    expect(out.get("api")).toBe("https://grudge-api-production-0d46.up.railway.app");
  });
});
