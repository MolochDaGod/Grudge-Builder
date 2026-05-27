/**
 * Session Persistence Tests
 *
 * Tests the low-level grudgeBackend.ts helpers that every auth method relies on:
 *   - Token storage (localStorage + cookie mirror)
 *   - Session object storage
 *   - getCurrentUser() reconstruction from different storage states
 *   - verifyToken() JWT expiry detection
 *   - logout() complete cleanup
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// We must import dynamically because grudgeBackend.ts has a top-level IIFE
// (pickupSsoToken) and auto-starts a token monitor. We isolate each import.
async function loadModule() {
  // Reset module cache so each test gets fresh module state
  vi.resetModules();
  return import("@/lib/grudgeBackend");
}

describe("Token helpers", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("setToken stores in both canonical and legacy keys + cookie", async () => {
    const mod = await loadModule();
    mod.setToken("tok_abc");

    expect(localStorage.getItem("grudge_auth_token")).toBe("tok_abc");
    expect(localStorage.getItem("grudge_session_token")).toBe("tok_abc");
    expect(document.cookie).toContain("grudge_auth_token=tok_abc");
  });

  it("getToken reads canonical key first, falls back to legacy", async () => {
    const mod = await loadModule();

    localStorage.setItem("grudge_auth_token", "primary");
    expect(mod.getToken()).toBe("primary");

    localStorage.removeItem("grudge_auth_token");
    localStorage.setItem("grudge_session_token", "fallback");
    expect(mod.getToken()).toBe("fallback");
  });

  it("clearToken removes both keys and cookie", async () => {
    const mod = await loadModule();
    mod.setToken("tok_xyz");
    mod.clearToken();

    expect(localStorage.getItem("grudge_auth_token")).toBeNull();
    expect(localStorage.getItem("grudge_session_token")).toBeNull();
  });

  it("isAuthenticated returns true iff a token exists", async () => {
    const mod = await loadModule();
    expect(mod.isAuthenticated()).toBe(false);

    mod.setToken("tok_123");
    expect(mod.isAuthenticated()).toBe(true);
  });

  it("authHeaders returns Bearer + X-Session-Token when authenticated", async () => {
    const mod = await loadModule();
    expect(mod.authHeaders()).toEqual({});

    mod.setToken("tok_hdr");
    expect(mod.authHeaders()).toEqual({
      Authorization: "Bearer tok_hdr",
      "X-Session-Token": "tok_hdr",
    });
  });
});

describe("Session helpers", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("setSession + getSession round-trips correctly", async () => {
    const mod = await loadModule();
    const session = {
      type: "grudge" as const,
      username: "TestUser",
      grudgeId: "GRUDGE_ABC123",
      loginTime: 1000,
    };
    mod.setSession(session);

    const restored = mod.getSession();
    expect(restored).toEqual(session);
  });

  it("setSession mirrors grudgeId to cookie", async () => {
    const mod = await loadModule();
    mod.setSession({
      type: "wallet" as const,
      username: "WalletBro",
      grudgeId: "GRUDGE_WAL",
      loginTime: 2000,
    });
    expect(document.cookie).toContain("grudge_id=GRUDGE_WAL");
  });

  it("getSession returns null when nothing stored", async () => {
    const mod = await loadModule();
    expect(mod.getSession()).toBeNull();
  });

  it("getSession returns null on malformed JSON", async () => {
    const mod = await loadModule();
    localStorage.setItem("grudge-session", "{bad json");
    expect(mod.getSession()).toBeNull();
  });
});

describe("getCurrentUser", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns null when no token and no session", async () => {
    const mod = await loadModule();
    expect(mod.getCurrentUser()).toBeNull();
  });

  it("reconstructs user from session object", async () => {
    const mod = await loadModule();
    mod.setToken("tok");
    mod.setSession({
      type: "puter" as const,
      username: "PuterGuy",
      grudgeId: "GRUDGE_PG",
      loginTime: 3000,
    });

    const user = mod.getCurrentUser();
    expect(user).not.toBeNull();
    expect(user!.username).toBe("PuterGuy");
    expect(user!.grudgeId).toBe("GRUDGE_PG");
  });

  it("reconstructs user from individual localStorage keys when no session object", async () => {
    const mod = await loadModule();
    mod.setToken("tok");
    localStorage.setItem("grudge_id", "GRUDGE_KEYS");
    localStorage.setItem("grudge_username", "KeyUser");
    localStorage.setItem("grudge_user_id", "42");

    const user = mod.getCurrentUser();
    expect(user).not.toBeNull();
    expect(user!.grudgeId).toBe("GRUDGE_KEYS");
    expect(user!.username).toBe("KeyUser");
    expect(user!.id).toBe(42);
  });
});

describe("verifyToken", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns { valid: false } when no token", async () => {
    const mod = await loadModule();
    const result = await mod.verifyToken();
    expect(result.valid).toBe(false);
  });

  it("returns { valid: true } for a non-JWT token (Puter session)", async () => {
    const mod = await loadModule();
    mod.setToken("puter_session_opaque_token");
    localStorage.setItem("grudge_id", "GRUDGE_V");
    localStorage.setItem("grudge_username", "ValidUser");

    const result = await mod.verifyToken();
    expect(result.valid).toBe(true);
    expect(result.grudgeId).toBe("GRUDGE_V");
    expect(result.username).toBe("ValidUser");
  });

  it("returns { valid: false } and calls logout for an expired JWT", async () => {
    const mod = await loadModule();
    // Create a JWT with exp in the past
    const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const payload = btoa(
      JSON.stringify({ userId: "1", exp: Math.floor(Date.now() / 1000) - 3600 }),
    );
    const expiredJwt = `${header}.${payload}.fakesig`;

    mod.setToken(expiredJwt);
    const result = await mod.verifyToken();
    expect(result.valid).toBe(false);
    // Verify logout was triggered (token cleared)
    expect(mod.getToken()).toBeNull();
  });

  it("returns { valid: true } for a JWT with future exp", async () => {
    const mod = await loadModule();
    const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const payload = btoa(
      JSON.stringify({ userId: "1", exp: Math.floor(Date.now() / 1000) + 3600 }),
    );
    const validJwt = `${header}.${payload}.fakesig`;

    mod.setToken(validJwt);
    const result = await mod.verifyToken();
    expect(result.valid).toBe(true);
  });
});

describe("logout", () => {
  it("clears all session state from localStorage and cookies", async () => {
    const mod = await loadModule();

    // Set up a full session
    mod.setToken("tok_logout");
    mod.setSession({
      type: "grudge" as const,
      username: "LogoutUser",
      grudgeId: "GRUDGE_LO",
      loginTime: 5000,
    });
    localStorage.setItem("grudge_user_id", "99");
    localStorage.setItem("grudge_id", "GRUDGE_LO");
    localStorage.setItem("grudge_username", "LogoutUser");
    localStorage.setItem("grudge_account_id", "GRUDGE_LO");

    // Verify setup
    expect(mod.isAuthenticated()).toBe(true);

    // Logout
    mod.logout();

    // Verify complete cleanup
    expect(mod.getToken()).toBeNull();
    expect(mod.getSession()).toBeNull();
    expect(mod.getCurrentUser()).toBeNull();
    expect(mod.isAuthenticated()).toBe(false);
    expect(localStorage.getItem("grudge_user_id")).toBeNull();
    expect(localStorage.getItem("grudge_id")).toBeNull();
    expect(localStorage.getItem("grudge_username")).toBeNull();
    expect(localStorage.getItem("grudge_account_id")).toBeNull();
  });
});

describe("getDeviceId", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("generates and persists a device ID", async () => {
    const mod = await loadModule();
    const id = mod.getDeviceId();
    expect(id).toMatch(/^gb_/);
    expect(mod.getDeviceId()).toBe(id); // stable
  });

  it("reuses stored device ID", async () => {
    const mod = await loadModule();
    localStorage.setItem("grudge_device_id", "gb_existing");
    expect(mod.getDeviceId()).toBe("gb_existing");
  });
});
