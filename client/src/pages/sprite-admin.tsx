import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
  Brain,
  FolderSearch,
  Image,
  Play,
  Check,
  X,
  ChevronRight,
  RefreshCw,
  Download,
  Sparkles,
  ArrowLeft,
  Grid3X3,
  Layers,
  Move,
  Zap,
  FileCode,
  Eye,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Palette
} from "lucide-react";
import { ColorSwapTool } from "@/components/ColorSwapTool";

interface SpriteFile {
  path: string;
  name: string;
  directory: string;
  size: number;
  category: string;
}

interface AnalyzedSprite {
  id: string;
  filePath: string;
  name: string;
  category: string;
  type: "character" | "effect" | "projectile" | "environment" | "ui" | "unknown";
  dimensions: { width: number; height: number };
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  columns: number;
  rows: number;
  animations: {
    name: string;
    frameStart: number;
    frameEnd: number;
    fps: number;
    loop: boolean;
  }[];
  directional: "none" | "4-way" | "8-way";
  directions?: string[];
  approved: boolean;
  analyzedAt: string;
  aiConfidence: number;
}

interface ScanResult {
  totalFiles: number;
  directories: number;
  files: SpriteFile[];
  grouped: Record<string, SpriteFile[]>;
}

interface AnalyzedResult {
  total: number;
  approved: number;
  pending: number;
  sprites: AnalyzedSprite[];
}

