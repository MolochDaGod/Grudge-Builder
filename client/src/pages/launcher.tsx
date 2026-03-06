import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

// ============================================
// API HELPERS
// ============================================

async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "API error");
  return data.data;
}

// ============================================
// TYPES
// ============================================

interface Game {
  id: string;
  name: string;
  engine: string;
  projectPath: string;
  description?: string;
  hasNodeModules: boolean;
  scripts?: Record<string, string>;
}

interface Asset {
  id: string;
  name: string;
  category: string;
  filePath: string;
  extension: string;
  sizeBytes: number;
  sourceDir: string;
}

interface AssetStats {
  byCategory: Record<string, number>;
  bySource: Record<string, number>;
  totalSize: number;
  totalCount: number;
}

interface AnimModel {
  id: string;
  name: string;
  paper: string;
  year: number;
  description: string;
  category: string;
  framework: string;
  githubUrl: string;
  demoAvailable: boolean;
}

interface AnimMapping {
  grudgeAction: string;
  ai4animModel: string;
  description: string;
  applicableClasses: string[];
}

interface DraftUnit {
  id: number;
  race: string;
  classId: string;
  name: string;
  baseStrength: number;
  synergies: string[];
}

interface DraftRecommendation {
  action: { unitId: number; roleId: number };
  unit: DraftUnit;
  role: string;
  qValue: number;
  reasoning: string;
}

interface Tool {
  id: string;
  name: string;
  description: string;
  path: string | null;
  installed: boolean;
  category: string;
}

// ============================================
// ENGINE BADGES
// ============================================

const ENGINE_COLORS: Record<string, string> = {
  gdevelop: "bg-green-600",
  godot: "bg-blue-600",
  threejs: "bg-purple-600",
  phaser: "bg-orange-600",
  "vite-web": "bg-yellow-600",
  html5: "bg-red-600",
  unknown: "bg-gray-600",
};

const CATEGORY_ICONS: Record<string, string> = {
  "2d-sprite": "🎨",
  "3d-model": "🧊",
  "ui-kit": "🖼️",
  font: "🔤",
  audio: "🔊",
  script: "📜",
  animation: "🎬",
  texture: "🗺️",
};

// ============================================
// GAME LIBRARY TAB
// ============================================

