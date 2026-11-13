import { describe, expect, it } from "vitest";
import {
  encodeKeyPath,
  keyFromReq,
  rawQueryParam,
  sanitizeKey,
} from "./cdn-proxy";

function req(url: string) {
  return { url, headers: { host: "localhost" } } as import("node:http").IncomingMessage;
}

describe("cdn-proxy key parsing", () => {
  it("does not treat + in ?key= as space", () => {
    // Vercel rewrite /api/assets/foo+bar.png → /api/cdn-proxy?key=foo+bar.png
    expect(rawQueryParam("?key=foo+bar.png", "key")).toBe("foo+bar.png");
    expect(sanitizeKey("foo+bar.png")).toBe("foo+bar.png");
    expect(encodeKeyPath("foo+bar.png")).toBe("/foo%2Bbar.png");
    expect(keyFromReq(req("/api/cdn-proxy?key=foo+bar.png"))).toBe("foo+bar.png");
  });

  it("decodes %2B without turning + into a space", () => {
    expect(rawQueryParam("?key=foo%2Bbar.png", "key")).toBe("foo+bar.png");
    expect(keyFromReq(req("/api/cdn-proxy?key=foo%2Bbar.png"))).toBe("foo+bar.png");
    expect(encodeKeyPath(keyFromReq(req("/api/cdn-proxy?key=foo%2Bbar.png"))!)).toBe(
      "/foo%2Bbar.png",
    );
  });

  it("keeps parentheses and spaces in keys", () => {
    const key = "sprites/Tiny Swords (Free Pack)/x.png";
    expect(sanitizeKey(key)).toBe(key);
    expect(encodeKeyPath(key)).toBe("/sprites/Tiny%20Swords%20(Free%20Pack)/x.png");
  });

  it("still rejects path traversal and empty keys", () => {
    expect(sanitizeKey("../etc/passwd")).toBeNull();
    expect(sanitizeKey("foo/../../bar")).toBeNull();
    expect(keyFromReq(req("/api/cdn-proxy?key="))).toBeNull();
    expect(keyFromReq(req("/api/cdn-proxy"))).toBeNull();
  });

  it("accepts path-style /api/cdn-proxy/foo+bar.png", () => {
    expect(keyFromReq(req("/api/cdn-proxy/foo+bar.png"))).toBe("foo+bar.png");
  });
});
