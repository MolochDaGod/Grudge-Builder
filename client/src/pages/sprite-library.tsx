import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import {
  ArrowLeft,
  Search,
  Swords,
  Ghost,
  Sparkles,
  Building,
  Ship,
  Palette,
  Grid3X3,
  Users,
  PawPrint,
  Layers,
} from "lucide-react";
import {
  CRAFTPIX_ASSET_CATALOG,
  getAssetsByCategory,
  type SpriteCategory,
  type SpriteAsset,
} from "@/lib/craftpixAssetCatalog";

const CATEGORY_ICONS: Record<SpriteCategory, React.ReactNode> = {
  hero: <Users className="w-4 h-4" />,
  enemy: <Ghost className="w-4 h-4" />,
  magic: <Sparkles className="w-4 h-4" />,
  icon: <Grid3X3 className="w-4 h-4" />,
  ui: <Palette className="w-4 h-4" />,
  building: <Building className="w-4 h-4" />,
  environment: <Layers className="w-4 h-4" />,
  animal: <PawPrint className="w-4 h-4" />,
  boat: <Ship className="w-4 h-4" />,
  weapon: <Swords className="w-4 h-4" />,
  template: <Grid3X3 className="w-4 h-4" />,
};

const CATEGORY_COLORS: Record<SpriteCategory, string> = {
  hero: "bg-blue-500/20 text-blue-300 border-blue-500/50",
  enemy: "bg-red-500/20 text-red-300 border-red-500/50",
  magic: "bg-purple-500/20 text-purple-300 border-purple-500/50",
  icon: "bg-amber-500/20 text-amber-300 border-amber-500/50",
  ui: "bg-cyan-500/20 text-cyan-300 border-cyan-500/50",
  building: "bg-green-500/20 text-green-300 border-green-500/50",
  environment: "bg-emerald-500/20 text-emerald-300 border-emerald-500/50",
  animal: "bg-orange-500/20 text-orange-300 border-orange-500/50",
  boat: "bg-sky-500/20 text-sky-300 border-sky-500/50",
  weapon: "bg-rose-500/20 text-rose-300 border-rose-500/50",
  template: "bg-indigo-500/20 text-indigo-300 border-indigo-500/50",
};