export default function SpriteAdminPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("browse");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [analyzedSprites, setAnalyzedSprites] = useState<AnalyzedSprite[]>([]);
  const [selectedDirectory, setSelectedDirectory] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<SpriteFile | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [previewImage, setPreviewImage] = useState<HTMLImageElement | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const scanSprites = useCallback(async () => {
    setIsScanning(true);
    try {
      const response = await fetch("/api/sprites/scan");
      const data = await response.json();
      setScanResult(data);
      toast({
        title: "Scan Complete",
        description: `Found ${data.totalFiles} sprite files in ${data.directories} directories.`
      });
    } catch (error: any) {
      toast({
        title: "Scan Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsScanning(false);
    }
  }, [toast]);

  const fetchAnalyzedSprites = useCallback(async () => {
    try {
      const response = await fetch("/api/sprites/analyzed");
      const data: AnalyzedResult = await response.json();
      setAnalyzedSprites(data.sprites);
    } catch (error) {
      console.error("Failed to fetch analyzed sprites:", error);
    }
  }, []);

  useEffect(() => {
    scanSprites();
    fetchAnalyzedSprites();
  }, [scanSprites, fetchAnalyzedSprites]);

  const loadImageDimensions = useCallback((path: string): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => {
        setPreviewImage(img);
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = path;
    });
  }, []);

  const analyzeSprite = useCallback(async (file: SpriteFile, userHints?: string) => {
    setIsAnalyzing(true);
    setAnalysisResult(null);
    
    try {
      const dimensions = await loadImageDimensions(file.path);
      
      const response = await fetch("/api/sprites/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filePath: file.path,
          dimensions,
          userHints
        })
      });
      
      const data = await response.json();
      setAnalysisResult(data);
      await fetchAnalyzedSprites();
      
      toast({
        title: "Analysis Complete",
        description: `AI identified ${data.sprite.animations.length} animations with ${data.sprite.aiConfidence}% confidence.`
      });
    } catch (error: any) {
      toast({
        title: "Analysis Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, [loadImageDimensions, fetchAnalyzedSprites, toast]);

  const approveSprite = useCallback(async (sprite: AnalyzedSprite, updates?: Partial<AnalyzedSprite>) => {
    try {
      const response = await fetch(`/api/sprites/approve/${sprite.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates || {})
      });
      
      if (response.ok) {
        await fetchAnalyzedSprites();
        toast({
          title: "Sprite Approved",
          description: `${sprite.name} is now ready for use in the game.`
        });
      }
    } catch (error: any) {
      toast({
        title: "Approval Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  }, [fetchAnalyzedSprites, toast]);

  const generateManifest = useCallback(async () => {
    try {
      const response = await fetch("/api/sprites/generate-manifest");
      const data = await response.json();
      
      const blob = new Blob([data.code], { type: "text/typescript" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ai-analyzed-sprites.ts";
      a.click();
      URL.revokeObjectURL(url);
      
      toast({
        title: "Manifest Generated",
        description: `Generated manifest with ${data.count} approved sprites.`
      });
    } catch (error: any) {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  }, [toast]);

  const batchAnalyze = useCallback(async (files: SpriteFile[]) => {
    setBatchProgress({ current: 0, total: files.length });
    
    for (let i = 0; i < files.length; i++) {
      setBatchProgress({ current: i + 1, total: files.length });
      await analyzeSprite(files[i]);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setBatchProgress({ current: 0, total: 0 });
    toast({
      title: "Batch Analysis Complete",
      description: `Analyzed ${files.length} sprite files.`
    });
  }, [analyzeSprite, toast]);

  const autoAnalyzeAll = useCallback(async (batchLimit: number = 25, autoApprove: boolean = true) => {
    setIsAnalyzing(true);
    setBatchProgress({ current: 0, total: batchLimit });
    
    try {
      const response = await fetch("/api/sprites/batch-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          limit: batchLimit,
          autoApprove
        })
      });
      
      const data = await response.json();
      await fetchAnalyzedSprites();
      
      toast({
        title: "Auto-Analysis Complete",
        description: `Analyzed ${data.analyzed} sprites. ${data.remaining} remaining to analyze.`
      });
      
      return data;
    } catch (error: any) {
      toast({
        title: "Auto-Analysis Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
      setBatchProgress({ current: 0, total: 0 });
    }
  }, [fetchAnalyzedSprites, toast]);

  const approveAllPending = useCallback(async () => {
    try {
      const response = await fetch("/api/sprites/approve-all", {
        method: "POST"
      });
      
      const data = await response.json();
      await fetchAnalyzedSprites();
      
      toast({
        title: "All Sprites Approved",
        description: `Approved ${data.approved} sprites for game use.`
      });
    } catch (error: any) {
      toast({
        title: "Approval Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  }, [fetchAnalyzedSprites, toast]);

  const filteredDirectories = scanResult?.grouped
    ? Object.entries(scanResult.grouped).filter(([dir]) =>
        dir.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const filteredAnalyzed = analyzedSprites.filter(sprite => {
    if (filterType !== "all" && sprite.type !== filterType) return false;
    if (searchQuery && !sprite.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto p-4">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/sprite-editor">
            <Button variant="ghost" size="sm" className="text-amber-200 hover:text-amber-100" data-testid="link-sprite-editor">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Editor
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-amber-200 font-['Cinzel']">AI Sprite Admin</h1>
            <p className="text-amber-100/70 text-sm">Analyze and configure sprite sheets for RPG & Dungeon systems</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/50">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              {analyzedSprites.filter(s => s.approved).length} Approved
            </Badge>
            <Badge variant="outline" className="bg-amber-500/20 text-amber-300 border-amber-500/50">
              <AlertCircle className="w-3 h-3 mr-1" />
              {analyzedSprites.filter(s => !s.approved).length} Pending
            </Badge>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-slate-800/50 border border-amber-900/30">
            <TabsTrigger value="browse" className="data-[state=active]:bg-amber-900/50 data-[state=active]:text-amber-200" data-testid="tab-browse">
              <FolderSearch className="w-4 h-4 mr-2" />
              Browse Files
            </TabsTrigger>
            <TabsTrigger value="analyze" className="data-[state=active]:bg-amber-900/50 data-[state=active]:text-amber-200" data-testid="tab-analyze">
              <Brain className="w-4 h-4 mr-2" />
              AI Analyzer
            </TabsTrigger>
            <TabsTrigger value="reviewed" className="data-[state=active]:bg-amber-900/50 data-[state=active]:text-amber-200" data-testid="tab-reviewed">
              <Check className="w-4 h-4 mr-2" />
              Reviewed Sprites
            </TabsTrigger>
            <TabsTrigger value="export" className="data-[state=active]:bg-amber-900/50 data-[state=active]:text-amber-200" data-testid="tab-export">
              <FileCode className="w-4 h-4 mr-2" />
              Export Manifest
            </TabsTrigger>
            <TabsTrigger value="colorswap" className="data-[state=active]:bg-amber-900/50 data-[state=active]:text-amber-200" data-testid="tab-colorswap">
              <Palette className="w-4 h-4 mr-2" />
              Color Swap
            </TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-4">
            <Card className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 border-purple-500/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-purple-600/30 p-3 rounded-lg">
                      <Brain className="w-8 h-8 text-purple-300" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-purple-200">AI Auto-Analyzer</h3>
                      <p className="text-purple-300/70 text-sm">
                        Automatically scan and analyze all sprite sheets with AI
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {isAnalyzing && batchProgress.total > 0 && (
                      <div className="flex items-center gap-2 text-purple-200">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Analyzing...</span>
                      </div>
                    )}
                    <Button
                      onClick={() => autoAnalyzeAll(25, true)}
                      disabled={isAnalyzing}
                      className="bg-purple-600 hover:bg-purple-700"
                      data-testid="button-auto-analyze-25"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Analyze 25 Sprites
                    </Button>
                    <Button
                      onClick={() => autoAnalyzeAll(100, true)}
                      disabled={isAnalyzing}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                      data-testid="button-auto-analyze-100"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Analyze 100 Sprites
                    </Button>
                    {analyzedSprites.filter(s => !s.approved).length > 0 && (
                      <Button
                        onClick={approveAllPending}
                        className="bg-emerald-600 hover:bg-emerald-700"
                        data-testid="button-approve-all"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Approve All ({analyzedSprites.filter(s => !s.approved).length})
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center gap-4">
              <Input
                placeholder="Search directories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-md bg-slate-800/50 border-amber-900/30 text-amber-100"
                data-testid="input-search"
              />
              <Button onClick={scanSprites} disabled={isScanning} className="bg-amber-600 hover:bg-amber-700" data-testid="button-scan">
                {isScanning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Rescan
              </Button>
              {scanResult && (
                <span className="text-amber-100/70 text-sm">
                  {scanResult.totalFiles.toLocaleString()} files in {scanResult.directories} directories
                </span>
              )}
            </div>

            <div className="grid grid-cols-12 gap-4">
              <Card className="col-span-4 bg-slate-800/50 border-amber-900/30">
                <CardHeader className="py-3">
                  <CardTitle className="text-amber-200 text-sm">Directories</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[500px]">
                    {filteredDirectories.map(([dir, files]) => (
                      <button
                        key={dir}
                        onClick={() => setSelectedDirectory(dir)}
                        className={`w-full px-4 py-2 text-left flex items-center justify-between hover:bg-amber-900/20 transition-colors ${
                          selectedDirectory === dir ? "bg-amber-900/30 border-l-2 border-amber-500" : ""
                        }`}
                        data-testid={`dir-${dir.replace(/[^a-zA-Z0-9]/g, "-")}`}
                      >
                        <span className="text-amber-100 text-sm truncate">{dir}</span>
                        <Badge variant="secondary" className="bg-slate-700 text-amber-200">{files.length}</Badge>
                      </button>
                    ))}
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card className="col-span-4 bg-slate-800/50 border-amber-900/30">
                <CardHeader className="py-3">
                  <CardTitle className="text-amber-200 text-sm">
                    Files {selectedDirectory && `in ${selectedDirectory}`}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[500px]">
                    {selectedDirectory && scanResult?.grouped[selectedDirectory]?.map((file) => (
                      <button
                        key={file.path}
                        onClick={() => {
                          setSelectedFile(file);
                          loadImageDimensions(file.path);
                        }}
                        className={`w-full px-4 py-2 text-left flex items-center gap-2 hover:bg-amber-900/20 transition-colors ${
                          selectedFile?.path === file.path ? "bg-amber-900/30 border-l-2 border-amber-500" : ""
                        }`}
                        data-testid={`file-${file.name.replace(/[^a-zA-Z0-9]/g, "-")}`}
                      >
                        <Image className="w-4 h-4 text-amber-400 flex-shrink-0" />
                        <span className="text-amber-100 text-sm truncate flex-1">{file.name}</span>
                        <span className="text-amber-100/50 text-xs">{(file.size / 1024).toFixed(1)}KB</span>
                      </button>
                    ))}
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card className="col-span-4 bg-slate-800/50 border-amber-900/30">
                <CardHeader className="py-3">
                  <CardTitle className="text-amber-200 text-sm">Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedFile ? (
                    <div className="space-y-4">
                      <div className="bg-slate-900 rounded-lg p-4 flex items-center justify-center min-h-[200px]">
                        <img
                          src={selectedFile.path}
                          alt={selectedFile.name}
                          className="max-w-full max-h-[200px] object-contain image-rendering-pixelated"
                          style={{ imageRendering: "pixelated" }}
                        />
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between text-amber-100">
                          <span className="text-amber-100/70">Name:</span>
                          <span className="truncate ml-2">{selectedFile.name}</span>
                        </div>
                        {previewImage && (
                          <div className="flex justify-between text-amber-100">
                            <span className="text-amber-100/70">Dimensions:</span>
                            <span>{previewImage.width} x {previewImage.height}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-amber-100">
                          <span className="text-amber-100/70">Size:</span>
                          <span>{(selectedFile.size / 1024).toFixed(2)} KB</span>
                        </div>
                      </div>
                      <Button
                        onClick={() => analyzeSprite(selectedFile)}
                        disabled={isAnalyzing}
                        className="w-full bg-purple-600 hover:bg-purple-700"
                        data-testid="button-analyze-selected"
                      >
                        {isAnalyzing ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Brain className="w-4 h-4 mr-2" />
                        )}
                        Analyze with AI
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-amber-100/50">
                      Select a file to preview
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analyze" className="space-y-4">
            <div className="grid grid-cols-2 gap-6">
              <Card className="bg-slate-800/50 border-amber-900/30">
                <CardHeader>
                  <CardTitle className="text-amber-200 flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    AI Sprite Analyzer
                  </CardTitle>
                  <CardDescription className="text-amber-100/70">
                    Automatically detect animations, frame layouts, and directional sprites
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedFile ? (
                    <>
                      <div className="bg-slate-900 rounded-lg p-4 flex items-center justify-center">
                        <img
                          src={selectedFile.path}
                          alt={selectedFile.name}
                          className="max-w-full max-h-[300px] object-contain"
                          style={{ imageRendering: "pixelated" }}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-amber-600">{selectedFile.name}</Badge>
                        {previewImage && (
                          <Badge variant="outline" className="border-amber-500/50 text-amber-300">
                            {previewImage.width}x{previewImage.height}
                          </Badge>
                        )}
                      </div>
                      <Button
                        onClick={() => analyzeSprite(selectedFile)}
                        disabled={isAnalyzing}
                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                        data-testid="button-ai-analyze"
                      >
                        {isAnalyzing ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Analyze Sprite Sheet
                          </>
                        )}
                      </Button>
                    </>
                  ) : (
                    <div className="text-center py-8 text-amber-100/50">
                      <Image className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Select a sprite file from the Browse tab to analyze</p>
                    </div>
                  )}

                  {batchProgress.total > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-amber-100">
                        <span>Batch Progress</span>
                        <span>{batchProgress.current} / {batchProgress.total}</span>
                      </div>
                      <Progress value={(batchProgress.current / batchProgress.total) * 100} className="bg-slate-700" />
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-amber-900/30">
                <CardHeader>
                  <CardTitle className="text-amber-200 flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Analysis Results
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analysisResult ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-900 rounded-lg p-3">
                          <div className="text-amber-100/70 text-xs mb-1">Type</div>
                          <div className="text-amber-200 font-medium capitalize">{analysisResult.sprite.type}</div>
                        </div>
                        <div className="bg-slate-900 rounded-lg p-3">
                          <div className="text-amber-100/70 text-xs mb-1">Confidence</div>
                          <div className="text-amber-200 font-medium">{analysisResult.sprite.aiConfidence}%</div>
                        </div>
                        <div className="bg-slate-900 rounded-lg p-3">
                          <div className="text-amber-100/70 text-xs mb-1">Frame Size</div>
                          <div className="text-amber-200 font-medium">
                            {analysisResult.sprite.frameWidth}x{analysisResult.sprite.frameHeight}
                          </div>
                        </div>
                        <div className="bg-slate-900 rounded-lg p-3">
                          <div className="text-amber-100/70 text-xs mb-1">Grid</div>
                          <div className="text-amber-200 font-medium">
                            {analysisResult.sprite.columns}x{analysisResult.sprite.rows}
                          </div>
                        </div>
                        <div className="bg-slate-900 rounded-lg p-3">
                          <div className="text-amber-100/70 text-xs mb-1">Directional</div>
                          <div className="text-amber-200 font-medium capitalize">{analysisResult.sprite.directional}</div>
                        </div>
                        <div className="bg-slate-900 rounded-lg p-3">
                          <div className="text-amber-100/70 text-xs mb-1">Total Frames</div>
                          <div className="text-amber-200 font-medium">{analysisResult.sprite.frameCount}</div>
                        </div>
                      </div>

                      <div className="bg-slate-900 rounded-lg p-3">
                        <div className="text-amber-100/70 text-xs mb-2">Detected Animations</div>
                        <div className="space-y-2">
                          {analysisResult.sprite.animations.map((anim: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <span className="text-amber-200 capitalize">{anim.name}</span>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="border-amber-500/30 text-amber-300 text-xs">
                                  {anim.frameEnd - anim.frameStart + 1} frames
                                </Badge>
                                <Badge variant="outline" className="border-amber-500/30 text-amber-300 text-xs">
                                  {anim.fps} fps
                                </Badge>
                                {anim.loop && (
                                  <Badge variant="outline" className="border-emerald-500/30 text-emerald-300 text-xs">
                                    Loop
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {analysisResult.aiAnalysis?.notes && (
                        <div className="bg-slate-900 rounded-lg p-3">
                          <div className="text-amber-100/70 text-xs mb-1">AI Notes</div>
                          <div className="text-amber-100 text-sm">{analysisResult.aiAnalysis.notes}</div>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          onClick={() => approveSprite(analysisResult.sprite)}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                          data-testid="button-approve"
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          className="border-amber-500/50 text-amber-200 hover:bg-amber-900/30"
                          data-testid="button-edit"
                        >
                          Edit Config
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-amber-100/50">
                      <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Analysis results will appear here</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="reviewed" className="space-y-4">
            <div className="flex items-center gap-4 mb-4">
              <Input
                placeholder="Search sprites..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-md bg-slate-800/50 border-amber-900/30 text-amber-100"
                data-testid="input-search-reviewed"
              />
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-40 bg-slate-800/50 border-amber-900/30 text-amber-100" data-testid="select-filter-type">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="character">Characters</SelectItem>
                  <SelectItem value="effect">Effects</SelectItem>
                  <SelectItem value="projectile">Projectiles</SelectItem>
                  <SelectItem value="environment">Environment</SelectItem>
                  <SelectItem value="ui">UI</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {filteredAnalyzed.map((sprite) => (
                <Card
                  key={sprite.id}
                  className={`bg-slate-800/50 border-amber-900/30 ${
                    sprite.approved ? "ring-1 ring-emerald-500/50" : ""
                  }`}
                  data-testid={`sprite-card-${sprite.id}`}
                >
                  <CardHeader className="py-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-amber-200 text-sm truncate">{sprite.name}</CardTitle>
                      {sprite.approved ? (
                        <Badge className="bg-emerald-600">Approved</Badge>
                      ) : (
                        <Badge variant="outline" className="border-amber-500/50 text-amber-300">Pending</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="bg-slate-900 rounded-lg p-2 flex items-center justify-center h-24">
                      <img
                        src={sprite.filePath}
                        alt={sprite.name}
                        className="max-w-full max-h-full object-contain"
                        style={{ imageRendering: "pixelated" }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="text-amber-100/70">Type: <span className="text-amber-200 capitalize">{sprite.type}</span></div>
                      <div className="text-amber-100/70">Frames: <span className="text-amber-200">{sprite.frameCount}</span></div>
                      <div className="text-amber-100/70">Size: <span className="text-amber-200">{sprite.frameWidth}x{sprite.frameHeight}</span></div>
                      <div className="text-amber-100/70">Dir: <span className="text-amber-200 capitalize">{sprite.directional}</span></div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {sprite.animations.slice(0, 4).map((anim, idx) => (
                        <Badge key={idx} variant="outline" className="border-amber-500/30 text-amber-300 text-xs">
                          {anim.name}
                        </Badge>
                      ))}
                      {sprite.animations.length > 4 && (
                        <Badge variant="outline" className="border-slate-500/30 text-slate-400 text-xs">
                          +{sprite.animations.length - 4}
                        </Badge>
                      )}
                    </div>
                    {!sprite.approved && (
                      <Button
                        size="sm"
                        onClick={() => approveSprite(sprite)}
                        className="w-full bg-emerald-600 hover:bg-emerald-700"
                        data-testid={`button-approve-${sprite.id}`}
                      >
                        <Check className="w-3 h-3 mr-1" />
                        Approve
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
              {filteredAnalyzed.length === 0 && (
                <div className="col-span-3 text-center py-12 text-amber-100/50">
                  <Layers className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No analyzed sprites yet. Use the Browse tab to select and analyze sprites.</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="export" className="space-y-4">
            <Card className="bg-slate-800/50 border-amber-900/30">
              <CardHeader>
                <CardTitle className="text-amber-200 flex items-center gap-2">
                  <FileCode className="w-5 h-5" />
                  Export Sprite Manifest
                </CardTitle>
                <CardDescription className="text-amber-100/70">
                  Generate TypeScript code for approved sprites, ready to use in RPG and Dungeon systems
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-900 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-amber-200">{analyzedSprites.length}</div>
                    <div className="text-amber-100/70 text-sm">Total Analyzed</div>
                  </div>
                  <div className="bg-slate-900 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-emerald-400">{analyzedSprites.filter(s => s.approved).length}</div>
                    <div className="text-emerald-300/70 text-sm">Approved</div>
                  </div>
                  <div className="bg-slate-900 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-amber-400">{analyzedSprites.filter(s => !s.approved).length}</div>
                    <div className="text-amber-300/70 text-sm">Pending Review</div>
                  </div>
                </div>

                <Separator className="bg-amber-900/30" />

                <div className="space-y-2">
                  <Label className="text-amber-200">Export Options</Label>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Switch id="include-directional" defaultChecked />
                      <Label htmlFor="include-directional" className="text-amber-100 text-sm">Include directional sprites</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch id="include-effects" defaultChecked />
                      <Label htmlFor="include-effects" className="text-amber-100 text-sm">Include effects</Label>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button
                    onClick={generateManifest}
                    disabled={analyzedSprites.filter(s => s.approved).length === 0}
                    className="bg-purple-600 hover:bg-purple-700"
                    data-testid="button-generate-manifest"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Manifest (.ts)
                  </Button>
                  <Button
                    variant="outline"
                    className="border-amber-500/50 text-amber-200 hover:bg-amber-900/30"
                    data-testid="button-copy-code"
                  >
                    <FileCode className="w-4 h-4 mr-2" />
                    Copy to Clipboard
                  </Button>
                </div>
              </CardContent>
            </Card>

            {analyzedSprites.filter(s => s.approved).length > 0 && (
              <Card className="bg-slate-800/50 border-amber-900/30">
                <CardHeader>
                  <CardTitle className="text-amber-200 text-sm">Approved Sprites Ready for Export</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2">
                      {analyzedSprites.filter(s => s.approved).map(sprite => (
                        <div
                          key={sprite.id}
                          className="flex items-center gap-3 p-2 bg-slate-900 rounded-lg"
                        >
                          <img
                            src={sprite.filePath}
                            alt={sprite.name}
                            className="w-10 h-10 object-contain"
                            style={{ imageRendering: "pixelated" }}
                          />
                          <div className="flex-1">
                            <div className="text-amber-200 text-sm">{sprite.name}</div>
                            <div className="text-amber-100/50 text-xs">{sprite.filePath}</div>
                          </div>
                          <Badge className="bg-emerald-600/50 text-emerald-200">{sprite.type}</Badge>
                          {sprite.directional !== "none" && (
                            <Badge variant="outline" className="border-purple-500/50 text-purple-300">
                              {sprite.directional}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="colorswap" className="space-y-4">
            <Card className="bg-slate-800/50 border-amber-900/30">
              <CardHeader>
                <CardTitle className="text-amber-200 flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  Color Swap Tool
                </CardTitle>
                <CardDescription className="text-amber-100/70">
                  Pick a color from the sprite sheet, then choose a new color to replace it across all character sheets.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ColorSwapTool
                  characterName={selectedFile?.name.replace(/\.[^.]+$/, '') || "character"}
                  spriteSheets={selectedFile ? [selectedFile.path] : [
                    "/sprites/heroes/human/retsuzen_sheet.png",
                    "/sprites/heroes/barbarian/diokles_sheet.png",
                    "/sprites/heroes/elf/launa_sheet.png",
                    "/sprites/enemies/barbarian/mcgill_sheet.png"
                  ]}
                  onSave={(modifiedSheets) => {
                    toast({
                      title: "Color Swaps Applied",
                      description: `Modified ${modifiedSheets.size} sprite sheets`,
                    });
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
