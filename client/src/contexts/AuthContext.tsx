/**
 * AuthContext — Global authentication state for Grudge Warlords.
 *
 * Provides:
 *   - isAuthenticated / user / session
 *   - openLogin() → **canonical Grudge ID SSO** (id.grudge-studio.com)
 *   - redirectToGrudgeIdLogin(returnPath) same as openLogin with explicit path
 *   - handleLogout()
 *   - refreshAuth() to re-check token validity
 *
 * HARD RULE: Warlords product hosts never use a unique/local login page.
 * All sign-in goes through id.grudge-studio.com (fleet SSOT).
 * LoginModal remains only as an emergency/dev override via openLoginModalLegacy.
 *
 * Wraps the entire app so any component can `useAuth()`.
 */
import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import {
  ensureFleetSessionClaim,
  getCurrentUser,
  getSession,
  logout as backendLogout,
  verifyToken,
  type GrudgeUser,
  type GrudgeSession,
} from "@/lib/grudgeBackend";
import { loginWithGrudgeId } from "@/lib/grudgeFleet";

interface AuthState {
  isAuthenticated: boolean;
  authLoading: boolean;
  authError: string | null;
  user: GrudgeUser | null;
  session: GrudgeSession | null;
  loginOpen: boolean;
  /**
   * Canonical login — redirects to id.grudge-studio.com/login and returns
   * via /auth/callback with JWT. Prefer this everywhere on Warlords.
   */
  openLogin: (returnPath?: string) => void;
  /** Same as openLogin (explicit name for callers that want SSO semantics). */
  redirectToGrudgeIdLogin: (returnPath?: string) => void;
  /**
   * @deprecated Dev/emergency only — opens in-page LoginModal.
   * Do not use for production Warlords entry (intro, shell, etc.).
   */
  openLoginModalLegacy: () => void;
  closeLogin: () => void;
  handleLogout: () => void;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthed, setIsAuthed] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const authGeneration = useRef(0);
  const [user, setUser] = useState<GrudgeUser | null>(() => getCurrentUser());
  const [session, setSession] = useState<GrudgeSession | null>(() => getSession());
  const [loginOpen, setLoginOpen] = useState(false);

  const refreshAuth = useCallback(async () => {
    const generation = ++authGeneration.current;
    setAuthLoading(true);
    try {
      await ensureFleetSessionClaim();
      const result = await verifyToken();
      if (generation !== authGeneration.current) return;
      setIsAuthed(result.valid);
      setUser(result.valid ? getCurrentUser() : null);
      setSession(result.valid ? getSession() : null);
      setAuthError(null);
    } catch {
      if (generation !== authGeneration.current) return;
      setIsAuthed(false);
      setAuthError('Account service is unavailable. Retry your connection.');
    } finally {
      if (generation === authGeneration.current) setAuthLoading(false);
    }
  }, []);

  // Re-check on mount and after fleet bootstrap / SSO bridge completes
  useEffect(() => {
    refreshAuth();
    const onAuthReady = () => {
      refreshAuth();
    };
    const onRejected = () => {
      ++authGeneration.current;
      setIsAuthed(false);
      setUser(null);
      setSession(null);
      setAuthLoading(false);
      setAuthError('Session rejected. Sign in again with Grudge ID.');
    };
    window.addEventListener("grudge:auth:rejected", onRejected);
    window.addEventListener("grudge:auth:ready", onAuthReady);
    window.addEventListener("grudge:auth:success", onAuthReady);
    return () => {
      ++authGeneration.current;
      window.removeEventListener("grudge:auth:rejected", onRejected);
      window.removeEventListener("grudge:auth:ready", onAuthReady);
      window.removeEventListener("grudge:auth:success", onAuthReady);
    };
  }, [refreshAuth]);

  /** Remember where the user was so /auth/callback can send them back. */
  const rememberReturnPath = useCallback((returnPath?: string) => {
    try {
      const path =
        returnPath ||
        (typeof window !== "undefined"
          ? `${window.location.pathname}${window.location.search || ""}`
          : "/home");
      // Callback handler + warlordsLoginUrl both read this key
      sessionStorage.setItem("grudge_auth_return", path.startsWith("/") ? path : `/${path}`);
    } catch {
      /* ignore */
    }
  }, []);

  /**
   * Production login = Grudge ID SSO only.
   * After login, id.grudge-studio.com returns to /auth/callback with token.
   */
  const redirectToGrudgeIdLogin = useCallback(
    (returnPath?: string) => {
      rememberReturnPath(returnPath);
      // Fleet SSO entry: callback always /auth/callback; post-callback uses grudge_auth_return
      loginWithGrudgeId("/auth/callback");
    },
    [rememberReturnPath],
  );

  const openLogin = useCallback(
    (returnPath?: string) => {
      redirectToGrudgeIdLogin(returnPath);
    },
    [redirectToGrudgeIdLogin],
  );

  const openLoginModalLegacy = useCallback(() => setLoginOpen(true), []);
  const closeLogin = useCallback(() => setLoginOpen(false), []);

  const handleLogout = useCallback(() => {
    ++authGeneration.current;
    backendLogout();
    setAuthLoading(false);
    setAuthError(null);
    setIsAuthed(false);
    setUser(null);
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: isAuthed,
        authLoading,
        authError,
        user,
        session,
        loginOpen,
        openLogin,
        redirectToGrudgeIdLogin,
        openLoginModalLegacy,
        closeLogin,
        handleLogout,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
