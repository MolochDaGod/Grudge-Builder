/**
 * Login Page — All auth methods, WCS dark-fantasy theme.
 *
 * Auth methods (in UI order):
 *   1. Grudge ID SSO (redirect to id.grudge-studio.com)
 *   2. Social: Discord · Google · Puter
 *   3. Solana wallet: Phantom · Solflare (shown if detected)
 *   4. Phone / SMS (Twilio via id.grudge-studio.com)
 *   5. Username + password (login / register tabs)
 *   6. Guest
 */
import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, Eye, EyeOff, LogIn, UserPlus, User, Phone,
  Wallet, MessageSquare, ArrowLeft,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { assetUrl } from "@/lib/assetConfig";
import { playBGM } from "@/lib/audioManager";
import {
  isAuthenticated,
  setToken,
  loginWithCredentials,
  registerAccount,
  loginAsGuest,
  startDiscordLogin,
  startGoogleLogin,
  loginWithPuterSDK,
  sendPhoneCode,
  verifyPhoneCode,
  connectBrowserWallet,
  getAvailableWallets,
} from "@/lib/grudgeBackend";
import { FactionEmblemRow } from "@/components/FactionEmblems";

declare global {
  interface Window {
    openGrudgeAuthModal?: () => void;
    grudgeAuthIsLoggedIn?: () => boolean;
  }
}

// ── Sub-view type ─────────────────────────────────────────────────────
type AuthView = "main" | "credentials" | "phone";

// ── Shared styles ─────────────────────────────────────────────────────
const socialBtn =
  "flex items-center justify-center gap-2 h-11 rounded-lg border border-stone-700 bg-stone-800 hover:bg-stone-700 text-stone-200 text-sm font-medium transition-colors disabled:opacity-40";
