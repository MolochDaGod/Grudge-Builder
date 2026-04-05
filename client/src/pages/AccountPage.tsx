import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Wallet, Shield, Copy, Sparkles, LogOut, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAccount } from "@/hooks/use-account";
import { getCurrentUser, getSession, logout } from "@/lib/grudgeBackend";
import { assetUrl } from "@/lib/assetConfig";
import Layout from "@/components/Layout";

export default function AccountPage() {
  const { account, loading } = useAccount();
  const { toast } = useToast();
  const user = getCurrentUser();
  const session = getSession();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: "Copied to clipboard" });
  };

  const handleLogout = () => {
    logout();
    window.location.href = "/";
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-cinzel text-amber-400 flex items-center gap-3" data-testid="text-account-title">
            <User className="h-8 w-8" />
            Account
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Your Grudge Studio profile and settings
          </p>
        </div>

        {/* Profile Card */}
        <Card className="mb-6 bg-slate-900/60 border-slate-700">
          <CardHeader>
            <CardTitle className="text-amber-400 font-cinzel">Profile</CardTitle>
            <CardDescription>Your Grudge Studio identity</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-slate-400 text-sm">Loading account...</div>
            ) : (
              <div className="space-y-4">
                {/* Avatar + Name */}
                <div className="flex items-center gap-4">
                  {account?.avatarUrl ? (
                    <img
                      src={account.avatarUrl}
                      alt="Avatar"
                      className="w-16 h-16 rounded-xl ring-2 ring-amber-600/50 object-cover shadow-lg"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-amber-500 via-orange-600 to-red-700 flex items-center justify-center ring-2 ring-amber-600/50 shadow-lg">
                      <span className="text-2xl font-bold text-white font-cinzel">
                        {(account?.displayName || user?.username || "W")[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <div className="text-xl font-bold text-white font-cinzel" data-testid="text-display-name">
                      {account?.displayName || user?.username || "Warlord"}
                    </div>
                    <div className="text-sm text-slate-400">
                      {session?.type === "grudge" && "Grudge Account"}
                      {session?.type === "discord" && "Discord Login"}
                      {session?.type === "puter" && "Puter Login"}
                      {session?.type === "wallet" && "Wallet Login"}
                      {session?.type === "guest" && "Guest Account"}
                      {!session?.type && "Logged In"}
                    </div>
                  </div>
                </div>

                <Separator className="border-slate-700" />

                {/* Grudge ID */}
                <div className="flex items-center justify-between bg-black/30 p-3 rounded-lg border border-slate-800">
                  <div>
                    <div className="text-xs text-slate-500 uppercase tracking-wider">Grudge ID</div>
                    <div className="text-sm font-mono text-amber-300" data-testid="text-grudge-id">
                      {user?.grudgeId || account?.grudgeId || "—"}
                    </div>
                  </div>
                  {(user?.grudgeId || account?.grudgeId) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:text-amber-400"
                      onClick={() => copyToClipboard(user?.grudgeId || account?.grudgeId || "")}
                      data-testid="button-copy-grudge-id"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Username */}
                <div className="flex items-center justify-between bg-black/30 p-3 rounded-lg border border-slate-800">
                  <div>
                    <div className="text-xs text-slate-500 uppercase tracking-wider">Username</div>
                    <div className="text-sm text-white" data-testid="text-username">
                      {user?.username || "—"}
                    </div>
                  </div>
                </div>

                {/* Email */}
                {user?.email && (
                  <div className="flex items-center justify-between bg-black/30 p-3 rounded-lg border border-slate-800">
                    <div>
                      <div className="text-xs text-slate-500 uppercase tracking-wider">Email</div>
                      <div className="text-sm text-white">{user.email}</div>
                    </div>
                  </div>
                )}

                {/* Account XP + GBUX */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-black/30 p-3 rounded-lg border border-slate-800 text-center">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Account XP</div>
                    <div className="flex items-center justify-center gap-1">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span className="text-xl font-bold text-amber-400" data-testid="text-account-xp">
                        {(account?.accountXp || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="bg-black/30 p-3 rounded-lg border border-slate-800 text-center">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">GBUX Balance</div>
                    <div className="flex items-center justify-center gap-1">
                      <img
                        src="/sprites/gbux-token.png"
                        alt="GBUX"
                        className="w-5 h-5 rounded-full"
                      />
                      <span className="text-xl font-bold text-cyan-300" data-testid="text-gbux-balance">
                        {(account?.gbuxBalance || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Premium Status */}
                {user?.isPremium && (
                  <div className="bg-gradient-to-r from-amber-950/50 to-amber-900/30 p-3 rounded-lg border border-amber-600/50">
                    <Badge className="bg-amber-500/20 text-amber-300 border-amber-600/50">
                      Premium Member
                    </Badge>
                  </div>
                )}

                {/* Wallet Address */}
                {account?.walletAddress && (
                  <div className="flex items-center justify-between bg-black/30 p-3 rounded-lg border border-slate-800">
                    <div>
                      <div className="text-xs text-slate-500 uppercase tracking-wider">Wallet</div>
                      <div className="text-sm font-mono text-purple-300">
                        {account.walletAddress.slice(0, 6)}...{account.walletAddress.slice(-4)}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:text-purple-400"
                      onClick={() => copyToClipboard(account.walletAddress!)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Links */}
        <Card className="mb-6 bg-slate-900/60 border-slate-700">
          <CardHeader>
            <CardTitle className="text-amber-400 font-cinzel text-lg">Quick Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/wallet">
              <div className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-slate-800 hover:border-amber-700/50 hover:bg-black/30 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <Wallet className="w-5 h-5 text-purple-400" />
                  <div>
                    <div className="text-sm font-medium text-white">Wallet & NFTs</div>
                    <div className="text-xs text-slate-400">Manage your Solana wallet and character cNFTs</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </div>
            </Link>
            <Link href="/character">
              <div className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-slate-800 hover:border-amber-700/50 hover:bg-black/30 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-amber-400" />
                  <div>
                    <div className="text-sm font-medium text-white">Characters</div>
                    <div className="text-xs text-slate-400">Manage your heroes and equipment</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </div>
            </Link>
          </CardContent>
        </Card>

        {/* Logout */}
        <div className="flex justify-end">
          <Button
            variant="outline"
            className="border-red-800/50 text-red-400 hover:bg-red-950/30 hover:text-red-300"
            onClick={handleLogout}
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </Layout>
  );
}
