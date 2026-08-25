/**
 * LoginModal — LEGACY / emergency in-page auth only.
 *
 * Production Warlords (grudgewarlords.com /intro, shell, play) MUST use
 * id.grudge-studio.com via useAuth().openLogin() → loginWithGrudgeId().
 *
 * This modal is only opened by openLoginModalLegacy() (dev / tests).
 * Do not wire product CTAs to this component.
 *
 * Auth methods (if modal is forced open):
 *   wallet · Puter · Discord · credentials · guest
 */
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import {
  loginWithCredentials,
  registerAccount,
  loginWithPuterSDK,
  connectBrowserWallet,
  connectPhantomEmbedded,
  getAvailableWallets,
  startDiscordLogin,
} from "@/lib/grudgeBackend";
import { useAuth } from "@/contexts/AuthContext";

type View = "main" | "credentials";

export function LoginModal() {
  const { loginOpen, closeLogin, refreshAuth } = useAuth();
  const [view, setView] = useState<View>("main");
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  // Phantom is always available (embedded SDK), Solflare needs extension
  const hasSolflare = typeof window !== "undefined" && !!(window as any).solflare?.isSolflare;

  const reset = () => {
    setView("main");
    setIsRegister(false);
    setUsername("");
    setPassword("");
    setEmail("");
    setError("");
    setLoading(null);
  };

  const onSuccess = async () => {
    await refreshAuth();
    reset();
    closeLogin();
  };

  const handleError = (e: unknown) => {
    const msg = e instanceof Error ? e.message : "Something went wrong";
    setError(msg);
    setLoading(null);
  };

  // ── Auth handlers ─────────────────────────────────────────────────

  const handlePhantom = async () => {
    setError("");
    setLoading("phantom");
    try {
      await connectPhantomEmbedded();
      await onSuccess();
    } catch (e) {
      handleError(e);
    }
  };

  const handleSolflare = async () => {
    setError("");
    setLoading("solflare");
    try {
      await connectBrowserWallet("solflare");
      await onSuccess();
    } catch (e) {
      handleError(e);
    }
  };

  const handlePuter = async () => {
    setError("");
    setLoading("puter");
    try {
      console.debug("[LoginModal] Google/Puter sign-in clicked");
      await loginWithPuterSDK();
      await onSuccess();
    } catch (e) {
      console.error("[LoginModal] Google/Puter sign-in error:", e);
      handleError(e);
    }
  };

  const handleDiscord = async () => {
    setError("");
    setLoading("discord");
    try {
      console.debug("[LoginModal] Discord login clicked");
      const url = await startDiscordLogin();
      if (url && url !== "__puter_sdk__" && url !== "__discord_redirect__") {
        console.debug("[LoginModal] Discord redirect →", url.slice(0, 60));
        window.location.href = url;
        return;
      }
      if (url === "__discord_redirect__") return;
      await onSuccess();
    } catch (e) {
      console.error("[LoginModal] Discord login error:", e);
      handleError(e);
    }
  };

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Username and password are required");
      return;
    }
    setError("");
    setLoading("credentials");
    try {
      if (isRegister) {
        await registerAccount(username.trim(), password, email || undefined);
      } else {
        await loginWithCredentials(username.trim(), password);
      }
      await onSuccess();
    } catch (err) {
      handleError(err);
    }
  };

  // ── Render ────────────────────────────────────────────────────────

  const isLoading = !!loading;

  return (
    <Dialog
      open={loginOpen}
      onOpenChange={(open) => {
        if (!open) {
          reset();
          closeLogin();
        }
      }}
    >
      <DialogContent className="bg-[#0b0f1e] border-white/[.08] text-white max-w-md sm:rounded-2xl p-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-2">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <img
                src="/grudge-logo.png"
                alt=""
                className="w-7 h-7 rounded"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              <DialogTitle
                className="font-cinzel font-bold tracking-[3px] text-sm"
                style={{
                  background: "linear-gradient(90deg,#f6c945,#fff3c2 50%,#f6c945)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                GRUDGE WARLORDS
              </DialogTitle>
            </div>
            <DialogDescription className="text-white/40 text-xs">
              {view === "main"
                ? "Sign in to save your progress across devices"
                : isRegister
                  ? "Create a new Grudge account"
                  : "Sign in with your Grudge account"}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Body */}
        <div className="px-6 pb-6 space-y-3">
          {error && (
            <div className="text-red-400 text-xs bg-red-950/40 border border-red-800/40 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {view === "main" && (
            <>
              {/* Grudge Login (Puter SDK under the hood) */}
              <AuthButton
                onClick={handlePuter}
                loading={loading === "puter"}
                disabled={isLoading}
                icon={
                  <img
                    src="/grudge-logo.png"
                    alt=""
                    className="w-5 h-5 rounded"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                }
                label="Grudge Login"
                className="bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30"
              />

              {/* Phantom Wallet (embedded SDK — always available) */}
              <AuthButton
                onClick={handlePhantom}
                loading={loading === "phantom"}
                disabled={isLoading}
                icon={
                  <svg viewBox="0 0 128 128" className="w-5 h-5">
                    <rect rx="26" fill="#AB9FF2" width="128" height="128" />
                    <path
                      d="M110.584 64.914H99.142c0-24.966-20.233-45.202-45.196-45.202-24.496 0-44.44 19.532-45.17 43.848-.78 25.997 21.1 48.04 47.1 48.04h2.474c22.585 0 42.122-15.48 47.522-37.374a8.03 8.03 0 004.712-7.312zM38.408 68.496a5.755 5.755 0 01-5.754 5.755 5.755 5.755 0 110-11.51 5.755 5.755 0 015.754 5.755zm22.694 0a5.755 5.755 0 01-5.754 5.755 5.755 5.755 0 110-11.51 5.755 5.755 0 015.754 5.755z"
                      fill="#FFFDF8"
                    />
                  </svg>
                }
                label="Continue with Phantom"
                className="bg-[#AB9FF2]/10 hover:bg-[#AB9FF2]/20 border-[#AB9FF2]/30"
              />

              {/* Solflare (extension only) */}
              {hasSolflare && (
                <AuthButton
                  onClick={handleSolflare}
                  loading={loading === "solflare"}
                  disabled={isLoading}
                  icon={<span className="text-orange-400 text-lg">☀</span>}
                  label="Continue with Solflare"
                  className="bg-orange-500/10 hover:bg-orange-500/20 border-orange-500/30"
                />
              )}

              {/* Discord */}
              <AuthButton
                onClick={handleDiscord}
                loading={loading === "discord"}
                disabled={isLoading}
                icon={
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#5865F2]">
                    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.608 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1634-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z" />
                  </svg>
                }
                label="Continue with Discord"
                className="bg-[#5865F2]/10 hover:bg-[#5865F2]/20 border-[#5865F2]/30"
              />

              <div className="flex items-center gap-2 py-1">
                <div className="flex-1 h-px bg-white/[.06]" />
                <span className="text-[10px] text-white/20 uppercase tracking-wider">or</span>
                <div className="flex-1 h-px bg-white/[.06]" />
              </div>

              {/* Username/password */}
              <Button
                variant="outline"
                className="w-full border-white/[.1] bg-white/[.02] hover:bg-white/[.06] text-white/70 text-sm h-11"
                onClick={() => setView("credentials")}
                disabled={isLoading}
              >
                Sign in with Username
              </Button>
            </>
          )}

          {view === "credentials" && (
            <form onSubmit={handleCredentials} className="space-y-3">
              <Input
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-white/[.04] border-white/[.1] text-white placeholder:text-white/25 h-11"
                autoFocus
                disabled={isLoading}
              />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white/[.04] border-white/[.1] text-white placeholder:text-white/25 h-11"
                disabled={isLoading}
              />
              {isRegister && (
                <Input
                  type="email"
                  placeholder="Email (optional)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white/[.04] border-white/[.1] text-white placeholder:text-white/25 h-11"
                  disabled={isLoading}
                />
              )}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 font-cinzel font-bold tracking-wider"
                style={{
                  background: "linear-gradient(180deg, #f6c945, #d8a819)",
                  color: "#20180a",
                }}
              >
                {loading === "credentials" ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                {isRegister ? "Create Account" : "Sign In"}
              </Button>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setView("main")}
                  className="text-[11px] text-white/30 hover:text-white/50"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(!isRegister);
                    setError("");
                  }}
                  className="text-[11px] text-amber-400/60 hover:text-amber-400"
                >
                  {isRegister
                    ? "Already have an account? Sign in"
                    : "Need an account? Register"}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-4 pt-0">
          <p className="text-[9px] text-white/15 text-center">
            By signing in you agree to the Grudge Studio Terms of Service
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Reusable auth button ──────────────────────────────────────────────

function AuthButton({
  onClick,
  loading,
  disabled,
  icon,
  label,
  className = "",
}: {
  onClick: () => void;
  loading: boolean;
  disabled: boolean;
  icon: React.ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <Button
      variant="outline"
      className={`w-full h-11 text-sm text-white/80 justify-start gap-3 ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : icon}
      {label}
    </Button>
  );
}
