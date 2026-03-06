import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
  Sparkles,
  ArrowLeft,
  Play,
  Download,
  Loader2,
  Eye,
  CheckCircle2,
  XCircle,
  Sword,
  Shield,
  Wand2,
  RefreshCw,
} from "lucide-react";
import { isPuterAvailable } from "@/lib/puterIntegration";
import {
  RACE_SPRITE_CONFIGS,
  buildRacePrompt,
} from "@shared/definitions/spriteGeneration";
import type { AnimationSlot } from "@shared/schema";

interface GeneratedSprite {
  race: string;
  animation: AnimationSlot;
  imageUrl: string;
  timestamp: number;
}

const ANIMATIONS_TO_GENERATE: AnimationSlot[] = ["idle", "walk", "attack", "hurt", "death"];

export default function RaceSpriteGeneratorPage() {
  const { toast } = useToast();
  const [selectedRace, setSelectedRace] = useState<string>("barbarian");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentAnimation, setCurrentAnimation] = useState<string>("");
  const [generatedSprites, setGeneratedSprites] = useState<GeneratedSprite[]>([]);
  const [previewPrompt, setPreviewPrompt] = useState("");
  const puterReady = isPuterAvailable();

  const raceConfig = RACE_SPRITE_CONFIGS[selectedRace];
  const races = Object.entries(RACE_SPRITE_CONFIGS);

  useEffect(() => {
    if (raceConfig) {
      const prompt = buildRacePrompt(selectedRace, "idle");
      setPreviewPrompt(prompt);
    }
  }, [selectedRace, raceConfig]);

  async function generateSprite(prompt: string): Promise<string | null> {
    if (!window.puter?.ai?.txt2img) {
      console.warn("Puter AI not available");
      return null;
    }

    try {
      const imgElement = await window.puter.ai.txt2img(prompt, {
        model: "black-forest-labs/FLUX.1-schnell",
        quality: "medium",
        size: "1024x1024",
      });
      return imgElement.src;
    } catch (error) {
      console.error("Puter txt2img error:", error);
      return null;
    }
  }

  async function handleGenerateRace() {
    if (!puterReady) {
      toast({
        title: "AI Not Available",
        description: "Puter AI is not available. Please refresh and try again.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setGeneratedSprites([]);

    const totalAnimations = ANIMATIONS_TO_GENERATE.length;
    const newSprites: GeneratedSprite[] = [];

    for (let i = 0; i < totalAnimations; i++) {
      const animation = ANIMATIONS_TO_GENERATE[i];
      setCurrentAnimation(animation);
      setProgress(Math.round((i / totalAnimations) * 100));

      const prompt = buildRacePrompt(selectedRace, animation);
      
      try {
        const imageUrl = await generateSprite(prompt);
        
        if (imageUrl) {
          newSprites.push({
            race: selectedRace,
            animation,
            imageUrl,
            timestamp: Date.now(),
          });
          setGeneratedSprites([...newSprites]);
        }
      } catch (error) {
        console.error(`Failed to generate ${animation}:`, error);
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    setProgress(100);
    setCurrentAnimation("");
    setIsGenerating(false);

    toast({
      title: "Generation Complete",
      description: `Generated ${newSprites.length} sprites for ${raceConfig?.name || selectedRace}`,
    });
  }

  async function handleGenerateSingle(animation: AnimationSlot) {
    if (!puterReady) {
      toast({
        title: "AI Not Available",
        description: "Puter AI is not available.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setCurrentAnimation(animation);

    const prompt = buildRacePrompt(selectedRace, animation);
    
    try {
      const imageUrl = await generateSprite(prompt);
      
      if (imageUrl) {
        setGeneratedSprites(prev => [
          ...prev.filter(s => !(s.race === selectedRace && s.animation === animation)),
          {
            race: selectedRace,
            animation,
            imageUrl,
            timestamp: Date.now(),
          }
        ]);

        toast({
          title: "Sprite Generated",
          description: `Generated ${animation} animation for ${raceConfig?.name}`,
        });
      }
    } catch (error) {
      console.error(`Failed to generate ${animation}:`, error);
      toast({
        title: "Generation Failed",
        description: `Failed to generate ${animation} sprite`,
        variant: "destructive",
      });
    }

    setCurrentAnimation("");
    setIsGenerating(false);
  }

  function downloadSprite(sprite: GeneratedSprite) {
    const link = document.createElement("a");
    link.href = sprite.imageUrl;
    link.download = `${sprite.race}-${sprite.animation}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="sm" data-testid="button-back">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Admin
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Sparkles className="w-8 h-8 text-purple-400" />
              <h1 className="text-3xl font-bold text-white">Race Sprite Generator</h1>
            </div>
          </div>
          <Badge variant={puterReady ? "default" : "destructive"} data-testid="badge-ai-status">
            {puterReady ? "AI Ready" : "AI Unavailable"}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Select Race</CardTitle>
                <CardDescription>Choose a race to generate sprites</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {races.map(([raceKey, config]) => (
                    <Button
                      key={raceKey}
                      variant={selectedRace === raceKey ? "default" : "outline"}
                      className={`justify-start ${selectedRace === raceKey ? "bg-purple-600" : ""}`}
                      onClick={() => setSelectedRace(raceKey)}
                      data-testid={`button-race-${raceKey}`}
                    >
                      {config.name}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {raceConfig && (
              <Card className="bg-slate-800/50 border-slate-700 mt-4">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    {raceConfig.name}
                    {raceConfig.referenceImage && (
                      <Badge variant="secondary" className="text-xs">Has Reference</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>{raceConfig.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {raceConfig.referenceImage && (
                    <div className="relative">
                      <p className="text-xs text-slate-400 mb-2">Reference Image:</p>
                      <img 
                        src={raceConfig.referenceImage} 
                        alt={`${raceConfig.name} reference`}
                        className="w-full h-48 object-contain bg-slate-900 rounded-lg border border-slate-600"
                        data-testid="img-reference"
                      />
                    </div>
                  )}
                  
                  <div className="flex flex-wrap gap-1">
                    {raceConfig.features.map((feature, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="flex items-center gap-1 text-slate-400">
                      <Sword className="w-3 h-3" />
                      {raceConfig.defaultWeapon}
                    </div>
                    <div className="flex items-center gap-1 text-slate-400">
                      <Shield className="w-3 h-3" />
                      {raceConfig.defaultArmor}
                    </div>
                    <div className="flex items-center gap-1 text-slate-400">
                      <Wand2 className="w-3 h-3" />
                      {raceConfig.defaultStyle}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <div 
                      className="w-8 h-8 rounded border border-slate-600" 
                      style={{ backgroundColor: raceConfig.colors.primary }}
                      title="Primary"
                    />
                    <div 
                      className="w-8 h-8 rounded border border-slate-600" 
                      style={{ backgroundColor: raceConfig.colors.secondary }}
                      title="Secondary"
                    />
                    <div 
                      className="w-8 h-8 rounded border border-slate-600" 
                      style={{ backgroundColor: raceConfig.colors.accent }}
                      title="Accent"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="bg-slate-800/50 border-slate-700 mt-4">
              <CardHeader>
                <CardTitle className="text-white text-sm">AI Prompt Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-32">
                  <p className="text-xs text-slate-400 font-mono" data-testid="text-prompt">
                    {previewPrompt}
                  </p>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">Generate Sprites</CardTitle>
                  <Button
                    onClick={handleGenerateRace}
                    disabled={isGenerating || !puterReady}
                    className="bg-purple-600 hover:bg-purple-700"
                    data-testid="button-generate-all"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Generate All
                      </>
                    )}
                  </Button>
                </div>
                {isGenerating && (
                  <div className="space-y-2">
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-slate-400">
                      Generating {currentAnimation}... ({progress}%)
                    </p>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {ANIMATIONS_TO_GENERATE.map((animation) => {
                    const sprite = generatedSprites.find(
                      s => s.race === selectedRace && s.animation === animation
                    );
                    const isCurrentlyGenerating = isGenerating && currentAnimation === animation;

                    return (
                      <Card 
                        key={animation} 
                        className={`bg-slate-900/50 border-slate-600 ${isCurrentlyGenerating ? "ring-2 ring-purple-500" : ""}`}
                      >
                        <CardHeader className="p-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm text-white capitalize">{animation}</CardTitle>
                            {sprite ? (
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            ) : isCurrentlyGenerating ? (
                              <Loader2 className="w-4 h-4 text-purple-500 animate-spin" />
                            ) : (
                              <XCircle className="w-4 h-4 text-slate-500" />
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="p-3 pt-0">
                          <div className="aspect-square bg-slate-800 rounded-lg flex items-center justify-center overflow-hidden">
                            {sprite ? (
                              <img 
                                src={sprite.imageUrl} 
                                alt={`${selectedRace} ${animation}`}
                                className="w-full h-full object-contain"
                                data-testid={`img-sprite-${animation}`}
                              />
                            ) : isCurrentlyGenerating ? (
                              <div className="text-center p-4">
                                <Loader2 className="w-8 h-8 text-purple-500 animate-spin mx-auto mb-2" />
                                <p className="text-xs text-slate-400">Generating...</p>
                              </div>
                            ) : (
                              <div className="text-center p-4">
                                <Sparkles className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                                <p className="text-xs text-slate-500">Not generated</p>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2 mt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-xs"
                              onClick={() => handleGenerateSingle(animation)}
                              disabled={isGenerating}
                              data-testid={`button-generate-${animation}`}
                            >
                              <RefreshCw className="w-3 h-3 mr-1" />
                              Generate
                            </Button>
                            {sprite && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs"
                                onClick={() => downloadSprite(sprite)}
                                data-testid={`button-download-${animation}`}
                              >
                                <Download className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {generatedSprites.length > 0 && (
              <Card className="bg-slate-800/50 border-slate-700 mt-4">
                <CardHeader>
                  <CardTitle className="text-white">Generated Sprites Gallery</CardTitle>
                  <CardDescription>
                    {generatedSprites.length} sprites generated for {selectedRace}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                    {generatedSprites
                      .filter(s => s.race === selectedRace)
                      .map((sprite, i) => (
                        <div 
                          key={i}
                          className="relative aspect-square bg-slate-900 rounded-lg overflow-hidden group cursor-pointer border border-slate-700"
                          onClick={() => window.open(sprite.imageUrl, "_blank")}
                        >
                          <img 
                            src={sprite.imageUrl} 
                            alt={`${sprite.race} ${sprite.animation}`}
                            className="w-full h-full object-contain"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Eye className="w-6 h-6 text-white" />
                          </div>
                          <Badge className="absolute bottom-1 left-1 text-xs">
                            {sprite.animation}
                          </Badge>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
