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
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// We must import dynamically because grudgeBackend.ts has a top-level IIFE
// (pickupSsoToken) and auto-starts a token monitor. We isolate each import.
async function loadModule() {
  // Reset module cache so each test gets fresh module state
  vi.resetModules();
  return import("@/lib/grudgeBackend");
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

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

    localStorage.setItem("grudge_auth_token", "fixture_session_primary_1234567890");
    expect(mod.getToken()).toBe("fixture_session_primary_1234567890");

    localStorage.removeItem("grudge_auth_token");
    localStorage.setItem("grudge_session_token", "fixture_session_fallback_1234567890");
    expect(mod.getToken()).toBe("fixture_session_fallback_1234567890");
  });

  it("clearToken removes both keys and cookie", async () => {
    const mod = await loadModule();
    mod.setToken("tok_xyz");
    mod.clearToken();

    expect(localStorage.getItem("grudge_auth_token")).toBeNull();
    expect(localStorage.getItem("grudge_session_token")).toBeNull();
    expect(document.cookie).not.toContain("grudge_auth_token=");
  });

  it("isAuthenticated returns true iff a token exists", async () => {
    const mod = await loadModule();
    expect(mod.isAuthenticated()).toBe(false);

    mod.setToken("fixture_session_tok_123_1234567890");
    expect(mod.isAuthenticated()).toBe(true);
  });

  it("authHeaders returns Bearer + X-Session-Token when authenticated", async () => {
    const mod = await loadModule();
    expect(mod.authHeaders()).toEqual({});

    mod.setToken("fixture_session_tok_hdr_1234567890");
    expect(mod.authHeaders()).toEqual({
      Authorization: "Bearer fixture_session_tok_hdr_1234567890",
      "X-Session-Token": "fixture_session_tok_hdr_1234567890",
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
    mod.setToken("fixture_session_tok_1234567890");
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
    mod.setToken("fixture_session_tok_1234567890");
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

  it("accepts only server-verified sessions and caches concurrent verification", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      valid: true, grudgeId: "GRUDGE_V", username: "ValidUser",
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const mod = await loadModule();
    mod.setToken("fixture_session_verified_1234567890");
    const [first, second] = await Promise.all([mod.verifyToken(), mod.verifyToken()]);
    expect(first).toEqual({ valid: true, grudgeId: "GRUDGE_V", username: "ValidUser" });
    expect(second).toEqual(first);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/verify", expect.objectContaining({
      headers: { Authorization: "Bearer fixture_session_verified_1234567890" },
    }));
  });

  it.each([401, 403])("clears a session rejected with HTTP %s", async (status) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status })));
    const mod = await loadModule();
    mod.setToken("fixture_session_rejected_1234567890");
    expect((await mod.verifyToken()).valid).toBe(false);
    expect(mod.getToken()).toBeNull();
  });

  it("does not trust an opaque token merely because it exists", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response('{"valid":false}')));
    const mod = await loadModule();
    mod.setToken("fixture_session_unverified_1234567890");
    expect((await mod.verifyToken()).valid).toBe(false);
    expect(mod.getToken()).toBeNull();
  });

  it("preserves the token and retries verification after a service outage", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response("{}", { status: 503 }))
      .mockResolvedValueOnce(new Response('{"valid":true}'));
    vi.stubGlobal("fetch", fetchMock);
    const mod = await loadModule();
    mod.setToken("fixture_session_retry_1234567890");
    await expect(mod.verifyToken()).rejects.toThrow("HTTP 503");
    expect(mod.getToken()).toBe("fixture_session_retry_1234567890");
    expect((await mod.verifyToken()).valid).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

});

describe("logout", () => {
  it("clears all session state from localStorage and cookies", async () => {
    const mod = await loadModule();

    // Set up a full session
    mod.setToken("fixture_session_tok_logout_1234567890");
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
    expect(document.cookie).not.toContain("grudge_auth_token=");
    expect(document.cookie).not.toContain("grudge_id=");
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
