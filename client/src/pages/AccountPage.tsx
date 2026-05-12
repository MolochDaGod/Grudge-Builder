import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  User, Wallet, Shield, Copy, Sparkles, LogOut, ChevronRight, Swords,
  Crown, Hammer, Pickaxe, Leaf, Map, Zap,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAccount } from "@/hooks/use-account";
import { getCurrentUser, getSession, logout, authHeaders } from "@/lib/grudgeBackend";
import Layout from "@/components/Layout";
import CharacterSelectorPanel from "@/components/CharacterSelectorPanel";

interface IslandStatus {
  homeIsland: boolean;
  homeIslandId: string | null;
}

export default function AccountPage() {
  const [, setLocation] = useLocation();
  const { account, loading } = useAccount();
  const { toast } = useToast();
  const user = getCurrentUser();
  const session = getSession();
  const [islandStatus, setIslandStatus] = useState<IslandStatus | null>(null);

  useEffect(() => {
    fetch('/api/island/status', { headers: authHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setIslandStatus(data); })
      .catch(() => {});
  }, []);

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

        {/* Island Status */}
        <Card className="mb-6 bg-slate-900/60 border-slate-700">
          <CardHeader>
            <CardTitle className="text-amber-400 font-cinzel flex items-center gap-2">
              <Leaf className="h-5 w-5" />
              Home Island
            </CardTitle>
            <CardDescription>Your personal resource island</CardDescription>
          </CardHeader>
          <CardContent>
            {islandStatus === null ? (
              <div className="text-slate-400 text-sm">Checking island status...</div>
            ) : islandStatus.homeIsland ? (
              <div className="flex items-center justify-between">
                <div>
                  <Badge className="bg-emerald-700/30 text-emerald-300 border-emerald-600/50 mb-1">Island Active</Badge>
                  <p className="text-xs text-slate-400">Your island is initialized and generating resources.</p>
                </div>
                <Button size="sm" variant="outline" className="border-emerald-700/50 text-emerald-400 hover:bg-emerald-900/20"
                  onClick={() => setLocation('/island-v2')}>Enter Island</Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <Badge variant="outline" className="border-slate-600 text-slate-400 mb-1">Not Initialized</Badge>
                  <p className="text-xs text-slate-400">Complete the character creator to claim your home island.</p>
                </div>
                <Button size="sm" variant="outline" className="border-amber-700/50 text-amber-400 hover:bg-amber-900/20"
                  onClick={() => setLocation('/character-creator')}>Create Character</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Characters */}
        <Card className="mb-6 bg-slate-900/60 border-slate-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-amber-400 font-cinzel flex items-center gap-2">
                  <Swords className="h-5 w-5" />
                  Your Characters
                </CardTitle>
                <CardDescription>Select your active character for crafting and gameplay</CardDescription>
              </div>
              {account && (
                <div className="flex items-center gap-1.5 bg-amber-950/40 border border-amber-800/40 px-2.5 py-1 rounded-lg">
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs text-amber-300 font-medium">{account.characterTokens ?? 0} token{(account.characterTokens ?? 0) !== 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <CharacterSelectorPanel
              selectLabel="Set Active"
              columns={3}
              onSelected={() => {
                toast({ title: "Character selected", description: "Active character updated." });
              }}
            />
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="outline" className="border-amber-700/40 text-amber-400 hover:bg-amber-900/20 font-cinzel text-xs"
                onClick={() => setLocation('/character')}><Swords className="w-3.5 h-3.5 mr-1" />Manage Heroes</Button>
              <Button size="sm" variant="outline" className="border-slate-700/60 text-slate-300 hover:bg-slate-800/40 font-cinzel text-xs"
                onClick={() => setLocation('/character-creator')}><Crown className="w-3.5 h-3.5 mr-1" />New Hero</Button>
            </div>
          </CardContent>
        </Card>

        {/* Game Links */}
        <Card className="mb-6 bg-slate-900/60 border-slate-700">
          <CardHeader>
            <CardTitle className="text-amber-400 font-cinzel text-lg">All Games</CardTitle>
            <CardDescription>Jump into any mode with your active character</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { href: '/island-v2',    icon: <Leaf className="w-4 h-4" />,     label: 'Home Island',     color: 'text-emerald-400', sub: 'Auto-Harvest' },
                { href: '/crafting',     icon: <Hammer className="w-4 h-4" />,   label: 'Crafting',        color: 'text-orange-400',  sub: 'Forge gear' },
                { href: '/tower-wars',   icon: <Shield className="w-4 h-4" />,   label: 'Tower Wars',      color: 'text-red-400',     sub: 'RTS Grudge' },
                { href: '/combat',       icon: <Swords className="w-4 h-4" />,   label: 'Combat',          color: 'text-slate-300',   sub: 'RPG Battle' },
                { href: '/dungeon',      icon: <Pickaxe className="w-4 h-4" />,  label: 'Dungeon',         color: 'text-zinc-400',    sub: 'Roguelike' },
                { href: '/harvest',      icon: <Leaf className="w-4 h-4" />,     label: 'Harvest',         color: 'text-lime-400',    sub: 'Gathering' },
                { href: '/professions',  icon: <Pickaxe className="w-4 h-4" />,  label: 'Professions',     color: 'text-green-400',   sub: 'Level up' },
                { href: '/skill-tree',   icon: <Zap className="w-4 h-4" />,      label: 'Skill Tree',      color: 'text-blue-400',    sub: 'Abilities' },
                { href: '/world-map',    icon: <Map className="w-4 h-4" />,      label: 'World Map',       color: 'text-teal-400',    sub: 'Explore' },
                { href: '/missions',     icon: <Swords className="w-4 h-4" />,   label: 'Missions',        color: 'text-cyan-400',    sub: 'Quests' },
                { href: '/wallet',       icon: <Wallet className="w-4 h-4" />,   label: 'Wallet & NFTs',   color: 'text-purple-400',  sub: 'Solana' },
                { href: '/character',    icon: <Shield className="w-4 h-4" />,   label: 'Characters',      color: 'text-amber-400',   sub: 'Manage' },
              ].map(item => (
                <button key={item.href} onClick={() => setLocation(item.href)}
                  className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-800 bg-black/20 hover:bg-slate-800/30 hover:border-slate-700 transition-all text-left group">
                  <span className={`${item.color} shrink-0`}>{item.icon}</span>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-white truncate group-hover:text-foreground">{item.label}</div>
                    <div className="text-[10px] text-slate-500">{item.sub}</div>
                  </div>
                </button>
              ))}
            </div>
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
