/**
 * Login Page — Grudge Warlords entry point.
 *
 * Auth flow:
 *   1. GRUDGE ID (SSO redirect to id.grudge-studio.com — has all providers)
 *   2. Discord (direct OAuth)
 *   3. Google (direct OAuth)
 *   4. Wallet (Phantom/Solflare if detected)
 *   5. Guest
 */
import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Loader2, User, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { assetUrl } from "@/lib/assetConfig";
import { playBGM } from "@/lib/audioManager";
import {
  isAuthenticated,
  setToken,
  loginAsGuest,
  startDiscordLogin,
  startGoogleLogin,
  connectBrowserWallet,
  getAvailableWallets,
} from "@/lib/grudgeBackend";
import { CrusadeEmblem, LegionEmblem, FabledEmblem } from "@/components/FactionEmblems";

declare global {
  interface Window {
    grudgeAuthIsLoggedIn?: () => boolean;
  }
}

const btnFull =
  "w-full flex items-center justify-center gap-3 rounded-lg font-cinzel font-bold tracking-wider transition-all disabled:opacity-40";
const btnProvider =
  "flex items-center justify-center gap-2 h-11 rounded-lg border border-stone-700 bg-stone-800/60 hover:bg-stone-700 text-stone-200 text-sm font-medium transition-colors disabled:opacity-40";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [wallets, setWallets] = useState<string[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setWallets(getAvailableWallets()), 300);
    return () => clearTimeout(t);
  }, []);

  // Auth guard + SSO token pickup
  useEffect(() => {
    if (isAuthenticated() || window.grudgeAuthIsLoggedIn?.()) {
      setLocation("/home");
      return;
    }
    const onOk = () => setLocation("/home");
    window.addEventListener("grudge:auth:success", onOk);
    const p = new URLSearchParams(window.location.search);
    if (p.get("sso_token")) { setToken(p.get("sso_token")!); setLocation("/home"); }
    playBGM("title");
    return () => window.removeEventListener("grudge:auth:success", onOk);
  }, [setLocation]);

  const exec = useCallback(
    async (fn: () => Promise<unknown>, msg?: string) => {
      setBusy(true); setError("");
      try { await fn(); if (msg) toast({ title: msg }); setLocation("/home"); }
      catch (e: any) { if (e.message !== "__redirect__") setError(e.message || "Connection error"); }
      finally { setBusy(false); }
    },
    [setLocation, toast],
  );

  const doGrudgeId = () => {
    const returnUrl = encodeURIComponent(window.location.origin + "/?sso_token=");
    window.location.href = `https://id.grudge-studio.com?return=${returnUrl}`;
  };
  const doDiscord = () => exec(async () => { window.location.href = await startDiscordLogin(); throw new Error("__redirect__"); });
  const doGoogle = () => exec(async () => { window.location.href = await startGoogleLogin(); throw new Error("__redirect__"); });
  const doWallet = (w: "phantom" | "solflare") => exec(() => connectBrowserWallet(w), "Wallet connected!");
  const doGuest = () => exec(() => loginAsGuest(), "Welcome, Guest!");

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 opacity-30 pointer-events-none"
        style={{ backgroundImage: `url(${assetUrl("/backgrounds/main_menu_bg.png")})`, backgroundSize: "cover", backgroundPosition: "center" }} />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-[420px]">
        <div className="bg-stone-900/95 border border-stone-700 shadow-2xl backdrop-blur-sm rounded-xl overflow-hidden">

          {/* ══ Header with faction emblems ══ */}
          <div className="text-center pt-8 pb-3 px-6">
            <img src={assetUrl("/images/logo.png")} alt="Grudge Warlords" className="w-20 h-20 mx-auto mb-3 drop-shadow-[0_0_24px_rgba(201,168,76,0.3)]"
              onError={(e) => { e.currentTarget.style.display = "none"; }} />
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 font-cinzel tracking-wide drop-shadow-lg">GRUDGE</h1>
            <h2 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-amber-400 font-cinzel tracking-[0.25em] mb-1">WARLORDS</h2>

            {/* Faction emblems — large, labeled, interactive */}
            <div className="flex justify-center items-end gap-5 mt-5 mb-1">
              {[
                { Emblem: CrusadeEmblem, name: "Crusade", color: "amber", glow: "rgba(251,191,36,0.25)" },
                { Emblem: FabledEmblem, name: "Fabled", color: "cyan", glow: "rgba(34,211,238,0.25)" },
                { Emblem: LegionEmblem, name: "Legion", color: "red", glow: "rgba(239,68,68,0.25)" },
              ].map(({ Emblem, name, color, glow }) => (
                <motion.div key={name} whileHover={{ scale: 1.12, y: -4 }} className="flex flex-col items-center gap-1.5 cursor-pointer">
                  <div
                    className={`w-16 h-16 rounded-xl bg-stone-800/80 border border-${color}-500/30 flex items-center justify-center`}
                    style={{ boxShadow: `0 0 20px ${glow}` }}
                  >
                    <Emblem size={44} />
                  </div>
                  <span className={`text-[10px] font-cinzel tracking-wider text-${color}-400/70 uppercase`}>{name}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* ══ Auth buttons ══ */}
          <div className="px-6 pb-7 pt-3 space-y-2.5">

            {/* 1. Grudge ID SSO — primary */}
            <button onClick={doGrudgeId} disabled={busy}
              className={`${btnFull} h-[52px] text-[15px] text-stone-950 shadow-lg shadow-amber-900/30 hover:shadow-amber-800/40`}
              style={{ background: "linear-gradient(135deg, #b45309, #d97706, #b45309)" }}>
              {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <span className="text-lg">🛡️</span>}
              SIGN IN WITH GRUDGE ID
            </button>

            {/* 2. Discord */}
            <button onClick={doDiscord} disabled={busy}
              className={`${btnFull} h-11 text-sm text-white bg-[#5865F2] hover:bg-[#4752c4]`}>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128c.126-.094.252-.192.373-.292a.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.1.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
              CONTINUE WITH DISCORD
            </button>

            {/* 3. Google + Wallet row */}
            <div className={`grid gap-2 ${wallets.length > 0 ? "grid-cols-2" : "grid-cols-1"}`}>
              <button onClick={doGoogle} disabled={busy} className={btnProvider}>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Google
              </button>
              {wallets.includes("phantom") && (
                <button onClick={() => doWallet("phantom")} disabled={busy} className={btnProvider}>
                  <Wallet className="w-4 h-4 text-purple-400" /> Phantom
                </button>
              )}
              {wallets.includes("solflare") && !wallets.includes("phantom") && (
                <button onClick={() => doWallet("solflare")} disabled={busy} className={btnProvider}>
                  <Wallet className="w-4 h-4 text-orange-400" /> Solflare
                </button>
              )}
            </div>

            <div className="relative flex items-center my-1">
              <div className="flex-1 border-t border-stone-700/60" />
              <span className="px-4 text-[10px] text-stone-600 uppercase tracking-widest">or</span>
              <div className="flex-1 border-t border-stone-700/60" />
            </div>

            {/* 4. Guest */}
            <button onClick={doGuest} disabled={busy}
              className={`${btnFull} h-10 text-xs text-stone-400 hover:text-stone-200 border border-stone-700 hover:border-stone-600 bg-transparent`}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <User className="w-4 h-4" />}
              PLAY AS GUEST
            </button>

            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-red-400 text-sm text-center bg-red-900/20 py-2 px-4 rounded border border-red-800/50">{error}</motion.div>
            )}

            <p className="text-stone-600 text-[11px] text-center pt-1 leading-relaxed">
              Your Grudge ID works across all Grudge games.
              <br />
              <a href="https://id.grudge-studio.com" className="text-amber-600 hover:text-amber-400 underline">More sign-in options →</a>
            </p>
          </div>
        </div>

        {/* Footer credit */}
        <p className="text-center text-stone-700 text-[10px] mt-4 font-cinzel tracking-widest">
          GRUDGE STUDIO • © 2026
        </p>
      </motion.div>
    </div>
  );
}
