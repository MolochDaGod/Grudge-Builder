/**
 * Auth Callback — Single SSO entry point for all auth flows.
 *
 * Every auth method (login, register, Discord, Puter, wallet, phone, guest)
 * redirects here with:
 *   /auth/callback?sso_token=JWT&grudge_id=GRDG-XXXX&grudge_username=Player
 *
 * The `pickupSsoToken()` IIFE in grudgeBackend.ts fires on module load and
 * persists these params to localStorage + cookies before this component mounts.
 * This page then creates a full GrudgeSession and redirects to /home.
 */
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { isAuthenticated, setSession, getCurrentUser } from "@/lib/grudgeBackend";
import type { GrudgeSession } from "@/lib/grudgeBackend";

export default function AuthCallbackPage() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    // pickupSsoToken() already ran and stored sso_token, grudge_id, grudge_username
    if (!isAuthenticated()) {
      setStatus("error");
      const t = setTimeout(() => setLocation("/"), 2000);
      return () => clearTimeout(t);
    }

    // Build a full session from what pickupSsoToken stored
    const grudgeId = localStorage.getItem("grudge_id") || "";
    const username = localStorage.getItem("grudge_username") || "Player";
    setDisplayName(username);

    const session: GrudgeSession = {
      type: "grudge",
      username,
      grudgeId: grudgeId || undefined,
      loginTime: Date.now(),
    };
    setSession(session);

    // Store cross-app user object for grudge-auth-modal.js compat
    try {
      localStorage.setItem("grudge_user", JSON.stringify({ username, grudgeId }));
    } catch { /* ignore */ }

    setStatus("success");
    const t = setTimeout(() => setLocation("/home"), 600);
    return () => clearTimeout(t);
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-[#05060c] flex items-center justify-center">
      <div className="text-center space-y-4">
        {status === "loading" && (
          <>
            <Loader2 className="w-10 h-10 text-amber-400 animate-spin mx-auto" />
            <p className="text-stone-400 text-sm font-cinzel tracking-wider">Completing sign-in…</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-amber-400 text-sm font-cinzel tracking-wider">
              Welcome, {displayName}
            </p>
            <p className="text-stone-500 text-xs">Entering the world…</p>
          </>
        )}
        {status === "error" && (
          <>
            <div className="w-12 h-12 mx-auto rounded-full bg-red-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-red-400 text-sm font-cinzel tracking-wider">Sign-in failed</p>
            <p className="text-stone-500 text-xs">Redirecting to login…</p>
          </>
        )}
      </div>
    </div>
  );
}
