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
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
  Sparkles,
  ArrowLeft,
  Play,
  Pause,
  RefreshCw,
  Download,
  Loader2,
  Plus,
  Trash2,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Wand2,
} from "lucide-react";
import { isPuterAvailable } from "@/lib/puterIntegration";
import {
  fetchSpriteUnitSpecs,
  createSpriteUnitSpec,
  startSpriteGeneration,
  GENERATION_PRESETS,
  type GenerationProgress,
} from "@/lib/spriteGenerationService";
import {
  RACE_DESCRIPTORS,
  CLASS_DESCRIPTORS,
  WEAPON_DESCRIPTORS,
  ARMOR_DESCRIPTORS,
  STYLE_DESCRIPTORS,
  DEFAULT_ANIMATIONS,
  buildPromptFromSpec,
} from "@shared/definitions/spriteGeneration";
import type { SpriteUnitSpec, SpriteGenerationJob, AnimationSlot } from "@shared/schema";
import { AnimationSlots } from "@shared/schema";

interface GenerationJobWithSpec extends SpriteGenerationJob {
  specName?: string;
}

export default function SpriteGeneratorPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("create");
  const [specs, setSpecs] = useState<SpriteUnitSpec[]>([]);
  const [selectedSpec, setSelectedSpec] = useState<SpriteUnitSpec | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress | null>(null);
  const [previewPrompt, setPreviewPrompt] = useState("");
  const [jobs, setJobs] = useState<GenerationJobWithSpec[]>([]);
  const puterReady = isPuterAvailable();

  const [formData, setFormData] = useState({
    name: "",
    unitId: "",
    category: "player",
    race: "human",
    classType: "warrior",
    faction: "",
    weapon: "sword",
    armor: "plate",
    style: "dark",
    frameWidth: 100,
    frameHeight: 100,
    animations: { ...DEFAULT_ANIMATIONS },
  });

  const loadSpecs = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchSpriteUnitSpecs();
      setSpecs(data);
    } catch (error) {
      console.error("Failed to load specs:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadJobs = useCallback(async () => {
    try {
      const response = await fetch("/api/sprite-generation-jobs");
      if (response.ok) {
        const jobsData = await response.json();
        const specsMap = new Map(specs.map(s => [s.id, s.name]));
        setJobs(jobsData.map((j: SpriteGenerationJob) => ({
          ...j,
          specName: specsMap.get(j.specId) || "Unknown"
        })));
      }
    } catch (error) {
      console.error("Failed to load jobs:", error);
    }
  }, [specs]);

  useEffect(() => {
    loadSpecs();
  }, [loadSpecs]);

  useEffect(() => {
    if (specs.length > 0) {
      loadJobs();
    }
  }, [specs, loadJobs]);

  useEffect(() => {
    const prompt = buildPromptFromSpec(formData.race, formData.classType, {
      weapon: formData.weapon,
      armor: formData.armor,
      style: formData.style,
    }, "idle");
    setPreviewPrompt(prompt);
  }, [formData]);

  const handleApplyPreset = (presetName: string) => {
    const preset = GENERATION_PRESETS[presetName as keyof typeof GENERATION_PRESETS];
    if (preset) {
      setFormData(prev => ({
        ...prev,
        race: preset.race,
        classType: preset.classType,
        weapon: preset.traits.weapon || "sword",
        armor: preset.traits.armor || "plate",
        style: preset.traits.style || "dark",
        name: presetName.charAt(0).toUpperCase() + presetName.slice(1),
        unitId: presetName.replace(/\s+/g, "_"),
      }));
      toast({ title: "Preset Applied", description: `Applied ${presetName} preset` });
    }
  };

  const handleCreateSpec = async () => {
    if (!formData.name || !formData.unitId) {
      toast({ title: "Error", description: "Name and Unit ID are required", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const spec = await createSpriteUnitSpec({
        name: formData.name,
        unitId: formData.unitId,
        category: formData.category,
        race: formData.race,
        classType: formData.classType,
        faction: formData.faction || null,
        traits: {
          weapon: formData.weapon,
          armor: formData.armor,
          style: formData.style,
        },
        frameWidth: formData.frameWidth,
        frameHeight: formData.frameHeight,
        animations: formData.animations,
        status: "draft",
        generatedAssets: null,
        basePath: null,
        objectStoragePath: null,
        promptTemplate: null,
        referenceImageUrl: null,
        generationSettings: null,
      } as any);

      if (spec) {
        toast({ title: "Spec Created", description: `Created ${formData.name} sprite spec` });
        await loadSpecs();
        setActiveTab("specs");
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to create spec", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartGeneration = async (spec: SpriteUnitSpec) => {
    if (!puterReady) {
      toast({ 
        title: "Puter AI Not Available", 
        description: "AI sprite generation requires Puter platform",
        variant: "destructive" 
      });
      return;
    }

    setSelectedSpec(spec);
    setActiveTab("generate");

    try {
      const result = await startSpriteGeneration(spec, (progress) => {
        setGenerationProgress(progress);
      });

      if (result.success) {
        toast({ title: "Generation Complete", description: `Generated ${Object.keys(result.images).length} animation sprites` });
      } else {
        toast({ title: "Generation Issues", description: `Completed with ${result.errors.length} errors`, variant: "destructive" });
      }

      // Auto-refresh jobs and specs after generation completes
      await Promise.all([loadSpecs(), loadJobs()]);
    } catch (error) {
      toast({ title: "Generation Failed", description: "An error occurred during generation", variant: "destructive" });
      await Promise.all([loadSpecs(), loadJobs()]);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "complete": return "bg-emerald-500/20 text-emerald-300 border-emerald-500/50";
      case "generating": return "bg-blue-500/20 text-blue-300 border-blue-500/50";
      case "failed": return "bg-red-500/20 text-red-300 border-red-500/50";
      default: return "bg-amber-500/20 text-amber-300 border-amber-500/50";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "complete": return <CheckCircle2 className="w-3 h-3" />;
      case "generating": return <Loader2 className="w-3 h-3 animate-spin" />;
      case "failed": return <XCircle className="w-3 h-3" />;
      default: return <Clock className="w-3 h-3" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto p-4">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/sprite-viewer">
            <Button variant="ghost" size="sm" className="text-amber-200 hover:text-amber-100" data-testid="link-sprite-viewer">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Viewer
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-amber-200 font-['Cinzel']">AI Sprite Generator</h1>
            <p className="text-amber-100/70 text-sm">Create new sprites using Puter AI image generation</p>
          </div>
          <Badge variant="outline" className={puterReady ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"}>
            {puterReady ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
            Puter AI {puterReady ? "Ready" : "Unavailable"}
          </Badge>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-slate-800/50 border border-amber-900/30">
            <TabsTrigger value="create" className="data-[state=active]:bg-amber-900/50 data-[state=active]:text-amber-200" data-testid="tab-create">
              <Plus className="w-4 h-4 mr-2" />
              Create Spec
            </TabsTrigger>
            <TabsTrigger value="specs" className="data-[state=active]:bg-amber-900/50 data-[state=active]:text-amber-200" data-testid="tab-specs">
              <Eye className="w-4 h-4 mr-2" />
              Sprite Specs ({specs.length})
            </TabsTrigger>
            <TabsTrigger value="generate" className="data-[state=active]:bg-amber-900/50 data-[state=active]:text-amber-200" data-testid="tab-generate">
              <Sparkles className="w-4 h-4 mr-2" />
              Generate
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-slate-800/50 border-amber-900/30">
                <CardHeader>
                  <CardTitle className="text-amber-200">Sprite Configuration</CardTitle>
                  <CardDescription className="text-slate-400">Define the visual characteristics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-amber-100">Name</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Dark Knight"
                        className="bg-slate-900/50 border-slate-700"
                        data-testid="input-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-amber-100">Unit ID</Label>
                      <Input
                        value={formData.unitId}
                        onChange={(e) => setFormData(prev => ({ ...prev, unitId: e.target.value }))}
                        placeholder="dark_knight"
                        className="bg-slate-900/50 border-slate-700"
                        data-testid="input-unit-id"
                      />
                    </div>
                  </div>

                  <Separator className="bg-slate-700" />

                  <div className="space-y-2">
                    <Label className="text-amber-100">Quick Presets</Label>
                    <div className="flex flex-wrap gap-2">
                      {Object.keys(GENERATION_PRESETS).map((preset) => (
                        <Button
                          key={preset}
                          size="sm"
                          variant="outline"
                          onClick={() => handleApplyPreset(preset)}
                          className="border-amber-700/50 text-amber-200 hover:bg-amber-900/30"
                          data-testid={`preset-${preset}`}
                        >
                          <Wand2 className="w-3 h-3 mr-1" />
                          {preset.charAt(0).toUpperCase() + preset.slice(1)}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <Separator className="bg-slate-700" />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-amber-100">Race</Label>
                      <Select value={formData.race} onValueChange={(v) => setFormData(prev => ({ ...prev, race: v }))}>
                        <SelectTrigger className="bg-slate-900/50 border-slate-700" data-testid="select-race">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.keys(RACE_DESCRIPTORS).map((race) => (
                            <SelectItem key={race} value={race}>{race.charAt(0).toUpperCase() + race.slice(1)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-amber-100">Class</Label>
                      <Select value={formData.classType} onValueChange={(v) => setFormData(prev => ({ ...prev, classType: v }))}>
                        <SelectTrigger className="bg-slate-900/50 border-slate-700" data-testid="select-class">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.keys(CLASS_DESCRIPTORS).map((cls) => (
                            <SelectItem key={cls} value={cls}>{cls.charAt(0).toUpperCase() + cls.slice(1)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-amber-100">Weapon</Label>
                      <Select value={formData.weapon} onValueChange={(v) => setFormData(prev => ({ ...prev, weapon: v }))}>
                        <SelectTrigger className="bg-slate-900/50 border-slate-700" data-testid="select-weapon">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.keys(WEAPON_DESCRIPTORS).map((w) => (
                            <SelectItem key={w} value={w}>{w.charAt(0).toUpperCase() + w.slice(1)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-amber-100">Armor</Label>
                      <Select value={formData.armor} onValueChange={(v) => setFormData(prev => ({ ...prev, armor: v }))}>
                        <SelectTrigger className="bg-slate-900/50 border-slate-700" data-testid="select-armor">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.keys(ARMOR_DESCRIPTORS).map((a) => (
                            <SelectItem key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-amber-100">Style</Label>
                      <Select value={formData.style} onValueChange={(v) => setFormData(prev => ({ ...prev, style: v }))}>
                        <SelectTrigger className="bg-slate-900/50 border-slate-700" data-testid="select-style">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.keys(STYLE_DESCRIPTORS).map((s) => (
                            <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator className="bg-slate-700" />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-amber-100">Frame Width</Label>
                      <Input
                        type="number"
                        value={formData.frameWidth}
                        onChange={(e) => setFormData(prev => ({ ...prev, frameWidth: parseInt(e.target.value) || 100 }))}
                        className="bg-slate-900/50 border-slate-700"
                        data-testid="input-frame-width"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-amber-100">Frame Height</Label>
                      <Input
                        type="number"
                        value={formData.frameHeight}
                        onChange={(e) => setFormData(prev => ({ ...prev, frameHeight: parseInt(e.target.value) || 100 }))}
                        className="bg-slate-900/50 border-slate-700"
                        data-testid="input-frame-height"
                      />
                    </div>
                  </div>

                  <Button 
                    onClick={handleCreateSpec} 
                    disabled={isLoading || !formData.name || !formData.unitId}
                    className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700"
                    data-testid="button-create-spec"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                    Create Sprite Spec
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-amber-900/30">
                <CardHeader>
                  <CardTitle className="text-amber-200">Prompt Preview</CardTitle>
                  <CardDescription className="text-slate-400">Generated AI prompt for idle animation</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="p-4 bg-slate-900/80 rounded-lg border border-slate-700">
                    <p className="text-slate-300 text-sm leading-relaxed font-mono">{previewPrompt}</p>
                  </div>

                  <div className="mt-4 space-y-2">
                    <Label className="text-amber-100">Enabled Animations</Label>
                    <div className="flex flex-wrap gap-2">
                      {AnimationSlots.map((slot) => {
                        const config = formData.animations[slot];
                        return (
                          <Badge
                            key={slot}
                            variant="outline"
                            className={config?.enabled ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-700/50 text-slate-500"}
                          >
                            {slot}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="specs" className="space-y-4">
            <Card className="bg-slate-800/50 border-amber-900/30">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-amber-200">Sprite Unit Specs</CardTitle>
                  <CardDescription className="text-slate-400">All defined sprite configurations</CardDescription>
                </div>
                <Button onClick={loadSpecs} variant="outline" size="sm" className="border-amber-700/50" data-testid="button-refresh-specs">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                  </div>
                ) : specs.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <p>No sprite specs created yet.</p>
                    <Button onClick={() => setActiveTab("create")} className="mt-4" data-testid="button-go-create">
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Spec
                    </Button>
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-3">
                      {specs.map((spec) => (
                        <Card key={spec.id} className="bg-slate-900/50 border-slate-700 hover:border-amber-700/50 transition-colors">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-amber-600 to-orange-600 rounded-lg flex items-center justify-center">
                                  <span className="text-xl">🗡️</span>
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-bold text-amber-100">{spec.name}</h4>
                                    <Badge variant="outline" className={getStatusColor(spec.status)}>
                                      {getStatusIcon(spec.status)}
                                      <span className="ml-1">{spec.status}</span>
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-slate-400">
                                    {spec.race} {spec.classType} • {spec.frameWidth}x{spec.frameHeight}px
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleStartGeneration(spec)}
                                  disabled={spec.status === "generating" || !puterReady}
                                  className="bg-gradient-to-r from-purple-600 to-pink-600"
                                  data-testid={`button-generate-${spec.id}`}
                                >
                                  {spec.status === "generating" ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  ) : (
                                    <Sparkles className="w-4 h-4 mr-2" />
                                  )}
                                  Generate
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="generate" className="space-y-4">
            <Card className="bg-slate-800/50 border-amber-900/30">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-amber-200">
                    {selectedSpec ? `Generating: ${selectedSpec.name}` : "Generation Status"}
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    {selectedSpec ? `Unit ID: ${selectedSpec.unitId}` : "Select a spec to start generation"}
                  </CardDescription>
                </div>
                <Button onClick={loadJobs} variant="outline" size="sm" className="border-amber-700/50" data-testid="button-refresh-jobs">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </CardHeader>
              <CardContent>
                {!selectedSpec ? (
                  <div className="text-center py-12 text-slate-400">
                    <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>Select a sprite spec from the Specs tab to start generation</p>
                  </div>
                ) : generationProgress ? (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-amber-100">
                          {generationProgress.currentStep === "complete" 
                            ? "Generation Complete!" 
                            : generationProgress.currentStep === "failed"
                              ? "Generation Failed"
                              : `Generating: ${generationProgress.currentStep}`}
                        </span>
                        <span className="text-slate-400">{generationProgress.progress}%</span>
                      </div>
                      <Progress value={generationProgress.progress} className="h-3" />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {Object.entries(generationProgress.generatedImages).map(([slot, imageUrl]) => (
                        <Card key={slot} className="bg-slate-900/50 border-slate-700 overflow-hidden">
                          <div className="aspect-square bg-slate-800 flex items-center justify-center">
                            {imageUrl ? (
                              <img src={imageUrl} alt={slot} className="w-full h-full object-contain" />
                            ) : (
                              <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
                            )}
                          </div>
                          <div className="p-2 text-center">
                            <span className="text-xs text-amber-200 font-medium">{slot}</span>
                          </div>
                        </Card>
                      ))}
                    </div>

                    {generationProgress.errors.length > 0 && (
                      <div className="p-4 bg-red-900/20 border border-red-700/50 rounded-lg">
                        <h4 className="text-red-300 font-medium mb-2">Errors:</h4>
                        <ul className="text-sm text-red-200/70 space-y-1">
                          {generationProgress.errors.map((error, i) => (
                            <li key={i}>• {error.step}: {error.message}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Button
                      onClick={() => handleStartGeneration(selectedSpec)}
                      disabled={!puterReady}
                      className="bg-gradient-to-r from-purple-600 to-pink-600"
                      data-testid="button-start-generation"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Start Generation
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Job History Section */}
            <Card className="bg-slate-800/50 border-amber-900/30">
              <CardHeader>
                <CardTitle className="text-amber-200">Generation History</CardTitle>
                <CardDescription className="text-slate-400">Past generation jobs and results</CardDescription>
              </CardHeader>
              <CardContent>
                {jobs.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No generation jobs yet</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-3">
                      {jobs.map((job) => (
                        <Card key={job.id} className="bg-slate-900/50 border-slate-700">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                  job.status === "completed" ? "bg-emerald-500/20" :
                                  job.status === "failed" ? "bg-red-500/20" :
                                  job.status === "running" ? "bg-blue-500/20" : "bg-amber-500/20"
                                }`}>
                                  {job.status === "completed" ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> :
                                   job.status === "failed" ? <XCircle className="w-5 h-5 text-red-400" /> :
                                   job.status === "running" ? <Loader2 className="w-5 h-5 text-blue-400 animate-spin" /> :
                                   <Clock className="w-5 h-5 text-amber-400" />}
                                </div>
                                <div>
                                  <h4 className="font-medium text-amber-100">{job.specName}</h4>
                                  <div className="flex items-center gap-2 text-xs text-slate-400">
                                    <span>{job.status}</span>
                                    <span>•</span>
                                    <span>{job.progress}% complete</span>
                                    {job.completedAt && (
                                      <>
                                        <span>•</span>
                                        <span>{new Date(job.completedAt).toLocaleDateString()}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {job.status === "completed" && job.generatedImages && Object.keys(job.generatedImages).length > 0 && (
                                  <Badge variant="outline" className="bg-emerald-500/20 text-emerald-300">
                                    {Object.keys(job.generatedImages).length} images
                                  </Badge>
                                )}
                                {job.errors && job.errors.length > 0 && (
                                  <Badge variant="outline" className="bg-red-500/20 text-red-300">
                                    {job.errors.length} errors
                                  </Badge>
                                )}
                              </div>
                            </div>
                            
                            {job.status === "completed" && job.generatedImages && Object.keys(job.generatedImages).length > 0 && (
                              <div className="mt-4 grid grid-cols-4 md:grid-cols-6 gap-2">
                                {Object.entries(job.generatedImages).slice(0, 6).map(([slot, imgData]) => {
                                  const imgUrl = typeof imgData === "string" ? imgData : (imgData as { url: string })?.url;
                                  return (
                                    <div key={slot} className="aspect-square bg-slate-800 rounded overflow-hidden">
                                      <img src={imgUrl} alt={slot} className="w-full h-full object-contain" />
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
