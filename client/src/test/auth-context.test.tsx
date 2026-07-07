/**
 * AuthContext Tests
 *
 * Tests the AuthProvider + useAuth hook that wraps the entire app:
 *   - Initial state based on localStorage
 *   - openLogin / closeLogin toggle
 *   - handleLogout clears all state
 *   - refreshAuth rehydrates from storage
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

// Mock grudgeBackend functions so we control what they return
vi.mock("@/lib/grudgeBackend", () => ({
  isAuthenticated: vi.fn(() => false),
  getCurrentUser: vi.fn(() => null),
  getSession: vi.fn(() => null),
  logout: vi.fn(),
  verifyToken: vi.fn(async () => ({ valid: false })),
}));

vi.mock("@/lib/grudgeFleet", () => ({
  loginWithGrudgeId: vi.fn(),
}));

import { loginWithGrudgeId } from "@/lib/grudgeFleet";
const mockLoginWithGrudgeId = vi.mocked(loginWithGrudgeId);

// Re-import the mocked module for direct manipulation
import * as backend from "@/lib/grudgeBackend";
const mockBackend = vi.mocked(backend);

/** Test harness that exposes auth state via data-testid attributes */
function AuthConsumer() {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="authed">{String(auth.isAuthenticated)}</span>
      <span data-testid="user">{auth.user?.username ?? "none"}</span>
      <span data-testid="login-open">{String(auth.loginOpen)}</span>
      <button data-testid="open" onClick={auth.openLogin}>
        Open
      </button>
      <button data-testid="sso" onClick={() => auth.redirectToGrudgeIdLogin("/auth/callback")}>
        SSO
      </button>
      <button data-testid="close" onClick={auth.closeLogin}>
        Close
      </button>
      <button data-testid="logout" onClick={auth.handleLogout}>
        Logout
      </button>
      <button data-testid="refresh" onClick={auth.refreshAuth}>
        Refresh
      </button>
    </div>
  );
}

function renderWithAuth() {
  return render(
    <AuthProvider>
      <AuthConsumer />
    </AuthProvider>,
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBackend.isAuthenticated.mockReturnValue(false);
    mockBackend.getCurrentUser.mockReturnValue(null);
    mockBackend.getSession.mockReturnValue(null);
    mockBackend.verifyToken.mockResolvedValue({ valid: false });
  });

  it("renders with unauthenticated state by default", async () => {
    renderWithAuth();
    // Wait for the useEffect refreshAuth to settle
    await act(async () => {});

    expect(screen.getByTestId("authed").textContent).toBe("false");
    expect(screen.getByTestId("user").textContent).toBe("none");
    expect(screen.getByTestId("login-open").textContent).toBe("false");
  });

  it("renders with authenticated state when token exists", async () => {
    mockBackend.isAuthenticated.mockReturnValue(true);
    mockBackend.getCurrentUser.mockReturnValue({
      grudgeId: "GRUDGE_TEST",
      username: "TestHero",
    });
    mockBackend.getSession.mockReturnValue({
      type: "grudge",
      username: "TestHero",
      grudgeId: "GRUDGE_TEST",
      loginTime: Date.now(),
    });
    mockBackend.verifyToken.mockResolvedValue({
      valid: true,
      grudgeId: "GRUDGE_TEST",
      username: "TestHero",
    });

    renderWithAuth();
    await act(async () => {});

    expect(screen.getByTestId("authed").textContent).toBe("true");
    expect(screen.getByTestId("user").textContent).toBe("TestHero");
  });

  it("openLogin opens the login modal", async () => {
    const user = userEvent.setup();
    renderWithAuth();
    await act(async () => {});

    await user.click(screen.getByTestId("open"));
    expect(screen.getByTestId("login-open").textContent).toBe("true");
    expect(mockLoginWithGrudgeId).not.toHaveBeenCalled();
  });

  it("redirectToGrudgeIdLogin sends user to Grudge ID SSO", async () => {
    const user = userEvent.setup();
    renderWithAuth();
    await act(async () => {});

    await user.click(screen.getByTestId("sso"));
    expect(mockLoginWithGrudgeId).toHaveBeenCalledWith("/auth/callback");
  });

  it("handleLogout clears auth state and calls backend logout", async () => {
    const user = userEvent.setup();

    mockBackend.isAuthenticated.mockReturnValue(true);
    mockBackend.getCurrentUser.mockReturnValue({
      grudgeId: "GRUDGE_LO",
      username: "LogoutGuy",
    });
    mockBackend.verifyToken.mockResolvedValue({ valid: true });

    renderWithAuth();
    await act(async () => {});
    expect(screen.getByTestId("authed").textContent).toBe("true");

    await user.click(screen.getByTestId("logout"));

    expect(mockBackend.logout).toHaveBeenCalledOnce();
    expect(screen.getByTestId("authed").textContent).toBe("false");
    expect(screen.getByTestId("user").textContent).toBe("none");
  });

  it("refreshAuth rehydrates from storage after login", async () => {
    const user = userEvent.setup();
    renderWithAuth();
    await act(async () => {});
    expect(screen.getByTestId("authed").textContent).toBe("false");

    // Simulate a login happened externally (e.g. LoginModal wrote to storage)
    mockBackend.verifyToken.mockResolvedValue({
      valid: true,
      grudgeId: "GRUDGE_NEW",
      username: "NewUser",
    });
    mockBackend.getCurrentUser.mockReturnValue({
      grudgeId: "GRUDGE_NEW",
      username: "NewUser",
    });
    mockBackend.getSession.mockReturnValue({
      type: "grudge",
      username: "NewUser",
      grudgeId: "GRUDGE_NEW",
      loginTime: Date.now(),
    });

    await user.click(screen.getByTestId("refresh"));

    await waitFor(() => {
      expect(screen.getByTestId("authed").textContent).toBe("true");
      expect(screen.getByTestId("user").textContent).toBe("NewUser");
    });
  });
});

describe("useAuth outside provider", () => {
  it("throws if used without AuthProvider", () => {
    function Broken() {
      useAuth();
      return null;
    }

    // Suppress the React error boundary console noise
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Broken />)).toThrow(
      "useAuth must be used inside <AuthProvider>",
    );
    spy.mockRestore();
  });
});
