import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Play, Pause, RefreshCw, Search, AlertCircle, CheckCircle } from "lucide-react";
import SpriteAnimator, { SpriteAction } from "@/components/SpriteAnimator";
import DirectionalSprite, { Direction, SpriteState, DungeonHeroSprite, DungeonMonsterSprite } from "@/components/DirectionalSprite";
import { SPRITE_MANIFEST, getSpriteUnit, AnimationState } from "@/lib/spriteManifest";

const ACTIONS: SpriteAction[] = ["Idle", "Walk", "Walk2", "Run", "Attack", "Attack2", "Attack3", "Cast", "Heal", "Hurt", "Death", "Block"];
const DIRECTIONS: Direction[] = ["down", "left", "right", "up"];
const DIRECTIONAL_STATES: SpriteState[] = ["idle", "walk", "attack", "hurt", "cast"];

type SpriteCategory = "grudge" | "vampire" | "satyr" | "shinobi" | "werewolf" | "knight" | "fantasy" | "dungeon";

interface SpriteStatus {
  id: string;
  name: string;
  category: SpriteCategory;
  working: boolean;
  errors: string[];
  availableActions: string[];
}

function categorizeSpriteId(id: string): SpriteCategory {
  const lower = id.toLowerCase();
  if (lower.includes("vampire") || lower.includes("countess") || lower.includes("converted")) return "vampire";
  if (lower.includes("satyr")) return "satyr";
  if (lower.includes("shinobi") || lower.includes("samurai") || lower.includes("fighter")) return "shinobi";
  if (lower.includes("werewolf") || lower.includes("worge")) return "werewolf";
  if (lower.includes("knight_")) return "knight";
  if (lower.includes("fire_spirit") || lower.includes("plent") || lower.includes("fantasy_skeleton")) return "fantasy";
  
  const grudgeSprites = [
    "archer", "armored axeman", "armored orc", "armored skeleton", "elite orc",
    "greatsword skeleton", "knight", "knight templar", "lancer", "orc", "orc rider",
    "priest", "skeleton", "skeleton archer", "slime", "soldier", "swordsman",
    "werebear", "werewolf", "wizard"
  ];
  if (grudgeSprites.some(s => lower === s)) return "grudge";
  
  return "grudge";
}

