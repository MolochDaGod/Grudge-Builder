/**
 * AuthContext — Global authentication state for Grudge Warlords.
 *
 * Provides:
 *   - isAuthenticated / user / session
 *   - openLogin() / closeLogin() to control the LoginModal
 *   - handleLogout()
 *   - refreshAuth() to re-check token validity
 *
 * Wraps the entire app so any component can `useAuth()`.
 */
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import {
  isAuthenticated as checkAuth,
  getCurrentUser,
  getSession,
  logout as backendLogout,
  verifyToken,
  type GrudgeUser,
  type GrudgeSession,
} from "@/lib/grudgeBackend";

interface AuthState {
  isAuthenticated: boolean;
  user: GrudgeUser | null;
  session: GrudgeSession | null;
  loginOpen: boolean;
  openLogin: () => void;
  closeLogin: () => void;
  handleLogout: () => void;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthed, setIsAuthed] = useState(() => checkAuth());
  const [user, setUser] = useState<GrudgeUser | null>(() => getCurrentUser());
  const [session, setSession] = useState<GrudgeSession | null>(() => getSession());
  const [loginOpen, setLoginOpen] = useState(false);

  const refreshAuth = useCallback(async () => {
    const result = await verifyToken();
    setIsAuthed(result.valid);
    setUser(result.valid ? getCurrentUser() : null);
    setSession(result.valid ? getSession() : null);
  }, []);

  // Re-check on mount (covers SSO token pickup from URL)
  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  const openLogin = useCallback(() => setLoginOpen(true), []);
  const closeLogin = useCallback(() => setLoginOpen(false), []);

  const handleLogout = useCallback(() => {
    backendLogout();
    setIsAuthed(false);
    setUser(null);
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: isAuthed,
        user,
        session,
        loginOpen,
        openLogin,
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
