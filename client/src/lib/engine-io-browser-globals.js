/**
 * Browser shim for engine.io-client/build/esm/globals.node.js
 *
 * The published engine.io-client package is missing its browser-specific
 * globals.js file (the package.json browser field maps globals.node.js →
 * globals.js but only the Node version ships). This shim provides the
 * browser-appropriate implementations.
 *
 * Exports that matter for browser builds:
 *  - nextTick  → queueMicrotask (same semantics, microtask queue)
 *  - globalThisShim → globalThis
 *  - defaultBinaryType → "arraybuffer" (browsers use arraybuffer, not nodebuffer)
 *  - CookieJar / createCookieJar / parse → no-ops (browser handles cookies natively)
 */

export const nextTick = (callback, ...args) =>
  queueMicrotask(() => callback(...args));

export const globalThisShim = globalThis;

export const defaultBinaryType = "arraybuffer";

export function createCookieJar() {
  return new CookieJar();
}

export function parse(setCookieString) {
  // Browsers handle Set-Cookie natively via document.cookie
  const [nameValue] = (setCookieString || "").split(";");
  const eqIdx = nameValue.indexOf("=");
  return eqIdx === -1
    ? { name: nameValue.trim(), value: "" }
    : { name: nameValue.slice(0, eqIdx).trim(), value: nameValue.slice(eqIdx + 1).trim() };
}

export class CookieJar {
  constructor() {
    this._cookies = new Map();
  }
  parseCookies(values) {
    if (!values) return;
    for (const v of values) {
      const c = parse(v);
      if (c.name) this._cookies.set(c.name, c);
    }
  }
  get cookies() {
    return this._cookies.entries();
  }
  addCookies(xhr) {
    // No-op: browsers send cookies automatically via credentials
  }
  appendCookies(headers) {
    // No-op: browser handles cookies natively
  }
}