function AssetCard({ asset }: { asset: SpriteAsset }) {
  const [imageError, setImageError] = useState(false);
  const previewPath = `${asset.path}/Idle.png`;
  const fallbackPath = `${asset.path}/idle.png`;

  return (
    <Card className="bg-slate-800/50 border-slate-700/50 hover:border-amber-500/30 transition-colors">
      <CardContent className="p-4">
        <div className="aspect-square bg-slate-900/50 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
          {!imageError ? (
            <img
              src={previewPath}
              alt={asset.name}
              className="max-w-full max-h-full object-contain"
              style={{ imageRendering: "pixelated" }}
              onError={() => setImageError(true)}
              data-testid={`img-asset-${asset.id}`}
            />
          ) : (
            <div className="text-slate-500 text-xs text-center p-2">
              <Layers className="w-8 h-8 mx-auto mb-1 opacity-50" />
              Preview unavailable
            </div>
          )}
        </div>
        <h4 className="text-amber-200 font-semibold text-sm truncate" title={asset.name}>
          {asset.name}
        </h4>
        <p className="text-slate-400 text-xs truncate" title={asset.path}>
          {asset.path}
        </p>
        <div className="flex flex-wrap gap-1 mt-2">
          <Badge className={CATEGORY_COLORS[asset.category]} variant="outline">
            {CATEGORY_ICONS[asset.category]}
            <span className="ml-1 text-xs">{asset.category}</span>
          </Badge>
          {asset.animations.length > 0 && (
            <Badge variant="outline" className="text-xs bg-slate-700/50">
              {asset.animations.length} anims
            </Badge>
          )}
        </div>
        {asset.usedIn && asset.usedIn.length > 0 && (
          <div className="mt-2 text-xs text-slate-500">
            Used in: {asset.usedIn.join(", ")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function SpriteLibraryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<SpriteCategory | "all">("all");

  const allAssets = useMemo(() => {
    return CRAFTPIX_ASSET_CATALOG.flatMap(pack => pack.assets);
  }, []);

  const filteredAssets = useMemo(() => {
    let assets = activeCategory === "all" ? allAssets : getAssetsByCategory(activeCategory);
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      assets = assets.filter(
        asset =>
          asset.name.toLowerCase().includes(query) ||
          asset.id.toLowerCase().includes(query) ||
          asset.path.toLowerCase().includes(query)
      );
    }
    
    return assets;
  }, [allAssets, activeCategory, searchQuery]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allAssets.length };
    for (const category of Object.keys(CATEGORY_ICONS) as SpriteCategory[]) {
      counts[category] = getAssetsByCategory(category).length;
    }
    return counts;
  }, [allAssets]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-amber-900/20 to-slate-900 p-6">
      <div className="container mx-auto max-w-7xl">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/sprite-viewer">
            <Button variant="ghost" size="sm" className="text-amber-200 hover:text-amber-100" data-testid="link-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-amber-200 font-['Cinzel']">Sprite Library</h1>
            <p className="text-amber-100/70 text-sm">Browse all Craftpix game assets by category</p>
          </div>
          <Badge variant="outline" className="bg-amber-500/20 text-amber-300 border-amber-500/50">
            {allAssets.length} Assets
          </Badge>
        </div>

        <div className="flex gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-800/50 border-slate-700"
              data-testid="input-search"
            />
          </div>
          <Link href="/template-viewer">
            <Button variant="outline" className="border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/10" data-testid="link-templates">
              <Grid3X3 className="w-4 h-4 mr-2" />
              View Templates
            </Button>
          </Link>
        </div>

        <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as SpriteCategory | "all")} className="space-y-4">
          <ScrollArea className="w-full">
            <TabsList className="bg-slate-800/50 border border-amber-900/30 inline-flex w-auto">
              <TabsTrigger 
                value="all" 
                className="data-[state=active]:bg-amber-900/50 data-[state=active]:text-amber-200"
                data-testid="tab-all"
              >
                All ({categoryCounts.all})
              </TabsTrigger>
              {(Object.keys(CATEGORY_ICONS) as SpriteCategory[]).map((category) => (
                categoryCounts[category] > 0 && (
                  <TabsTrigger
                    key={category}
                    value={category}
                    className="data-[state=active]:bg-amber-900/50 data-[state=active]:text-amber-200"
                    data-testid={`tab-${category}`}
                  >
                    {CATEGORY_ICONS[category]}
                    <span className="ml-1 capitalize">{category}</span>
                    <span className="ml-1 opacity-60">({categoryCounts[category]})</span>
                  </TabsTrigger>
                )
              ))}
            </TabsList>
          </ScrollArea>

          <TabsContent value={activeCategory} className="mt-4">
            {filteredAssets.length === 0 ? (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="py-12 text-center">
                  <Ghost className="w-12 h-12 mx-auto mb-4 text-slate-500" />
                  <h3 className="text-amber-200 font-semibold mb-2">No assets found</h3>
                  <p className="text-slate-400 text-sm">
                    {searchQuery ? "Try a different search term" : "No assets in this category"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {filteredAssets.map((asset) => (
                  <AssetCard key={asset.id} asset={asset} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Card className="mt-8 bg-slate-800/50 border-amber-900/30">
          <CardHeader>
            <CardTitle className="text-amber-200">Asset Packs Summary</CardTitle>
            <CardDescription className="text-slate-400">Overview of all sprite packs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {CRAFTPIX_ASSET_CATALOG.map((pack) => (
                <div key={pack.id} className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50">
                  <div className="flex items-center gap-2 mb-2">
                    {CATEGORY_ICONS[pack.category]}
                    <h4 className="text-amber-200 font-semibold">{pack.name}</h4>
                  </div>
                  <p className="text-slate-400 text-xs mb-2">{pack.basePath}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {pack.assets.length} assets
                    </Badge>
                    <Badge variant="outline" className="text-xs opacity-60">
                      {pack.source}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
