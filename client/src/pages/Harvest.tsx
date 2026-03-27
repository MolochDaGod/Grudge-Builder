import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";
import { 
  Settings, Wallet, User, Shield, Paintbrush, Bell, 
  Volume2, Copy, ExternalLink, ArrowRightLeft, Coins,
  LogOut, RefreshCw, Eye, EyeOff, Loader2, Search, Book,
  Swords, Heart, Zap, Brain, Target, Wind, Sparkles
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { assetUrl } from "@/lib/assetConfig";

interface UserData {
  username: string;
  level: number;
  gold: number;
}

interface UserSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  notificationsEnabled: boolean;
  autoSaveEnabled: boolean;
  uiScale: number;
}

const GBUX_RATE = 0.001;
const CROSSMINT_COLLECTION_URL = "https://www.crossmint.com/collections/grudge-warlords/drop";
const CROSSMINT_NEXUS_URL = "https://www.crossmint.com/collections/season0-nexus-11/drop";
const CONTRACT_ADDRESS = "34BCY9G9tvWRhUB4z6aeBR7zqd6Z5Wm7hy6fZaN8ZSrW";
const COLLECTION_ID = "5061318d-ff65-4893-ac4b-9b28efb18ace";

export default function HomePage() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("events");
  const [settingsSection, setSettingsSection] = useState("account");
  const [user, setUser] = useState<UserData | null>(null);
  const [settings, setSettings] = useState<UserSettings>({
    soundEnabled: true,
    musicEnabled: true,
    notificationsEnabled: true,
    autoSaveEnabled: true,
    uiScale: 100
  });
  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [swapAmount, setSwapAmount] = useState("");
  const [swapDirection, setSwapDirection] = useState<'sol-to-gbux' | 'gbux-to-sol'>('sol-to-gbux');
  const [solPrice, setSolPrice] = useState<number>(0);
  const [activeNftTab, setActiveNftTab] = useState<'grudge' | 'nexus'>('grudge');
  const [mechanicsSearch, setMechanicsSearch] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    // Check VPS auth token, fall back to legacy localStorage
    const token = localStorage.getItem('grudge_token');
    const vpsUser = localStorage.getItem('grudge_user');
    if (token && vpsUser) {
      try {
        const parsed = JSON.parse(vpsUser);
        setUser({ username: parsed.username || parsed.displayName || 'Warlord', level: 1, gold: parsed.gold || 0 });
      } catch {
        setLocation("/login");
        return;
      }
    } else {
      setLocation("/login");
      return;
    }

    const savedSettings = localStorage.getItem('grudge_user_settings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }

    fetchSolPrice();
  }, [setLocation]);

  const fetchSolPrice = async () => {
    try {
      const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
      const data = await res.json();
      setSolPrice(data.solana?.usd || 180);
    } catch {
      setSolPrice(180);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('grudge_token');
    localStorage.removeItem('grudge_user');
    setLocation("/login");
  };

  const saveSettings = (newSettings: UserSettings) => {
    setSettings(newSettings);
    localStorage.setItem('grudge_user_settings', JSON.stringify(newSettings));
    toast({ title: "Settings Saved", description: "Your preferences have been updated." });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: "Copied to clipboard" });
  };

  const calculateSwap = () => {
    const amount = parseFloat(swapAmount) || 0;
    if (swapDirection === 'sol-to-gbux') {
      const usdValue = amount * solPrice;
      return Math.floor(usdValue / GBUX_RATE);
    } else {
      const usdValue = amount * GBUX_RATE;
      return (usdValue / solPrice).toFixed(6);
    }
  };

  const swapMutation = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(swapAmount);
      if (!amount || amount <= 0) throw new Error("Invalid amount");
      
      const res = await fetch('/api/exchange/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, direction: swapDirection })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Swap failed');
      return data;
    },
    onSuccess: (data) => {
      toast({ title: "Swap Successful", description: data.message });
      setSwapAmount("");
    },
    onError: (error: Error) => {
      toast({ title: "Swap Failed", description: error.message, variant: "destructive" });
    }
  });

  const passwordMutation = useMutation({
    mutationFn: async () => {
      if (!currentPassword || !newPassword) throw new Error("Both passwords required");
      if (newPassword.length < 6) throw new Error("Password must be at least 6 characters");
      
      const res = await fetch('/api/account/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Password change failed');
      return data;
    },
    onSuccess: () => {
      toast({ title: "Password Changed", description: "Your password has been updated successfully." });
      setCurrentPassword("");
      setNewPassword("");
    },
    onError: (error: Error) => {
      toast({ title: "Password Change Failed", description: error.message, variant: "destructive" });
    }
  });

  if (!user) return null;

  return (
    <Layout>
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20 pointer-events-none z-0"
        style={{ backgroundImage: `url(assetUrl("/backgrounds/home-bg.png"))` }}
      />
      <div className="relative z-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-800">
              Welcome, {user.username}
            </h1>
            <p className="text-slate-400">Level {user.level} Warlord</p>
          </div>
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => setLocation("/character")}
              className="border-slate-700 hover:bg-slate-800"
              data-testid="btn-characters"
            >
              My Characters
            </Button>
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="text-slate-400 hover:text-slate-200"
              data-testid="btn-logout"
            >
              Logout
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-stone-900 border border-stone-700 mb-8" data-testid="tabs-main">
              <TabsTrigger value="events" className="data-[state=active]:bg-red-900/50" data-testid="tab-events">
                All Events
              </TabsTrigger>
              <TabsTrigger value="rpg" className="data-[state=active]:bg-red-900/50" data-testid="tab-rpg">
                <Book className="w-4 h-4 mr-2" /> Game Mechanics
              </TabsTrigger>
              <TabsTrigger value="settings" className="data-[state=active]:bg-red-900/50" data-testid="tab-settings">
                <Settings className="w-4 h-4 mr-2" /> Settings
              </TabsTrigger>
              <TabsTrigger value="exchange" className="data-[state=active]:bg-amber-900/50" data-testid="tab-exchange">
                <Coins className="w-4 h-4 mr-2" /> GBUX Exchange
              </TabsTrigger>
            </TabsList>

            <TabsContent value="events">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
              >
                <EventCard
                  title="Weekly Tournament"
                  description="Compete against other warlords for glory and rewards"
                  status="Active"
                  reward="500 Gold + Rare Items"
                  image=assetUrl("/images/events/weekly-tournament.png")
                  onClick={() => setLocation("/combat")}
                />
                <EventCard
                  title="Dungeon Raid: Shadow Depths"
                  description="Lead your party into the cursed dungeon depths"
                  status="Active"
                  reward="XP Boost + Epic Gear"
                  image=assetUrl("/images/events/dungeon-raid-1.png")
                  onClick={() => setLocation("/dungeon")}
                />
                <EventCard
                  title="Faction War"
                  description="Join your faction's crusade for dominion"
                  status="Active"
                  reward="Faction Points"
                  image=assetUrl("/images/events/faction-war.png")
                  onClick={() => setLocation("/combat")}
                />
              </motion.div>
            </TabsContent>

            <TabsContent value="rpg">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-stone-200">Game Mechanics</h2>
                    <p className="text-stone-400">Learn about attributes, combat, and battle systems</p>
                  </div>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
                    <Input
                      placeholder="Search mechanics..."
                      value={mechanicsSearch}
                      onChange={(e) => setMechanicsSearch(e.target.value)}
                      className="pl-10 bg-stone-800 border-stone-600"
                      data-testid="input-mechanics-search"
                    />
                  </div>
                </div>

                <ScrollArea className="h-[600px] pr-4">
                  <Accordion type="multiple" defaultValue={["attributes", "combat"]} className="space-y-4">
                    {(!mechanicsSearch || "attributes strength vitality endurance intellect wisdom dexterity agility tactics str vit end int wis dex agi tac".toLowerCase().includes(mechanicsSearch.toLowerCase())) && (
                      <AccordionItem value="attributes" className="bg-stone-900 border border-stone-700 rounded-lg px-4">
                        <AccordionTrigger className="text-stone-200 hover:no-underline" data-testid="accordion-attributes">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-amber-500" />
                            <span className="text-lg font-semibold">Core Attributes (8)</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4 pt-2">
                          <p className="text-stone-400 text-sm">
                            Your character has 8 core attributes that determine combat effectiveness. Each attribute provides flat bonuses and percentage increases to secondary stats.
                          </p>
                          
                          <div className="grid gap-3 md:grid-cols-2">
                            <Card className="bg-stone-800 border-red-900/50">
                              <CardHeader className="pb-2">
                                <CardTitle className="text-red-400 flex items-center gap-2 text-base">
                                  <Swords className="w-4 h-4" /> Strength (STR)
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="text-sm text-stone-300">
                                <p className="text-stone-400 mb-2">Tank / Melee DPS</p>
                                <ul className="space-y-1 text-xs">
                                  <li>+26 Health, +0.8% per point</li>
                                  <li>+3 Damage, +2% per point</li>
                                  <li>+12 Defense, +1.5% per point</li>
                                  <li>+0.5% Block Chance, +0.32% Crit Chance</li>
                                </ul>
                              </CardContent>
                            </Card>

                            <Card className="bg-stone-800 border-green-900/50">
                              <CardHeader className="pb-2">
                                <CardTitle className="text-green-400 flex items-center gap-2 text-base">
                                  <Heart className="w-4 h-4" /> Vitality (VIT)
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="text-sm text-stone-300">
                                <p className="text-stone-400 mb-2">Tank / Survivability</p>
                                <ul className="space-y-1 text-xs">
                                  <li>+25 Health, +0.5% per point</li>
                                  <li>+2 Mana, +5 Stamina per point</li>
                                  <li>+12 Defense flat</li>
                                  <li>+0.5% Resistance per point</li>
                                </ul>
                              </CardContent>
                            </Card>

                            <Card className="bg-stone-800 border-gray-600/50">
                              <CardHeader className="pb-2">
                                <CardTitle className="text-gray-300 flex items-center gap-2 text-base">
                                  <Shield className="w-4 h-4" /> Endurance (END)
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="text-sm text-stone-300">
                                <p className="text-stone-400 mb-2">Defensive Specialist</p>
                                <ul className="space-y-1 text-xs">
                                  <li>+10 Health, +12 Defense per point</li>
                                  <li>+12% Defense scaling</li>
                                  <li>+0.11% Block Chance, +73.5% scaling</li>
                                  <li>+0.46% Resistance per point</li>
                                </ul>
                              </CardContent>
                            </Card>

                            <Card className="bg-stone-800 border-blue-900/50">
                              <CardHeader className="pb-2">
                                <CardTitle className="text-blue-400 flex items-center gap-2 text-base">
                                  <Brain className="w-4 h-4" /> Intellect (INT)
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="text-sm text-stone-300">
                                <p className="text-stone-400 mb-2">Mage / Caster</p>
                                <ul className="space-y-1 text-xs">
                                  <li>+5 Mana, +5% per point</li>
                                  <li>+4 Damage, +2.5% per point</li>
                                  <li>+0.12% Accuracy, +33.8% scaling</li>
                                  <li>+0.38% Resistance per point</li>
                                </ul>
                              </CardContent>
                            </Card>

                            <Card className="bg-stone-800 border-purple-900/50">
                              <CardHeader className="pb-2">
                                <CardTitle className="text-purple-400 flex items-center gap-2 text-base">
                                  <Sparkles className="w-4 h-4" /> Wisdom (WIS)
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="text-sm text-stone-300">
                                <p className="text-stone-400 mb-2">Healer / Support</p>
                                <ul className="space-y-1 text-xs">
                                  <li>+10 Health, +20 Mana per point</li>
                                  <li>+3% Mana scaling</li>
                                  <li>+2 Damage, +1.5% per point</li>
                                  <li>+0.5% Crit Chance, +0.5% Resistance</li>
                                </ul>
                              </CardContent>
                            </Card>

                            <Card className="bg-stone-800 border-amber-900/50">
                              <CardHeader className="pb-2">
                                <CardTitle className="text-amber-400 flex items-center gap-2 text-base">
                                  <Target className="w-4 h-4" /> Dexterity (DEX)
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="text-sm text-stone-300">
                                <p className="text-stone-400 mb-2">Rogue / Precision Fighter</p>
                                <ul className="space-y-1 text-xs">
                                  <li>+3 Damage, +1.8% per point</li>
                                  <li>+10 Defense, +1% per point</li>
                                  <li>+0.5% Crit Chance, +1.2% scaling</li>
                                  <li>+0.7% Accuracy, +1.5% scaling</li>
                                </ul>
                              </CardContent>
                            </Card>

                            <Card className="bg-stone-800 border-cyan-900/50">
                              <CardHeader className="pb-2">
                                <CardTitle className="text-cyan-400 flex items-center gap-2 text-base">
                                  <Wind className="w-4 h-4" /> Agility (AGI)
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="text-sm text-stone-300">
                                <p className="text-stone-400 mb-2">Speed / Evasion</p>
                                <ul className="space-y-1 text-xs">
                                  <li>+15 Stamina, +1% per point</li>
                                  <li>+2 Damage per point</li>
                                  <li>+0.3% Crit Chance, +0.4% Accuracy</li>
                                  <li>+0.8% Crit Evasion per point</li>
                                </ul>
                              </CardContent>
                            </Card>

                            <Card className="bg-stone-800 border-rose-900/50">
                              <CardHeader className="pb-2">
                                <CardTitle className="text-rose-400 flex items-center gap-2 text-base">
                                  <Zap className="w-4 h-4" /> Tactics (TAC)
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="text-sm text-stone-300">
                                <p className="text-stone-400 mb-2">Strategic Combat</p>
                                <ul className="space-y-1 text-xs">
                                  <li>+3 Damage, +1.2% per point</li>
                                  <li>+5 Defense, +0.5% per point</li>
                                  <li>+0.2% Accuracy, +0.3% Block Chance</li>
                                  <li>+0.01 Crit Factor per point</li>
                                </ul>
                              </CardContent>
                            </Card>
                          </div>

                          <Card className="bg-stone-800/50 border-amber-900/30">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-amber-500 text-sm">Diminishing Returns System</CardTitle>
                            </CardHeader>
                            <CardContent className="text-xs text-stone-400">
                              <ul className="space-y-1">
                                <li><span className="text-green-400">Points 1-25:</span> 100% efficiency (full effect)</li>
                                <li><span className="text-yellow-400">Points 26-50:</span> 50% efficiency</li>
                                <li><span className="text-red-400">Points 51+:</span> 25% efficiency</li>
                              </ul>
                            </CardContent>
                          </Card>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {(!mechanicsSearch || "combat battle damage attack defense block critical crit hit miss formula".toLowerCase().includes(mechanicsSearch.toLowerCase())) && (
                      <AccordionItem value="combat" className="bg-stone-900 border border-stone-700 rounded-lg px-4">
                        <AccordionTrigger className="text-stone-200 hover:no-underline" data-testid="accordion-combat">
                          <div className="flex items-center gap-2">
                            <Swords className="w-5 h-5 text-red-500" />
                            <span className="text-lg font-semibold">Combat System</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4 pt-2">
                          <p className="text-stone-400 text-sm">
                            Combat follows an 8-step resolution process for each attack. Understanding this flow helps optimize your character build.
                          </p>

                          <Card className="bg-stone-800 border-stone-600">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-stone-200 text-sm">Combat Flow (8 Steps)</CardTitle>
                            </CardHeader>
                            <CardContent className="text-xs space-y-2">
                              <div className="grid gap-2">
                                <div className="flex items-start gap-2">
                                  <Badge className="bg-red-900 text-red-300 shrink-0">1</Badge>
                                  <span className="text-stone-300"><strong>Accuracy Check:</strong> attacker.accuracy vs defender.evasion</span>
                                </div>
                                <div className="flex items-start gap-2">
                                  <Badge className="bg-red-900 text-red-300 shrink-0">2</Badge>
                                  <span className="text-stone-300"><strong>Base Damage:</strong> attacker.damage × (1 + random variance ±10%)</span>
                                </div>
                                <div className="flex items-start gap-2">
                                  <Badge className="bg-red-900 text-red-300 shrink-0">3</Badge>
                                  <span className="text-stone-300"><strong>Critical Check:</strong> Roll against critChance, apply critFactor</span>
                                </div>
                                <div className="flex items-start gap-2">
                                  <Badge className="bg-red-900 text-red-300 shrink-0">4</Badge>
                                  <span className="text-stone-300"><strong>Defense Reduction:</strong> damage - (defense × defenseEfficiency)</span>
                                </div>
                                <div className="flex items-start gap-2">
                                  <Badge className="bg-red-900 text-red-300 shrink-0">5</Badge>
                                  <span className="text-stone-300"><strong>Block Check:</strong> Roll against blockChance, reduce by blockFactor</span>
                                </div>
                                <div className="flex items-start gap-2">
                                  <Badge className="bg-red-900 text-red-300 shrink-0">6</Badge>
                                  <span className="text-stone-300"><strong>Resistance:</strong> Apply elemental/magic resistance</span>
                                </div>
                                <div className="flex items-start gap-2">
                                  <Badge className="bg-red-900 text-red-300 shrink-0">7</Badge>
                                  <span className="text-stone-300"><strong>Apply Damage:</strong> Subtract from target health</span>
                                </div>
                                <div className="flex items-start gap-2">
                                  <Badge className="bg-red-900 text-red-300 shrink-0">8</Badge>
                                  <span className="text-stone-300"><strong>Triggers:</strong> Lifesteal, reflect, absorb effects</span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          <div className="grid gap-3 md:grid-cols-2">
                            <Card className="bg-stone-800 border-stone-600">
                              <CardHeader className="pb-2">
                                <CardTitle className="text-amber-400 text-sm">Damage Formula</CardTitle>
                              </CardHeader>
                              <CardContent className="text-xs text-stone-300 font-mono">
                                <code className="block bg-stone-900 p-2 rounded">
                                  finalDamage = baseDamage × critMultiplier - (defense × 0.4) × (1 - blockReduction)
                                </code>
                              </CardContent>
                            </Card>

                            <Card className="bg-stone-800 border-stone-600">
                              <CardHeader className="pb-2">
                                <CardTitle className="text-blue-400 text-sm">Block Mechanics</CardTitle>
                              </CardHeader>
                              <CardContent className="text-xs text-stone-300">
                                <ul className="space-y-1">
                                  <li><strong>Block Chance Cap:</strong> 75%</li>
                                  <li><strong>Block Factor Cap:</strong> 90% reduction</li>
                                  <li><strong>Block Break:</strong> Can ignore up to 75%</li>
                                </ul>
                              </CardContent>
                            </Card>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {(!mechanicsSearch || "stats secondary health mana stamina caps limits".toLowerCase().includes(mechanicsSearch.toLowerCase())) && (
                      <AccordionItem value="stats" className="bg-stone-900 border border-stone-700 rounded-lg px-4">
                        <AccordionTrigger className="text-stone-200 hover:no-underline" data-testid="accordion-stats">
                          <div className="flex items-center gap-2">
                            <Zap className="w-5 h-5 text-yellow-500" />
                            <span className="text-lg font-semibold">Secondary Stats (19)</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4 pt-2">
                          <p className="text-stone-400 text-sm">
                            Secondary stats are derived from your core attributes. Each has minimum and maximum caps.
                          </p>

                          <div className="grid gap-2 md:grid-cols-3">
                            <Card className="bg-stone-800 border-stone-600">
                              <CardContent className="pt-4 text-xs">
                                <h4 className="text-green-400 font-semibold mb-2">Resources</h4>
                                <ul className="space-y-1 text-stone-300">
                                  <li>Health: 1 - 999,999</li>
                                  <li>Mana: 0 - 999,999</li>
                                  <li>Stamina: 0 - 999</li>
                                </ul>
                              </CardContent>
                            </Card>

                            <Card className="bg-stone-800 border-stone-600">
                              <CardContent className="pt-4 text-xs">
                                <h4 className="text-red-400 font-semibold mb-2">Combat</h4>
                                <ul className="space-y-1 text-stone-300">
                                  <li>Damage: 1 - 99,999</li>
                                  <li>Defense: 0 - 9,999</li>
                                </ul>
                              </CardContent>
                            </Card>

                            <Card className="bg-stone-800 border-stone-600">
                              <CardContent className="pt-4 text-xs">
                                <h4 className="text-blue-400 font-semibold mb-2">Chance Stats</h4>
                                <ul className="space-y-1 text-stone-300">
                                  <li>Block Chance: 0 - 75%</li>
                                  <li>Crit Chance: 0 - 75%</li>
                                  <li>Accuracy: 0 - 95%</li>
                                  <li>Resistance: 0 - 95%</li>
                                </ul>
                              </CardContent>
                            </Card>

                            <Card className="bg-stone-800 border-stone-600">
                              <CardContent className="pt-4 text-xs">
                                <h4 className="text-purple-400 font-semibold mb-2">Multipliers</h4>
                                <ul className="space-y-1 text-stone-300">
                                  <li>Block Factor: 0 - 90%</li>
                                  <li>Crit Factor: 1.0x - 3.0x</li>
                                </ul>
                              </CardContent>
                            </Card>

                            <Card className="bg-stone-800 border-stone-600">
                              <CardContent className="pt-4 text-xs">
                                <h4 className="text-amber-400 font-semibold mb-2">Advanced</h4>
                                <ul className="space-y-1 text-stone-300">
                                  <li>Lifesteal: 0 - 50%</li>
                                  <li>Manasteal: 0 - 50%</li>
                                  <li>Reflect: 0 - 50%</li>
                                </ul>
                              </CardContent>
                            </Card>

                            <Card className="bg-stone-800 border-stone-600">
                              <CardContent className="pt-4 text-xs">
                                <h4 className="text-cyan-400 font-semibold mb-2">Penetration</h4>
                                <ul className="space-y-1 text-stone-300">
                                  <li>Defense Break: 0 - 75%</li>
                                  <li>Block Break: 0 - 75%</li>
                                  <li>Crit Evasion: 0 - 50%</li>
                                </ul>
                              </CardContent>
                            </Card>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {(!mechanicsSearch || "level experience xp progression character hero".toLowerCase().includes(mechanicsSearch.toLowerCase())) && (
                      <AccordionItem value="progression" className="bg-stone-900 border border-stone-700 rounded-lg px-4">
                        <AccordionTrigger className="text-stone-200 hover:no-underline" data-testid="accordion-progression">
                          <div className="flex items-center gap-2">
                            <Target className="w-5 h-5 text-green-500" />
                            <span className="text-lg font-semibold">Character Progression</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4 pt-2">
                          <div className="grid gap-3 md:grid-cols-2">
                            <Card className="bg-stone-800 border-stone-600">
                              <CardHeader className="pb-2">
                                <CardTitle className="text-stone-200 text-sm">Level Progression</CardTitle>
                              </CardHeader>
                              <CardContent className="text-xs text-stone-300">
                                <ul className="space-y-1">
                                  <li><strong>Max Level:</strong> 20</li>
                                  <li><strong>Starting Points:</strong> 20</li>
                                  <li><strong>Points per Level:</strong> +7</li>
                                  <li><strong>Max Attribute Points:</strong> 160</li>
                                </ul>
                              </CardContent>
                            </Card>

                            <Card className="bg-stone-800 border-stone-600">
                              <CardHeader className="pb-2">
                                <CardTitle className="text-stone-200 text-sm">Point Distribution</CardTitle>
                              </CardHeader>
                              <CardContent className="text-xs text-stone-300">
                                <ul className="space-y-1">
                                  <li><strong>Level 1:</strong> 20 points to allocate</li>
                                  <li><strong>Level 10:</strong> 83 points total</li>
                                  <li><strong>Level 20:</strong> 153 points total</li>
                                  <li>Respec available for gold cost</li>
                                </ul>
                              </CardContent>
                            </Card>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}
                  </Accordion>
                </ScrollArea>
              </motion.div>
            </TabsContent>

            <TabsContent value="settings">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="flex gap-6">
                  <div className="w-48 space-y-2">
                    <Button
                      variant={settingsSection === 'account' ? 'secondary' : 'ghost'}
                      className="w-full justify-start"
                      onClick={() => setSettingsSection('account')}
                      data-testid="btn-settings-account"
                    >
                      <User className="w-4 h-4 mr-2" /> Account
                    </Button>
                    <Button
                      variant={settingsSection === 'avatar' ? 'secondary' : 'ghost'}
                      className="w-full justify-start"
                      onClick={() => setSettingsSection('avatar')}
                      data-testid="btn-settings-avatar"
                    >
                      <User className="w-4 h-4 mr-2" /> Avatar
                    </Button>
                    <Button
                      variant={settingsSection === 'appearance' ? 'secondary' : 'ghost'}
                      className="w-full justify-start"
                      onClick={() => setSettingsSection('appearance')}
                      data-testid="btn-settings-appearance"
                    >
                      <Paintbrush className="w-4 h-4 mr-2" /> Appearance
                    </Button>
                    <Button
                      variant={settingsSection === 'audio' ? 'secondary' : 'ghost'}
                      className="w-full justify-start"
                      onClick={() => setSettingsSection('audio')}
                      data-testid="btn-settings-audio"
                    >
                      <Volume2 className="w-4 h-4 mr-2" /> Audio
                    </Button>
                    <Button
                      variant={settingsSection === 'security' ? 'secondary' : 'ghost'}
                      className="w-full justify-start"
                      onClick={() => setSettingsSection('security')}
                      data-testid="btn-settings-security"
                    >
                      <Shield className="w-4 h-4 mr-2" /> Security
                    </Button>
                    <Button
                      variant={settingsSection === 'wallet' ? 'secondary' : 'ghost'}
                      className="w-full justify-start"
                      onClick={() => setSettingsSection('wallet')}
                      data-testid="btn-settings-wallet"
                    >
                      <Wallet className="w-4 h-4 mr-2" /> Wallet
                    </Button>
                    <Separator className="my-4" />
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-red-500 hover:text-red-400 hover:bg-red-900/20"
                      onClick={handleLogout}
                      data-testid="btn-settings-logout"
                    >
                      <LogOut className="w-4 h-4 mr-2" /> Log Out
                    </Button>
                  </div>

                  <div className="flex-1">
                    {settingsSection === 'account' && (
                      <Card className="bg-stone-900 border-stone-700">
                        <CardHeader>
                          <CardTitle className="text-stone-200">Account Information</CardTitle>
                          <CardDescription>Your account details and preferences</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-stone-400">Username</Label>
                              <p className="text-stone-200 font-medium">{user.username}</p>
                            </div>
                            <div>
                              <Label className="text-stone-400">Level</Label>
                              <p className="text-stone-200 font-medium">{user.level}</p>
                            </div>
                            <div>
                              <Label className="text-stone-400">Gold</Label>
                              <p className="text-amber-500 font-medium">{user.gold?.toLocaleString() || 0}</p>
                            </div>
                            <div>
                              <Label className="text-stone-400">Account Status</Label>
                              <Badge className="bg-green-900 text-green-400">Active</Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {settingsSection === 'avatar' && (
                      <Card className="bg-stone-900 border-stone-700">
                        <CardHeader>
                          <CardTitle className="text-stone-200">Avatar Settings</CardTitle>
                          <CardDescription>Customize your profile picture</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex items-center gap-6">
                            <div className="w-24 h-24 rounded-full bg-stone-800 border-2 border-stone-600 flex items-center justify-center">
                              <User className="w-12 h-12 text-stone-500" />
                            </div>
                            <div className="space-y-2">
                              <Button variant="outline" className="border-stone-600">
                                Upload New Avatar
                              </Button>
                              <p className="text-xs text-stone-500">PNG, JPG up to 2MB</p>
                            </div>
                          </div>
                          <Separator />
                          <div>
                            <Label className="text-stone-400 mb-2 block">Choose from Gallery</Label>
                            <div className="grid grid-cols-6 gap-2">
                              {['warrior', 'mage', 'ranger', 'rogue'].map((cls) => (
                                <div 
                                  key={cls}
                                  className="w-12 h-12 rounded-lg bg-stone-800 border border-stone-600 hover:border-amber-500 cursor-pointer flex items-center justify-center"
                                >
                                  <User className="w-6 h-6 text-stone-400" />
                                </div>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {settingsSection === 'appearance' && (
                      <Card className="bg-stone-900 border-stone-700">
                        <CardHeader>
                          <CardTitle className="text-stone-200">Appearance</CardTitle>
                          <CardDescription>Customize the look and feel</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          <div>
                            <Label className="text-stone-400 mb-2 block">UI Scale: {settings.uiScale}%</Label>
                            <Slider
                              value={[settings.uiScale]}
                              onValueChange={([value]) => saveSettings({ ...settings, uiScale: value })}
                              min={75}
                              max={150}
                              step={5}
                              className="w-full"
                              data-testid="slider-ui-scale"
                            />
                            <div className="flex justify-between text-xs text-stone-500 mt-1">
                              <span>75%</span>
                              <span>100%</span>
                              <span>150%</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {settingsSection === 'audio' && (
                      <Card className="bg-stone-900 border-stone-700">
                        <CardHeader>
                          <CardTitle className="text-stone-200">Audio & Notifications</CardTitle>
                          <CardDescription>Sound and notification preferences</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex items-center justify-between py-2">
                            <div>
                              <Label className="text-stone-200">Sound Effects</Label>
                              <p className="text-sm text-stone-500">Combat and UI sounds</p>
                            </div>
                            <Switch
                              checked={settings.soundEnabled}
                              onCheckedChange={(checked) => saveSettings({ ...settings, soundEnabled: checked })}
                              data-testid="switch-sound"
                            />
                          </div>
                          <Separator />
                          <div className="flex items-center justify-between py-2">
                            <div>
                              <Label className="text-stone-200">Music</Label>
                              <p className="text-sm text-stone-500">Background music</p>
                            </div>
                            <Switch
                              checked={settings.musicEnabled}
                              onCheckedChange={(checked) => saveSettings({ ...settings, musicEnabled: checked })}
                              data-testid="switch-music"
                            />
                          </div>
                          <Separator />
                          <div className="flex items-center justify-between py-2">
                            <div>
                              <Label className="text-stone-200">Notifications</Label>
                              <p className="text-sm text-stone-500">Event and battle alerts</p>
                            </div>
                            <Switch
                              checked={settings.notificationsEnabled}
                              onCheckedChange={(checked) => saveSettings({ ...settings, notificationsEnabled: checked })}
                              data-testid="switch-notifications"
                            />
                          </div>
                          <Separator />
                          <div className="flex items-center justify-between py-2">
                            <div>
                              <Label className="text-stone-200">Auto-Save</Label>
                              <p className="text-sm text-stone-500">Automatically save progress</p>
                            </div>
                            <Switch
                              checked={settings.autoSaveEnabled}
                              onCheckedChange={(checked) => saveSettings({ ...settings, autoSaveEnabled: checked })}
                              data-testid="switch-autosave"
                            />
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {settingsSection === 'security' && (
                      <Card className="bg-stone-900 border-stone-700">
                        <CardHeader>
                          <CardTitle className="text-stone-200">Security</CardTitle>
                          <CardDescription>Password and account security</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-4">
                            <div>
                              <Label className="text-stone-400">Current Password</Label>
                              <div className="relative">
                                <Input
                                  type={showPassword ? "text" : "password"}
                                  value={currentPassword}
                                  onChange={(e) => setCurrentPassword(e.target.value)}
                                  className="bg-stone-800 border-stone-600 pr-10"
                                  data-testid="input-current-password"
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-1 top-1/2 -translate-y-1/2"
                                  onClick={() => setShowPassword(!showPassword)}
                                >
                                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </Button>
                              </div>
                            </div>
                            <div>
                              <Label className="text-stone-400">New Password</Label>
                              <Input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="bg-stone-800 border-stone-600"
                                data-testid="input-new-password"
                              />
                            </div>
                            <Button 
                              className="bg-amber-600 hover:bg-amber-500" 
                              data-testid="btn-change-password"
                              onClick={() => passwordMutation.mutate()}
                              disabled={passwordMutation.isPending || !currentPassword || !newPassword}
                            >
                              {passwordMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                              Change Password
                            </Button>
                          </div>
                          <Separator className="my-6" />
                          <div>
                            <h4 className="text-red-500 font-medium mb-2">Danger Zone</h4>
                            <Button variant="outline" className="border-red-900 text-red-500 hover:bg-red-900/20">
                              Reset Progress
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {settingsSection === 'wallet' && (
                      <Card className="bg-stone-900 border-stone-700">
                        <CardHeader>
                          <CardTitle className="text-stone-200">Wallet Settings</CardTitle>
                          <CardDescription>Manage your Solana wallet and NFTs</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <Button 
                            onClick={() => setLocation("/wallet")}
                            className="w-full bg-purple-600 hover:bg-purple-500"
                            data-testid="btn-open-wallet"
                          >
                            <Wallet className="w-4 h-4 mr-2" /> Open Full Wallet Manager
                          </Button>
                          <Separator />
                          <div className="bg-stone-800 rounded-lg p-4">
                            <Label className="text-stone-400">Quick Actions</Label>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                              <Button variant="outline" size="sm" className="border-stone-600">
                                View NFTs
                              </Button>
                              <Button variant="outline" size="sm" className="border-stone-600">
                                Mint Character
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              </motion.div>
            </TabsContent>

            <TabsContent value="exchange">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold text-amber-400">GBUX Exchange</h2>
                    <p className="text-stone-400">Trade GBUX tokens and browse NFT collections</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-amber-600 text-amber-400">
                      1 GBUX = ${GBUX_RATE} USDT
                    </Badge>
                    <Badge variant="outline" className="border-purple-600 text-purple-400">
                      SOL: ${solPrice.toFixed(2)}
                    </Badge>
                  </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <Card className="bg-stone-900 border-amber-900/50">
                    <CardHeader>
                      <CardTitle className="text-amber-400 flex items-center gap-2">
                        <ArrowRightLeft className="w-5 h-5" /> GBUX Swap
                      </CardTitle>
                      <CardDescription>Exchange SOL for GBUX tokens</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Button
                          variant={swapDirection === 'sol-to-gbux' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSwapDirection('sol-to-gbux')}
                          className={swapDirection === 'sol-to-gbux' ? 'bg-amber-600' : 'border-stone-600'}
                        >
                          SOL → GBUX
                        </Button>
                        <Button
                          variant={swapDirection === 'gbux-to-sol' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSwapDirection('gbux-to-sol')}
                          className={swapDirection === 'gbux-to-sol' ? 'bg-amber-600' : 'border-stone-600'}
                        >
                          GBUX → SOL
                        </Button>
                      </div>
                      
                      <div>
                        <Label className="text-stone-400">
                          {swapDirection === 'sol-to-gbux' ? 'SOL Amount' : 'GBUX Amount'}
                        </Label>
                        <Input
                          type="number"
                          value={swapAmount}
                          onChange={(e) => setSwapAmount(e.target.value)}
                          placeholder="0.00"
                          className="bg-stone-800 border-stone-600"
                          data-testid="input-swap-amount"
                        />
                      </div>
                      
                      <div className="bg-stone-800 rounded-lg p-4 text-center">
                        <p className="text-stone-400 text-sm">You will receive</p>
                        <p className="text-3xl font-bold text-amber-400">
                          {calculateSwap()} {swapDirection === 'sol-to-gbux' ? 'GBUX' : 'SOL'}
                        </p>
                      </div>

                      <Button 
                        className="w-full bg-amber-600 hover:bg-amber-500" 
                        data-testid="btn-swap"
                        onClick={() => swapMutation.mutate()}
                        disabled={swapMutation.isPending || !swapAmount || parseFloat(swapAmount) <= 0}
                      >
                        {swapMutation.isPending ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                        ) : (
                          <><RefreshCw className="w-4 h-4 mr-2" /> Swap Now</>
                        )}
                      </Button>

                      <p className="text-xs text-stone-500 text-center">
                        Exchange powered by AI Agent Wallets. Rate: 1 GBUX ≥ $0.001 USDT
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-stone-900 border-purple-900/50">
                    <CardHeader>
                      <CardTitle className="text-purple-400 flex items-center gap-2">
                        <Shield className="w-5 h-5" /> Smart Contract
                      </CardTitle>
                      <CardDescription>Grudge Warlords Collection Details</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div className="bg-stone-800 rounded-lg p-3">
                          <Label className="text-stone-400 text-xs">Blockchain</Label>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-purple-900 text-purple-300">Solana</Badge>
                            <span className="text-stone-200">Metaplex Certified</span>
                          </div>
                        </div>
                        
                        <div className="bg-stone-800 rounded-lg p-3">
                          <Label className="text-stone-400 text-xs">Contract Address</Label>
                          <div className="flex items-center gap-2">
                            <code className="text-xs text-amber-400 flex-1 truncate">{CONTRACT_ADDRESS}</code>
                            <Button variant="ghost" size="sm" onClick={() => copyToClipboard(CONTRACT_ADDRESS)}>
                              <Copy className="w-3 h-3" />
                            </Button>
                            <a 
                              href={`https://solscan.io/account/${CONTRACT_ADDRESS}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button variant="ghost" size="sm">
                                <ExternalLink className="w-3 h-3" />
                              </Button>
                            </a>
                          </div>
                        </div>

                        <div className="bg-stone-800 rounded-lg p-3">
                          <Label className="text-stone-400 text-xs">Collection ID</Label>
                          <div className="flex items-center gap-2">
                            <code className="text-xs text-purple-400 flex-1 truncate">{COLLECTION_ID}</code>
                            <Button variant="ghost" size="sm" onClick={() => copyToClipboard(COLLECTION_ID)}>
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="bg-stone-900 border-stone-700">
                  <CardHeader>
                    <CardTitle className="text-stone-200">NFT Marketplace</CardTitle>
                    <CardDescription>Browse and purchase Grudge Warlords NFTs</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2 mb-4">
                      <Button
                        variant={activeNftTab === 'grudge' ? 'default' : 'outline'}
                        onClick={() => setActiveNftTab('grudge')}
                        className={activeNftTab === 'grudge' ? 'bg-amber-600' : 'border-stone-600'}
                      >
                        Grudge Warlords
                      </Button>
                      <Button
                        variant={activeNftTab === 'nexus' ? 'default' : 'outline'}
                        onClick={() => setActiveNftTab('nexus')}
                        className={activeNftTab === 'nexus' ? 'bg-purple-600' : 'border-stone-600'}
                      >
                        Season 0 Nexus
                      </Button>
                    </div>
                    
                    <div className="rounded-lg overflow-hidden border border-stone-700 bg-white">
                      <iframe
                        src={activeNftTab === 'grudge' ? CROSSMINT_COLLECTION_URL : CROSSMINT_NEXUS_URL}
                        className="w-full h-[600px]"
                        title={activeNftTab === 'grudge' ? 'Grudge Warlords Collection' : 'Season 0 Nexus Collection'}
                        sandbox="allow-scripts allow-forms allow-popups allow-same-origin"
                        data-testid="iframe-crossmint"
                      />
                    </div>
                    
                    <p className="text-xs text-stone-500 text-center mt-4">
                      Powered by Crossmint. Purchases are processed securely on the Solana blockchain.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}

function EventCard({ title, description, status, reward, image, onClick }: {
  title: string;
  description: string;
  status: string;
  reward: string;
  image?: string;
  onClick: () => void;
}) {
  return (
    <Card 
      className="bg-stone-900 border-stone-700 hover:border-red-900/50 transition-colors cursor-pointer overflow-hidden group"
      onClick={onClick}
      data-testid={`event-card-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      {image && (
        <div className="relative h-40 overflow-hidden">
          <img 
            src={image} 
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-transparent to-transparent" />
          <span className={`absolute top-2 right-2 text-xs px-2 py-1 rounded ${status === 'Active' ? 'bg-green-900/80 text-green-400' : 'bg-stone-700/80 text-stone-400'}`}>
            {status}
          </span>
        </div>
      )}
      <CardHeader className={image ? 'pt-2' : ''}>
        {!image && (
          <div className="flex justify-between items-start">
            <CardTitle className="text-stone-200">{title}</CardTitle>
            <span className={`text-xs px-2 py-1 rounded ${status === 'Active' ? 'bg-green-900/50 text-green-400' : 'bg-stone-700 text-stone-400'}`}>
              {status}
            </span>
          </div>
        )}
        {image && <CardTitle className="text-stone-200">{title}</CardTitle>}
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-amber-500 text-sm font-medium">{reward}</div>
      </CardContent>
    </Card>
  );
}
