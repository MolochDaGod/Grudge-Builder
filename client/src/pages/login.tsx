import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { Loader2, Eye, EyeOff, LogIn, UserPlus, User, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SavedAccount {
  username: string;
  password: string;
  createdAt: string;
  level: number;
  gold: number;
  walletAddress?: string;
}

function generateStableWalletId(): string {
  const storedMockWallet = localStorage.getItem('grudge_mock_wallet');
  if (storedMockWallet) {
    return storedMockWallet;
  }
  const newWallet = "5S64" + Math.random().toString(36).substring(2, 10).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
  localStorage.setItem('grudge_mock_wallet', newWallet);
  return newWallet;
}

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);
  const [isOnboardingLoading, setIsOnboardingLoading] = useState(false);
  const { toast } = useToast();
  
  const [showWalletOnboarding, setShowWalletOnboarding] = useState(false);
  const [onboardingUsername, setOnboardingUsername] = useState("");
  const [onboardingPassword, setOnboardingPassword] = useState("");
  const [onboardingStep, setOnboardingStep] = useState<"choice" | "create" | "link">("choice");
  const [onboardingError, setOnboardingError] = useState("");
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null);

  useEffect(() => {
    const currentUser = localStorage.getItem('grudge_current_user');
    if (currentUser) {
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
      const accounts = JSON.parse(localStorage.getItem('grudge_accounts') || '{}');
      const account = accounts[username.toLowerCase()];

      if (!account) {
        setError("Account not found. Click Register to create one.");
        return;
      }

      if (account.password !== password) {
        setError("Incorrect password");
        return;
      }

      localStorage.setItem('grudge_current_user', JSON.stringify(account));
      setLocation("/home");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!username.trim() || !password.trim()) {
      setError("Please enter both username and password");
      return;
    }

    if (username.length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }

    if (password.length < 4) {
      setError("Password must be at least 4 characters");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const accounts = JSON.parse(localStorage.getItem('grudge_accounts') || '{}');
      
      if (accounts[username.toLowerCase()]) {
        setError("Username already taken");
        return;
      }

      const newAccount: SavedAccount = {
        username: username,
        password: password,
        createdAt: new Date().toISOString(),
        level: 1,
        gold: 1000,
      };

      accounts[username.toLowerCase()] = newAccount;
      localStorage.setItem('grudge_accounts', JSON.stringify(accounts));
      localStorage.setItem('grudge_current_user', JSON.stringify(newAccount));
      setLocation("/home");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestLogin = () => {
    const guestAccount: SavedAccount = {
      username: "Guest",
      password: "",
      createdAt: new Date().toISOString(),
      level: 1,
      gold: 500,
    };
    localStorage.setItem('grudge_current_user', JSON.stringify(guestAccount));
    setLocation("/home");
  };

  const handleWalletConnect = async () => {
    if (isConnectingWallet) return;
    
    setIsConnectingWallet(true);
    toast({
      title: "Connecting Wallet",
      description: "Please approve the connection in your wallet...",
    });
    
    const stableWallet = generateStableWalletId();
    
    setTimeout(() => {
      setConnectedWallet(stableWallet);
      const accounts = JSON.parse(localStorage.getItem('grudge_accounts') || '{}');
      const existingAccount = Object.values(accounts as Record<string, SavedAccount>).find(
        (acc) => acc.walletAddress === stableWallet
      );
      
      if (existingAccount) {
        localStorage.setItem('grudge_current_user', JSON.stringify(existingAccount));
        toast({
          title: "Welcome Back",
          description: `Signed in as ${existingAccount.username}`,
        });
        setLocation("/home");
      } else {
        setOnboardingUsername("");
        setOnboardingPassword("");
        setOnboardingError("");
        setOnboardingStep("choice");
        setShowWalletOnboarding(true);
      }
      setIsConnectingWallet(false);
    }, 1000);
  };

  const handleWalletOnboardingCreate = async () => {
    if (isOnboardingLoading) return;
    
    if (!onboardingUsername.trim() || !onboardingPassword.trim()) {
      setOnboardingError("Please enter both username and password");
      return;
    }

    if (onboardingUsername.length < 3) {
      setOnboardingError("Username must be at least 3 characters");
      return;
    }

    if (onboardingPassword.length < 4) {
      setOnboardingError("Password must be at least 4 characters");
      return;
    }

    setIsOnboardingLoading(true);
    setOnboardingError("");

    try {
      const accounts = JSON.parse(localStorage.getItem('grudge_accounts') || '{}');
      
      if (accounts[onboardingUsername.toLowerCase()]) {
        setOnboardingError("Username already taken");
        return;
      }

      const newAccount: SavedAccount = {
        username: onboardingUsername,
        password: onboardingPassword,
        createdAt: new Date().toISOString(),
        level: 1,
        gold: 1000,
        walletAddress: connectedWallet || undefined,
      };

      accounts[onboardingUsername.toLowerCase()] = newAccount;
      localStorage.setItem('grudge_accounts', JSON.stringify(accounts));
      localStorage.setItem('grudge_current_user', JSON.stringify(newAccount));
      
      toast({
        title: "Account Created",
        description: `Welcome, ${onboardingUsername}! Your wallet has been linked.`,
      });
      
      setShowWalletOnboarding(false);
      setLocation("/home");
    } finally {
      setIsOnboardingLoading(false);
    }
  };

  const handleWalletOnboardingLink = async () => {
    if (isOnboardingLoading) return;
    
    if (!onboardingUsername.trim() || !onboardingPassword.trim()) {
      setOnboardingError("Please enter your existing username and password");
      return;
    }

    setIsOnboardingLoading(true);
    setOnboardingError("");

    try {
      const accounts = JSON.parse(localStorage.getItem('grudge_accounts') || '{}');
      const account = accounts[onboardingUsername.toLowerCase()];

      if (!account) {
        setOnboardingError("Account not found");
        return;
      }

      if (account.password !== onboardingPassword) {
        setOnboardingError("Incorrect password");
        return;
      }

      account.walletAddress = connectedWallet;
      accounts[onboardingUsername.toLowerCase()] = account;
      localStorage.setItem('grudge_accounts', JSON.stringify(accounts));
      localStorage.setItem('grudge_current_user', JSON.stringify(account));
      
      toast({
        title: "Wallet Linked",
        description: `Your wallet has been linked to ${onboardingUsername}.`,
      });
      
      setShowWalletOnboarding(false);
      setLocation("/home");
    } finally {
      setIsOnboardingLoading(false);
    }
  };

  const handlePuterLogin = () => {
    toast({
      title: "Puter Login",
      description: "Connecting to Puter...",
    });
    setTimeout(() => {
      const puterAccount: SavedAccount = {
        username: "Puter User",
        password: "",
        createdAt: new Date().toISOString(),
        level: 1,
        gold: 1000,
      };
      localStorage.setItem('grudge_current_user', JSON.stringify(puterAccount));
      setLocation("/home");
    }, 500);
  };

  const handleStepChange = (step: "choice" | "create" | "link") => {
    setOnboardingStep(step);
    setOnboardingError("");
    setOnboardingUsername("");
    setOnboardingPassword("");
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
      <div className="absolute left-0 top-0 bottom-0 w-48 bg-gradient-to-r from-transparent to-transparent pointer-events-none hidden lg:block"
           style={{ backgroundImage: "url('/assets/characters/left-warrior.png')", backgroundSize: "contain", backgroundRepeat: "no-repeat", backgroundPosition: "left center", opacity: 0.8 }} />
      <div className="absolute right-0 top-0 bottom-0 w-48 bg-gradient-to-l from-transparent to-transparent pointer-events-none hidden lg:block"
           style={{ backgroundImage: "url('/assets/characters/right-mage.png')", backgroundSize: "contain", backgroundRepeat: "no-repeat", backgroundPosition: "right center", opacity: 0.8 }} />
      
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
              <p className="text-stone-400 text-sm mt-1">Crafting & Progression System</p>
            </motion.div>
            
            <div className="flex justify-center gap-2 mb-4">
              <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center" title="Puter">
                <span className="text-white font-bold text-sm">P</span>
              </div>
              <div className="w-8 h-8 rounded bg-purple-600 flex items-center justify-center" title="Solana">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <div className="w-8 h-8 rounded bg-green-600 flex items-center justify-center" title="Web3">
                <span className="text-white font-bold text-sm">W</span>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <Button 
              onClick={handlePuterLogin}
              variant="outline"
              className="w-full border-stone-600 bg-stone-800 hover:bg-stone-700 text-stone-100 h-12 font-cinzel"
              data-testid="btn-puter-login"
            >
              <span className="mr-2 text-blue-400">◯</span>
              SIGN IN WITH PUTER
            </Button>
            
            <Button 
              onClick={handleWalletConnect}
              disabled={isConnectingWallet}
              className="w-full h-12 bg-gradient-to-r from-purple-700 to-purple-600 hover:from-purple-600 hover:to-purple-500 border border-purple-500 font-cinzel text-sm"
              data-testid="btn-wallet-connect"
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
                  data-testid="tab-login"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Login
                </TabsTrigger>
                <TabsTrigger 
                  value="register" 
                  className="data-[state=active]:bg-amber-900/50 data-[state=active]:text-amber-300 font-cinzel"
                  data-testid="tab-register"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Register
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-stone-300 font-cinzel text-xs tracking-wider">USERNAME</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => { setUsername(e.target.value); setError(""); }}
                    className="bg-stone-800 border-stone-600 text-stone-100 placeholder:text-stone-500 h-11"
                    data-testid="input-username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-stone-300 font-cinzel text-xs tracking-wider">PASSWORD</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(""); }}
                      className="bg-stone-800 border-stone-600 text-stone-100 placeholder:text-stone-500 h-11 pr-10"
                      data-testid="input-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                
                <Button 
                  onClick={handleLogin}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-white h-12 font-cinzel tracking-wider"
                  data-testid="btn-login"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <LogIn className="w-4 h-4 mr-2" />}
                  SIGN IN
                </Button>
              </TabsContent>
              
              <TabsContent value="register" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-username" className="text-stone-300 font-cinzel text-xs tracking-wider">USERNAME</Label>
                  <Input
                    id="reg-username"
                    type="text"
                    placeholder="Choose a username"
                    value={username}
                    onChange={(e) => { setUsername(e.target.value); setError(""); }}
                    className="bg-stone-800 border-stone-600 text-stone-100 placeholder:text-stone-500 h-11"
                    data-testid="input-reg-username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password" className="text-stone-300 font-cinzel text-xs tracking-wider">PASSWORD</Label>
                  <div className="relative">
                    <Input
                      id="reg-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Choose a password"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(""); }}
                      className="bg-stone-800 border-stone-600 text-stone-100 placeholder:text-stone-500 h-11 pr-10"
                      data-testid="input-reg-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                
                <Button 
                  onClick={handleRegister}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-green-700 to-green-600 hover:from-green-600 hover:to-green-500 text-white h-12 font-cinzel tracking-wider"
                  data-testid="btn-register"
                >
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

            <Button
              variant="ghost"
              onClick={handleGuestLogin}
              className="w-full text-stone-400 hover:text-stone-200 hover:bg-stone-800 h-10 font-cinzel text-xs tracking-wider"
              data-testid="btn-guest"
            >
              <User className="w-4 h-4 mr-2" />
              CONTINUE AS GUEST
            </Button>

            <p className="text-stone-600 text-xs text-center">
              Sign in with Puter for Premium features including AI assistants and cloud sync
            </p>
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={showWalletOnboarding} onOpenChange={(open) => {
        if (!open) {
          setOnboardingError("");
          setOnboardingUsername("");
          setOnboardingPassword("");
        }
        setShowWalletOnboarding(open);
      }}>
        <DialogContent className="bg-stone-900 border-stone-700 text-stone-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-cinzel text-amber-400 flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              Wallet Connected
            </DialogTitle>
            <DialogDescription className="text-stone-400">
              {connectedWallet && `Connected: ${connectedWallet.slice(0, 8)}...${connectedWallet.slice(-4)}`}
            </DialogDescription>
          </DialogHeader>

          {onboardingStep === "choice" && (
            <div className="space-y-4 py-4">
              <p className="text-stone-300 text-sm">
                Would you like to create a new account or link this wallet to an existing account?
              </p>
              <div className="grid gap-3">
                <Button
                  onClick={() => handleStepChange("create")}
                  disabled={isOnboardingLoading}
                  className="w-full bg-gradient-to-r from-green-700 to-green-600 hover:from-green-600 hover:to-green-500 h-12 font-cinzel"
                  data-testid="btn-onboard-new"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Create New Account
                </Button>
                <Button
                  onClick={() => handleStepChange("link")}
                  disabled={isOnboardingLoading}
                  variant="outline"
                  className="w-full border-stone-600 h-12 font-cinzel"
                  data-testid="btn-onboard-link"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Link to Existing Account
                </Button>
              </div>
            </div>
          )}

          {onboardingStep === "create" && (
            <div className="space-y-4 py-4">
              <p className="text-stone-300 text-sm">
                Create a username and password to secure your account:
              </p>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-stone-300 text-xs font-cinzel">USERNAME</Label>
                  <Input
                    type="text"
                    placeholder="Choose a username"
                    value={onboardingUsername}
                    onChange={(e) => { setOnboardingUsername(e.target.value); setOnboardingError(""); }}
                    disabled={isOnboardingLoading}
                    className="bg-stone-800 border-stone-600 text-stone-100"
                    data-testid="input-onboard-username"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-stone-300 text-xs font-cinzel">PASSWORD</Label>
                  <Input
                    type="password"
                    placeholder="Choose a password"
                    value={onboardingPassword}
                    onChange={(e) => { setOnboardingPassword(e.target.value); setOnboardingError(""); }}
                    disabled={isOnboardingLoading}
                    className="bg-stone-800 border-stone-600 text-stone-100"
                    data-testid="input-onboard-password"
                  />
                </div>
              </div>
              {onboardingError && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-400 text-sm text-center bg-red-900/20 py-2 rounded border border-red-800/50"
                >
                  {onboardingError}
                </motion.div>
              )}
              <DialogFooter className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => handleStepChange("choice")} 
                  disabled={isOnboardingLoading}
                  className="border-stone-600"
                >
                  Back
                </Button>
                <Button 
                  onClick={handleWalletOnboardingCreate}
                  disabled={isOnboardingLoading}
                  className="bg-gradient-to-r from-green-700 to-green-600 hover:from-green-600 hover:to-green-500 font-cinzel"
                  data-testid="btn-onboard-create-submit"
                >
                  {isOnboardingLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {isOnboardingLoading ? "Creating..." : "Create Account"}
                </Button>
              </DialogFooter>
            </div>
          )}

          {onboardingStep === "link" && (
            <div className="space-y-4 py-4">
              <p className="text-stone-300 text-sm">
                Enter your existing account credentials to link this wallet:
              </p>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-stone-300 text-xs font-cinzel">USERNAME</Label>
                  <Input
                    type="text"
                    placeholder="Your existing username"
                    value={onboardingUsername}
                    onChange={(e) => { setOnboardingUsername(e.target.value); setOnboardingError(""); }}
                    disabled={isOnboardingLoading}
                    className="bg-stone-800 border-stone-600 text-stone-100"
                    data-testid="input-link-username"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-stone-300 text-xs font-cinzel">PASSWORD</Label>
                  <Input
                    type="password"
                    placeholder="Your password"
                    value={onboardingPassword}
                    onChange={(e) => { setOnboardingPassword(e.target.value); setOnboardingError(""); }}
                    disabled={isOnboardingLoading}
                    className="bg-stone-800 border-stone-600 text-stone-100"
                    data-testid="input-link-password"
                  />
                </div>
              </div>
              {onboardingError && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-400 text-sm text-center bg-red-900/20 py-2 rounded border border-red-800/50"
                >
                  {onboardingError}
                </motion.div>
              )}
              <DialogFooter className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => handleStepChange("choice")} 
                  disabled={isOnboardingLoading}
                  className="border-stone-600"
                >
                  Back
                </Button>
                <Button 
                  onClick={handleWalletOnboardingLink}
                  disabled={isOnboardingLoading}
                  className="bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 font-cinzel"
                  data-testid="btn-onboard-link-submit"
                >
                  {isOnboardingLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {isOnboardingLoading ? "Linking..." : "Link Wallet"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