function GameLibrary() {
  const { toast } = useToast();

  const { data: games, isLoading } = useQuery<Game[]>({
    queryKey: ["/api/launcher/games"],
    queryFn: () => fetchApi("/api/launcher/games"),
  });

  const launchMutation = useMutation({
    mutationFn: (gameId: string) =>
      fetchApi("/api/launcher/launch", {
        method: "POST",
        body: JSON.stringify({ gameId }),
      }),
    onSuccess: (data: any) => {
      toast({
        title: "Launch Config Ready",
        description: `Run: ${data.launchCommand}`,
      });
    },
  });

  if (isLoading) return <div className="p-4 text-muted-foreground">Scanning for games...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {games?.map((game) => (
        <Card key={game.id} className="bg-card/50 border-border/50 hover:border-primary/30 transition-colors">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{game.name}</CardTitle>
              <Badge className={`${ENGINE_COLORS[game.engine] || ENGINE_COLORS.unknown} text-white text-xs`}>
                {game.engine}
              </Badge>
            </div>
            {game.description && (
              <CardDescription className="text-xs line-clamp-2">{game.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground truncate mb-3" title={game.projectPath}>
              {game.projectPath}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => launchMutation.mutate(game.id)}
                disabled={launchMutation.isPending}
                className="flex-1"
              >
                Launch
              </Button>
              {!game.hasNodeModules && game.scripts && (
                <Badge variant="outline" className="text-xs self-center">
                  needs install
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
      {(!games || games.length === 0) && (
        <p className="text-muted-foreground col-span-full text-center py-8">
          No game projects found. Run a scan first.
        </p>
      )}
    </div>
  );
}

// ============================================
// ASSET BROWSER TAB
// ============================================

function AssetBrowser() {
  const [category, setCategory] = useState<string>("all");
  const [search, setSearch] = useState("");

  const params = new URLSearchParams();
  if (category !== "all") params.set("category", category);
  if (search) params.set("q", search);
  params.set("limit", "50");

  const { data, isLoading } = useQuery<{ data: Asset[]; pagination: any }>({
    queryKey: ["/api/launcher/assets", category, search],
    queryFn: async () => {
      const res = await fetch(`/api/launcher/assets?${params}`);
      return res.json();
    },
  });

  const { data: statsData } = useQuery({
    queryKey: ["/api/launcher/assets/stats"],
    queryFn: () => fetchApi<AssetStats>("/api/launcher/assets/stats"),
  });

  const assets = data?.data || [];

  return (
    <div className="p-4 space-y-4">
      {/* Stats bar */}
      {statsData && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(statsData.byCategory).map(([cat, count]) => (
            <Badge
              key={cat}
              variant={category === cat ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setCategory(category === cat ? "all" : cat)}
            >
              {CATEGORY_ICONS[cat] || "📁"} {cat}: {count}
            </Badge>
          ))}
          <Badge variant="secondary">
            Total: {statsData.totalCount} ({(statsData.totalSize / 1024 / 1024).toFixed(0)} MB)
          </Badge>
        </div>
      )}

      {/* Search */}
      <Input
        placeholder="Search assets..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {/* Asset list */}
      <ScrollArea className="h-[500px]">
        {isLoading ? (
          <p className="text-muted-foreground">Loading assets...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {assets.map((asset: Asset) => (
              <div
                key={asset.id}
                className="flex items-center gap-3 p-2 rounded-md bg-card/30 hover:bg-card/60 border border-border/30"
              >
                <span className="text-lg">{CATEGORY_ICONS[asset.category] || "📁"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{asset.name}{asset.extension}</p>
                  <p className="text-xs text-muted-foreground truncate">{asset.filePath}</p>
                </div>
                <Badge variant="outline" className="text-xs shrink-0">
                  {(asset.sizeBytes / 1024).toFixed(0)} KB
                </Badge>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

// ============================================
// AI ANIMATIONS HUB TAB
// ============================================

function AIAnimationsHub() {
  const { data: status } = useQuery({
    queryKey: ["/api/launcher/ai-animations"],
    queryFn: () => fetchApi<any>("/api/launcher/ai-animations"),
  });

  const { data: mappings } = useQuery<AnimMapping[]>({
    queryKey: ["/api/launcher/ai-animations/mappings"],
    queryFn: () => fetchApi("/api/launcher/ai-animations/mappings"),
  });

  const models: AnimModel[] = status?.models || [];

  return (
    <div className="p-4 space-y-4">
      {/* Status */}
      <Card className="bg-card/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">AI4Animation Integration</CardTitle>
          <CardDescription>
            Neural network-based character animation models from{" "}
            <a href="https://github.com/sebastianstarke/AI4Animation" target="_blank" rel="noreferrer" className="text-primary underline">
              sebastianstarke/AI4Animation
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Badge variant={status?.localRepoAvailable ? "default" : "secondary"}>
              {status?.localRepoAvailable ? "Local Repo Available" : "Remote Reference Only"}
            </Badge>
            <Badge variant="outline">{models.length} Models</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Models */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {models.map((model) => (
          <Card key={model.id} className="bg-card/30 border-border/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{model.name}</CardTitle>
                <Badge variant="outline" className="text-xs">{model.paper}</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs text-muted-foreground mb-2">{model.description}</p>
              <div className="flex gap-1 flex-wrap">
                <Badge variant="secondary" className="text-xs">{model.category}</Badge>
                <Badge variant="secondary" className="text-xs">{model.framework}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Grudge Mappings */}
      {mappings && mappings.length > 0 && (
        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Grudge Warlords Animation Mappings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {mappings.map((m, i) => (
                <div key={i} className="flex items-start gap-3 p-2 bg-card/30 rounded-md">
                  <Badge className="shrink-0">{m.grudgeAction}</Badge>
                  <div>
                    <p className="text-sm">{m.description}</p>
                    <div className="flex gap-1 mt-1">
                      {m.applicableClasses.map((c) => (
                        <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================
// DRAFT SIMULATOR TAB
// ============================================

function DraftSimulator() {
  const [draftState, setDraftState] = useState<any>(null);
  const { toast } = useToast();

  const { data: units } = useQuery<DraftUnit[]>({
    queryKey: ["/api/launcher/draft/units"],
    queryFn: () => fetchApi("/api/launcher/draft/units"),
  });

  const recommendMutation = useMutation({
    mutationFn: () =>
      fetchApi<DraftRecommendation[]>("/api/launcher/draft/recommend", {
        method: "POST",
        body: JSON.stringify({ state: draftState, topN: 6 }),
      }),
  });

  const pickMutation = useMutation({
    mutationFn: (action: { unitId: number; roleId: number }) =>
      fetchApi("/api/launcher/draft/pick", {
        method: "POST",
        body: JSON.stringify({ state: draftState, action }),
      }),
    onSuccess: (newState: any) => {
      setDraftState(newState);
      recommendMutation.mutate();
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: (team: any[]) =>
      fetchApi("/api/launcher/draft/analyze", {
        method: "POST",
        body: JSON.stringify({ team }),
      }),
  });

  const recommendations = recommendMutation.data || [];
  const roles = ["Tank", "DPS", "Healer", "Support", "Flex"];

  const handleStartDraft = () => {
    setDraftState(null);
    recommendMutation.mutate();
  };

  return (
    <div className="p-4 space-y-4">
      <Card className="bg-card/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Crew Draft Simulator</CardTitle>
              <CardDescription>
                AI-powered crew composition analysis adapted from SwainBot's RL draft system
              </CardDescription>
            </div>
            <Button onClick={handleStartDraft} size="sm">
              {draftState ? "Reset" : "Start Draft"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Current draft state */}
          {draftState && (
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <h4 className="text-sm font-semibold mb-2">Team A</h4>
                {draftState.teamA?.map((a: any, i: number) => {
                  const unit = units?.find((u) => u.id === a.unitId);
                  return (
                    <Badge key={i} className="mr-1 mb-1">
                      {unit?.race} {unit?.classId} → {roles[a.roleId]}
                    </Badge>
                  );
                })}
                {(!draftState.teamA || draftState.teamA.length === 0) && (
                  <p className="text-xs text-muted-foreground">No picks yet</p>
                )}
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-2">Team B</h4>
                {draftState.teamB?.map((a: any, i: number) => {
                  const unit = units?.find((u) => u.id === a.unitId);
                  return (
                    <Badge key={i} variant="secondary" className="mr-1 mb-1">
                      {unit?.race} {unit?.classId} → {roles[a.roleId]}
                    </Badge>
                  );
                })}
                {(!draftState.teamB || draftState.teamB.length === 0) && (
                  <p className="text-xs text-muted-foreground">No picks yet</p>
                )}
              </div>
            </div>
          )}

          {/* Turn indicator */}
          {draftState && (
            <Badge variant="outline" className="mb-3">
              Turn {draftState.turnNumber + 1} — Team {draftState.currentTeam || "A"} picks
            </Badge>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">AI Recommendations</h4>
              {recommendations.map((rec, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-2 bg-card/30 rounded-md hover:bg-card/60 cursor-pointer border border-border/30"
                  onClick={() => pickMutation.mutate(rec.action)}
                >
                  <span className="text-lg font-bold text-primary w-6">#{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex gap-1 items-center">
                      <Badge variant="outline" className="text-xs">{rec.unit.race}</Badge>
                      <Badge className="text-xs">{rec.unit.classId}</Badge>
                      <span className="text-xs text-muted-foreground">→</span>
                      <Badge variant="secondary" className="text-xs">{rec.role}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{rec.reasoning}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-primary">{rec.qValue.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">Q-value</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Analyze button */}
          {draftState && draftState.teamA?.length >= 2 && (
            <div className="mt-4">
              <Button
                size="sm"
                variant="outline"
                onClick={() => analyzeMutation.mutate(draftState.teamA)}
              >
                Analyze Team A
              </Button>
              {analyzeMutation.data && (() => {
                const analysis = analyzeMutation.data as Record<string, any>;
                return (
                  <div className="mt-2 p-3 bg-card/30 rounded-md">
                    <div className="flex gap-2 mb-2">
                      <Badge>Rating: {analysis.overallRating}</Badge>
                      <Badge variant="outline">Synergy: {analysis.synergyScore}</Badge>
                      <Badge variant="outline">Balance: {analysis.balanceScore}</Badge>
                    </div>
                    {(analysis.strengths as string[])?.map((s: string, i: number) => (
                      <Badge key={i} className="mr-1 mb-1 bg-green-600/20 text-green-400 border-green-600/30">
                        + {s}
                      </Badge>
                    ))}
                    {(analysis.weaknesses as string[])?.map((w: string, i: number) => (
                      <Badge key={i} className="mr-1 mb-1 bg-red-600/20 text-red-400 border-red-600/30">
                        - {w}
                      </Badge>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unit Pool reference */}
      <Card className="bg-card/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Unit Pool ({units?.length || 0} units)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1">
            {units?.map((u) => (
              <Badge key={u.id} variant="outline" className="text-xs">
                {u.race}-{u.classId} ({u.baseStrength})
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// TOOLS TAB
// ============================================

function ToolsPanel() {
  const { data: tools } = useQuery<Tool[]>({
    queryKey: ["/api/launcher/tools"],
    queryFn: () => fetchApi("/api/launcher/tools"),
  });

  const TOOL_ICONS: Record<string, string> = {
    art: "🎨",
    engine: "⚙️",
    platform: "🚀",
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4">
      {tools?.map((tool) => (
        <Card key={tool.id} className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{TOOL_ICONS[tool.category] || "🔧"}</span>
              <div className="flex-1">
                <h3 className="font-semibold text-sm">{tool.name}</h3>
                <p className="text-xs text-muted-foreground">{tool.description}</p>
              </div>
              <Badge variant={tool.installed ? "default" : "secondary"}>
                {tool.installed ? "Available" : "Not Found"}
              </Badge>
            </div>
            {tool.path && (
              <p className="text-xs text-muted-foreground mt-2 truncate" title={tool.path}>
                {tool.path}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============================================
// STORAGE TAB
// ============================================

function StoragePanel() {
  const { data: syncStatus } = useQuery({
    queryKey: ["/api/launcher/sync/status"],
    queryFn: () => fetchApi<any>("/api/launcher/sync/status"),
    refetchInterval: 5000,
  });

  const stats = syncStatus?.stats;

  return (
    <div className="p-4 space-y-4">
      <Card className="bg-card/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Object Storage Sync</CardTitle>
          <CardDescription>
            Sync local assets to cloud storage (Google Cloud Storage)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats ? (
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-400">{stats.synced}</p>
                  <p className="text-xs text-muted-foreground">Synced</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-400">{stats.pending + stats.syncing}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-400">{stats.errors}</p>
                  <p className="text-xs text-muted-foreground">Errors</p>
                </div>
              </div>
              {stats.total > 0 && (
                <Progress value={(stats.synced / stats.total) * 100} className="h-2" />
              )}
              <p className="text-xs text-muted-foreground">
                Total tracked: {(stats.totalSizeBytes / 1024 / 1024).toFixed(1)} MB
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No assets have been synced yet. Use the Asset Browser to select assets for cloud sync.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// MAIN LAUNCHER PAGE
// ============================================

export default function LauncherPage() {
  const { toast } = useToast();

  const scanMutation = useMutation({
    mutationFn: () => fetchApi<any>("/api/launcher/scan?fresh=true"),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/launcher"] });
      toast({
        title: "Scan Complete",
        description: `Found ${data.assetCount} assets and ${data.gameCount} games in ${(data.scanDuration / 1000).toFixed(1)}s`,
      });
    },
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">
                Grudge Studio Games Engine
              </h1>
              <p className="text-sm text-muted-foreground">
                Launcher &middot; Asset Browser &middot; AI Tools &middot; Draft Simulator
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => scanMutation.mutate()}
                disabled={scanMutation.isPending}
              >
                {scanMutation.isPending ? "Scanning..." : "Scan Drives"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => window.location.href = "/home"}>
                Back to Home
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="container mx-auto px-4 py-4">
        <Tabs defaultValue="games" className="w-full">
          <TabsList className="grid w-full grid-cols-6 mb-4">
            <TabsTrigger value="games">Game Library</TabsTrigger>
            <TabsTrigger value="assets">Asset Browser</TabsTrigger>
            <TabsTrigger value="ai-anim">AI Animations</TabsTrigger>
            <TabsTrigger value="draft">Draft Sim</TabsTrigger>
            <TabsTrigger value="storage">Storage</TabsTrigger>
            <TabsTrigger value="tools">Tools</TabsTrigger>
          </TabsList>

          <TabsContent value="games">
            <GameLibrary />
          </TabsContent>

          <TabsContent value="assets">
            <AssetBrowser />
          </TabsContent>

          <TabsContent value="ai-anim">
            <AIAnimationsHub />
          </TabsContent>

          <TabsContent value="draft">
            <DraftSimulator />
          </TabsContent>

          <TabsContent value="storage">
            <StoragePanel />
          </TabsContent>

          <TabsContent value="tools">
            <ToolsPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
