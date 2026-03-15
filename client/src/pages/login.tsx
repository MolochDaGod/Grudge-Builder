import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { Loader2, Eye, EyeOff, LogIn, UserPlus, User, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  isAuthenticated,
  loginWithCredentials,
  registerAccount,
  loginAsGuest,
  loginWithWallet,
  loginWithPuter,
  startDiscordLogin,
  startGoogleLogin,
  startGithubLogin,
} from "@/lib/grudgeBackend";

const DiscordSvg = ({ size = 20, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={Math.round(size * 0.77)} viewBox="0 0 71 55" fill={color}>
    <path d="M60.1 4.9A58.5 58.5 0 0045.4.2a.2.2 0 00-.2.1 40.7 40.7 0 00-1.8 3.7 54 54 0 00-16.2 0A26.4 26.4 0 0025.4.3a.2.2 0 00-.2-.1A58.4 58.4 0 0010.5 4.9a.2.2 0 00-.1.1C1.5 18.7-.9 32.2.3 45.5v.1a58.8 58.8 0 0017.7 9a.2.2 0 00.3-.1 42 42 0 003.6-5.9.2.2 0 00-.1-.3 38.8 38.8 0 01-5.5-2.6.2.2 0 01 0-.4c.4-.3.7-.6 1.1-.9a.2.2 0 01.2 0 42 42 0 0035.6 0 .2.2 0 01.2 0l1.1.9a.2.2 0 010 .4 36.4 36.4 0 01-5.5 2.6.2.2 0 00-.1.3 47.2 47.2 0 003.6 5.9.2.2 0 00.3.1A58.6 58.6 0 0070.3 45.6v-.1c1.4-15.1-2.4-28.2-10.1-39.8a.2.2 0 00-.1-.1zM23.7 37.3c-3.4 0-6.3-3.2-6.3-7s2.8-7 6.3-7 6.4 3.2 6.3 7-2.8 7-6.3 7zm23.2 0c-3.4 0-6.3-3.2-6.3-7s2.8-7 6.3-7 6.4 3.2 6.3 7-2.8 7-6.3 7z"/>
  </svg>
);

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isAuthenticated()) {
      setLocation("/home");
    }
  }, [setLocation]);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError("Please enter both username and password");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const data = await loginWithCredentials(username, password);
      toast({ title: "Welcome Back", description: `Signed in as ${data.username}` });
      setLocation("/home");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!username.trim() || !password.trim()) {
      setError("Please enter both username and password");
      return;
    }
    if (username.length < 3) { setError("Username must be at least 3 characters"); return; }
    if (password.length < 4) { setError("Password must be at least 4 characters"); return; }
    setIsLoading(true);
    setError("");
    try {
      const data = await registerAccount(username, password);
      toast({ title: "Account Created", description: data.message || `Welcome, ${data.username}!` });
      setLocation("/home");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setIsLoading(true);
    setError("");
    try {
      await loginAsGuest();
      toast({ title: "Welcome", description: "Playing as guest — your progress will be saved." });
      setLocation("/home");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Guest login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGrudgeAuth = async () => {
    const hasPuter = typeof window !== "undefined" && !!(window as any).puter;
    if (!hasPuter) {
      await handleGuestLogin();
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const puter = (window as any).puter;
      if (!puter.auth?.isSignedIn?.()) {
        await puter.auth.signIn();
      }
      const user = await puter.auth.getUser();
      if (user?.uuid) {
        const data = await loginWithPuter(user.uuid, user.username);
        toast({ title: "Grudge Auth", description: `Signed in as ${data.username}` });
        setLocation("/home");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Grudge Auth failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleWalletConnect = async () => {
    if (isConnectingWallet) return;
    setIsConnectingWallet(true);
    setError("");
    try {
      const solana = (window as any).solana || (window as any).phantom?.solana;
      if (!solana) {
        setError("No Solana wallet found. Install Phantom or Solflare.");
        setIsConnectingWallet(false);
        return;
      }
      const resp = await solana.connect();
      const walletAddress = resp.publicKey.toString();
      const data = await loginWithWallet(walletAddress);
      toast({ title: "Wallet Connected", description: `Signed in as ${data.username}` });
      setLocation("/home");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Wallet connection failed");
    } finally {
      setIsConnectingWallet(false);
    }
  };

  const handleDiscordLogin = async () => {
    setIsLoading(true);
    try {
      const url = await startDiscordLogin();
      if (url) window.location.href = url;
    } catch {
      setError("Discord login unavailable");
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const url = await startGoogleLogin();
      if (url) window.location.href = url;
    } catch {
      setError("Google login unavailable");
      setIsLoading(false);
    }
  };

  const handleGithubLogin = async () => {
    setIsLoading(true);
    try {
      const url = await startGithubLogin();
      if (url) window.location.href = url;
    } catch {
      setError("GitHub login unavailable");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: "url('/assets/backgrounds/login-bg.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <Card className="bg-stone-900/95 border-stone-700 shadow-2xl backdrop-blur-sm">
          <CardHeader className="text-center pb-2">
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3 }}
              className="mb-4"
            >
              <img
                src="/sprites/ui/grudge-logo.png"
                alt="Grudge Warlords"
                className="w-16 h-16 mx-auto mb-2"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
              <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 font-cinzel tracking-wide">
                GRUDGE
              </h1>
              <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-amber-400 font-cinzel tracking-[0.2em]">
                WARLORDS
              </h2>
              <p className="text-stone-500 text-xs mt-1 tracking-widest uppercase">
                Grudge Studio
              </p>
            </motion.div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Grudge Auth (Puter-powered) */}
            <Button
              onClick={handleGrudgeAuth}
              disabled={isLoading}
              className="w-full h-12 bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-white font-cinzel tracking-wider"
            >
              {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : (
                <img src="/sprites/ui/grudge-logo.png" alt="" className="w-5 h-5 mr-2" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              )}
              SIGN IN WITH GRUDGE
            </Button>

            {/* Discord */}
            <Button
              onClick={handleDiscordLogin}
              variant="outline"
              className="w-full h-11 border-indigo-600/40 bg-indigo-900/10 hover:bg-indigo-900/20 text-indigo-300 font-cinzel text-sm"
            >
              <DiscordSvg size={18} color="#7289da" />
              <span className="ml-2">LOGIN WITH DISCORD</span>
            </Button>

            {/* Google */}
            <Button
              onClick={handleGoogleLogin}
              variant="outline"
              className="w-full h-11 border-red-600/40 bg-red-900/10 hover:bg-red-900/20 text-red-300 font-cinzel text-sm"
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              LOGIN WITH GOOGLE
            </Button>

            {/* GitHub */}
            <Button
              onClick={handleGithubLogin}
              variant="outline"
              className="w-full h-11 border-stone-500/40 bg-stone-800/30 hover:bg-stone-700/30 text-stone-300 font-cinzel text-sm"
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              LOGIN WITH GITHUB
            </Button>

            {/* Wallet */}
            <Button
              onClick={handleWalletConnect}
              disabled={isConnectingWallet}
              variant="outline"
              className="w-full h-11 border-purple-600/40 bg-purple-900/10 hover:bg-purple-900/20 text-purple-300 font-cinzel text-sm"
            >
              {isConnectingWallet ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Wallet className="w-4 h-4 mr-2" />
              )}
              {isConnectingWallet ? "CONNECTING..." : "CONNECT SOLANA WALLET"}
            </Button>

            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-stone-600" />
              </div>
              <span className="relative z-10 px-4 text-xs text-stone-500 bg-stone-900 font-cinzel tracking-widest">
                OR CONTINUE WITH
              </span>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as "login" | "register"); setError(""); }}>
              <TabsList className="grid w-full grid-cols-2 bg-stone-800 border border-stone-700">
                <TabsTrigger
                  value="login"
                  className="data-[state=active]:bg-amber-900/50 data-[state=active]:text-amber-300 font-cinzel"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Login
                </TabsTrigger>
                <TabsTrigger
                  value="register"
                  className="data-[state=active]:bg-amber-900/50 data-[state=active]:text-amber-300 font-cinzel"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Register
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-stone-300 font-cinzel text-xs tracking-wider">USERNAME</Label>
                  <Input
                    id="username" type="text" placeholder="Enter your username"
                    value={username} onChange={(e) => { setUsername(e.target.value); setError(""); }}
                    className="bg-stone-800 border-stone-600 text-stone-100 placeholder:text-stone-500 h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-stone-300 font-cinzel text-xs tracking-wider">PASSWORD</Label>
                  <div className="relative">
                    <Input
                      id="password" type={showPassword ? "text" : "password"} placeholder="Enter your password"
                      value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }}
                      className="bg-stone-800 border-stone-600 text-stone-100 placeholder:text-stone-500 h-11 pr-10"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-200">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button onClick={handleLogin} disabled={isLoading}
                  className="w-full bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-white h-12 font-cinzel tracking-wider">
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <LogIn className="w-4 h-4 mr-2" />}
                  SIGN IN
                </Button>
              </TabsContent>

              <TabsContent value="register" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-username" className="text-stone-300 font-cinzel text-xs tracking-wider">USERNAME</Label>
                  <Input
                    id="reg-username" type="text" placeholder="Choose a username"
                    value={username} onChange={(e) => { setUsername(e.target.value); setError(""); }}
                    className="bg-stone-800 border-stone-600 text-stone-100 placeholder:text-stone-500 h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password" className="text-stone-300 font-cinzel text-xs tracking-wider">PASSWORD</Label>
                  <div className="relative">
                    <Input
                      id="reg-password" type={showPassword ? "text" : "password"} placeholder="Choose a password"
                      value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }}
                      className="bg-stone-800 border-stone-600 text-stone-100 placeholder:text-stone-500 h-11 pr-10"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-200">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button onClick={handleRegister} disabled={isLoading}
                  className="w-full bg-gradient-to-r from-green-700 to-green-600 hover:from-green-600 hover:to-green-500 text-white h-12 font-cinzel tracking-wider">
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                  CREATE ACCOUNT
                </Button>
              </TabsContent>
            </Tabs>

            {error && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-red-400 text-sm text-center bg-red-900/20 py-2 px-4 rounded border border-red-800/50"
              >
                {error}
              </motion.div>
            )}

            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-stone-700" />
              </div>
              <span className="relative z-10 px-4 text-xs text-stone-600 bg-stone-900">OR</span>
            </div>

            <Button variant="ghost" onClick={handleGuestLogin}
              className="w-full text-stone-400 hover:text-stone-200 hover:bg-stone-800 h-10 font-cinzel text-xs tracking-wider">
              <User className="w-4 h-4 mr-2" />
              CONTINUE AS GUEST
            </Button>

            <p className="text-stone-600 text-xs text-center">
              Sign in with Grudge for cloud saves, characters, and crafting
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
