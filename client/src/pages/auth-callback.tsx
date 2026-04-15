/**
 * Auth Callback — Handles OAuth redirect returns.
 *
 * The grudgeBackend.ts `pickupSsoToken()` IIFE already extracts sso_token from
 * URL params on ANY page load. This route exists as an explicit landing target
 * for OAuth providers that redirect to /auth/callback?sso_token=...
 */
import { useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { isAuthenticated } from "@/lib/grudgeBackend";

export default function AuthCallbackPage() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // pickupSsoToken() already ran — just redirect
    const dest = isAuthenticated() ? "/home" : "/";
    const t = setTimeout(() => setLocation(dest), 300);
    return () => clearTimeout(t);
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center">
      <div className="text-center space-y-3">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
        <p className="text-stone-400 text-sm font-cinzel tracking-wider">Completing sign-in…</p>
      </div>
    </div>
  );
}
