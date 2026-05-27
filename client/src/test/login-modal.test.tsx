/**
 * LoginModal Integration Tests
 *
 * Tests the full LoginModal flow for each auth method:
 *   1. Credentials (login + register)
 *   2. Phantom wallet
 *   3. Puter SDK (Google)
 *   4. Discord OAuth redirect
 *   5. Guest login
 *
 * Also tests: error display, modal open/close, view switching.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LoginModal } from "@/components/LoginModal";

// ── Mock grudgeBackend ──────────────────────────────────────────────

const mockLoginWithCredentials = vi.fn();
const mockRegisterAccount = vi.fn();
const mockLoginWithPuterSDK = vi.fn();
const mockConnectBrowserWallet = vi.fn();
const mockGetAvailableWallets = vi.fn(() => [] as string[]);
const mockStartDiscordLogin = vi.fn();
const mockLoginAsGuest = vi.fn();

vi.mock("@/lib/grudgeBackend", () => ({
  isAuthenticated: vi.fn(() => false),
  getCurrentUser: vi.fn(() => null),
  getSession: vi.fn(() => null),
  logout: vi.fn(),
  verifyToken: vi.fn(async () => ({ valid: false })),
  loginWithCredentials: (...args: unknown[]) =>
    mockLoginWithCredentials(...args),
  registerAccount: (...args: unknown[]) => mockRegisterAccount(...args),
  loginWithPuterSDK: (...args: unknown[]) => mockLoginWithPuterSDK(...args),
  connectBrowserWallet: (...args: unknown[]) =>
    mockConnectBrowserWallet(...args),
  getAvailableWallets: () => mockGetAvailableWallets(),
  startDiscordLogin: (...args: unknown[]) => mockStartDiscordLogin(...args),
  loginAsGuest: (...args: unknown[]) => mockLoginAsGuest(...args),
}));

import * as backend from "@/lib/grudgeBackend";
const mockBackend = vi.mocked(backend);

// ── Helpers ─────────────────────────────────────────────────────────

/** Fake auth response that handleAuthResponse would return */
const fakeAuthResponse = {
  success: true,
  token: "tok_test",
  sessionToken: "tok_test",
  grudgeId: "GRUDGE_TEST",
  username: "TestUser",
  user: { id: 1, grudgeId: "GRUDGE_TEST", username: "TestUser" },
};

/** Render the modal with a trigger button to open it */
function Opener() {
  const { openLogin } = useAuth();
  return (
    <button data-testid="trigger" onClick={openLogin}>
      Open
    </button>
  );
}

function renderOpenModal() {
  return render(
    <AuthProvider>
      <LoginModal />
      <Opener />
    </AuthProvider>,
  );
}

async function openModal(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByTestId("trigger"));
  // Wait for dialog animation
  await waitFor(() => {
    expect(screen.getByText("GRUDGE WARLORDS")).toBeInTheDocument();
  });
}

// ── Tests ───────────────────────────────────────────────────────────

