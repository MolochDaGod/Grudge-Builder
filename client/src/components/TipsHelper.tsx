import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  HELPER_CHARACTERS, 
  HELPER_ANIMATION_CONFIG,
  createChromaKeyCanvas,
  startChromaKeyPlayback,
  type HelperRace,
  type HelperAnimationState 
} from "@/lib/puterIntegration";
import { X, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface TipsHelperProps {
  race?: HelperRace;
  tips: string[];
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  autoAdvance?: boolean;
  advanceInterval?: number;
  onClose?: () => void;
  className?: string;
  videoUrls?: Record<HelperAnimationState, string>;
}

const RACE_EMOJIS: Record<HelperRace, string> = {
  human: '🧑‍🎓',
  barbarian: '🧔',
  undead: '💀',
  orc: '👹',
  elf: '🧝',
  dwarf: '🧙'
};

export function TipsHelper({
  race = 'human',
  tips,
  position = 'bottom-right',
  autoAdvance = true,
  advanceInterval = 8000,
  onClose,
  className,
  videoUrls
}: TipsHelperProps) {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [animState, setAnimState] = useState<HelperAnimationState>('wave');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const timersRef = useRef<NodeJS.Timeout[]>([]);
  
  const helper = HELPER_CHARACTERS[race];
  const currentTip = tips[currentTipIndex];
  const currentVideoUrl = videoUrls?.[animState];

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(timer => clearTimeout(timer));
    timersRef.current = [];
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimState('talking');
    }, 2000);
    timersRef.current.push(timer);
    
    return () => clearTimers();
  }, [clearTimers]);

  useEffect(() => {
    if (!autoAdvance || tips.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentTipIndex(prev => (prev + 1) % tips.length);
      setAnimState('talking');
    }, advanceInterval);

    return () => clearInterval(interval);
  }, [autoAdvance, advanceInterval, tips.length]);

  useEffect(() => {
    const config = HELPER_ANIMATION_CONFIG[animState];
    if (!config.loop && config.nextState) {
      const timer = setTimeout(() => {
        setAnimState(config.nextState!);
      }, 3000);
      timersRef.current.push(timer);
      return () => clearTimeout(timer);
    }
  }, [animState]);

  useEffect(() => {
    if (videoRef.current && canvasRef.current && currentVideoUrl) {
      // Cleanup previous playback
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      video.src = currentVideoUrl;
      video.load();
      
      video.onloadeddata = () => {
        canvas.width = video.videoWidth || 360;
        canvas.height = video.videoHeight || 640;
        video.play().catch(() => {});
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
  }, [currentVideoUrl]);

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  const handleNextTip = () => {
    setCurrentTipIndex(prev => (prev + 1) % tips.length);
    setAnimState('talkandpoint');
  };

  if (!isVisible) return null;

  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4'
  };

  return (
    <div 
      className={cn(
        "fixed z-50 flex items-end gap-3",
        positionClasses[position],
        className
      )}
      data-testid="tips-helper"
    >
      <div className="relative w-24 h-32 flex-shrink-0">
        <div className="w-full h-full bg-gradient-to-t from-slate-900/80 to-transparent rounded-lg overflow-hidden">
          {currentVideoUrl ? (
            <>
              {/* Hidden video source for chroma key processing */}
              <video
                ref={videoRef}
                loop={HELPER_ANIMATION_CONFIG[animState].loop}
                muted
                playsInline
                className="hidden"
                crossOrigin="anonymous"
              />
              {/* Canvas showing green-removed character */}
              <canvas
                ref={canvasRef}
                className="w-full h-full object-contain"
                data-testid="helper-canvas"
              />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl animate-bounce">
              {RACE_EMOJIS[race]}
            </div>
          )}
        </div>
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-slate-800 px-2 py-0.5 rounded text-[10px] text-amber-400 font-medium whitespace-nowrap">
          {helper.name}
        </div>
      </div>

      <Card className="max-w-xs bg-slate-900/95 border-amber-600/50 backdrop-blur-sm shadow-xl">
        <CardContent className="p-3 relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute -top-1 -right-1 h-6 w-6 text-slate-400 hover:text-white"
            onClick={handleClose}
            data-testid="button-close-tips"
          >
            <X className="w-3 h-3" />
          </Button>

          <div className="flex items-start gap-2 mb-2">
            <MessageCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-amber-400 font-medium">{helper.title}</p>
              <p className="text-sm text-slate-200 mt-1 leading-relaxed">{currentTip}</p>
            </div>
          </div>

          {tips.length > 1 && (
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-700">
              <div className="flex gap-1">
                {tips.map((_, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "w-1.5 h-1.5 rounded-full transition-colors",
                      idx === currentTipIndex ? "bg-amber-400" : "bg-slate-600"
                    )}
                  />
                ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-amber-400 hover:text-amber-300"
                onClick={handleNextTip}
                data-testid="button-next-tip"
              >
                Next Tip
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export const PAGE_TIPS: Record<string, { race: HelperRace; tips: string[] }> = {
  character: {
    race: 'human',
    tips: [
      "Welcome to the Character Builder! Here you can create and customize your hero.",
      "Allocate attribute points wisely - each stat affects different aspects of combat.",
      "Hover over any attribute to see what bonuses it provides.",
      "Don't forget to equip abilities before heading into battle!"
    ]
  },
  combat: {
    race: 'orc',
    tips: [
      "COMBAT TIME! Pay attention to turn order at the top of the screen.",
      "Use abilities strategically - some have cooldowns between uses.",
      "Block and parry are affected by your Tactics attribute.",
      "Target enemy weaknesses for bonus damage!"
    ]
  },
  dungeon: {
    race: 'undead',
    tips: [
      "The dungeon is shrouded in darkness... Watch your step.",
      "Explore carefully - traps and treasure await around every corner.",
      "Fog of war reveals as you move. Stay alert for ambushes.",
      "Rest at checkpoints to recover health and mana."
    ]
  },
  professions: {
    race: 'dwarf',
    tips: [
      "Professions let you gather resources and craft powerful items!",
      "Each profession has 100 levels to master.",
      "Higher skill levels unlock better recipes and rare materials.",
      "Profession skills decay if not practiced - stay active!"
    ]
  },
  island: {
    race: 'elf',
    tips: [
      "Your home island is your sanctuary. Build and expand as you progress.",
      "Gather resources from nodes scattered across the landscape.",
      "Use the RTS camera controls to explore the entire island.",
      "Upgrade buildings to unlock new features and bonuses."
    ]
  },
  database: {
    race: 'barbarian',
    tips: [
      "The Database contains all weapons, armor, and items in the game!",
      "Items are sorted by tier from T1 (common) to T8 (legendary).",
      "Each weapon has unique abilities - check the skill icons!",
      "Use filters to find the perfect gear for your build."
    ]
  },
  missions: {
    race: 'human',
    tips: [
      "The Mission Board shows available quests for your faction.",
      "Missions reward gold, experience, and faction reputation.",
      "Some missions require specific levels or gear to attempt.",
      "Complete faction storylines to unlock legendary rewards!"
    ]
  }
};

export default TipsHelper;
