import { useState, useEffect, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { CharacterManager, Character } from "@/lib/characterManager";
import { authHeaders } from "@/lib/grudgeBackend";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { AnimatePresence, motion } from "framer-motion";
import {
  Hammer, Clock, CheckCircle, Loader2, Package, Lock,
  Flame, Search, X, AlertCircle, Sparkles, Sword, Shield, FlaskConical, Gem,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  useObjectStoreData,
  getBaseItems,
  getTierVariants,
  findRecipeForItem,
  type OSItem,
  type OSRecipe,
} from "@/lib/objectStoreData";
import { TIERS as TIER_DEFS, getTierDef } from "@shared/definitions/tierSystem";
import { resolveIconUrl, iconOnError } from "@/lib/iconResolver";

// ── Types ────────────────────────────────────────────────────────────
interface CraftingJob {
  id: string;
  characterId: string;
  recipeId: string;
  quantity: number;
  duration: number;
  startedAt: string;
  completesAt: string;
  status: string;
}

// ── Helpers ──────────────────────────────────────────────────────────
function formatTimeRemaining(completesAt: string): string {
  const diff = Math.max(0, new Date(completesAt).getTime() - Date.now());
  if (diff === 0) return "Ready!";
  const s = Math.floor(diff / 1000) % 60;
  const m = Math.floor(diff / 60000) % 60;
  const h = Math.floor(diff / 3600000);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function jobProgress(job: CraftingJob): number {
  const start = new Date(job.startedAt).getTime();
  const end = new Date(job.completesAt).getTime();
  const now = Date.now();
  if (now >= end) return 100;
  return Math.min(100, ((now - start) / (end - start)) * 100);
}

const WCS_TABS = [
  { id: "weapons", label: "Weapons", icon: Sword, filter: (i: OSItem) => i.type === "weapon" },
  { id: "armor", label: "Armor", icon: Shield, filter: (i: OSItem) => i.type === "armor" },
  { id: "consumables", label: "Consumables", icon: FlaskConical, filter: (i: OSItem) => i.type === "food" || i.type === "potion" },
  { id: "materials", label: "Materials", icon: Gem, filter: (_i: OSItem) => false },
] as const;

const PROFESSION_COLORS: Record<string, string> = {
  Miner: "text-amber-400 border-amber-700",
  Forester: "text-green-400 border-green-700",
  Mystic: "text-purple-400 border-purple-700",
  Engineer: "text-orange-400 border-orange-700",
  Chef: "text-red-400 border-red-700",
};

// ── Component ────────────────────────────────────────────────────────
export default function CraftingPage() {
  const authReady = useAuthGuard();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [character, setCharacter] = useState<Character | null>(null);
  const [activeTab, setActiveTab] = useState("weapons");
  const [activeTier, setActiveTier] = useState<number | 0>(0); // 0 = All
  const [activeProfession, setActiveProfession] = useState("All");
  const [selectedItem, setSelectedItem] = useState<OSItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [, setTick] = useState(0);

  // ObjectStore live data
  const { items: osItems, recipes: osRecipes, materials: osMaterials, isLoading: osLoading, totalItems, version: osVersion } = useObjectStoreData();

  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (!authReady) return;
    CharacterManager.getActiveCharacter().then(setCharacter);
  }, [authReady]);

  // ── Crafting jobs (backend) ──────────────────────────────────────
  const craftingJobs: CraftingJob[] = []; // TODO: wire to backend when crafting-jobs API is live
  const jobsLoading = false;

  // ── Filtering ────────────────────────────────────────────────────
  const currentTab = WCS_TABS.find(t => t.id === activeTab) || WCS_TABS[0];

  const filteredItems = useMemo(() => {
    if (activeTab === "materials") return []; // materials tab shows osMaterials separately
    let list = osItems.filter(currentTab.filter);
    // Show only base items (T1) unless a specific tier is selected
    if (activeTier === 0) {
      list = list.filter(i => i.uuid === i.baseUuid);
    } else {
      list = list.filter(i => i.tier === activeTier);
    }
    if (activeProfession !== "All") {
      list = list.filter(i => i.craftedBy === activeProfession);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(i => i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q) || i.category.toLowerCase().includes(q));
    }
    return list;
  }, [osItems, activeTab, activeTier, activeProfession, searchQuery]);

  const filteredMaterials = useMemo(() => {
    if (activeTab !== "materials") return [];
    let list = [...osMaterials];
    if (activeTier > 0) list = list.filter(m => m.tier === activeTier);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(m => m.name.toLowerCase().includes(q));
    }
    return list;
  }, [osMaterials, activeTab, activeTier, searchQuery]);

  // Auto-select first item when filters change
  useEffect(() => {
    if (filteredItems.length > 0 && !filteredItems.find(i => i.uuid === selectedItem?.uuid)) {
      setSelectedItem(filteredItems[0]);
    }
  }, [filteredItems]);

  // ── Craft mutation (backend) ─────────────────────────────────────
  const craftMutation = useMutation({
    mutationFn: async (item: OSItem) => {
      const res = await fetch("/api/crafting-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          characterId: character!.id,
          recipeId: item.recipeUuid,
          itemUuid: item.uuid,
          quantity: 1,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Crafting failed");
      }
      return res.json();
    },
    onSuccess: (_data, item) => {
      toast({ title: "Crafting Started", description: `Now crafting ${item.name}` });
      queryClient.invalidateQueries({ queryKey: ["/api/crafting-jobs"] });
    },
    onError: (err: Error) => {
      toast({ title: "Craft Failed", description: err.message, variant: "destructive" });
    },
  });

  const collectMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const res = await fetch(`/api/crafting-jobs/${jobId}/collect`, {
        method: "POST",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Collect failed");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Collected!", description: "Item added to inventory" });
      queryClient.invalidateQueries({ queryKey: ["/api/crafting-jobs"] });
    },
  });

  // ── Unique professions from live data ─────────────────────────────
  const professions = useMemo(() => {
    const profs = new Set<string>();
    for (const r of osRecipes) profs.add(r.profession);
    return ["All", ...Array.from(profs).sort()];
  }, [osRecipes]);

  if (!authReady) return null;

  if (!character) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[60vh]">
          <Card className="bg-stone-900 border-stone-700 max-w-md">
            <CardContent className="pt-6 text-center space-y-4">
              <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
              <h2 className="text-xl font-bold text-stone-200">No Character Selected</h2>
              <p className="text-stone-400">
                Create or select a character to start crafting.
              </p>
              <Button
                onClick={() => (window.location.href = "/character")}
                className="bg-amber-600 hover:bg-amber-500"
              >
                Go to Characters
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // Get recipe for selected item
  const selectedRecipe = selectedItem ? findRecipeForItem(osRecipes, selectedItem.recipeUuid) : undefined;
  const tierVariants = selectedItem ? getTierVariants(osItems, selectedItem.baseUuid) : [];

  return (
    <Layout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-red-500">
              Crafting Station
            </h1>
            <p className="text-stone-400 text-sm">
              {character.name} — {totalItems} items from ObjectStore{osVersion ? ` v${osVersion}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {osLoading && <Loader2 className="w-4 h-4 animate-spin text-amber-400" />}
            <Badge className="bg-stone-800 text-stone-300 border-stone-600">
              <Package className="w-3 h-3 mr-1" />
              {totalItems} Items
            </Badge>
          </div>
        </div>

        {/* WCS 4-Tab Navigation */}
        <div className="flex gap-1 bg-stone-900/80 rounded-lg p-1 border border-stone-700/50">
          {WCS_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "ghost"}
                size="sm"
                onClick={() => { setActiveTab(tab.id); setActiveTier(0); setActiveProfession("All"); setSearchQuery(""); setSelectedItem(null); }}
                className={cn(
                  "flex-1 transition-all",
                  activeTab === tab.id
                    ? "bg-amber-900/60 text-amber-200 border border-amber-700/50"
                    : "text-stone-400 hover:text-stone-200",
                )}
              >
                <Icon className="w-4 h-4 mr-1.5" />
                {tab.label}
              </Button>
            );
          })}
        </div>

        {/* Filters row */}
        <div className="flex gap-2 items-center flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
            <Input
              placeholder={activeTab === "materials" ? "Search materials..." : "Search items..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-stone-900 border-stone-700 h-8 text-sm"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          {/* Profession filter */}
          {activeTab !== "materials" && (
            <div className="flex gap-1">
              {professions.map((p) => (
                <Button
                  key={p}
                  variant={activeProfession === p ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setActiveProfession(p)}
                  className={cn("h-8 text-xs", activeProfession === p && p !== "All" && PROFESSION_COLORS[p])}
                >
                  {p}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Tier filter */}
        <div className="flex gap-1 flex-wrap">
          <Button variant={activeTier === 0 ? "secondary" : "ghost"} size="sm" onClick={() => setActiveTier(0)} className="h-7 text-xs px-2">
            All Tiers
          </Button>
          {TIER_DEFS.map((td) => (
            <Button
              key={td.tier}
              variant={activeTier === td.tier ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveTier(td.tier)}
              className={cn("h-7 text-xs px-2", activeTier === td.tier && `${td.tw} ${td.twBorder}`)}
            >
              T{td.tier} {td.label}
            </Button>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
          {/* Left: Item / Material Grid */}
          <ScrollArea className="h-[calc(100vh-340px)] pr-2">
            {osLoading ? (
              <div className="text-center py-20 text-stone-500">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
                <p>Loading ObjectStore data...</p>
              </div>
            ) : activeTab === "materials" ? (
              /* Materials tab */
              filteredMaterials.length === 0 ? (
                <div className="text-center py-12 text-stone-500">
                  <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>No materials found.</p>
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredMaterials.map((mat) => {
                    const td = getTierDef(mat.tier);
                    return (
                      <div key={mat.uuid} className="bg-stone-900/80 border border-stone-700/60 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <img
                            src={resolveIconUrl(mat.iconUrl, { category: mat.category, name: mat.name })}
                            alt=""
                            className="w-8 h-8 rounded object-contain"
                            onError={(e) => iconOnError(e, { category: mat.category, name: mat.name })}
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-stone-200 truncate">{mat.name}</p>
                            <p className="text-xs text-stone-500">{mat.category}</p>
                          </div>
                          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 ml-auto shrink-0", td.tw, td.twBorder)}>T{mat.tier}</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              /* Items tab (Weapons / Armor / Consumables) */
              filteredItems.length === 0 ? (
                <div className="text-center py-12 text-stone-500">
                  <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>No items found.</p>
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {filteredItems.map((item) => {
                    const td = getTierDef(item.tier);
                    const isSelected = selectedItem?.uuid === item.uuid;
                    return (
                      <button
                        key={item.uuid}
                        onClick={() => setSelectedItem(item)}
                        className={cn(
                          "text-left rounded-lg border p-3 transition-all duration-150",
                          isSelected
                            ? "bg-stone-800 border-amber-600/60 ring-1 ring-amber-600/30"
                            : "bg-stone-900/80 border-stone-700/60 hover:border-stone-600",
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <img
                            src={resolveIconUrl(item.iconUrl, { category: item.category, type: item.type, name: item.name })}
                            alt={item.name}
                            className="w-10 h-10 rounded-lg border border-stone-700/50 bg-stone-800 object-contain"
                            onError={(e) => iconOnError(e, { category: item.category, type: item.type, name: item.name })}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm text-stone-200 truncate">{item.name}</p>
                            <p className="text-xs text-stone-500 truncate">{item.description}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", td.tw, td.twBorder)}>
                                T{item.tier} {td.label}
                              </Badge>
                              <span className="text-[10px] text-stone-500">{item.category}</span>
                              {item.craftedBy && <span className={cn("text-[10px]", PROFESSION_COLORS[item.craftedBy] || "text-stone-500")}>{item.craftedBy}</span>}
                            </div>
                          </div>
                        </div>
                        {/* Stat bar */}
                        <div className="flex gap-3 mt-2 text-[10px] text-stone-500">
                          <span>DMG {item.stats.damage}</span>
                          <span>SPD {item.stats.speed}</span>
                          <span>CRIT {item.stats.crit}%</span>
                          <span>DEF {item.stats.defense}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )
            )}
          </ScrollArea>

          {/* Right: Item Detail + Crafting Jobs */}
          <div className="space-y-4">
            {selectedItem ? (
              <Card className="bg-stone-900 border-stone-700">
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <img
                      src={resolveIconUrl(selectedItem.iconUrl, { category: selectedItem.category, type: selectedItem.type, name: selectedItem.name })}
                      alt=""
                      className="w-14 h-14 rounded-lg border border-stone-700/50 bg-stone-800 object-contain"
                      onError={(e) => iconOnError(e, { category: selectedItem.category, type: selectedItem.type, name: selectedItem.name })}
                    />
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-stone-200 text-lg">{selectedItem.name}</CardTitle>
                      <p className="text-xs text-stone-500 mt-1">{selectedItem.description}</p>
                      <Badge variant="outline" className={cn("mt-1", getTierDef(selectedItem.tier).tw, getTierDef(selectedItem.tier).twBorder)}>
                        T{selectedItem.tier} {getTierDef(selectedItem.tier).label}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Stats */}
                  <div className="grid grid-cols-5 gap-1.5 text-center">
                    {([
                      ["DMG", selectedItem.stats.damage],
                      ["SPD", selectedItem.stats.speed],
                      ["CRIT", `${selectedItem.stats.crit}%`],
                      ["BLK", selectedItem.stats.block],
                      ["DEF", selectedItem.stats.defense],
                    ] as [string, string | number][]).map(([label, val]) => (
                      <div key={label} className="bg-stone-800 rounded p-1.5">
                        <p className="text-[9px] text-stone-500 uppercase">{label}</p>
                        <p className="text-sm font-medium text-stone-200">{val}</p>
                      </div>
                    ))}
                  </div>

                  {/* Abilities */}
                  {selectedItem.abilities.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-stone-400 mb-1.5 uppercase tracking-wider">Abilities</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedItem.abilities.map((a) => (
                          <Badge key={a} variant="outline" className="text-[10px] border-stone-600 text-stone-300">{a}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Signature + Passives */}
                  {selectedItem.signature && (
                    <div className="bg-amber-950/20 rounded-lg p-2 border border-amber-800/30">
                      <p className="text-[10px] text-amber-500 uppercase tracking-wider">Signature</p>
                      <p className="text-sm text-amber-200 font-medium">{selectedItem.signature}</p>
                    </div>
                  )}
                  {selectedItem.passives.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-stone-400 mb-1 uppercase tracking-wider">Passives</p>
                      {selectedItem.passives.map((p) => (
                        <p key={p} className="text-xs text-stone-400">• {p}</p>
                      ))}
                    </div>
                  )}

                  <Separator className="bg-stone-700" />

                  {/* Recipe materials */}
                  {selectedRecipe && (
                    <div>
                      <p className="text-xs font-medium text-stone-400 mb-2 uppercase tracking-wider">Recipe Materials</p>
                      <div className="space-y-1.5">
                        {selectedRecipe.materials.map((mat) => (
                          <div key={mat.uuid} className="flex items-center justify-between rounded-md px-2.5 py-1.5 text-sm bg-stone-800/60">
                            <span className="text-stone-300">{mat.name}</span>
                            <span className="font-mono text-xs text-stone-400">×{mat.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tier variants */}
                  {tierVariants.length > 1 && (
                    <div>
                      <p className="text-xs font-medium text-stone-400 mb-1.5 uppercase tracking-wider">Tier Variants</p>
                      <div className="flex gap-1 flex-wrap">
                        {tierVariants.map((v) => {
                          const vtd = getTierDef(v.tier);
                          return (
                            <button
                              key={v.uuid}
                              onClick={() => setSelectedItem(v)}
                              className={cn(
                                "px-2 py-1 rounded text-xs border transition-all",
                                v.uuid === selectedItem.uuid
                                  ? `${vtd.tw} ${vtd.twBorder} bg-stone-800`
                                  : "border-stone-700 text-stone-500 hover:text-stone-300",
                              )}
                            >
                              T{v.tier}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Craft button */}
                  <Button
                    className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-40"
                    disabled={craftMutation.isPending}
                    onClick={() => craftMutation.mutate(selectedItem)}
                  >
                    {craftMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Starting...</>
                    ) : (
                      <><Hammer className="w-4 h-4 mr-2" />Craft {selectedItem.name}</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-stone-900 border-stone-700">
                <CardContent className="py-12 text-center text-stone-500">
                  <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Select an item to view details</p>
                </CardContent>
              </Card>
            )}

            {/* Active Crafting Jobs */}
            <Card className="bg-stone-900 border-stone-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-stone-300 text-sm flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-500" />
                  Active Crafts
                </CardTitle>
              </CardHeader>
              <CardContent>
                {craftingJobs.length === 0 ? (
                  <p className="text-xs text-stone-500 text-center py-4">No active crafting jobs</p>
                ) : (
                  <div className="space-y-2">
                    <AnimatePresence>
                      {craftingJobs.map((job) => {
                        const progress = jobProgress(job);
                        const done = progress >= 100;
                        return (
                          <motion.div key={job.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="bg-stone-800 rounded-lg p-2.5 border border-stone-700/50">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-sm text-stone-200 font-medium truncate">{job.recipeId}</span>
                              {done ? (
                                <Button size="sm" className="h-6 text-xs bg-green-700 hover:bg-green-600" onClick={() => collectMutation.mutate(job.id)} disabled={collectMutation.isPending}>
                                  <CheckCircle className="w-3 h-3 mr-1" />Collect
                                </Button>
                              ) : (
                                <span className="text-xs text-amber-400 font-mono">{formatTimeRemaining(job.completesAt)}</span>
                              )}
                            </div>
                            <Progress value={progress} className="h-1.5" />
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