describe("LoginModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBackend.isAuthenticated.mockReturnValue(false);
    mockBackend.getCurrentUser.mockReturnValue(null);
    mockBackend.getSession.mockReturnValue(null);
    mockBackend.verifyToken.mockResolvedValue({ valid: false });
    mockGetAvailableWallets.mockReturnValue([]);
  });

  describe("Modal visibility", () => {
    it("is hidden by default", async () => {
      render(
        <AuthProvider>
          <LoginModal />
        </AuthProvider>,
      );
      await act(async () => {});

      // Dialog content should NOT be in the DOM when closed
      expect(screen.queryByText("GRUDGE WARLORDS")).not.toBeInTheDocument();
    });

    it("opens when openLogin is called and shows main view", async () => {
      const user = userEvent.setup();
      renderOpenModal();
      await act(async () => {});

      await openModal(user);

      expect(
        screen.getByText("Sign in to save your progress across devices"),
      ).toBeInTheDocument();
      expect(screen.getByText("Continue with Google")).toBeInTheDocument();
      expect(screen.getByText("Continue with Discord")).toBeInTheDocument();
      expect(screen.getByText("Sign in with Username")).toBeInTheDocument();
      expect(screen.getByText("Continue as Guest")).toBeInTheDocument();
    });
  });

  describe("Wallet buttons", () => {
    it("shows Phantom button when wallet is detected", async () => {
      mockGetAvailableWallets.mockReturnValue(["phantom"]);
      const user = userEvent.setup();
      renderOpenModal();
      await act(async () => {});
      await openModal(user);

      expect(screen.getByText("Continue with Phantom")).toBeInTheDocument();
    });

    it("hides wallet buttons when no wallets detected", async () => {
      mockGetAvailableWallets.mockReturnValue([]);
      const user = userEvent.setup();
      renderOpenModal();
      await act(async () => {});
      await openModal(user);

      expect(
        screen.queryByText("Continue with Phantom"),
      ).not.toBeInTheDocument();
    });

    it("calls connectBrowserWallet('phantom') on Phantom click", async () => {
      mockGetAvailableWallets.mockReturnValue(["phantom"]);
      mockConnectBrowserWallet.mockResolvedValue(fakeAuthResponse);
      // After success, refreshAuth will check
      mockBackend.verifyToken.mockResolvedValue({ valid: true });
      mockBackend.getCurrentUser.mockReturnValue({
        grudgeId: "GRUDGE_TEST",
        username: "TestUser",
      });

      const user = userEvent.setup();
      renderOpenModal();
      await act(async () => {});
      await openModal(user);

      await user.click(screen.getByText("Continue with Phantom"));

      await waitFor(() => {
        expect(mockConnectBrowserWallet).toHaveBeenCalledWith("phantom");
      });
    });

    it("shows error when Phantom is not installed", async () => {
      mockGetAvailableWallets.mockReturnValue(["phantom"]);
      mockConnectBrowserWallet.mockRejectedValue(
        new Error("Phantom wallet not installed. Get it at phantom.app"),
      );

      const user = userEvent.setup();
      renderOpenModal();
      await act(async () => {});
      await openModal(user);

      await user.click(screen.getByText("Continue with Phantom"));

      await waitFor(() => {
        expect(screen.getByText(/Phantom wallet not installed/)).toBeInTheDocument();
      });
    });
  });

  describe("Puter / Google", () => {
    it("calls loginWithPuterSDK on Google button click", async () => {
      mockLoginWithPuterSDK.mockResolvedValue(fakeAuthResponse);
      mockBackend.verifyToken.mockResolvedValue({ valid: true });

      const user = userEvent.setup();
      renderOpenModal();
      await act(async () => {});
      await openModal(user);

      await user.click(screen.getByText("Continue with Google"));

      await waitFor(() => {
        expect(mockLoginWithPuterSDK).toHaveBeenCalledOnce();
      });
    });

    it("shows error when Puter SDK fails", async () => {
      mockLoginWithPuterSDK.mockRejectedValue(
        new Error("Puter SDK not loaded"),
      );

      const user = userEvent.setup();
      renderOpenModal();
      await act(async () => {});
      await openModal(user);

      await user.click(screen.getByText("Continue with Google"));

      await waitFor(() => {
        expect(screen.getByText("Puter SDK not loaded")).toBeInTheDocument();
      });
    });
  });

  describe("Discord", () => {
    it("redirects to Discord OAuth URL on click", async () => {
      const discordUrl = "https://discord.com/api/oauth2/authorize?client_id=123";
      mockStartDiscordLogin.mockResolvedValue(discordUrl);

      // Mock window.location.href assignment
      const hrefSpy = vi.spyOn(window, "location", "get").mockReturnValue({
        ...window.location,
        href: "",
      } as Location);

      const user = userEvent.setup();
      renderOpenModal();
      await act(async () => {});
      await openModal(user);

      await user.click(screen.getByText("Continue with Discord"));

      await waitFor(() => {
        expect(mockStartDiscordLogin).toHaveBeenCalledOnce();
      });

      hrefSpy.mockRestore();
    });
  });

  describe("Username/Password", () => {
    it("switches to credentials view on 'Sign in with Username' click", async () => {
      const user = userEvent.setup();
      renderOpenModal();
      await act(async () => {});
      await openModal(user);

      await user.click(screen.getByText("Sign in with Username"));

      expect(screen.getByPlaceholderText("Username")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
      expect(screen.getByText("Sign In")).toBeInTheDocument();
    });

    it("calls loginWithCredentials on form submit", async () => {
      mockLoginWithCredentials.mockResolvedValue(fakeAuthResponse);
      mockBackend.verifyToken.mockResolvedValue({ valid: true });

      const user = userEvent.setup();
      renderOpenModal();
      await act(async () => {});
      await openModal(user);

      await user.click(screen.getByText("Sign in with Username"));
      await user.type(screen.getByPlaceholderText("Username"), "myuser");
      await user.type(screen.getByPlaceholderText("Password"), "mypass");
      await user.click(screen.getByText("Sign In"));

      await waitFor(() => {
        expect(mockLoginWithCredentials).toHaveBeenCalledWith(
          "myuser",
          "mypass",
        );
      });
    });

    it("shows validation error for empty fields", async () => {
      const user = userEvent.setup();
      renderOpenModal();
      await act(async () => {});
      await openModal(user);

      await user.click(screen.getByText("Sign in with Username"));
      await user.click(screen.getByText("Sign In"));

      await waitFor(() => {
        expect(
          screen.getByText("Username and password are required"),
        ).toBeInTheDocument();
      });
    });

    it("shows server error on failed login", async () => {
      mockLoginWithCredentials.mockRejectedValue(
        new Error("Invalid username or password"),
      );

      const user = userEvent.setup();
      renderOpenModal();
      await act(async () => {});
      await openModal(user);

      await user.click(screen.getByText("Sign in with Username"));
      await user.type(screen.getByPlaceholderText("Username"), "bad");
      await user.type(screen.getByPlaceholderText("Password"), "bad");
      await user.click(screen.getByText("Sign In"));

      await waitFor(() => {
        expect(
          screen.getByText("Invalid username or password"),
        ).toBeInTheDocument();
      });
    });

    it("toggles to register mode and back", async () => {
      const user = userEvent.setup();
      renderOpenModal();
      await act(async () => {});
      await openModal(user);

      await user.click(screen.getByText("Sign in with Username"));
      expect(screen.getByText("Sign In")).toBeInTheDocument();

      await user.click(screen.getByText("Need an account? Register"));
      expect(screen.getByText("Create Account")).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("Email (optional)"),
      ).toBeInTheDocument();

      await user.click(
        screen.getByText("Already have an account? Sign in"),
      );
      expect(screen.getByText("Sign In")).toBeInTheDocument();
    });

    it("calls registerAccount in register mode", async () => {
      mockRegisterAccount.mockResolvedValue(fakeAuthResponse);
      mockBackend.verifyToken.mockResolvedValue({ valid: true });

      const user = userEvent.setup();
      renderOpenModal();
      await act(async () => {});
      await openModal(user);

      await user.click(screen.getByText("Sign in with Username"));
      await user.click(screen.getByText("Need an account? Register"));

      await user.type(screen.getByPlaceholderText("Username"), "newuser");
      await user.type(screen.getByPlaceholderText("Password"), "newpass");
      await user.type(
        screen.getByPlaceholderText("Email (optional)"),
        "me@test.com",
      );
      await user.click(screen.getByText("Create Account"));

      await waitFor(() => {
        expect(mockRegisterAccount).toHaveBeenCalledWith(
          "newuser",
          "newpass",
          "me@test.com",
        );
      });
    });

    it("back button returns to main view", async () => {
      const user = userEvent.setup();
      renderOpenModal();
      await act(async () => {});
      await openModal(user);

      await user.click(screen.getByText("Sign in with Username"));
      expect(screen.getByPlaceholderText("Username")).toBeInTheDocument();

      await user.click(screen.getByText("← Back"));
      expect(screen.getByText("Continue with Google")).toBeInTheDocument();
    });
  });

  describe("Guest", () => {
    it("calls loginAsGuest on 'Continue as Guest' click", async () => {
      mockLoginAsGuest.mockResolvedValue(fakeAuthResponse);
      mockBackend.verifyToken.mockResolvedValue({ valid: true });

      const user = userEvent.setup();
      renderOpenModal();
      await act(async () => {});
      await openModal(user);

      await user.click(screen.getByText("Continue as Guest"));

      await waitFor(() => {
        expect(mockLoginAsGuest).toHaveBeenCalledOnce();
      });
    });
  });

  describe("Post-login state", () => {
    it("closes modal and refreshes auth after successful credentials login", async () => {
      mockLoginWithCredentials.mockResolvedValue(fakeAuthResponse);
      // After onSuccess calls refreshAuth
      mockBackend.verifyToken.mockResolvedValue({
        valid: true,
        grudgeId: "GRUDGE_TEST",
        username: "TestUser",
      });
      mockBackend.getCurrentUser.mockReturnValue({
        grudgeId: "GRUDGE_TEST",
        username: "TestUser",
      });

      const user = userEvent.setup();
      renderOpenModal();
      await act(async () => {});
      await openModal(user);

      await user.click(screen.getByText("Sign in with Username"));
      await user.type(screen.getByPlaceholderText("Username"), "hero");
      await user.type(screen.getByPlaceholderText("Password"), "pass");
      await user.click(screen.getByText("Sign In"));

      // Modal should close after success
      await waitFor(() => {
        expect(
          screen.queryByText("Sign in to save your progress across devices"),
        ).not.toBeInTheDocument();
      });
    });
  });
});
