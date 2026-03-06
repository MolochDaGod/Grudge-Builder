import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  HELPER_CHARACTERS, 
  HELPER_ANIMATION_CONFIG, 
  ANIMATION_PROMPTS,
  generateHelperPrompt,
  puterVideo,
  isPuterAvailable,
  startChromaKeyPlayback,
  type HelperRace,
  type HelperAnimationState 
} from "@/lib/puterIntegration";
import { Loader2, Play, Download, Sparkles, Video, User, Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const RACES: HelperRace[] = ['human', 'barbarian', 'undead', 'orc', 'elf', 'dwarf'];
const ANIMATIONS: HelperAnimationState[] = ['idle', 'idle2', 'idle3', 'talking', 'talking2', 'talkandpoint', 'excited', 'wave', 'sleep', 'getup'];

const FACTION_COLORS = {
  Crusade: 'bg-amber-600',
  Legion: 'bg-red-600',
  Fabled: 'bg-emerald-600'
};

export default function AIHelperGenerator() {
  const [selectedRace, setSelectedRace] = useState<HelperRace>('human');
  const [selectedAnimation, setSelectedAnimation] = useState<HelperAnimationState>('idle');
  const [isGenerating, setIsGenerating] = useState(false);
  const [testMode, setTestMode] = useState(true);
  const [generatedVideos, setGeneratedVideos] = useState<Map<string, string>>(new Map());
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [progress, setProgress] = useState({ current: 0, total: 0, state: '' });
  const [chromaKeyEnabled, setChromaKeyEnabled] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const { toast } = useToast();

  // Start chroma key processing when video changes
  useEffect(() => {
    const videoKey = getVideoKey(selectedRace, selectedAnimation);
    const videoSrc = generatedVideos.get(videoKey);
    
    if (videoRef.current && canvasRef.current && videoSrc && chromaKeyEnabled) {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      video.onloadeddata = () => {
        canvas.width = video.videoWidth || 360;
        canvas.height = video.videoHeight || 640;
      };
      
      video.onplay = () => {
        cleanupRef.current = startChromaKeyPlayback(video, canvas);
      };
    }
    
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [selectedRace, selectedAnimation, generatedVideos, chromaKeyEnabled]);

  const helper = HELPER_CHARACTERS[selectedRace];
  const animConfig = HELPER_ANIMATION_CONFIG[selectedAnimation];
  const getVideoKey = (race: HelperRace, anim: HelperAnimationState) => `${race}-${anim}`;
  const hasVideo = (race: HelperRace, anim: HelperAnimationState) => generatedVideos.has(getVideoKey(race, anim));

  const handleGenerateSingle = async () => {
    if (!isPuterAvailable()) {
      toast({
        title: "Puter Not Available",
        description: "Please run this app on Puter.com to use AI video generation",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    setCurrentPrompt(generateHelperPrompt(selectedRace, selectedAnimation));

    try {
      const video = await puterVideo.generateHelperAnimation(selectedRace, selectedAnimation, { 
        testMode, 
        seconds: 4 
      });
      
      if (video) {
        const key = `${selectedRace}-${selectedAnimation}`;
        const src = video.getAttribute('data-source') || video.src;
        setGeneratedVideos(prev => new Map(prev).set(key, src));
        
        if (videoRef.current) {
          videoRef.current.src = src;
          videoRef.current.load();
          videoRef.current.play();
        }

        toast({
          title: "Video Generated!",
          description: `${helper.name}'s ${selectedAnimation} animation is ready`
        });
      }
    } catch (error) {
      console.error('Generation error:', error);
      toast({
        title: "Generation Failed",
        description: "Could not generate video. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateAll = async () => {
    if (!isPuterAvailable()) {
      toast({
        title: "Puter Not Available",
        description: "Please run this app on Puter.com to use AI video generation",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    setProgress({ current: 0, total: ANIMATIONS.length, state: 'Starting...' });

    try {
      const results = await puterVideo.generateAllAnimationsForRace(
        selectedRace,
        (state, index, total) => {
          setProgress({ current: index + 1, total, state });
        },
        testMode
      );

      results.forEach((src, state) => {
        const key = `${selectedRace}-${state}`;
        setGeneratedVideos(prev => new Map(prev).set(key, src));
      });

      toast({
        title: "All Animations Generated!",
        description: `Generated ${results.size} animations for ${helper.name}`
      });
    } catch (error) {
      console.error('Batch generation error:', error);
      toast({
        title: "Generation Failed",
        description: "Some animations could not be generated.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
      setProgress({ current: 0, total: 0, state: '' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-cinzel text-amber-400 mb-2 flex items-center justify-center gap-3">
            <Wand2 className="w-10 h-10" />
            AI Helper Generator
          </h1>
          <p className="text-slate-400">Generate animated tutorial characters for each race using Puter AI</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="bg-slate-900/80 border-slate-700 lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-amber-400 flex items-center gap-2">
                <User className="w-5 h-5" /> Select Character
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Race</label>
                <Select value={selectedRace} onValueChange={(v) => setSelectedRace(v as HelperRace)}>
                  <SelectTrigger className="bg-slate-800 border-slate-600" data-testid="select-race">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RACES.map(race => (
                      <SelectItem key={race} value={race}>
                        {HELPER_CHARACTERS[race].name} ({race})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl font-cinzel text-white">{helper.name}</span>
                  <Badge className={FACTION_COLORS[helper.faction]}>{helper.faction}</Badge>
                </div>
                <p className="text-amber-400 text-sm mb-2">{helper.title}</p>
                <p className="text-slate-400 text-xs mb-2">{helper.personality}</p>
                <p className="text-slate-500 text-xs italic">{helper.appearance}</p>
              </div>

              <div>
                <label className="text-sm text-slate-400 mb-2 block">Animation</label>
                <Select value={selectedAnimation} onValueChange={(v) => setSelectedAnimation(v as HelperAnimationState)}>
                  <SelectTrigger className="bg-slate-800 border-slate-600" data-testid="select-animation">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ANIMATIONS.map(anim => {
                      const config = HELPER_ANIMATION_CONFIG[anim];
                      return (
                        <SelectItem key={anim} value={anim}>
                          {anim} {config.loop ? '(loop)' : '(once)'}
                          {hasVideo(selectedRace, anim) && ' ✓'}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-slate-800/30 rounded p-3 border border-slate-700">
                <p className="text-xs text-slate-400">
                  <span className="text-amber-400">Action:</span> {ANIMATION_PROMPTS[selectedAnimation]}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {animConfig.loop ? '🔄 Loops continuously' : '▶️ Plays once'}
                  {animConfig.nextState && ` → returns to ${animConfig.nextState}`}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="testMode" 
                  checked={testMode} 
                  onChange={(e) => setTestMode(e.target.checked)}
                  className="rounded"
                  data-testid="checkbox-testmode"
                />
                <label htmlFor="testMode" className="text-sm text-slate-400">
                  Test Mode (free, uses sample video)
                </label>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleGenerateSingle}
                  disabled={isGenerating}
                  className="flex-1 bg-amber-600 hover:bg-amber-500"
                  data-testid="button-generate-single"
                >
                  {isGenerating ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                  ) : (
                    <><Sparkles className="w-4 h-4 mr-2" /> Generate</>
                  )}
                </Button>
              </div>

              <Button 
                onClick={handleGenerateAll}
                disabled={isGenerating}
                variant="outline"
                className="w-full border-amber-600 text-amber-400 hover:bg-amber-600/20"
                data-testid="button-generate-all"
              >
                <Video className="w-4 h-4 mr-2" />
                Generate All Animations ({ANIMATIONS.length})
              </Button>

              {progress.total > 0 && (
                <div className="space-y-2">
                  <Progress value={(progress.current / progress.total) * 100} className="h-2" />
                  <p className="text-xs text-slate-400 text-center">
                    Generating {progress.state}... ({progress.current}/{progress.total})
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-slate-900/80 border-slate-700 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-amber-400 flex items-center gap-2">
                <Play className="w-5 h-5" /> Preview
              </CardTitle>
              <CardDescription className="flex items-center justify-between">
                <span>Generated animation preview</span>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={chromaKeyEnabled}
                    onChange={(e) => setChromaKeyEnabled(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-emerald-400">Green Screen Removal</span>
                </label>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="aspect-[9/16] max-h-[500px] bg-slate-800 rounded-lg overflow-hidden flex items-center justify-center border border-slate-700">
                {generatedVideos.has(getVideoKey(selectedRace, selectedAnimation)) ? (
                  <>
                    {/* Hidden video source for chroma key processing */}
                    <video 
                      ref={videoRef}
                      src={generatedVideos.get(getVideoKey(selectedRace, selectedAnimation))}
                      loop={animConfig.loop}
                      autoPlay
                      muted
                      playsInline
                      crossOrigin="anonymous"
                      className={chromaKeyEnabled ? "hidden" : "w-full h-full object-contain"}
                      data-testid="video-preview"
                    />
                    {/* Canvas showing green-removed character */}
                    {chromaKeyEnabled && (
                      <canvas
                        ref={canvasRef}
                        className="w-full h-full object-contain"
                        data-testid="canvas-preview"
                      />
                    )}
                  </>
                ) : (
                  <div className="text-center text-slate-500">
                    <Video className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p>No video generated yet</p>
                    <p className="text-xs mt-2">Click Generate to create {helper.name}'s {selectedAnimation} animation</p>
                  </div>
                )}
              </div>

              {currentPrompt && (
                <div className="mt-4 bg-slate-800/50 rounded p-3 border border-slate-700">
                  <p className="text-xs text-slate-500 mb-1">Generation Prompt:</p>
                  <p className="text-xs text-slate-400 font-mono">{currentPrompt}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="bg-slate-900/80 border-slate-700">
          <CardHeader>
            <CardTitle className="text-amber-400">Generated Library</CardTitle>
            <CardDescription>All generated helper animations</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="human">
              <TabsList className="bg-slate-800 mb-4 flex-wrap h-auto">
                {RACES.map(race => (
                  <TabsTrigger key={race} value={race} className="capitalize">
                    {race}
                    <Badge variant="outline" className="ml-2 text-xs">
                      {ANIMATIONS.filter(a => hasVideo(race, a)).length}/{ANIMATIONS.length}
                    </Badge>
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {RACES.map(race => (
                <TabsContent key={race} value={race}>
                  <ScrollArea className="h-[300px]">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                      {ANIMATIONS.map(anim => {
                        const key = getVideoKey(race, anim);
                        const videoSrc = generatedVideos.get(key);
                        return (
                          <div 
                            key={anim}
                            className={`aspect-video rounded-lg overflow-hidden border-2 ${
                              videoSrc ? 'border-emerald-500' : 'border-slate-700'
                            } bg-slate-800`}
                          >
                            {videoSrc ? (
                              <video 
                                src={videoSrc} 
                                loop={HELPER_ANIMATION_CONFIG[anim].loop}
                                muted
                                autoPlay
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-600">
                                <Video className="w-6 h-6" />
                              </div>
                            )}
                            <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-2 py-1">
                              <span className="text-xs text-white capitalize">{anim}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        <footer className="text-center text-slate-600 text-xs mt-8">
          Grudge Studio by RacalvinDaPirateKing
        </footer>
      </div>
    </div>
  );
}
