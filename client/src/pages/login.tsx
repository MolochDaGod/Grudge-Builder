/**
 * Login Page — WCS-style full auth with Grudge ID SSO, inline login/register,
 * guest login. Stone-900 dark theme, gold accents, Cinzel font.
 */
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Loader2, Eye, EyeOff, LogIn, UserPlus, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { assetUrl } from "@/lib/assetConfig";
import { playBGM } from "@/lib/audioManager";
import {
  isAuthenticated,
  setToken,
  setSession,
  API_BASE,
} from "@/lib/grudgeBackend";
import { FactionEmblemRow } from "@/components/FactionEmblems";

declare global {
  interface Window {
    openGrudgeAuthModal?: () => void;
    grudgeAuthIsLoggedIn?: () => boolean;
  }
}

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isAuthenticated() || window.grudgeAuthIsLoggedIn?.()) {
      setLocation("/home");
      return;
    }
    const onAuthSuccess = () => setLocation("/home");
    window.addEventListener("grudge:auth:success", onAuthSuccess);
    // SSO token pickup from URL
    const params = new URLSearchParams(window.location.search);
    if (params.get("sso_token")) {
      setToken(params.get("sso_token")!);
      setLocation("/home");
    }
    playBGM("title");
    return () => window.removeEventListener("grudge:auth:success", onAuthSuccess);
  }, [setLocation]);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) { setError("Enter username and password"); return; }
    setIsLoading(true); setError("");
    try {
      const res = await fetch(`${API_BASE}/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
      const data = await res.json();
      if (!res.ok || !data.success) { setError(data.error || "Login failed"); return; }
      setToken(data.token || data.sessionToken);
      setSession({ type: "grudge", username: data.user?.username || username, grudgeId: data.grudgeId, loginTime: Date.now() });
      toast({ title: "Welcome Back!", description: `Signed in as ${data.user?.username || username}` });
      setLocation("/home");
    } catch { setError("Connection error"); } finally { setIsLoading(false); }
  };

  const handleRegister = async () => {
    if (!username.trim() || !password.trim()) { setError("Enter username and password"); return; }
    if (username.length < 3 || username.length > 20) { setError("Username must be 3-20 characters"); return; }
    if (password.length < 4) { setError("Password must be at least 4 characters"); return; }
    setIsLoading(true); setError("");
    try {
      const res = await fetch(`${API_BASE}/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password, email: email || undefined }) });
      const data = await res.json();
      if (!res.ok || !data.success) { setError(data.error || "Registration failed"); return; }
      setToken(data.token || data.sessionToken);
      setSession({ type: "grudge", username: data.user?.username || username, grudgeId: data.grudgeId, loginTime: Date.now() });
      toast({ title: "Account Created!", description: `Welcome, ${data.user?.username || username}!` });
      setLocation("/home");
    } catch { setError("Connection error"); } finally { setIsLoading(false); }
  };

  const handleGuest = async () => {
    setIsLoading(true); setError("");
    try {
      const res = await fetch(`${API_BASE}/guest`, { method: "POST", headers: { "Content-Type": "application/json" } });
      const data = await res.json();
      if (!res.ok || !data.success) { setError(data.error || "Guest login failed"); return; }
      setToken(data.token || data.sessionToken);
      setSession({ type: "guest", username: data.user?.username || "Guest", loginTime: Date.now() });
      toast({ title: "Welcome, Guest!", description: "Upgrade to save progress." });
      setLocation("/home");
    } catch { setError("Connection error"); } finally { setIsLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ backgroundImage: `url(${assetUrl("/backgrounds/main_menu_bg.png")})`, backgroundSize: "cover", backgroundPosition: "center" }} />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="relative z-10 w-full max-w-md">
        <div className="bg-stone-900/95 border border-stone-700 shadow-2xl backdrop-blur-sm rounded-lg overflow-hidden">
          {/* Header */}
          <div className="text-center pt-8 pb-4 px-6">
            <img src={assetUrl("/images/logo.png")} alt="Grudge Warlords" className="w-16 h-16 mx-auto mb-2" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 font-cinzel tracking-wide">GRUDGE</h1>
            <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-amber-400 font-cinzel tracking-[0.2em]">WARLORDS</h2>
            <p className="text-stone-400 text-sm mt-1">Your GRUDGE ID is your gaming passport</p>
            <FactionEmblemRow size={36} className="mt-4 mb-2" />
          </div>

          <div className="px-6 pb-6 space-y-3">
            {/* Grudge ID SSO */}
            <button onClick={() => { const r = encodeURIComponent(window.location.href); window.location.href = `https://id.grudge-studio.com/auth/sso-check?return=${r}`; }} className="w-full h-14 rounded-lg font-cinzel font-bold text-base tracking-widest text-stone-950 shadow-lg" style={{ background: "linear-gradient(135deg, #b45309, #d97706, #b45309)" }}>
              🛡️ SIGN IN WITH GRUDGE ID
            </button>

            <div className="relative flex items-center"><div className="flex-1 border-t border-stone-700" /><span className="px-4 text-xs text-stone-500 font-cinzel tracking-widest">OR CONTINUE WITH</span><div className="flex-1 border-t border-stone-700" /></div>

            {/* Tabs */}
            <div className="grid grid-cols-2 bg-stone-800 border border-stone-700 rounded-lg overflow-hidden">
              <button onClick={() => { setActiveTab("login"); setError(""); }} className={`py-2.5 text-sm font-cinzel flex items-center justify-center gap-2 ${activeTab === "login" ? "bg-amber-900/50 text-amber-300" : "text-stone-400 hover:text-stone-200"}`}><LogIn className="w-4 h-4" />Login</button>
              <button onClick={() => { setActiveTab("register"); setError(""); }} className={`py-2.5 text-sm font-cinzel flex items-center justify-center gap-2 ${activeTab === "register" ? "bg-amber-900/50 text-amber-300" : "text-stone-400 hover:text-stone-200"}`}><UserPlus className="w-4 h-4" />Register</button>
            </div>

            {activeTab === "login" && (
              <div className="space-y-3">
                <div><label className="text-stone-300 font-cinzel text-xs tracking-wider block mb-1">USERNAME / EMAIL</label><input type="text" placeholder="Enter identifier" value={username} onChange={(e) => { setUsername(e.target.value); setError(""); }} disabled={isLoading} className="w-full h-11 px-3 rounded-md bg-stone-800 border border-stone-600 text-stone-100 placeholder:text-stone-500 outline-none focus:border-amber-500" /></div>
                <div><label className="text-stone-300 font-cinzel text-xs tracking-wider block mb-1">PASSWORD</label><div className="relative"><input type={showPassword ? "text" : "password"} placeholder="Enter password" value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }} onKeyDown={(e) => e.key === "Enter" && handleLogin()} disabled={isLoading} className="w-full h-11 px-3 pr-10 rounded-md bg-stone-800 border border-stone-600 text-stone-100 placeholder:text-stone-500 outline-none focus:border-amber-500" /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-200">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div></div>
                <button onClick={handleLogin} disabled={isLoading} className="w-full h-12 rounded-lg font-cinzel tracking-wider text-white flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: "linear-gradient(135deg, #b45309, #d97706)" }}>{isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}SIGN IN</button>
              </div>
            )}

            {activeTab === "register" && (
              <div className="space-y-3">
                <div><label className="text-stone-300 font-cinzel text-xs tracking-wider block mb-1">USERNAME</label><input type="text" placeholder="3-20 characters" value={username} onChange={(e) => { setUsername(e.target.value); setError(""); }} disabled={isLoading} className="w-full h-11 px-3 rounded-md bg-stone-800 border border-stone-600 text-stone-100 placeholder:text-stone-500 outline-none focus:border-amber-500" /></div>
                <div><label className="text-stone-300 font-cinzel text-xs tracking-wider block mb-1">EMAIL (OPTIONAL)</label><input type="email" placeholder="your@email.com" value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} disabled={isLoading} className="w-full h-11 px-3 rounded-md bg-stone-800 border border-stone-600 text-stone-100 placeholder:text-stone-500 outline-none focus:border-amber-500" /></div>
                <div><label className="text-stone-300 font-cinzel text-xs tracking-wider block mb-1">PASSWORD</label><div className="relative"><input type={showPassword ? "text" : "password"} placeholder="4+ characters" value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }} onKeyDown={(e) => e.key === "Enter" && handleRegister()} disabled={isLoading} className="w-full h-11 px-3 pr-10 rounded-md bg-stone-800 border border-stone-600 text-stone-100 placeholder:text-stone-500 outline-none focus:border-amber-500" /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-200">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div></div>
                <button onClick={handleRegister} disabled={isLoading} className="w-full h-12 rounded-lg font-cinzel tracking-wider text-white flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: "linear-gradient(135deg, #15803d, #16a34a)" }}>{isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}CREATE GRUDGE ID</button>
              </div>
            )}

            {error && <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="text-red-400 text-sm text-center bg-red-900/20 py-2 px-4 rounded border border-red-800/50">{error}</motion.div>}

            <div className="relative flex items-center"><div className="flex-1 border-t border-stone-700" /><span className="px-4 text-xs text-stone-600 bg-stone-900">OR</span><div className="flex-1 border-t border-stone-700" /></div>

            <button onClick={handleGuest} disabled={isLoading} className="w-full h-10 rounded-lg font-cinzel text-xs tracking-wider text-stone-400 hover:text-stone-200 hover:bg-stone-800 flex items-center justify-center gap-2"><User className="w-4 h-4" />CONTINUE AS GUEST</button>
            <p className="text-stone-600 text-xs text-center">Your GRUDGE ID works across all GRUDGE games.</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