const inputCls =
  "w-full h-11 px-3 rounded-md bg-stone-800 border border-stone-600 text-stone-100 placeholder:text-stone-500 outline-none focus:border-amber-500";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // shared
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<AuthView>("main");

  // credentials
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [credTab, setCredTab] = useState<"login" | "register">("login");

  // phone
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [codeSent, setCodeSent] = useState(false);

  // wallets
  const [wallets, setWallets] = useState<string[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setWallets(getAvailableWallets()), 300);
    return () => clearTimeout(t);
  }, []);

  // auth guard + SSO pickup
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

  // ── run helper ──────────────────────────────────────────────────────
  const exec = useCallback(
    async (fn: () => Promise<unknown>, msg?: string) => {
      setBusy(true); setError("");
      try { await fn(); if (msg) toast({ title: msg }); setLocation("/home"); }
      catch (e: any) {
        if (e.message !== "__redirect__") setError(e.message || "Connection error");
      }
      finally { setBusy(false); }
    },
    [setLocation, toast],
  );

  // ── handlers ────────────────────────────────────────────────────────
  const doLogin = () => {
    if (!username.trim() || !password.trim()) { setError("Enter username and password"); return; }
    exec(() => loginWithCredentials(username, password), `Welcome back, ${username}!`);
  };
  const doRegister = () => {
    if (username.length < 3 || username.length > 20) { setError("Username must be 3-20 characters"); return; }
    if (password.length < 4) { setError("Password must be at least 4 characters"); return; }
    exec(() => registerAccount(username, password, email || undefined), "Account created!");
  };
  const doGuest = () => exec(() => loginAsGuest(), "Welcome, Guest!");
  const doDiscord = () => exec(async () => { window.location.href = await startDiscordLogin(); throw new Error("__redirect__"); });
  const doGoogle = () => exec(async () => { window.location.href = await startGoogleLogin(); throw new Error("__redirect__"); });
  const doPuter = () => exec(() => loginWithPuterSDK(), "Signed in via Puter!");
  const doWallet = (w: "phantom" | "solflare") => exec(() => connectBrowserWallet(w), "Wallet connected!");

  const doSendCode = async () => {
    if (!phone.trim() || phone.length < 10) { setError("Enter a valid phone number with country code"); return; }
    setBusy(true); setError("");
    try { await sendPhoneCode(phone); setCodeSent(true); toast({ title: "Code sent!" }); }
    catch (e: any) { setError(e.message || "Failed to send code"); }
    finally { setBusy(false); }
  };
  const doVerify = () => exec(() => verifyPhoneCode(phone, otp), "Phone verified!");

  // ── shared UI fragments ─────────────────────────────────────────────
  const errBox = error && (
    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
      className="text-red-400 text-sm text-center bg-red-900/20 py-2 px-4 rounded border border-red-800/50">{error}</motion.div>
  );
  const backArrow = (
    <button onClick={() => { setView("main"); setError(""); setCodeSent(false); setOtp(""); }}
      className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-300 mb-3">
      <ArrowLeft className="w-3 h-3" /> Back
    </button>
  );

  // ═══════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-30 pointer-events-none"
        style={{ backgroundImage: `url(${assetUrl("/backgrounds/main_menu_bg.png")})`, backgroundSize: "cover", backgroundPosition: "center" }} />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md">
        <div className="bg-stone-900/95 border border-stone-700 shadow-2xl backdrop-blur-sm rounded-lg overflow-hidden">

          {/* Header */}
          <div className="text-center pt-8 pb-4 px-6">
            <img src={assetUrl("/images/logo.png")} alt="Grudge Warlords" className="w-16 h-16 mx-auto mb-2"
              onError={(e) => { e.currentTarget.style.display = "none"; }} />
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 font-cinzel tracking-wide">GRUDGE</h1>
            <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-amber-400 font-cinzel tracking-[0.2em]">WARLORDS</h2>
            <p className="text-stone-400 text-sm mt-1">Your GRUDGE ID is your gaming passport</p>
            <FactionEmblemRow size={36} className="mt-4 mb-2" />
          </div>

          {/* Body */}
          <div className="px-6 pb-6 space-y-3">
            <AnimatePresence mode="wait">

              {/* ═══════ MAIN VIEW ═══════ */}
              {view === "main" && (
                <motion.div key="main" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">

                  {/* Grudge ID SSO */}
                  <button onClick={() => { const r = encodeURIComponent(window.location.href); window.location.href = `https://id.grudge-studio.com/auth/sso-check?return=${r}`; }}
                    className="w-full h-14 rounded-lg font-cinzel font-bold text-base tracking-widest text-stone-950 shadow-lg"
                    style={{ background: "linear-gradient(135deg, #b45309, #d97706, #b45309)" }}>
                    🛡️ SIGN IN WITH GRUDGE ID
                  </button>

                  <div className="relative flex items-center"><div className="flex-1 border-t border-stone-700" /><span className="px-4 text-xs text-stone-500 font-cinzel tracking-widest">OR CONTINUE WITH</span><div className="flex-1 border-t border-stone-700" /></div>

                  {/* Social: Discord · Google · Puter */}
                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={doDiscord} disabled={busy} className={socialBtn}>
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128c.126-.094.252-.192.373-.292a.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.1.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                      Discord
                    </button>
                    <button onClick={doGoogle} disabled={busy} className={socialBtn}>
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      Google
                    </button>
                    <button onClick={doPuter} disabled={busy} className={socialBtn}>
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/><text x="12" y="16" textAnchor="middle" fontSize="10" fill="currentColor" fontWeight="bold">P</text></svg>
                      Puter
                    </button>
                  </div>

                  {/* Wallet buttons (only if extensions detected) */}
                  {wallets.length > 0 && (
                    <div className={`grid gap-2 ${wallets.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                      {wallets.includes("phantom") && (
                        <button onClick={() => doWallet("phantom")} disabled={busy} className={socialBtn}>
                          <Wallet className="w-4 h-4 text-purple-400" /> Phantom
                        </button>
                      )}
                      {wallets.includes("solflare") && (
                        <button onClick={() => doWallet("solflare")} disabled={busy} className={socialBtn}>
                          <Wallet className="w-4 h-4 text-orange-400" /> Solflare
                        </button>
                      )}
                    </div>
                  )}

                  {/* Phone + Credentials entry */}
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => { setView("phone"); setError(""); }} className={socialBtn}>
                      <Phone className="w-4 h-4 text-green-400" /> Phone / SMS
                    </button>
                    <button onClick={() => { setView("credentials"); setError(""); }} className={socialBtn}>
                      <LogIn className="w-4 h-4 text-amber-400" /> Email / Pass
                    </button>
                  </div>

                  {errBox}

                  <div className="relative flex items-center"><div className="flex-1 border-t border-stone-700" /><span className="px-4 text-xs text-stone-600 bg-stone-900">OR</span><div className="flex-1 border-t border-stone-700" /></div>

                  <button onClick={doGuest} disabled={busy}
                    className="w-full h-10 rounded-lg font-cinzel text-xs tracking-wider text-stone-400 hover:text-stone-200 hover:bg-stone-800 flex items-center justify-center gap-2">
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <User className="w-4 h-4" />} CONTINUE AS GUEST
                  </button>
                  <p className="text-stone-600 text-xs text-center">Your GRUDGE ID works across all GRUDGE games.</p>
                </motion.div>
              )}

              {/* ═══════ CREDENTIALS VIEW ═══════ */}
              {view === "credentials" && (
                <motion.div key="cred" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
                  {backArrow}
                  <div className="grid grid-cols-2 bg-stone-800 border border-stone-700 rounded-lg overflow-hidden">
                    <button onClick={() => { setCredTab("login"); setError(""); }}
                      className={`py-2.5 text-sm font-cinzel flex items-center justify-center gap-2 ${credTab === "login" ? "bg-amber-900/50 text-amber-300" : "text-stone-400 hover:text-stone-200"}`}>
                      <LogIn className="w-4 h-4" /> Login
                    </button>
                    <button onClick={() => { setCredTab("register"); setError(""); }}
                      className={`py-2.5 text-sm font-cinzel flex items-center justify-center gap-2 ${credTab === "register" ? "bg-amber-900/50 text-amber-300" : "text-stone-400 hover:text-stone-200"}`}>
                      <UserPlus className="w-4 h-4" /> Register
                    </button>
                  </div>

                  {credTab === "login" && (
                    <div className="space-y-3">
                      <div><label className="text-stone-300 font-cinzel text-xs tracking-wider block mb-1">USERNAME / EMAIL</label>
                        <input type="text" placeholder="Enter identifier" value={username} onChange={(e) => { setUsername(e.target.value); setError(""); }} disabled={busy} className={inputCls} /></div>
                      <div><label className="text-stone-300 font-cinzel text-xs tracking-wider block mb-1">PASSWORD</label>
                        <div className="relative">
                          <input type={showPw ? "text" : "password"} placeholder="Enter password" value={password}
                            onChange={(e) => { setPassword(e.target.value); setError(""); }}
                            onKeyDown={(e) => e.key === "Enter" && doLogin()} disabled={busy} className={`${inputCls} pr-10`} />
                          <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-200">
                            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                        </div></div>
                      <button onClick={doLogin} disabled={busy || !username.trim() || !password.trim()}
                        className="w-full h-12 rounded-lg font-cinzel tracking-wider text-white flex items-center justify-center gap-2 disabled:opacity-50"
                        style={{ background: "linear-gradient(135deg, #b45309, #d97706)" }}>
                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />} SIGN IN</button>
                    </div>
                  )}

                  {credTab === "register" && (
                    <div className="space-y-3">
                      <div><label className="text-stone-300 font-cinzel text-xs tracking-wider block mb-1">USERNAME</label>
                        <input type="text" placeholder="3-20 characters" value={username} onChange={(e) => { setUsername(e.target.value); setError(""); }} disabled={busy} className={inputCls} /></div>
                      <div><label className="text-stone-300 font-cinzel text-xs tracking-wider block mb-1">EMAIL (OPTIONAL)</label>
                        <input type="email" placeholder="your@email.com" value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} disabled={busy} className={inputCls} /></div>
                      <div><label className="text-stone-300 font-cinzel text-xs tracking-wider block mb-1">PASSWORD</label>
                        <div className="relative">
                          <input type={showPw ? "text" : "password"} placeholder="4+ characters" value={password}
                            onChange={(e) => { setPassword(e.target.value); setError(""); }}
                            onKeyDown={(e) => e.key === "Enter" && doRegister()} disabled={busy} className={`${inputCls} pr-10`} />
                          <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-200">
                            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                        </div></div>
                      <button onClick={doRegister} disabled={busy || !username.trim() || !password.trim()}
                        className="w-full h-12 rounded-lg font-cinzel tracking-wider text-white flex items-center justify-center gap-2 disabled:opacity-50"
                        style={{ background: "linear-gradient(135deg, #15803d, #16a34a)" }}>
                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} CREATE GRUDGE ID</button>
                    </div>
                  )}
                  {errBox}
                </motion.div>
              )}

              {/* ═══════ PHONE / SMS VIEW ═══════ */}
              {view === "phone" && (
                <motion.div key="phone" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
                  {backArrow}
                  <div className="flex items-center gap-2 mb-1">
                    <Phone className="w-5 h-5 text-green-400" />
                    <h3 className="font-cinzel text-sm text-stone-200 tracking-wider">{codeSent ? "ENTER VERIFICATION CODE" : "SIGN IN WITH PHONE"}</h3>
                  </div>

                  {!codeSent ? (
                    <>
                      <div><label className="text-stone-300 font-cinzel text-xs tracking-wider block mb-1">PHONE NUMBER</label>
                        <input type="tel" placeholder="+1 (555) 123-4567" value={phone}
                          onChange={(e) => { setPhone(e.target.value); setError(""); }}
                          onKeyDown={(e) => e.key === "Enter" && doSendCode()} disabled={busy} className={inputCls} />
                        <p className="text-stone-500 text-xs mt-1">Include country code (e.g. +1 for US)</p></div>
                      <button onClick={doSendCode} disabled={busy || phone.length < 10}
                        className="w-full h-12 rounded-lg font-cinzel tracking-wider text-white flex items-center justify-center gap-2 disabled:opacity-50"
                        style={{ background: "linear-gradient(135deg, #15803d, #16a34a)" }}>
                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />} SEND CODE</button>
                    </>
                  ) : (
                    <>
                      <p className="text-stone-400 text-xs">Code sent to <span className="text-stone-200 font-mono">{phone}</span></p>
                      <div><label className="text-stone-300 font-cinzel text-xs tracking-wider block mb-1">VERIFICATION CODE</label>
                        <input type="text" inputMode="numeric" placeholder="123456" maxLength={6} value={otp}
                          onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "")); setError(""); }}
                          onKeyDown={(e) => e.key === "Enter" && otp.length >= 4 && doVerify()}
                          disabled={busy} className={`${inputCls} text-center text-2xl tracking-[0.5em] font-mono`} /></div>
                      <button onClick={doVerify} disabled={busy || otp.length < 4}
                        className="w-full h-12 rounded-lg font-cinzel tracking-wider text-white flex items-center justify-center gap-2 disabled:opacity-50"
                        style={{ background: "linear-gradient(135deg, #b45309, #d97706)" }}>
                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />} VERIFY & SIGN IN</button>
                      <button onClick={() => { setCodeSent(false); setOtp(""); setError(""); }}
                        className="text-stone-500 hover:text-stone-300 text-xs text-center w-full">Resend code / change number</button>
                    </>
                  )}
                  {errBox}
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
