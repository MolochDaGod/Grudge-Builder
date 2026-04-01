import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import SpriteAnimator, { SpriteAction } from "@/components/SpriteAnimator";
import { RACES, CLASSES } from "@/lib/gameData";
import { ITEMS, GrudaItem, resolveItemImage } from "@/lib/grudaDB";
import { motion, AnimatePresence } from "framer-motion";
import { SpriteInspectorPopup } from "@/components/SpriteInspectorPopup";
import { 
  Search, Wand2, Palette, Download, RefreshCw, Zap, Flame, Snowflake, Skull, Shield, Swords,
  FolderOpen, Image, Play, Pause, ChevronRight, Bot, MessageSquare, Sparkles, Settings,
  Database, FileImage, Layers, Grid3X3, LayoutDashboard, Send, Loader2, Cloud, Upload, CloudUpload, FileText, Table,
  MousePointer, Trash2, Copy
} from "lucide-react";
import { DataSpreadsheet } from "@/components/DataSpreadsheet";
import { getCacheStats, clearObjectStoreCache, prefetchCoreData } from "@/lib/objectStoreApi";
import { assetUrl, OBJECT_STORE_BASE, OBJECT_STORE_API, ASSET_CDN_BASE, OBJECT_STORE_VERSION } from "@/lib/assetConfig";
import { 
  MINIWORLD_BUILDINGS, 
  MINIWORLD_MONSTERS, 
  MINIWORLD_NATURE, 
  MINIWORLD_OBJECTS, 
  MINIWORLD_SOLDIERS, 
  MINIWORLD_CHAMPIONS, 
  MINIWORLD_TILESETS,
  ORC_ISLAND_BUILDINGS,
  ORC_ISLAND_DECORATION
} from "@/lib/miniworldTileset";

interface SpriteCategory {
  id: string;
  name: string;
  path: string;
  count: number;
  subcategories?: string[];
}

const SPRITE_CATEGORIES: SpriteCategory[] = [
  { id: "heroes", name: "Hero Characters", path: assetUrl("/sprites/heroes"), count: 6, subcategories: ["human", "orc", "elf", "dwarf", "barbarian", "undead"] },
  { id: "enemies", name: "Enemy Sprites", path: assetUrl("/sprites/enemies"), count: 30, subcategories: ["vampire", "fantasy", "satyr", "shinobi", "werewolf", "knight"] },
  { id: "rpg", name: "RPG Characters", path: assetUrl("/sprites/rpg"), count: 40, subcategories: ["Archer", "Knight", "Wizard", "Skeleton", "Orc", "Slime"] },
  { id: "2dassets", name: "2D Asset Packs", path: assetUrl("/sprites/2dassets"), count: 500, subcategories: ["icons", "weapons", "armor", "enemies", "chibi"] },
  { id: "magic", name: "Magic Effects", path: assetUrl("/sprites/magic"), count: 50, subcategories: ["fire", "water", "ice", "lightning"] },
  { id: "spells", name: "Spell Animations", path: assetUrl("/sprites/spells"), count: 12, subcategories: ["fire-arrow", "fire-ball", "fire-spell", "water-arrow", "water-ball", "water-spell"] },
  { id: "ui", name: "UI Elements", path: assetUrl("/sprites/ui"), count: 100, subcategories: ["buttons", "frames", "icons"] },
  { id: "topdown", name: "Top-Down Sprites", path: assetUrl("/sprites/topdown"), count: 80, subcategories: ["goblin", "animals", "characters"] },
  { id: "gear", name: "Equipment & Gear", path: assetUrl("/sprites/gear"), count: 200, subcategories: ["weapons", "armor", "accessories"] },
];

const SPELL_EFFECTS = [
  { id: "fire-arrow", name: "Fire Arrow", path: assetUrl("/sprites/spells/fire-arrow"), frames: 8, icon: assetUrl("/sprites/spells/icons/fire-arrow.png") },
  { id: "fire-ball", name: "Fire Ball", path: assetUrl("/sprites/spells/fire-ball"), frames: 8, icon: assetUrl("/sprites/spells/icons/fire-ball.png") },
  { id: "fire-spell", name: "Fire Spell", path: assetUrl("/sprites/spells/fire-spell"), frames: 8, icon: assetUrl("/sprites/spells/icons/fire-spell.png") },
  { id: "water-arrow", name: "Water Arrow", path: assetUrl("/sprites/spells/water-arrow"), frames: 8, icon: assetUrl("/sprites/spells/icons/water-arrow.png") },
  { id: "water-ball", name: "Water Ball", path: assetUrl("/sprites/spells/water-ball"), frames: 12, icon: assetUrl("/sprites/spells/icons/water-ball.png") },
  { id: "water-spell", name: "Water Spell", path: assetUrl("/sprites/spells/water-spell"), frames: 8, icon: assetUrl("/sprites/spells/icons/water-spell.png") },
];

const CATEGORY_SPRITE_MAP: Record<string, string[]> = {
  heroes: ["Soldier", "Swordsman", "Archer", "Priest", "Wizard", "Knight", "Lancer", "Knight Templar"],
  enemies: ["Vampire_Girl", "Converted_Vampire", "Countess_Vampire", "Satyr_1", "Satyr_2", "Satyr_3", 
            "Black_Werewolf", "Red_Werewolf", "White_Werewolf", "Shinobi", "Samurai", "Fighter",
            "Armored Orc", "Elite Orc", "Orc", "Orc rider", "Slime", "Werebear", "Werewolf"],
  rpg: ["Archer", "Armored Axeman", "Armored Orc", "Armored Skeleton", "Elite Orc", "Greatsword Skeleton", 
        "Knight", "Knight Templar", "Lancer", "Orc", "Orc rider", "Priest", "Skeleton", "Skeleton Archer",
        "Slime", "Soldier", "Swordsman", "Werebear", "Werewolf", "Wizard"],
  "2dassets": ["Fire_Spirit", "Plent", "Fantasy_Skeleton"],
  magic: ["Fire_Spirit", "Wizard", "Priest"],
  spells: ["spell:fire-arrow", "spell:fire-ball", "spell:fire-spell", "spell:water-arrow", "spell:water-ball", "spell:water-spell"],
  topdown: ["Slime", "Orc", "Skeleton", "Archer"],
  gear: [],
  ui: [],
};

const SPELL_ID_TO_EFFECT = SPELL_EFFECTS.reduce((acc, spell) => {
  acc[`spell:${spell.id}`] = spell;
  return acc;
}, {} as Record<string, typeof SPELL_EFFECTS[0]>);

const ALL_CHARACTER_SPRITES = [
  "Archer", "Armored Axeman", "Armored Orc", "Armored Skeleton",
  "Elite Orc", "Greatsword Skeleton", "Knight", "Knight Templar",
  "Lancer", "Orc", "Orc rider", "Priest", "Skeleton", "Skeleton Archer",
  "Slime", "Soldier", "Swordsman", "Werebear", "Werewolf", "Wizard",
  "Vampire_Girl", "Converted_Vampire", "Countess_Vampire",
  "Satyr_1", "Satyr_2", "Satyr_3", "Shinobi", "Samurai", "Fighter",
  "Black_Werewolf", "Red_Werewolf", "White_Werewolf",
  "Knight_1", "Knight_2", "Knight_3",
  "Fire_Spirit", "Plent", "Fantasy_Skeleton"
];

const ALL_SPELL_SPRITES = SPELL_EFFECTS.map(s => `spell:${s.id}`);

const ALL_SPRITE_SETS = [...ALL_CHARACTER_SPRITES, ...ALL_SPELL_SPRITES];

const SPRITE_ACTIONS: SpriteAction[] = ["Idle", "Attack", "Hurt", "Cast", "Death", "Walk", "Run", "Block"];

const COLOR_PRESETS = [
  { name: "Original", hue: 0, saturation: 100, brightness: 100 },
  { name: "Fire", hue: 20, saturation: 150, brightness: 110 },
  { name: "Ice", hue: 200, saturation: 120, brightness: 110 },
  { name: "Poison", hue: 120, saturation: 130, brightness: 100 },
  { name: "Shadow", hue: 270, saturation: 50, brightness: 70 },
  { name: "Gold", hue: 45, saturation: 180, brightness: 120 },
  { name: "Blood", hue: 0, saturation: 200, brightness: 80 },
  { name: "Electric", hue: 60, saturation: 200, brightness: 150 },
];

interface ActivityItem {
  id: string;
  type: "scan" | "export" | "manifest" | "inspect" | "analyze" | "system";
  message: string;
  timestamp: Date;
  color: string;
}

interface PackageStats {
  totalPackages: number;
  totalAnimations: number;
  totalFrames: number;
  totalSheets: number;
}

interface OverviewDashboardProps {
  onNavigateToLibrary: (categoryPath?: string) => void;
}