export default function SpriteViewerPage() {
  const [selectedAction, setSelectedAction] = useState<SpriteAction>("Idle");
  const [selectedDirection, setSelectedDirection] = useState<Direction>("down");
  const [selectedDirectionalState, setSelectedDirectionalState] = useState<SpriteState>("idle");
  const [isPaused, setIsPaused] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<SpriteCategory | "all">("all");
  const [spriteStatuses, setSpriteStatuses] = useState<Record<string, SpriteStatus>>({});
  const [scale, setScale] = useState(1);

  const allSpriteIds = Object.keys(SPRITE_MANIFEST);
  
  const filteredSprites = allSpriteIds.filter(id => {
    const unit = getSpriteUnit(id);
    const matchesSearch = unit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || categorizeSpriteId(id) === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categoryCounts: Record<SpriteCategory | "all", number> = {
    all: allSpriteIds.length,
    grudge: allSpriteIds.filter(id => categorizeSpriteId(id) === "grudge").length,
    vampire: allSpriteIds.filter(id => categorizeSpriteId(id) === "vampire").length,
    satyr: allSpriteIds.filter(id => categorizeSpriteId(id) === "satyr").length,
    shinobi: allSpriteIds.filter(id => categorizeSpriteId(id) === "shinobi").length,
    werewolf: allSpriteIds.filter(id => categorizeSpriteId(id) === "werewolf").length,
    knight: allSpriteIds.filter(id => categorizeSpriteId(id) === "knight").length,
    fantasy: allSpriteIds.filter(id => categorizeSpriteId(id) === "fantasy").length,
    dungeon: 0,
  };

  const handleSpriteError = (spriteId: string, actionName: string) => {
    setSpriteStatuses(prev => ({
      ...prev,
      [spriteId]: {
        ...prev[spriteId],
        working: false,
        errors: [...(prev[spriteId]?.errors || []), actionName],
      }
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="outline" size="sm" data-testid="button-back">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-amber-400" style={{ fontFamily: "Cinzel, serif" }}>
              Sprite Animation Viewer
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-amber-400 border-amber-400/50">
              {allSpriteIds.length} Sprites
            </Badge>
          </div>
        </div>

        <Tabs defaultValue="manifest" className="space-y-4">
          <TabsList className="bg-slate-800 border border-amber-500/30">
            <TabsTrigger value="manifest" data-testid="tab-manifest">
              Manifest Sprites ({allSpriteIds.length})
            </TabsTrigger>
            <TabsTrigger value="dungeon" data-testid="tab-dungeon">
              Dungeon Sprites
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manifest" className="space-y-4">
            {/* Controls */}
            <Card className="bg-slate-800/80 border-amber-500/30">
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Search sprites..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-48 bg-slate-900/50 border-slate-600"
                      data-testid="input-search"
                    />
                  </div>
                  
                  <Select value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as SpriteCategory | "all")}>
                    <SelectTrigger className="w-40 bg-slate-900/50 border-slate-600" data-testid="select-category">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All ({categoryCounts.all})</SelectItem>
                      <SelectItem value="grudge">Grudge RPG ({categoryCounts.grudge})</SelectItem>
                      <SelectItem value="vampire">Vampires ({categoryCounts.vampire})</SelectItem>
                      <SelectItem value="satyr">Satyrs ({categoryCounts.satyr})</SelectItem>
                      <SelectItem value="shinobi">Shinobi ({categoryCounts.shinobi})</SelectItem>
                      <SelectItem value="werewolf">Werewolves ({categoryCounts.werewolf})</SelectItem>
                      <SelectItem value="knight">Knights ({categoryCounts.knight})</SelectItem>
                      <SelectItem value="fantasy">Fantasy ({categoryCounts.fantasy})</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={selectedAction} onValueChange={(v) => setSelectedAction(v as SpriteAction)}>
                    <SelectTrigger className="w-32 bg-slate-900/50 border-slate-600" data-testid="select-action">
                      <SelectValue placeholder="Action" />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTIONS.map(action => (
                        <SelectItem key={action} value={action}>{action}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={scale.toString()} onValueChange={(v) => setScale(parseFloat(v))}>
                    <SelectTrigger className="w-24 bg-slate-900/50 border-slate-600" data-testid="select-scale">
                      <SelectValue placeholder="Scale" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.5">0.5x</SelectItem>
                      <SelectItem value="1">1x</SelectItem>
                      <SelectItem value="1.5">1.5x</SelectItem>
                      <SelectItem value="2">2x</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsPaused(!isPaused)}
                    data-testid="button-pause"
                  >
                    {isPaused ? <Play className="w-4 h-4 mr-1" /> : <Pause className="w-4 h-4 mr-1" />}
                    {isPaused ? "Play" : "Pause"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Sprite Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredSprites.map(spriteId => {
                const unit = getSpriteUnit(spriteId);
                const category = categorizeSpriteId(spriteId);
                const hasAction = unit.animations[selectedAction.toLowerCase() as AnimationState];
                
                return (
                  <Card 
                    key={spriteId}
                    className={`bg-slate-800/60 border ${hasAction ? 'border-slate-600' : 'border-red-500/50'}`}
                    data-testid={`card-sprite-${spriteId.replace(/\s+/g, '-')}`}
                  >
                    <CardHeader className="p-2 pb-1">
                      <CardTitle className="text-xs text-slate-300 truncate" title={unit.name}>
                        {unit.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-2 pt-0">
                      <div className="flex flex-col items-center">
                        <div 
                          className="bg-slate-900/50 rounded flex items-center justify-center p-2"
                          style={{ minHeight: unit.frameHeight * scale + 16 }}
                        >
                          {hasAction ? (
                            <SpriteAnimator
                              spriteSet={spriteId}
                              action={selectedAction}
                              scale={scale}
                              paused={isPaused}
                            />
                          ) : (
                            <div className="flex flex-col items-center text-slate-500 text-xs">
                              <AlertCircle className="w-6 h-6 mb-1" />
                              No {selectedAction}
                            </div>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-1 flex-wrap justify-center">
                          <Badge variant="outline" className="text-[10px] px-1 py-0">
                            {unit.frameWidth}x{unit.frameHeight}
                          </Badge>
                          <Badge 
                            variant="outline" 
                            className={`text-[10px] px-1 py-0 ${category === 'grudge' ? 'border-amber-500/50 text-amber-400' : 'border-purple-500/50 text-purple-400'}`}
                          >
                            {category}
                          </Badge>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-0.5 justify-center">
                          {ACTIONS.map(action => {
                            const available = unit.animations[action.toLowerCase() as AnimationState];
                            return (
                              <div 
                                key={action}
                                className={`w-2 h-2 rounded-full ${available ? 'bg-green-500' : 'bg-slate-600'}`}
                                title={`${action}: ${available ? 'Available' : 'Missing'}`}
                              />
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {filteredSprites.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                No sprites found matching your criteria
              </div>
            )}
          </TabsContent>

          <TabsContent value="dungeon" className="space-y-4">
            {/* Dungeon Sprites Controls */}
            <Card className="bg-slate-800/80 border-amber-500/30">
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-4 items-center">
                  <Select value={selectedDirection} onValueChange={(v) => setSelectedDirection(v as Direction)}>
                    <SelectTrigger className="w-32 bg-slate-900/50 border-slate-600" data-testid="select-direction">
                      <SelectValue placeholder="Direction" />
                    </SelectTrigger>
                    <SelectContent>
                      {DIRECTIONS.map(dir => (
                        <SelectItem key={dir} value={dir}>{dir.charAt(0).toUpperCase() + dir.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={selectedDirectionalState} onValueChange={(v) => setSelectedDirectionalState(v as SpriteState)}>
                    <SelectTrigger className="w-32 bg-slate-900/50 border-slate-600" data-testid="select-state">
                      <SelectValue placeholder="State" />
                    </SelectTrigger>
                    <SelectContent>
                      {DIRECTIONAL_STATES.map(state => (
                        <SelectItem key={state} value={state}>{state.charAt(0).toUpperCase() + state.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Dungeon Heroes */}
            <Card className="bg-slate-800/80 border-amber-500/30">
              <CardHeader>
                <CardTitle className="text-amber-400">Dungeon Heroes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex flex-col items-center p-4 bg-slate-900/50 rounded">
                    <DungeonHeroSprite
                      direction={selectedDirection}
                      state={selectedDirectionalState}
                      scale={2}
                      hasSword={false}
                    />
                    <span className="text-xs text-slate-400 mt-2">Hero (Unarmed)</span>
                    <Badge variant="outline" className="mt-1 text-[10px]">48x64</Badge>
                  </div>
                  <div className="flex flex-col items-center p-4 bg-slate-900/50 rounded">
                    <DungeonHeroSprite
                      direction={selectedDirection}
                      state={selectedDirectionalState}
                      scale={2}
                      hasSword={true}
                    />
                    <span className="text-xs text-slate-400 mt-2">Hero (Sword)</span>
                    <Badge variant="outline" className="mt-1 text-[10px]">47x63</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dungeon Monsters */}
            <Card className="bg-slate-800/80 border-amber-500/30">
              <CardHeader>
                <CardTitle className="text-amber-400">Dungeon Monsters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {(["monsters1", "monsters2", "slimes", "mushroom"] as const).map(monsterSheet => (
                    <div key={monsterSheet} className="flex flex-col items-center p-4 bg-slate-900/50 rounded">
                      <DungeonMonsterSprite
                        monsterSheet={monsterSheet}
                        direction={selectedDirection}
                        state={selectedDirectionalState}
                        scale={2}
                      />
                      <span className="text-xs text-slate-400 mt-2 capitalize">{monsterSheet}</span>
                      <Badge variant="outline" className="mt-1 text-[10px]">48x64</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Animation Legend */}
            <Card className="bg-slate-800/80 border-slate-600">
              <CardHeader>
                <CardTitle className="text-slate-300 text-sm">Directional Sprite Format</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-400">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-slate-300 mb-2">6-Frame Layout (48x64)</h4>
                    <ul className="space-y-1">
                      <li>• Row 0: Down (frames 0-5)</li>
                      <li>• Row 1: Left (frames 0-5)</li>
                      <li>• Row 2: Right (frames 0-5)</li>
                      <li>• Row 3: Up (frames 0-5)</li>
                      <li className="text-slate-500">Walk: 0-2, Attack: 3-5</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-300 mb-2">4-Frame Layout (47x63)</h4>
                    <ul className="space-y-1">
                      <li>• Row 0: Down (frames 0-3)</li>
                      <li>• Row 1: Left (frames 0-3)</li>
                      <li>• Row 2: Right (frames 0-3)</li>
                      <li>• Row 3: Up (frames 0-3)</li>
                      <li className="text-slate-500">All actions use full row</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Statistics Summary */}
        <Card className="mt-6 bg-slate-800/80 border-amber-500/30">
          <CardHeader>
            <CardTitle className="text-amber-400 text-sm">Animation Coverage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
              {ACTIONS.map(action => {
                const count = allSpriteIds.filter(id => 
                  getSpriteUnit(id).animations[action.toLowerCase() as AnimationState]
                ).length;
                const percentage = Math.round((count / allSpriteIds.length) * 100);
                return (
                  <div key={action} className="text-center p-2 bg-slate-900/50 rounded">
                    <div className="text-xs text-slate-400">{action}</div>
                    <div className={`text-lg font-bold ${percentage === 100 ? 'text-green-400' : percentage > 50 ? 'text-amber-400' : 'text-red-400'}`}>
                      {percentage}%
                    </div>
                    <div className="text-[10px] text-slate-500">{count}/{allSpriteIds.length}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