function OverviewDashboard({ onNavigateToLibrary }: OverviewDashboardProps) {
  const [stats, setStats] = useState<PackageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [categories, setCategories] = useState<Array<{ name: string; path: string; packageCount: number }>>([]);

  const addActivity = useCallback((type: ActivityItem["type"], message: string, color: string) => {
    const newActivity: ActivityItem = {
      id: Date.now().toString(),
      type,
      message,
      timestamp: new Date(),
      color
    };
    setActivities(prev => [newActivity, ...prev].slice(0, 20));
  }, []);

  useEffect(() => {
    fetch("/api/sprites/packages")
      .then(res => res.json())
      .then(data => {
        setStats(data.stats);
        const cats = data.categories.map((cat: { name: string; path: string; packages: unknown[] }) => ({
          name: cat.name,
          path: cat.path,
          packageCount: cat.packages.length
        }));
        setCategories(cats);
        setLoading(false);
        addActivity("system", `Dashboard loaded - ${data.stats.totalPackages} packages, ${data.stats.totalAnimations} animations`, "bg-green-500");
      })
      .catch(err => {
        console.error("Error loading stats:", err);
        setLoading(false);
        addActivity("system", "Failed to load sprite statistics", "bg-red-500");
      });
  }, [addActivity]);

  const handleScanSprites = async () => {
    setActionLoading("scan");
    addActivity("scan", "Starting sprite scan...", "bg-blue-500");
    try {
      const res = await fetch("/api/sprites/scan");
      const data = await res.json();
      addActivity("scan", `Scan complete - found ${data.length} sprite files`, "bg-green-500");
    } catch (err) {
      addActivity("scan", "Sprite scan failed", "bg-red-500");
    }
    setActionLoading(null);
  };

  const handleGenerateManifest = async () => {
    setActionLoading("manifest");
    addActivity("manifest", "Generating sprite manifest...", "bg-purple-500");
    try {
      const res = await fetch("/api/sprites/generate-manifest");
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "sprite-manifest.json";
      a.click();
      URL.revokeObjectURL(url);
      addActivity("manifest", `Manifest generated with ${data.sprites?.length || 0} entries`, "bg-green-500");
    } catch (err) {
      addActivity("manifest", "Failed to generate manifest", "bg-red-500");
    }
    setActionLoading(null);
  };

  const escapeCsvField = (value: string): string => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const handleExportCatalog = async () => {
    setActionLoading("export");
    addActivity("export", "Exporting asset catalog...", "bg-amber-500");
    try {
      const res = await fetch("/api/sprites/packages");
      const data = await res.json();
      const rows: string[] = ["Category,Package,Animations,Frames"];
      for (const cat of data.categories) {
        for (const pkg of cat.packages) {
          rows.push(`${escapeCsvField(cat.name)},${escapeCsvField(pkg.name)},${pkg.animations.length},${pkg.totalFrames}`);
        }
      }
      const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "sprite-catalog.csv";
      a.click();
      URL.revokeObjectURL(url);
      addActivity("export", `Catalog exported - ${data.stats.totalPackages} packages`, "bg-green-500");
    } catch (err) {
      addActivity("export", "Failed to export catalog", "bg-red-500");
    }
    setActionLoading(null);
  };

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const statItems = [
    { label: "Sprite Packages", value: stats?.totalPackages || 0, icon: FolderOpen, color: "text-amber-400" },
    { label: "Animations", value: stats?.totalAnimations || 0, icon: Play, color: "text-green-400" },
    { label: "Total Frames", value: stats?.totalFrames || 0, icon: Image, color: "text-blue-400" },
    { label: "Sprite Sheets", value: stats?.totalSheets || 0, icon: Grid3X3, color: "text-purple-400" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statItems.map((stat) => (
          <Card key={stat.label} className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-slate-900 ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white" data-testid={`stat-${stat.label.toLowerCase().replace(/\s+/g, "-")}`}>
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : stat.value.toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-400">{stat.label}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-amber-400" />
              Sprite Categories
            </CardTitle>
            <CardDescription>Click to browse in Sprite Library</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : categories.length > 0 ? (
                categories.map((cat) => (
                  <div
                    key={cat.path}
                    onClick={() => onNavigateToLibrary(cat.path)}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 hover:bg-slate-900 transition-colors cursor-pointer group"
                    data-testid={`category-${cat.name.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <div className="flex items-center gap-3">
                      <FileImage className="w-4 h-4 text-slate-400 group-hover:text-amber-400 transition-colors" />
                      <span className="text-slate-200">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{cat.packageCount} packages</Badge>
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-slate-400 py-4">No categories found</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              Quick Actions
            </CardTitle>
            <CardDescription>Common sprite management tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2" 
              data-testid="btn-scan-sprites"
              onClick={handleScanSprites}
              disabled={actionLoading === "scan"}
            >
              {actionLoading === "scan" ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Scan All Sprites
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2" 
              data-testid="btn-browse-library"
              onClick={() => onNavigateToLibrary()}
            >
              <FileImage className="w-4 h-4" />
              Browse Sprite Library
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2" 
              data-testid="btn-generate-manifest"
              onClick={handleGenerateManifest}
              disabled={actionLoading === "manifest"}
            >
              {actionLoading === "manifest" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
              Generate Sprite Manifest
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2" 
              data-testid="btn-export-catalog"
              onClick={handleExportCatalog}
              disabled={actionLoading === "export"}
            >
              {actionLoading === "export" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Export Asset Catalog (CSV)
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white">Recent Activity</CardTitle>
          {activities.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setActivities([])} data-testid="btn-clear-activity">
              Clear
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <div className="text-center text-slate-400 py-4 text-sm">
              No recent activity. Actions you perform will appear here.
            </div>
          ) : (
            <div className="space-y-2 text-sm max-h-[200px] overflow-auto">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-center gap-2 text-slate-400">
                  <div className={`w-2 h-2 rounded-full ${activity.color}`} />
                  <span>{activity.message}</span>
                  <span className="ml-auto text-slate-500 whitespace-nowrap">{formatTimeAgo(activity.timestamp)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-green-400" />
              Database Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-sm text-slate-300">Connected</span>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white flex items-center gap-2">
              <Cloud className="w-4 h-4 text-blue-400" />
              Object Storage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-sm text-slate-300">Available</span>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white flex items-center gap-2">
              <Bot className="w-4 h-4 text-purple-400" />
              AI Assistant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-sm text-slate-300">Ready</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Animation types for sprite sheet labeling
const ANIMATION_TYPES = [
  "idle", "walk", "run", "jump", "slide", "roll",
  "attack01", "attack02", "attack03", 
  "cast01", "cast02",
  "hurt", "death", "victory",
  "effect", "spell"
] as const;

type AnimationType = typeof ANIMATION_TYPES[number];

interface SpriteLabel {
  x: number;
  y: number;
  number: number;
  animationType: AnimationType;
}

function SpriteAnnotator() {
  const [selectedAnimation, setSelectedAnimation] = useState<AnimationType>("idle");
  const [labels, setLabels] = useState<SpriteLabel[]>([]);
  const [nextNumber, setNextNumber] = useState(1);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new window.Image();
        img.onload = () => {
          setImageSize({ width: img.width, height: img.height });
        };
        img.src = event.target?.result as string;
        setUploadedImage(event.target?.result as string);
        setLabels([]);
        setNextNumber(1);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!uploadedImage || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const scrollLeft = containerRef.current.scrollLeft;
    const scrollTop = containerRef.current.scrollTop;
    // Account for scroll position to get correct coordinates on the image
    const x = e.clientX - rect.left + scrollLeft;
    const y = e.clientY - rect.top + scrollTop;
    
    // Left click - add label
    if (e.button === 0) {
      setLabels(prev => [...prev, { x, y, number: nextNumber, animationType: selectedAnimation }]);
      setNextNumber(prev => prev + 1);
    }
  };
  
  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!uploadedImage) return;
    
    // Right click - remove last label and decrement
    if (labels.length > 0) {
      setLabels(prev => prev.slice(0, -1));
      setNextNumber(prev => Math.max(1, prev - 1));
    }
  };
  
  const clearLabels = () => {
    setLabels([]);
    setNextNumber(1);
  };
  
  const exportLabels = () => {
    const grouped: Record<string, Array<{ frame: number; x: number; y: number }>> = {};
    labels.forEach(label => {
      if (!grouped[label.animationType]) {
        grouped[label.animationType] = [];
      }
      grouped[label.animationType].push({ frame: label.number, x: label.x, y: label.y });
    });
    
    const data = JSON.stringify(grouped, null, 2);
    navigator.clipboard.writeText(data);
  };
  
  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center gap-2">
          <MousePointer className="w-5 h-5 text-cyan-400" />
          Sprite Sheet Annotator
        </CardTitle>
        <CardDescription>
          Select animation type, then left-click to place numbered labels. Right-click to undo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {ANIMATION_TYPES.map(anim => (
            <Button
              key={anim}
              size="sm"
              variant={selectedAnimation === anim ? "default" : "outline"}
              onClick={() => {
                setSelectedAnimation(anim);
                // Calculate next number based on existing labels for this animation type
                const existingLabels = labels.filter(l => l.animationType === anim);
                const maxNumber = existingLabels.length > 0 
                  ? Math.max(...existingLabels.map(l => l.number)) 
                  : 0;
                setNextNumber(maxNumber + 1);
              }}
              className={`text-xs h-7 ${
                selectedAnimation === anim 
                  ? "bg-cyan-600 hover:bg-cyan-700" 
                  : "border-slate-600 hover:border-cyan-500"
              }`}
              data-testid={`btn-anim-${anim}`}
            >
              {anim}
            </Button>
          ))}
        </div>
        
        <div className="flex items-center gap-2">
          <Input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="flex-1"
            data-testid="input-sprite-upload"
          />
          <Button 
            variant="outline" 
            size="sm" 
            onClick={clearLabels}
            disabled={labels.length === 0}
            data-testid="btn-clear-labels"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Clear
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={exportLabels}
            disabled={labels.length === 0}
            data-testid="btn-export-labels"
          >
            <Copy className="w-4 h-4 mr-1" />
            Copy JSON
          </Button>
        </div>
        
        <div className="flex items-center gap-4 text-sm">
          <Badge variant="outline" className="border-cyan-500 text-cyan-400">
            Mode: {selectedAnimation}
          </Badge>
          <Badge variant="outline" className="border-amber-500 text-amber-400">
            Next: #{nextNumber}
          </Badge>
          <Badge variant="outline" className="border-slate-500 text-slate-400">
            Labels: {labels.length}
          </Badge>
        </div>
        
        <div 
          ref={containerRef}
          className="relative bg-slate-900 rounded-lg overflow-auto max-h-[400px] border border-slate-700 cursor-crosshair"
          onClick={handleCanvasClick}
          onContextMenu={handleContextMenu}
        >
          {uploadedImage ? (
            <>
              <img 
                src={uploadedImage} 
                alt="Sprite Sheet" 
                className="max-w-none"
                style={{ imageRendering: "pixelated" }}
                draggable={false}
              />
              {labels.map((label, i) => (
                <div
                  key={i}
                  className="absolute w-6 h-6 -ml-3 -mt-3 rounded-full flex items-center justify-center text-xs font-bold border-2 shadow-lg"
                  style={{ 
                    left: label.x, 
                    top: label.y,
                    backgroundColor: label.animationType.includes("attack") ? "#ef4444" :
                      label.animationType.includes("cast") ? "#8b5cf6" :
                      label.animationType === "idle" ? "#22c55e" :
                      label.animationType === "walk" || label.animationType === "run" ? "#3b82f6" :
                      label.animationType === "death" || label.animationType === "hurt" ? "#f97316" :
                      "#06b6d4",
                    borderColor: "white",
                    color: "white"
                  }}
                  title={`${label.animationType} #${label.number}`}
                >
                  {label.number}
                </div>
              ))}
            </>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-500">
              <div className="text-center">
                <Upload className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Upload a sprite sheet to annotate</p>
              </div>
            </div>
          )}
        </div>
        
        {labels.length > 0 && (
          <div className="text-xs text-slate-400 space-y-1 max-h-24 overflow-auto">
            <p className="font-medium text-slate-300">Labels:</p>
            {Object.entries(
              labels.reduce((acc, l) => {
                if (!acc[l.animationType]) acc[l.animationType] = [];
                acc[l.animationType].push(l.number);
                return acc;
              }, {} as Record<string, number[]>)
            ).map(([anim, nums]) => (
              <p key={anim}>
                <span className="text-cyan-400">{anim}:</span> frames {nums.join(", ")}
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AIAssistant() {
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([
    { role: "assistant", content: "Hello! I'm your AI Sprite Assistant. I can help you:\n\n• Find sprites by description\n• Organize sprite folders\n• Identify animation frames\n• Suggest sprite combinations\n• Generate sprite metadata\n\nWhat would you like help with?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    setTimeout(() => {
      let response = "";
      const lowerInput = userMessage.toLowerCase();
      
      if (lowerInput.includes("hero") || lowerInput.includes("character")) {
        response = `I found hero sprites in /sprites/heroes/ organized by race:\n\n• **Human** - walk, death, attack, magic animations\n• **Orc** - aggressive combat animations\n• **Elf** - graceful movement animations\n• **Dwarf** - sturdy combat stances\n• **Barbarian** - powerful attack sequences\n• **Undead** - eerie movement patterns\n\nEach race has 4 animation states. Would you like me to preview any specific race?`;
      } else if (lowerInput.includes("enemy") || lowerInput.includes("monster")) {
        response = `Enemy sprites are located in /sprites/enemies/ and /sprites/rpg/:\n\n**Vampire Pack**: Vampire_Girl, Converted_Vampire, Countess_Vampire\n**Werewolf Pack**: Black_Werewolf, Red_Werewolf, White_Werewolf\n**Knight Pack**: Knight_1, Knight_2, Knight_3\n**Satyr Pack**: Satyr_1, Satyr_2, Satyr_3\n**Undead**: Skeleton, Skeleton Archer, Fantasy_Skeleton\n\nEach has 7 animation states: Idle, Walk, Attack, Hurt, Cast, Victory, Death`;
      } else if (lowerInput.includes("organize") || lowerInput.includes("sort")) {
        response = `I can help organize your sprites! Here's my recommended structure:\n\n📁 **/sprites**\n├── 📁 characters/ (hero sprites by race)\n├── 📁 enemies/ (monster sprites by type)\n├── 📁 effects/ (magic, combat VFX)\n├── 📁 icons/ (UI, items, skills)\n├── 📁 environment/ (tiles, backgrounds)\n└── 📁 ui/ (buttons, frames, HUD)\n\nWant me to generate a migration script?`;
      } else if (lowerInput.includes("animation") || lowerInput.includes("frame")) {
        response = `Most sprite sheets follow these animation conventions:\n\n**Standard Actions (7 states)**:\n1. Idle - 4-10 frames, looping\n2. Walk - 6-8 frames, looping\n3. Attack - 4-6 frames, single play\n4. Hurt - 2-3 frames, single play\n5. Cast - 4-6 frames, single play\n6. Death - 6-10 frames, single play\n7. Victory - 4-6 frames, looping\n\n**Frame Dimensions**: Most are 64x64, 100x100, or 128x128 pixels\n**Format**: PNG with transparency`;
      } else {
        response = `I can help with that! Here are some things I can do:\n\n• Search: "Find all fire spell effects"\n• Organize: "How should I structure my sprites?"\n• Preview: "Show me werewolf animations"\n• Analyze: "What animations does the Knight have?"\n• Generate: "Create metadata for 2D assets"\n\nJust describe what you need!`;
      }
      
      setMessages(prev => [...prev, { role: "assistant", content: response }]);
      setIsLoading(false);
    }, 1000);
  }, [input, isLoading]);

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card className="bg-slate-800/50 border-slate-700 flex flex-col h-[600px]">
        <CardHeader className="border-b border-slate-700 shrink-0">
          <CardTitle className="text-white flex items-center gap-2">
            <Bot className="w-5 h-5 text-purple-400" />
            AI Sprite Assistant
          </CardTitle>
          <CardDescription>Ask questions about sprites, animations, and organization</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-0 min-h-0">
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg p-3 ${
                      msg.role === "user"
                        ? "bg-purple-600 text-white"
                        : "bg-slate-700 text-slate-200"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-700 rounded-lg p-3">
                    <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
          <div className="p-4 border-t border-slate-700 shrink-0">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Ask about sprites..."
                className="flex-1"
                data-testid="input-ai-chat"
              />
              <Button onClick={handleSend} disabled={isLoading} data-testid="btn-send-ai">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <SpriteAnnotator />
    </div>
  );
}

type ViewMode = 'static' | 'fade' | 'motion' | 'zoom' | 'pulse';
type SpriteAssetCategory = 'buildings' | 'orc_islands' | 'monsters' | 'soldiers' | 'champions' | 'nature' | 'objects' | 'tilesets';

interface MiniWorldAsset {
  id: string;
  name: string;
  imagePath: string;
  category: SpriteAssetCategory;
  subcategory?: string;
}

function MiniWorldViewer() {
  const [category, setCategory] = useState<SpriteAssetCategory>('buildings');
  const [viewMode, setViewMode] = useState<ViewMode>('static');
  const [selectedAsset, setSelectedAsset] = useState<MiniWorldAsset | null>(null);
  const [zoom, setZoom] = useState(4);
  const [showGrid, setShowGrid] = useState(true);
  const [animPhase, setAnimPhase] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const allAssets = useMemo((): MiniWorldAsset[] => {
    const assets: MiniWorldAsset[] = [];
    
    Object.entries(MINIWORLD_BUILDINGS || {}).forEach(([id, data]) => {
      assets.push({ id, name: data.name, imagePath: data.imagePath, category: 'buildings' });
    });
    Object.entries(ORC_ISLAND_BUILDINGS || {}).forEach(([id, data]) => {
      assets.push({ id, name: data.name, imagePath: data.imagePath, category: 'orc_islands', subcategory: data.category });
    });
    Object.entries(ORC_ISLAND_DECORATION || {}).forEach(([id, data]) => {
      assets.push({ id, name: data.name, imagePath: data.imagePath, category: 'orc_islands', subcategory: 'decoration' });
    });
    Object.entries(MINIWORLD_MONSTERS || {}).forEach(([id, data]) => {
      assets.push({ id, name: data.name, imagePath: data.imagePath, category: 'monsters' });
    });
    Object.entries(MINIWORLD_SOLDIERS || {}).forEach(([id, data]) => {
      assets.push({ id, name: data.name, imagePath: data.imagePath, category: 'soldiers' });
    });
    Object.entries(MINIWORLD_CHAMPIONS || {}).forEach(([id, data]) => {
      assets.push({ id, name: data.name, imagePath: data.imagePath, category: 'champions' });
    });
    Object.entries(MINIWORLD_NATURE || {}).forEach(([id, data]) => {
      assets.push({ id, name: data.name, imagePath: data.imagePath, category: 'nature' });
    });
    Object.entries(MINIWORLD_OBJECTS || {}).forEach(([id, data]) => {
      assets.push({ id, name: data.name, imagePath: data.imagePath, category: 'objects' });
    });
    Object.entries(MINIWORLD_TILESETS || {}).forEach(([id, data]) => {
      assets.push({ id, name: data.name, imagePath: data.groundImage, category: 'tilesets' });
    });
    
    return assets;
  }, []);

  const filteredAssets = useMemo(() => {
    let list = allAssets.filter(a => a.category === category);
    if (searchTerm) {
      list = list.filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase()) || a.id.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return list;
  }, [allAssets, category, searchTerm]);

  useEffect(() => {
    if (filteredAssets.length > 0 && !selectedAsset) {
      setSelectedAsset(filteredAssets[0]);
    }
  }, [filteredAssets, selectedAsset]);

  useEffect(() => {
    if (selectedAsset) {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => setLoadedImage(img);
      img.onerror = () => setLoadedImage(null);
      img.src = selectedAsset.imagePath;
    }
  }, [selectedAsset]);

  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setAnimPhase(p => (p + 0.05) % (Math.PI * 2));
    }, 50);
    return () => clearInterval(interval);
  }, [isAnimating]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !loadedImage) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const imgWidth = loadedImage.width * zoom;
      const imgHeight = loadedImage.height * zoom;
      
      canvas.width = Math.max(imgWidth + 100, 400);
      canvas.height = Math.max(imgHeight + 100, 300);
      
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      if (showGrid) {
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        const gridSize = 16 * zoom;
        for (let x = 0; x <= canvas.width; x += gridSize) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
          ctx.stroke();
        }
        for (let y = 0; y <= canvas.height; y += gridSize) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();
        }
      }
      
      ctx.save();
      
      let offsetX = (canvas.width - imgWidth) / 2;
      let offsetY = (canvas.height - imgHeight) / 2;
      let alpha = 1;
      let scale = 1;
      
      switch (viewMode) {
        case 'fade':
          alpha = 0.5 + Math.sin(animPhase) * 0.5;
          break;
        case 'motion':
          offsetX += Math.sin(animPhase) * 20;
          offsetY += Math.cos(animPhase * 0.7) * 10;
          break;
        case 'zoom':
          scale = 1 + Math.sin(animPhase) * 0.3;
          break;
        case 'pulse':
          scale = 1 + Math.sin(animPhase * 2) * 0.1;
          alpha = 0.7 + Math.sin(animPhase * 3) * 0.3;
          break;
      }
      
      ctx.globalAlpha = alpha;
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      ctx.translate(centerX, centerY);
      ctx.scale(scale, scale);
      ctx.translate(-centerX, -centerY);
      
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(loadedImage, offsetX, offsetY, imgWidth, imgHeight);
      
      ctx.restore();
      
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px monospace';
      ctx.fillText(`${loadedImage.width}x${loadedImage.height}px @ ${zoom}x`, 10, canvas.height - 10);
    };
    
    render();
  }, [loadedImage, zoom, showGrid, viewMode, animPhase]);

  const categoryInfo: Record<SpriteAssetCategory, { icon: typeof Layers; color: string; label: string }> = {
    buildings: { icon: Layers, color: 'text-amber-400', label: 'Buildings' },
    orc_islands: { icon: Flame, color: 'text-red-500', label: 'Orc Islands' },
    monsters: { icon: Skull, color: 'text-red-400', label: 'Monsters' },
    soldiers: { icon: Swords, color: 'text-cyan-400', label: 'Soldiers' },
    champions: { icon: Shield, color: 'text-purple-400', label: 'Champions' },
    nature: { icon: Snowflake, color: 'text-green-400', label: 'Nature' },
    objects: { icon: Grid3X3, color: 'text-orange-400', label: 'Objects' },
    tilesets: { icon: LayoutDashboard, color: 'text-blue-400', label: 'Tilesets' }
  };

  const viewModes: { mode: ViewMode; label: string; description: string }[] = [
    { mode: 'static', label: 'Static', description: 'No animation' },
    { mode: 'fade', label: 'Fade', description: 'Fade in/out' },
    { mode: 'motion', label: 'Motion', description: 'Float movement' },
    { mode: 'zoom', label: 'Zoom', description: 'Scale pulsing' },
    { mode: 'pulse', label: 'Pulse', description: 'Combined effects' }
  ];

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 space-y-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              MiniWorld Assets
            </CardTitle>
            <CardDescription>Browse and preview 16x16 tile sprites</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search assets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-miniworld-search"
              />
            </div>
            
            <div className="flex flex-wrap gap-1">
              {(Object.keys(categoryInfo) as SpriteAssetCategory[]).map(cat => {
                const info = categoryInfo[cat];
                const Icon = info.icon;
                const count = allAssets.filter(a => a.category === cat).length;
                return (
                  <Button
                    key={cat}
                    size="sm"
                    variant={category === cat ? 'default' : 'outline'}
                    onClick={() => {
                      setCategory(cat);
                      setSelectedAsset(null);
                    }}
                    className="gap-1 text-xs px-2"
                    data-testid={`btn-category-${cat}`}
                  >
                    <Icon className={`w-3 h-3 ${category === cat ? 'text-white' : info.color}`} />
                    {info.label}
                    <Badge variant="secondary" className="ml-1 text-[10px] px-1">{count}</Badge>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-0">
            <ScrollArea className="h-[350px]">
              <div className="p-2 grid grid-cols-2 gap-2">
                {filteredAssets.map((asset) => (
                  <motion.div
                    key={asset.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <button
                      onClick={() => setSelectedAsset(asset)}
                      className={`w-full text-left rounded-lg p-2 border transition-all ${
                        selectedAsset?.id === asset.id
                          ? 'bg-purple-600/50 border-purple-500'
                          : 'bg-slate-700/50 border-slate-600 hover:bg-slate-700'
                      }`}
                      data-testid={`asset-${asset.id}`}
                    >
                      <div className="h-12 flex items-center justify-center bg-slate-800 rounded mb-1 overflow-hidden">
                        <img
                          src={asset.imagePath}
                          alt={asset.name}
                          className="max-h-full max-w-full object-contain"
                          style={{ imageRendering: 'pixelated' }}
                          loading="lazy"
                        />
                      </div>
                      <p className="text-xs text-slate-300 truncate">{asset.name}</p>
                      <p className="text-[10px] text-slate-500 truncate">{asset.id}</p>
                    </button>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
      
      <div className="lg:col-span-2 space-y-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white">
                  {selectedAsset?.name || 'Select an asset'}
                </CardTitle>
                <CardDescription>
                  {selectedAsset ? `ID: ${selectedAsset.id}` : 'Choose from the list'}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={isAnimating ? 'default' : 'outline'}
                  onClick={() => setIsAnimating(!isAnimating)}
                  data-testid="btn-toggle-animation"
                >
                  {isAnimating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
                <Button
                  size="sm"
                  variant={showGrid ? 'default' : 'outline'}
                  onClick={() => setShowGrid(!showGrid)}
                  data-testid="btn-toggle-grid"
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                {selectedAsset && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedAsset.imagePath);
                    }}
                    data-testid="btn-copy-path"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-900 rounded-lg flex items-center justify-center overflow-hidden border border-slate-700">
              <canvas
                ref={canvasRef}
                className="max-w-full"
                style={{ imageRendering: 'pixelated' }}
                data-testid="canvas-sprite-preview"
              />
            </div>
          </CardContent>
        </Card>
        
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm">View Mode</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {viewModes.map(({ mode, label, description }) => (
                  <Button
                    key={mode}
                    size="sm"
                    variant={viewMode === mode ? 'default' : 'outline'}
                    onClick={() => setViewMode(mode)}
                    className="flex-col h-auto py-2"
                    data-testid={`btn-viewmode-${mode}`}
                  >
                    <span>{label}</span>
                    <span className="text-[10px] opacity-60">{description}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm">Zoom: {zoom}x</CardTitle>
            </CardHeader>
            <CardContent>
              <Slider
                value={[zoom]}
                onValueChange={([v]) => setZoom(v)}
                min={1}
                max={8}
                step={1}
                className="my-4"
                data-testid="slider-zoom"
              />
              <div className="flex justify-between text-xs text-slate-400">
                <span>1x (16px)</span>
                <span>4x (64px)</span>
                <span>8x (128px)</span>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {selectedAsset && (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm">Asset Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-400">Category</p>
                  <p className="text-white capitalize">{selectedAsset.category.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-slate-400">Asset ID</p>
                  <p className="text-white font-mono">{selectedAsset.id}</p>
                </div>
                {selectedAsset.subcategory && (
                  <div>
                    <p className="text-slate-400">Type</p>
                    <p className="text-white capitalize">{selectedAsset.subcategory}</p>
                  </div>
                )}
                <div className="col-span-2">
                  <p className="text-slate-400">Path</p>
                  <p className="text-white font-mono text-xs break-all">{selectedAsset.imagePath}</p>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-slate-700">
                <p className="text-slate-400 text-sm mb-2">Usage Code</p>
                <div className="bg-slate-900 rounded p-3 font-mono text-xs text-green-400 overflow-x-auto">
                  <pre>{selectedAsset.category === 'orc_islands' 
                    ? (selectedAsset.subcategory === 'decoration' 
                      ? `// Import orc island decorations
import { ORC_ISLAND_DECORATION } from '@/lib/miniworldTileset';

// Reference the decoration by name
const decor = ORC_ISLAND_DECORATION['${selectedAsset.id}'];
// Path: ${selectedAsset.imagePath}`
                      : `// Import orc island buildings
import { ORC_ISLAND_BUILDINGS } from '@/lib/miniworldTileset';

// Reference the building
const building = ORC_ISLAND_BUILDINGS['${selectedAsset.id}'];
// Category: ${selectedAsset.subcategory}
// Path: ${selectedAsset.imagePath}`)
                    : `// Import in island component
import { MINIWORLD_BUILDINGS } from '@/lib/miniworldTileset';
import { assetUrl } from "@/lib/assetConfig";

// Reference the asset
const building = MINIWORLD_BUILDINGS['${selectedAsset.id}'];
// Path: ${selectedAsset.imagePath}`}</pre>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function SpriteManager() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSprite, setSelectedSprite] = useState<string>(ALL_SPRITE_SETS[0]);
  const [action, setAction] = useState<SpriteAction>("Idle");
  const [scale, setScale] = useState(2);
  const [playing, setPlaying] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedColorPreset, setSelectedColorPreset] = useState(COLOR_PRESETS[0]);

  const isSpellSelected = selectedSprite.startsWith("spell:");
  const selectedSpellEffect = isSpellSelected ? SPELL_ID_TO_EFFECT[selectedSprite] : null;
  const characterSpriteForPreview = isSpellSelected ? ALL_CHARACTER_SPRITES[0] : selectedSprite;
  
  const getDisplayName = (sprite: string) => {
    if (sprite.startsWith("spell:")) {
      return SPELL_ID_TO_EFFECT[sprite]?.name || sprite.replace("spell:", "");
    }
    return sprite;
  };

  const filteredSprites = useMemo(() => {
    if (selectedCategory === "spells") {
      const spellSprites = CATEGORY_SPRITE_MAP.spells || [];
      if (searchTerm) {
        return spellSprites.filter(s => getDisplayName(s).toLowerCase().includes(searchTerm.toLowerCase()));
      }
      return spellSprites;
    }
    
    let sprites = [...ALL_SPRITE_SETS];
    
    if (selectedCategory !== "all") {
      const categorySprites = CATEGORY_SPRITE_MAP[selectedCategory];
      if (categorySprites && categorySprites.length > 0) {
        sprites = sprites.filter(s => categorySprites.includes(s));
      }
    }
    
    if (searchTerm) {
      sprites = sprites.filter(s => s.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return sprites;
  }, [searchTerm, selectedCategory]);
  
  const categoryHasNoSprites = selectedCategory !== "all" && 
    selectedCategory !== "spells" &&
    CATEGORY_SPRITE_MAP[selectedCategory]?.length === 0;

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-1 space-y-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">Sprite Browser</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search sprites..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-sprites"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {SPRITE_CATEGORIES.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              <div className="p-2 space-y-1">
                {categoryHasNoSprites ? (
                  <div className="p-4 text-center text-slate-400 text-sm">
                    <FileImage className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No animated sprites in this category.</p>
                    <p className="text-xs mt-1">These assets are static images.</p>
                  </div>
                ) : filteredSprites.length === 0 ? (
                  <div className="p-4 text-center text-slate-400 text-sm">
                    No sprites match your search.
                  </div>
                ) : (
                  filteredSprites.map((sprite) => (
                    <button
                      key={sprite}
                      onClick={() => setSelectedSprite(sprite)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                        selectedSprite === sprite
                          ? "bg-purple-600 text-white"
                          : "text-slate-300 hover:bg-slate-700"
                      }`}
                      data-testid={`sprite-${sprite.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      {sprite.startsWith("spell:") && SPELL_ID_TO_EFFECT[sprite]?.icon && (
                        <img src={SPELL_ID_TO_EFFECT[sprite].icon} alt="" className="w-5 h-5" onError={(e) => e.currentTarget.style.display = 'none'} />
                      )}
                      {getDisplayName(sprite)}
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <div className="md:col-span-2 space-y-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                {isSpellSelected && selectedSpellEffect?.icon && (
                  <img src={selectedSpellEffect.icon} alt="" className="w-6 h-6" onError={(e) => e.currentTarget.style.display = 'none'} />
                )}
                {getDisplayName(selectedSprite)}
                {isSpellSelected && <Badge className="bg-amber-600 text-xs">Spell Effect</Badge>}
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPlaying(!playing)}
                  data-testid="btn-play-pause"
                >
                  {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
                <Button size="sm" variant="outline" data-testid="btn-export-sprite">
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-900 rounded-lg h-[300px] flex items-center justify-center overflow-hidden">
              {isSpellSelected && selectedSpellEffect ? (
                <SpellEffectAnimator spell={selectedSpellEffect} scale={scale * 2} />
              ) : (
                <SpriteAnimator 
                  spriteSet={selectedSprite} 
                  action={action} 
                  scale={scale}
                  paused={!playing}
                  customTint={selectedColorPreset.name !== "Original" 
                    ? `hue-rotate(${selectedColorPreset.hue}deg) saturate(${selectedColorPreset.saturation}%) brightness(${selectedColorPreset.brightness}%)`
                    : undefined}
                />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4 space-y-4">
            <div>
              <label className="text-slate-400 text-sm mb-2 block">Animation State</label>
              <div className="flex flex-wrap gap-2">
                {SPRITE_ACTIONS.map((a) => (
                  <Button
                    key={a}
                    size="sm"
                    variant={action === a ? "default" : "outline"}
                    onClick={() => setAction(a)}
                    data-testid={`btn-action-${a.toLowerCase()}`}
                  >
                    {a}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-slate-400 text-sm mb-2 block">Scale: {scale}x</label>
              <Slider
                value={[scale]}
                onValueChange={([v]) => setScale(v)}
                min={0.5}
                max={5}
                step={0.25}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-sm">Color Presets (Character Only)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => setSelectedColorPreset(preset)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                    selectedColorPreset.name === preset.name 
                      ? "bg-purple-600/50 ring-2 ring-purple-500" 
                      : "hover:bg-slate-700"
                  }`}
                  data-testid={`preset-${preset.name.toLowerCase()}`}
                >
                  <div className="w-10 h-10 bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center">
                    <SpriteAnimator 
                      spriteSet={selectedSprite} 
                      action="Idle" 
                      scale={0.4} 
                      customTint={preset.name !== "Original" 
                        ? `hue-rotate(${preset.hue}deg) saturate(${preset.saturation}%) brightness(${preset.brightness}%)`
                        : undefined}
                    />
                  </div>
                  <span className="text-xs text-slate-400">{preset.name}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {!isSpellSelected && (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-sm">All Animations Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                {SPRITE_ACTIONS.map((animAction) => (
                  <div key={animAction} className="flex flex-col items-center gap-2">
                    <div className="bg-slate-900 rounded-lg p-2 w-full h-24 flex items-center justify-center overflow-hidden">
                      <SpriteAnimator 
                        spriteSet={characterSpriteForPreview} 
                        action={animAction} 
                        scale={1}
                        customTint={selectedColorPreset.name !== "Original" 
                          ? `hue-rotate(${selectedColorPreset.hue}deg) saturate(${selectedColorPreset.saturation}%) brightness(${selectedColorPreset.brightness}%)`
                          : undefined}
                      />
                    </div>
                    <span className="text-xs text-slate-400">{animAction}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Spell Effects Library
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
              {SPELL_EFFECTS.map((spell) => (
                <SpellEffectPreview key={spell.id} spell={spell} />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-sm">Attack + Effect Combo Preview ({characterSpriteForPreview})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {SPELL_EFFECTS.slice(0, 6).map((spell) => (
                <div key={spell.id} className="flex flex-col items-center gap-2">
                  <div className="bg-slate-900 rounded-lg p-2 w-full h-32 flex items-center justify-center overflow-hidden relative">
                    <SpriteAnimator 
                      spriteSet={characterSpriteForPreview} 
                      action="Attack" 
                      scale={1}
                      customTint={selectedColorPreset.name !== "Original" 
                        ? `hue-rotate(${selectedColorPreset.hue}deg) saturate(${selectedColorPreset.saturation}%) brightness(${selectedColorPreset.brightness}%)`
                        : undefined}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                      <SpellEffectAnimator spell={spell} scale={1.5} />
                    </div>
                  </div>
                  <span className="text-xs text-slate-400">Attack + {spell.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SpellEffectPreview({ spell }: { spell: typeof SPELL_EFFECTS[0] }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="bg-slate-900 rounded-lg p-2 w-full h-20 flex items-center justify-center overflow-hidden">
        <SpellEffectAnimator spell={spell} scale={1.5} />
      </div>
      <div className="flex items-center gap-1">
        <img src={spell.icon} alt={spell.name} className="w-4 h-4" onError={(e) => e.currentTarget.style.display = 'none'} />
        <span className="text-xs text-slate-400">{spell.name}</span>
      </div>
    </div>
  );
}

function SpellEffectAnimator({ spell, scale = 1 }: { spell: typeof SPELL_EFFECTS[0]; scale?: number }) {
  const [frameIndex, setFrameIndex] = useState(0);
  const [loadedFrames, setLoadedFrames] = useState<string[]>([]);

  useEffect(() => {
    const frames: string[] = [];
    for (let i = 1; i <= spell.frames; i++) {
      frames.push(`${spell.path}/frame_${i}.png`);
    }
    setLoadedFrames(frames);
    setFrameIndex(0);
  }, [spell]);

  useEffect(() => {
    if (loadedFrames.length <= 1) return;
    const interval = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % loadedFrames.length);
    }, 100);
    return () => clearInterval(interval);
  }, [loadedFrames]);

  if (loadedFrames.length === 0) return null;

  return (
    <img 
      src={loadedFrames[frameIndex]} 
      alt={spell.name}
      style={{
        width: 48 * scale,
        height: 48 * scale,
        objectFit: 'contain',
        imageRendering: 'pixelated'
      }}
      onError={(e) => e.currentTarget.style.display = 'none'}
    />
  );
}

function SpriteEditor() {
  const [baseSprite, setBaseSprite] = useState(ALL_SPRITE_SETS[0]);
  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(100);
  const [brightness, setBrightness] = useState(100);
  const [scale, setScale] = useState(2);
  const [action, setAction] = useState<SpriteAction>("Idle");
  
  const randomize = () => {
    setBaseSprite(ALL_SPRITE_SETS[Math.floor(Math.random() * ALL_SPRITE_SETS.length)]);
    setHue(Math.floor(Math.random() * 360));
    setSaturation(50 + Math.floor(Math.random() * 150));
    setBrightness(70 + Math.floor(Math.random() * 60));
  };
  
  const filterStyle = `hue-rotate(${hue}deg) saturate(${saturation}%) brightness(${brightness}%)`;

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Wand2 className="w-5 h-5" />
            Sprite Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-slate-400 text-sm mb-2 block">Base Sprite</label>
            <Select value={baseSprite} onValueChange={setBaseSprite}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_SPRITE_SETS.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-slate-400 text-sm mb-2 block">Hue: {hue}°</label>
            <Slider value={[hue]} onValueChange={([v]) => setHue(v)} max={360} step={1} />
          </div>
          
          <div>
            <label className="text-slate-400 text-sm mb-2 block">Saturation: {saturation}%</label>
            <Slider value={[saturation]} onValueChange={([v]) => setSaturation(v)} max={200} step={1} />
          </div>
          
          <div>
            <label className="text-slate-400 text-sm mb-2 block">Brightness: {brightness}%</label>
            <Slider value={[brightness]} onValueChange={([v]) => setBrightness(v)} max={150} min={50} step={1} />
          </div>
          
          <div>
            <label className="text-slate-400 text-sm mb-2 block">Scale: {scale}x</label>
            <Slider value={[scale]} onValueChange={([v]) => setScale(v)} max={5} min={0.5} step={0.25} />
          </div>
          
          <div className="flex gap-2">
            <Button onClick={randomize} className="flex-1" data-testid="btn-randomize">
              <RefreshCw className="w-4 h-4 mr-2" />
              Randomize
            </Button>
            <Button variant="outline" className="flex-1" data-testid="btn-export">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div 
            className="bg-slate-900 rounded-lg p-4 flex flex-col items-center justify-center min-h-[300px]"
            style={{ filter: filterStyle }}
          >
            <SpriteAnimator spriteSet={baseSprite} action={action} scale={scale} />
          </div>
          <div className="flex flex-wrap gap-2 mt-4 justify-center">
            {SPRITE_ACTIONS.map(a => (
              <Button
                key={a}
                size="sm"
                variant={action === a ? "default" : "outline"}
                onClick={() => setAction(a)}
                data-testid={`btn-preview-${a.toLowerCase()}`}
              >
                {a}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ItemCard({ item }: { item: GrudaItem }) {
  const [imgError, setImgError] = useState(false);
  const imagePath = resolveItemImage(item);
  
  const rarityColors: Record<string, string> = {
    Common: "bg-slate-500",
    Uncommon: "bg-green-600",
    Rare: "bg-blue-600",
    Epic: "bg-purple-600",
    Legendary: "bg-orange-500",
  };
  
  return (
    <Card className="bg-slate-800/50 border-slate-700 hover:border-slate-500 transition-colors">
      <CardContent className="p-3 flex gap-3">
        <div className="w-12 h-12 bg-slate-900 rounded flex items-center justify-center shrink-0">
          {!imgError ? (
            <img 
              src={imagePath} 
              alt={item.name}
              className="w-10 h-10 object-contain"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-10 h-10 bg-slate-700 rounded flex items-center justify-center text-xs text-slate-400">
              ?
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-white text-sm font-medium truncate">{item.name}</span>
            <Badge className={`${rarityColors[item.rarity]} text-[10px] px-1`}>{item.rarity}</Badge>
          </div>
          <div className="text-slate-400 text-xs">
            {item.type} {item.slot ? `• ${item.slot}` : ""} • T{item.tier}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface SpriteAnimation {
  name: string;
  frames: string[];
  frameCount: number;
}

interface SpritePackage {
  id: string;
  name: string;
  path: string;
  animations: SpriteAnimation[];
  totalFrames: number;
  hasSheetFile: boolean;
  sheetFiles: string[];
}

interface PackageCategory {
  name: string;
  path: string;
  packages: SpritePackage[];
  subCategories: PackageCategory[];
}

interface PackageData {
  categories: PackageCategory[];
  stats: {
    totalPackages: number;
    totalAnimations: number;
    totalFrames: number;
    totalSheets: number;
  };
}

function AnimationPreview({ basePath, frames, fps = 8 }: { basePath: string; frames: string[]; fps?: number }) {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    setCurrentFrame(0);
  }, [basePath, frames]);

  useEffect(() => {
    if (!isPlaying || frames.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentFrame(prev => (prev + 1) % frames.length);
    }, 1000 / fps);
    return () => clearInterval(interval);
  }, [isPlaying, frames.length, fps]);

  if (frames.length === 0) return null;

  return (
    <div className="relative">
      <img
        src={`${basePath}/${frames[currentFrame]}`}
        alt={frames[currentFrame]}
        className="w-full h-full object-contain"
        style={{ imageRendering: "pixelated" }}
      />
      {frames.length > 1 && (
        <div className="absolute bottom-1 right-1 flex items-center gap-1">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1 bg-black/60 rounded text-white hover:bg-black/80"
          >
            {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          </button>
          <span className="text-[10px] bg-black/60 px-1 rounded text-white">
            {currentFrame + 1}/{frames.length}
          </span>
        </div>
      )}
    </div>
  );
}

function CategoryTree({ 
  category, 
  depth = 0, 
  expandedFolders, 
  toggleFolder, 
  selectedPackage, 
  onSelectPackage 
}: { 
  category: PackageCategory; 
  depth?: number; 
  expandedFolders: Set<string>;
  toggleFolder: (path: string) => void;
  selectedPackage: SpritePackage | null;
  onSelectPackage: (pkg: SpritePackage) => void;
}) {
  const isExpanded = expandedFolders.has(category.path);
  const hasContent = category.packages.length > 0 || category.subCategories.length > 0;

  return (
    <div>
      <div
        className={`flex items-center gap-2 py-1 px-2 rounded cursor-pointer hover:bg-slate-700/50 ${depth > 0 ? 'ml-' + (depth * 3) : ''}`}
        style={{ marginLeft: depth * 12 }}
        onClick={() => toggleFolder(category.path)}
        data-testid={`folder-${category.path}`}
      >
        <ChevronRight className={`w-3 h-3 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        <FolderOpen className="w-4 h-4 text-amber-400" />
        <span className="text-sm text-slate-200 truncate">{category.name}</span>
        <span className="text-xs text-slate-500 ml-auto">
          {category.packages.length > 0 && `${category.packages.length}`}
        </span>
      </div>

      {isExpanded && hasContent && (
        <div>
          {category.packages.map(pkg => (
            <div
              key={pkg.id}
              className={`flex items-center gap-2 py-1 px-2 rounded cursor-pointer transition-colors ${
                selectedPackage?.id === pkg.id 
                  ? 'bg-amber-500/20 text-amber-400' 
                  : 'hover:bg-slate-700/50 text-slate-300'
              }`}
              style={{ marginLeft: (depth + 1) * 12 }}
              onClick={() => onSelectPackage(pkg)}
              data-testid={`package-${pkg.id}`}
            >
              <Layers className="w-4 h-4" />
              <span className="text-sm truncate">{pkg.name}</span>
              <Badge variant="outline" className="text-[10px] ml-auto">
                {pkg.animations.length} anim
              </Badge>
            </div>
          ))}

          {category.subCategories.map(sub => (
            <CategoryTree
              key={sub.path}
              category={sub}
              depth={depth + 1}
              expandedFolders={expandedFolders}
              toggleFolder={toggleFolder}
              selectedPackage={selectedPackage}
              onSelectPackage={onSelectPackage}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface SpriteMetadata {
  packagePath: string;
  spriteType: { 
    id: string; 
    name: string; 
    description: string; 
    usageInstructions: string;
    directional?: boolean;
    directions?: string[];
    frameWidth?: number;
    frameHeight?: number;
    animations?: string[];
  } | null;
  metadata: {
    hasAiFile: boolean;
    aiFiles: string[];
    hasReadme: boolean;
    readmeFiles: string[];
    hasLicense: boolean;
    licenseFiles: string[];
    hasBboxJson: boolean;
    bboxFiles: string[];
    hasUnityPackage: boolean;
    unityPackages: string[];
    hasSpritesheets: boolean;
    spritesheets: string[];
    variants: string[];
  };
}

interface SpriteLibraryProps {
  initialCategory?: string;
  onCategoryViewed?: () => void;
}

function SpriteLibrary({ initialCategory, onCategoryViewed }: SpriteLibraryProps) {
  const [packageData, setPackageData] = useState<PackageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [selectedPackage, setSelectedPackage] = useState<SpritePackage | null>(null);
  const [selectedAnimation, setSelectedAnimation] = useState<SpriteAnimation | null>(null);
  const [spriteMetadata, setSpriteMetadata] = useState<SpriteMetadata | null>(null);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  
  const openSpriteInspector = (anim: SpriteAnimation) => {
    setSelectedAnimation(anim);
    setIsPopupOpen(true);
  };

  useEffect(() => {
    if (selectedPackage) {
      setMetadataLoading(true);
      const pkgPath = selectedPackage.path.replace('/sprites/', '');
      fetch(`/api/sprites/metadata/${pkgPath}`)
        .then(res => res.json())
        .then(data => {
          setSpriteMetadata(data);
          setMetadataLoading(false);
        })
        .catch(() => {
          setSpriteMetadata(null);
          setMetadataLoading(false);
        });
    } else {
      setSpriteMetadata(null);
    }
  }, [selectedPackage]);

  useEffect(() => {
    fetch("/api/sprites/packages")
      .then(res => res.json())
      .then(data => {
        setPackageData(data);
        setLoading(false);
        if (initialCategory) {
          setExpandedFolders(new Set([initialCategory]));
          onCategoryViewed?.();
        } else if (data.categories.length > 0) {
          setExpandedFolders(new Set([data.categories[0].path]));
        }
      })
      .catch(err => {
        console.error("Error loading sprite packages:", err);
        setLoading(false);
      });
  }, [initialCategory, onCategoryViewed]);

  const toggleFolder = useCallback((path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const filteredCategories = useMemo(() => {
    if (!packageData?.categories || !searchTerm) return packageData?.categories || [];
    
    const filterCategory = (cat: PackageCategory): PackageCategory | null => {
      const matchingPackages = cat.packages.filter(pkg => 
        pkg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pkg.animations.some(a => a.name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      
      const matchingSubCategories = cat.subCategories
        .map(filterCategory)
        .filter((c): c is PackageCategory => c !== null);
      
      if (matchingPackages.length > 0 || matchingSubCategories.length > 0) {
        return {
          ...cat,
          packages: matchingPackages,
          subCategories: matchingSubCategories,
        };
      }
      return null;
    };
    
    return packageData.categories
      .map(filterCategory)
      .filter((c): c is PackageCategory => c !== null);
  }, [packageData, searchTerm]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
        <span className="ml-3 text-slate-400">Scanning sprite packages...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4 flex items-center gap-3">
            <FolderOpen className="w-8 h-8 text-amber-400" />
            <div>
              <div className="text-2xl font-bold text-white">{packageData?.stats.totalPackages || 0}</div>
              <div className="text-xs text-slate-400">Sprite Packages</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4 flex items-center gap-3">
            <Play className="w-8 h-8 text-green-400" />
            <div>
              <div className="text-2xl font-bold text-white">{packageData?.stats.totalAnimations || 0}</div>
              <div className="text-xs text-slate-400">Animations</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4 flex items-center gap-3">
            <Image className="w-8 h-8 text-blue-400" />
            <div>
              <div className="text-2xl font-bold text-white">{packageData?.stats.totalFrames || 0}</div>
              <div className="text-xs text-slate-400">Total Frames</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4 flex items-center gap-3">
            <FileImage className="w-8 h-8 text-purple-400" />
            <div>
              <div className="text-2xl font-bold text-white">{packageData?.stats.totalSheets || 0}</div>
              <div className="text-xs text-slate-400">Sprite Sheets</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search packages or animations..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search-packages"
          />
        </div>
      </div>

      <div className="grid md:grid-cols-[300px_1fr] gap-4">
        <Card className="bg-slate-800/50 border-slate-700 overflow-hidden">
          <CardHeader className="py-3 px-4 border-b border-slate-700">
            <CardTitle className="text-sm text-white flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-amber-400" />
              Sprite Packages
            </CardTitle>
          </CardHeader>
          <ScrollArea className="h-[500px]">
            <div className="p-2">
              {filteredCategories.map(category => (
                <CategoryTree
                  key={category.path}
                  category={category}
                  expandedFolders={expandedFolders}
                  toggleFolder={toggleFolder}
                  selectedPackage={selectedPackage}
                  onSelectPackage={setSelectedPackage}
                />
              ))}
            </div>
          </ScrollArea>
        </Card>

        <div className="space-y-4">
          {selectedPackage ? (
            <>
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader className="py-3 px-4 border-b border-slate-700">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white flex items-center gap-2">
                      <Layers className="w-5 h-5 text-amber-400" />
                      {selectedPackage.name}
                    </CardTitle>
                    <Badge className="bg-amber-600">
                      {selectedPackage.animations.length} animations
                    </Badge>
                  </div>
                  <CardDescription className="text-slate-400 text-xs">
                    {selectedPackage.path} - {selectedPackage.totalFrames} frames
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {selectedPackage.animations.map(anim => (
                      <div
                        key={anim.name}
                        className={`p-2 rounded-lg cursor-pointer transition-all ${
                          selectedAnimation?.name === anim.name
                            ? 'bg-amber-500/20 ring-1 ring-amber-500'
                            : 'bg-slate-900 hover:bg-slate-800'
                        }`}
                        onClick={() => openSpriteInspector(anim)}
                        data-testid={`anim-${anim.name}`}
                      >
                        <div className="aspect-square bg-slate-950 rounded mb-2 overflow-hidden">
                          <AnimationPreview
                            basePath={selectedPackage.path}
                            frames={anim.frames}
                            fps={8}
                          />
                        </div>
                        <div className="text-center">
                          <div className="text-white text-xs font-medium truncate">{anim.name}</div>
                          <div className="text-slate-500 text-[10px]">{anim.frameCount} frames</div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full mt-1 h-6 text-[10px] text-amber-400 hover:text-amber-300 hover:bg-amber-900/30"
                          onClick={(e) => {
                            e.stopPropagation();
                            openSpriteInspector(anim);
                          }}
                          data-testid={`inspect-${anim.name}`}
                        >
                          <Sparkles className="w-3 h-3 mr-1" />
                          Inspect
                        </Button>
                      </div>
                    ))}
                  </div>

                  {selectedPackage.sheetFiles.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-700">
                      <h4 className="text-white text-sm font-medium mb-2">Sprite Sheets</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedPackage.sheetFiles.map(sheet => (
                          <Badge key={sheet} variant="outline" className="text-xs">
                            {sheet}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {spriteMetadata && !metadataLoading && (
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader className="py-3 px-4 border-b border-slate-700">
                    <CardTitle className="text-white text-sm flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-400" />
                      Sprite Type & Usage
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    {spriteMetadata.spriteType ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className="bg-blue-600">{spriteMetadata.spriteType.name}</Badge>
                          <span className="text-slate-400 text-xs">({spriteMetadata.spriteType.id})</span>
                          {spriteMetadata.spriteType.frameWidth && spriteMetadata.spriteType.frameHeight && (
                            <Badge variant="outline" className="text-[10px]">
                              {spriteMetadata.spriteType.frameWidth}x{spriteMetadata.spriteType.frameHeight}px
                            </Badge>
                          )}
                          {spriteMetadata.spriteType.directional && (
                            <Badge variant="outline" className="text-[10px] bg-green-600/20">
                              {spriteMetadata.spriteType.directions?.length || 4}-directional
                            </Badge>
                          )}
                        </div>
                        <p className="text-slate-300 text-sm">{spriteMetadata.spriteType.description}</p>
                        
                        {spriteMetadata.spriteType.animations && spriteMetadata.spriteType.animations.length > 0 && (
                          <div className="bg-slate-900/50 p-2 rounded">
                            <h5 className="text-slate-400 text-[10px] uppercase mb-1">Expected Animations</h5>
                            <div className="flex flex-wrap gap-1">
                              {spriteMetadata.spriteType.animations.slice(0, 12).map(a => (
                                <Badge key={a} variant="outline" className="text-[10px]">{a}</Badge>
                              ))}
                              {spriteMetadata.spriteType.animations.length > 12 && (
                                <Badge variant="outline" className="text-[10px] text-slate-500">
                                  +{spriteMetadata.spriteType.animations.length - 12} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                        
                        <div className="bg-slate-900 p-3 rounded-lg">
                          <h5 className="text-amber-400 text-xs font-medium mb-1">Usage Instructions</h5>
                          <pre className="text-slate-300 text-xs whitespace-pre-wrap font-mono">
                            {spriteMetadata.spriteType.usageInstructions}
                          </pre>
                        </div>
                      </div>
                    ) : (
                      <p className="text-slate-400 text-sm">Unknown sprite type - custom or unrecognized format</p>
                    )}

                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-700">
                      {spriteMetadata.metadata.hasAiFile && (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                          <span className="text-slate-300 text-xs">AI Source ({spriteMetadata.metadata.aiFiles.length})</span>
                        </div>
                      )}
                      {spriteMetadata.metadata.hasBboxJson && (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-400"></div>
                          <span className="text-slate-300 text-xs">Bounding Box ({spriteMetadata.metadata.bboxFiles.length})</span>
                        </div>
                      )}
                      {spriteMetadata.metadata.hasUnityPackage && (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
                          <span className="text-slate-300 text-xs">Unity Package</span>
                        </div>
                      )}
                      {spriteMetadata.metadata.hasLicense && (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                          <span className="text-slate-300 text-xs">License</span>
                        </div>
                      )}
                    </div>

                    {spriteMetadata.metadata.variants.length > 0 && (
                      <div className="pt-2 border-t border-slate-700">
                        <h5 className="text-white text-xs font-medium mb-2">Variants</h5>
                        <div className="flex flex-wrap gap-1">
                          {spriteMetadata.metadata.variants.map(v => (
                            <Badge key={v} variant="outline" className="text-[10px]">{v}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {selectedAnimation && (
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader className="py-3 px-4 border-b border-slate-700">
                    <CardTitle className="text-white text-sm flex items-center gap-2">
                      <Play className="w-4 h-4 text-green-400" />
                      Animation: {selectedAnimation.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                      {selectedAnimation.frames.map((frame, idx) => (
                        <div 
                          key={frame}
                          className="aspect-square bg-slate-900 rounded overflow-hidden relative group"
                        >
                          <img
                            src={`${selectedPackage.path}/${frame}`}
                            alt={frame}
                            className="w-full h-full object-contain"
                            style={{ imageRendering: "pixelated" }}
                          />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center">
                            <span className="text-white text-xs">{idx}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => navigator.clipboard.writeText(`${selectedPackage.path}/${selectedAnimation.frames[0]}`)}
                      >
                        Copy First Frame Path
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => navigator.clipboard.writeText(JSON.stringify(selectedAnimation.frames))}
                      >
                        Copy Frame List
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-8 text-center">
                <Layers className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-white font-medium mb-1">Select a Sprite Package</h3>
                <p className="text-slate-400 text-sm">
                  Browse the folder tree on the left to view sprite packages and their animations
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      
      <SpriteInspectorPopup
        isOpen={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
        spritePackage={selectedPackage}
        animation={selectedAnimation}
        metadata={spriteMetadata}
      />
    </div>
  );
}

interface MigrationStatus {
  bucketConfigured: boolean;
  bucketId?: string;
  totalInManifest: number;
  migratedCount: number;
  pendingCount: number;
  activeJobs: {
    jobId: string;
    status: string;
    totalFiles: number;
    processedFiles: number;
    failedFiles: string[];
    currentFile?: string;
  }[];
}

function MigrationTab() {
  const [status, setStatus] = useState<MigrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [limit, setLimit] = useState(100);
  const [starting, setStarting] = useState(false);
  const [categories, setCategories] = useState<{ category: string; count: number }[]>([]);

  const refreshStatus = async () => {
    try {
      const [statusRes, catRes] = await Promise.all([
        fetch("/api/sprites/migration/status").then(r => r.json()),
        fetch("/api/sprites/categories").then(r => r.json())
      ]);
      setStatus(statusRes);
      setCategories(catRes);
    } catch (err) {
      console.error("Error fetching status:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshStatus();
    const interval = setInterval(refreshStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const startMigration = async () => {
    setStarting(true);
    try {
      const res = await fetch("/api/sprites/migration/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          category: selectedCategory === "all" ? undefined : selectedCategory,
          limit 
        })
      });
      const data = await res.json();
      console.log("Migration started:", data);
      refreshStatus();
    } catch (err) {
      console.error("Error starting migration:", err);
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
        <span className="ml-3 text-slate-400">Loading migration status...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Cloud className={`w-8 h-8 ${status?.bucketConfigured ? "text-green-400" : "text-red-400"}`} />
              <div>
                <div className="text-white font-medium">Object Storage</div>
                <div className="text-sm text-slate-400">
                  {status?.bucketConfigured ? "Connected" : "Not configured"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <FolderOpen className="w-8 h-8 text-blue-400" />
              <div>
                <div className="text-white font-medium">In Manifest</div>
                <div className="text-2xl font-bold text-blue-400">{status?.totalInManifest.toLocaleString()}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Upload className="w-8 h-8 text-amber-400" />
              <div>
                <div className="text-white font-medium">Migrated</div>
                <div className="text-2xl font-bold text-amber-400">{status?.migratedCount.toLocaleString()}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Start Migration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm text-slate-400 mb-1 block">Category</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.category} value={cat.category}>
                      {cat.category} ({cat.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-32">
              <label className="text-sm text-slate-400 mb-1 block">Limit</label>
              <Input 
                type="number" 
                value={limit} 
                onChange={e => setLimit(Number(e.target.value))}
                min={1}
                max={5000}
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={startMigration} 
                disabled={starting || !status?.bucketConfigured}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {starting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                Start Migration
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {status?.activeJobs && status.activeJobs.length > 0 && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Active Jobs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {status.activeJobs.map(job => (
              <div key={job.jobId} className="p-4 bg-slate-900/50 rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-white font-medium">{job.jobId}</span>
                  <Badge className={job.status === "running" ? "bg-blue-600" : job.status === "completed" ? "bg-green-600" : "bg-red-600"}>
                    {job.status}
                  </Badge>
                </div>
                <Progress value={(job.processedFiles / job.totalFiles) * 100} className="h-2" />
                <div className="flex justify-between text-sm text-slate-400">
                  <span>{job.processedFiles} / {job.totalFiles} files</span>
                  <span>{job.currentFile && `Processing: ${job.currentFile.split('/').pop()}`}</span>
                </div>
                {job.failedFiles.length > 0 && (
                  <div className="text-red-400 text-sm">{job.failedFiles.length} failed</div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface SyncStatus {
  total: number;
  synced: number;
  pending: number;
  errors: number;
  lastSyncedAt?: number;
}

interface LocalSprite {
  localPath: string;
  filename: string;
  category: string;
  subcategory?: string;
  animationType?: string;
}

interface SpriteManifestEntry {
  id: string;
  name: string;
  filename?: string;
  category: string;
  subcategory?: string;
  localPath?: string;
  objectPath?: string;
  publicUrl?: string;
  frameCount?: number;
  syncStatus?: string;
  syncedAt?: number;
  syncError?: string;
}

function CloudStorageTab() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [localSprites, setLocalSprites] = useState<LocalSprite[]>([]);
  const [manifestSprites, setManifestSprites] = useState<SpriteManifestEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeView, setActiveView] = useState<"local" | "cloud" | "manifest">("local");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [syncResult, setSyncResult] = useState<{ synced: number; skipped: number; errors: number } | null>(null);

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      const [statusRes, localRes, manifestRes] = await Promise.all([
        fetch("/api/sprites/sync/status").then(r => r.json()),
        fetch("/api/sprites/sync/local").then(r => r.json()),
        fetch("/api/sprites/sync/manifest").then(r => r.json()),
      ]);
      setSyncStatus(statusRes);
      setLocalSprites(localRes.sprites || []);
      setManifestSprites(manifestRes.sprites || []);
    } catch (err) {
      console.error("Error loading cloud storage data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const handleSync = async (force: boolean = false) => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/sprites/sync/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force, dryRun: false }),
      });
      const result = await res.json();
      setSyncResult({ synced: result.synced, skipped: result.skipped, errors: result.errors });
      refreshData();
    } catch (err) {
      console.error("Error syncing sprites:", err);
    } finally {
      setSyncing(false);
    }
  };

  const categories = useMemo(() => {
    const cats = new Set(localSprites.map(s => s.category));
    return Array.from(cats);
  }, [localSprites]);

  const filteredLocalSprites = useMemo(() => {
    let sprites = localSprites;
    if (categoryFilter !== "all") {
      sprites = sprites.filter(s => s.category === categoryFilter);
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      sprites = sprites.filter(s => 
        s.filename.toLowerCase().includes(q) || 
        s.category.toLowerCase().includes(q)
      );
    }
    return sprites.slice(0, 200);
  }, [localSprites, categoryFilter, searchTerm]);

  const filteredManifestSprites = useMemo(() => {
    let sprites = manifestSprites;
    if (categoryFilter !== "all") {
      sprites = sprites.filter(s => s.category === categoryFilter);
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      sprites = sprites.filter(s => 
        s.name?.toLowerCase().includes(q) || 
        s.filename?.toLowerCase().includes(q) ||
        s.category?.toLowerCase().includes(q)
      );
    }
    return sprites.slice(0, 200);
  }, [manifestSprites, categoryFilter, searchTerm]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
        <span className="ml-3 text-slate-400">Loading cloud storage data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Cloud className="w-8 h-8 text-blue-400" />
              <div>
                <div className="text-2xl font-bold text-white">{syncStatus?.total || 0}</div>
                <div className="text-sm text-slate-400">Total Sprites</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Upload className="w-8 h-8 text-green-400" />
              <div>
                <div className="text-2xl font-bold text-white">{syncStatus?.synced || 0}</div>
                <div className="text-sm text-slate-400">Synced to Cloud</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-amber-400" />
              <div>
                <div className="text-2xl font-bold text-white">{syncStatus?.pending || 0}</div>
                <div className="text-sm text-slate-400">Pending Sync</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <FolderOpen className="w-8 h-8 text-purple-400" />
              <div>
                <div className="text-2xl font-bold text-white">{localSprites.length}</div>
                <div className="text-sm text-slate-400">Local Sprites</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <CloudUpload className="w-5 h-5 text-amber-400" />
                Sprite Cloud Sync
              </CardTitle>
              <CardDescription>
                Sync local sprites to Cloud Storage for cloud-based delivery
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={refreshData}
                disabled={loading}
                data-testid="btn-refresh-sync"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button
                onClick={() => handleSync(false)}
                disabled={syncing}
                className="bg-amber-600 hover:bg-amber-700"
                data-testid="btn-sync-sprites"
              >
                {syncing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <CloudUpload className="w-4 h-4 mr-2" />
                    Sync New
                  </>
                )}
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleSync(true)}
                disabled={syncing}
                data-testid="btn-force-sync"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Force Sync All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {syncResult && (
            <div className="mb-4 p-4 bg-slate-900/50 rounded-lg flex items-center gap-4">
              <Badge className="bg-green-600">{syncResult.synced} synced</Badge>
              <Badge className="bg-slate-600">{syncResult.skipped} skipped</Badge>
              {syncResult.errors > 0 && <Badge className="bg-red-600">{syncResult.errors} errors</Badge>}
            </div>
          )}

          <div className="flex gap-4 mb-4 flex-wrap">
            <div className="flex gap-2">
              <Button
                variant={activeView === "local" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveView("local")}
                data-testid="btn-view-local"
              >
                <FolderOpen className="w-4 h-4 mr-1" />
                Local ({localSprites.length})
              </Button>
              <Button
                variant={activeView === "manifest" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveView("manifest")}
                data-testid="btn-view-manifest"
              >
                <Database className="w-4 h-4 mr-1" />
                Manifest ({manifestSprites.length})
              </Button>
            </div>

            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search sprites..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-sprites"
                />
              </div>
            </div>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40" data-testid="select-category">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ScrollArea className="h-[400px]">
            {activeView === "local" ? (
              <div className="space-y-2">
                {filteredLocalSprites.map((sprite, idx) => (
                  <div
                    key={sprite.localPath}
                    className="flex items-center gap-4 p-3 bg-slate-900/50 rounded-lg hover:bg-slate-900 transition-colors"
                    data-testid={`sprite-local-${idx}`}
                  >
                    <Image className="w-5 h-5 text-blue-400" />
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium truncate">{sprite.filename}</div>
                      <div className="text-sm text-slate-400 truncate">{sprite.localPath}</div>
                    </div>
                    <Badge className="bg-slate-700">{sprite.category}</Badge>
                    {sprite.animationType && (
                      <Badge variant="outline">{sprite.animationType}</Badge>
                    )}
                  </div>
                ))}
                {filteredLocalSprites.length === 0 && (
                  <div className="text-center text-slate-400 py-8">No local sprites found</div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredManifestSprites.map((sprite, idx) => (
                  <div
                    key={sprite.id}
                    className="flex items-center gap-4 p-3 bg-slate-900/50 rounded-lg hover:bg-slate-900 transition-colors"
                    data-testid={`sprite-manifest-${idx}`}
                  >
                    <Cloud className={`w-5 h-5 ${sprite.syncStatus === "synced" ? "text-green-400" : "text-amber-400"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium truncate">{sprite.name}</div>
                      <div className="text-sm text-slate-400 truncate">{sprite.objectPath || sprite.localPath}</div>
                    </div>
                    <Badge className="bg-slate-700">{sprite.category}</Badge>
                    {sprite.frameCount && sprite.frameCount > 1 && (
                      <Badge variant="outline">{sprite.frameCount} frames</Badge>
                    )}
                    <Badge className={sprite.syncStatus === "synced" ? "bg-green-600" : sprite.syncStatus === "error" ? "bg-red-600" : "bg-amber-600"}>
                      {sprite.syncStatus || "pending"}
                    </Badge>
                  </div>
                ))}
                {filteredManifestSprites.length === 0 && (
                  <div className="text-center text-slate-400 py-8">No manifest entries found</div>
                )}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

function DatabaseTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [itemTypeFilter, setItemTypeFilter] = useState<string>("all");
  const [rarityFilter, setRarityFilter] = useState<string>("all");
  
  const filteredItems = useMemo(() => {
    let items: GrudaItem[] = ITEMS;
    if (searchTerm) {
      items = items.filter((i: GrudaItem) => i.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    if (itemTypeFilter !== "all") {
      items = items.filter((i: GrudaItem) => i.type === itemTypeFilter);
    }
    if (rarityFilter !== "all") {
      items = items.filter((i: GrudaItem) => i.rarity === rarityFilter);
    }
    return items.slice(0, 100);
  }, [searchTerm, itemTypeFilter, rarityFilter]);
  
  const itemTypes = useMemo(() => {
    const types = new Set(ITEMS.map((i: GrudaItem) => i.type));
    return Array.from(types) as string[];
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search items..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-items"
            />
          </div>
        </div>
        <Select value={itemTypeFilter} onValueChange={setItemTypeFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Item type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {itemTypes.map(t => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={rarityFilter} onValueChange={setRarityFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Rarity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Rarities</SelectItem>
            <SelectItem value="Common">Common</SelectItem>
            <SelectItem value="Uncommon">Uncommon</SelectItem>
            <SelectItem value="Rare">Rare</SelectItem>
            <SelectItem value="Epic">Epic</SelectItem>
            <SelectItem value="Legendary">Legendary</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="text-slate-400 text-sm">
        Showing {filteredItems.length} of {ITEMS.length} items
      </div>
      
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredItems.map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

function ObjectStorePanel() {
  const [cacheStats, setCacheStats] = useState(getCacheStats());
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [cdnStatus, setCdnStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Check ObjectStore API health
    fetch(`${OBJECT_STORE_API}/classes.json`, { method: 'HEAD' })
      .then(res => setApiStatus(res.ok ? 'online' : 'offline'))
      .catch(() => setApiStatus('offline'));
    // Check CDN health
    fetch(`${ASSET_CDN_BASE}/health`, { method: 'GET' })
      .then(res => setCdnStatus(res.ok ? 'online' : 'offline'))
      .catch(() => setCdnStatus('offline'));
  }, []);

  const handleRefreshCache = async () => {
    setRefreshing(true);
    clearObjectStoreCache();
    await prefetchCoreData();
    setCacheStats(getCacheStats());
    setRefreshing(false);
  };

  const handleClearCache = () => {
    clearObjectStoreCache();
    setCacheStats(getCacheStats());
  };

  const statusColor = (s: string) =>
    s === 'online' ? 'bg-green-500' : s === 'offline' ? 'bg-red-500' : 'bg-yellow-500';
  const statusText = (s: string) =>
    s === 'online' ? 'Online' : s === 'offline' ? 'Offline' : 'Checking...';

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Database className="w-4 h-4 text-amber-400" />
              ObjectStore API
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${statusColor(apiStatus)}`} />
              <span className="text-slate-300 text-sm">{statusText(apiStatus)}</span>
            </div>
            <div className="text-xs text-slate-500 space-y-1">
              <p className="font-mono break-all">{OBJECT_STORE_BASE}</p>
              <p>Version: <span className="text-amber-400">{OBJECT_STORE_VERSION}</span></p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Cloud className="w-4 h-4 text-blue-400" />
              CDN / Asset Service
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${statusColor(cdnStatus)}`} />
              <span className="text-slate-300 text-sm">{statusText(cdnStatus)}</span>
            </div>
            <div className="text-xs text-slate-500 space-y-1">
              <p className="font-mono break-all">{ASSET_CDN_BASE}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-green-400" />
              Data Cache
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-slate-300 text-sm">
              <span className="text-2xl font-bold text-white">{cacheStats.entries}</span> endpoints cached
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleRefreshCache} disabled={refreshing}>
                {refreshing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                <span className="ml-1">Refresh</span>
              </Button>
              <Button size="sm" variant="outline" onClick={handleClearCache}>
                <Trash2 className="w-3 h-3" />
                <span className="ml-1">Clear</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {cacheStats.endpoints.length > 0 && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">Cached Endpoints</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {cacheStats.endpoints.map(ep => (
                <Badge key={ep} variant="outline" className="font-mono text-xs">
                  {ep}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-sm">API Endpoints</CardTitle>
          <CardDescription>ObjectStore api/v1 JSON data endpoints</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
            {[
              'weapons', 'armor', 'materials', 'consumables', 'classes', 'races',
              'factions', 'attributes', 'professions', 'skills', 'weaponSkills',
              'enemies', 'bosses', 'effectSprites', 'sprites2d', 'spriteMaps',
              'items-database', 'equipment', 'skillTrees', 'missions', 'worldMap',
              'lore', 'quests'
            ].map(ep => (
              <a
                key={ep}
                href={`${OBJECT_STORE_API}/${ep}.json`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2 rounded bg-slate-900/50 hover:bg-slate-700/50 transition-colors text-slate-300 hover:text-white"
              >
                <FileText className="w-3 h-3 text-amber-400 shrink-0" />
                <span className="font-mono">{ep}.json</span>
              </a>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [initialCategory, setInitialCategory] = useState<string | undefined>(undefined);
  
  const navigateToLibrary = useCallback((categoryPath?: string) => {
    setInitialCategory(categoryPath);
    setActiveTab("library");
  }, []);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Settings className="w-6 h-6 text-amber-400" />
              Admin Dashboard
            </h1>
            <p className="text-slate-400 text-sm mt-1">Sprite management, asset tools, and developer utilities</p>
          </div>
          <Badge className="bg-amber-600">Developer Tools</Badge>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-slate-800 flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="overview" className="gap-2" data-testid="tab-overview">
              <LayoutDashboard className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="library" className="gap-2" data-testid="tab-library">
              <FileImage className="w-4 h-4" />
              Sprite Library
            </TabsTrigger>
            <TabsTrigger value="sprites" className="gap-2" data-testid="tab-sprites">
              <Sparkles className="w-4 h-4" />
              Sprite Manager
            </TabsTrigger>
            <TabsTrigger value="editor" className="gap-2" data-testid="tab-editor">
              <Palette className="w-4 h-4" />
              Sprite Editor
            </TabsTrigger>
            <TabsTrigger value="ai" className="gap-2" data-testid="tab-ai">
              <Bot className="w-4 h-4" />
              AI Assistant
            </TabsTrigger>
            <TabsTrigger value="database" className="gap-2" data-testid="tab-database">
              <Database className="w-4 h-4" />
              Database
            </TabsTrigger>
            <TabsTrigger value="migration" className="gap-2" data-testid="tab-migration">
              <CloudUpload className="w-4 h-4" />
              Migration
            </TabsTrigger>
            <TabsTrigger value="cloud-storage" className="gap-2" data-testid="tab-cloud-storage">
              <Cloud className="w-4 h-4" />
              Cloud Storage
            </TabsTrigger>
            <TabsTrigger value="miniworld" className="gap-2" data-testid="tab-miniworld">
              <Layers className="w-4 h-4" />
              MiniWorld
            </TabsTrigger>
            <TabsTrigger value="objectstore" className="gap-2" data-testid="tab-objectstore">
              <Grid3X3 className="w-4 h-4" />
              ObjectStore
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview">
            <OverviewDashboard onNavigateToLibrary={navigateToLibrary} />
          </TabsContent>
          
          <TabsContent value="library">
            <SpriteLibrary initialCategory={initialCategory} onCategoryViewed={() => setInitialCategory(undefined)} />
          </TabsContent>
          
          <TabsContent value="sprites">
            <SpriteManager />
          </TabsContent>
          
          <TabsContent value="editor">
            <SpriteEditor />
          </TabsContent>
          
          <TabsContent value="ai">
            <AIAssistant />
          </TabsContent>
          
          <TabsContent value="database">
            <DataSpreadsheet />
          </TabsContent>
          
          <TabsContent value="migration">
            <MigrationTab />
          </TabsContent>
          
          <TabsContent value="cloud-storage">
            <CloudStorageTab />
          </TabsContent>
          
          <TabsContent value="miniworld">
            <MiniWorldViewer />
          </TabsContent>
          
          <TabsContent value="objectstore">
            <ObjectStorePanel />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
