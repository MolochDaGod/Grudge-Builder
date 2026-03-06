import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Anchor, Ship } from "lucide-react";

interface IslandCutsceneProps {
  onComplete: (islandName: string) => void;
  defaultName?: string;
}

export function IslandCutscene({ 
  onComplete, 
  defaultName = "Haven Isle",
}: IslandCutsceneProps) {
  const [phase, setPhase] = useState<'sailing' | 'land_ahead' | 'naming' | 'approaching'>('sailing');
  const [islandName, setIslandName] = useState(defaultName);
  const [sailPosition, setSailPosition] = useState(-100);
  const [approachPosition, setApproachPosition] = useState(40);

  useEffect(() => {
    if (phase === 'sailing') {
      const interval = setInterval(() => {
        setSailPosition(prev => {
          if (prev >= 40) {
            clearInterval(interval);
            setTimeout(() => setPhase('land_ahead'), 500);
            return 40;
          }
          return prev + 0.5;
        });
      }, 30);
      return () => clearInterval(interval);
    }
  }, [phase]);

  useEffect(() => {
    if (phase === 'land_ahead') {
      const timer = setTimeout(() => setPhase('naming'), 3000);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  useEffect(() => {
    if (phase === 'approaching') {
      const interval = setInterval(() => {
        setApproachPosition(prev => {
          if (prev >= 65) {
            clearInterval(interval);
            setTimeout(() => onComplete(islandName.trim() || defaultName), 800);
            return 65;
          }
          return prev + 0.8;
        });
      }, 30);
      return () => clearInterval(interval);
    }
  }, [phase, islandName, defaultName, onComplete]);

  const handleNameSubmit = () => {
    if (islandName.trim()) {
      setPhase('approaching');
    }
  };

  const currentBoatPosition = phase === 'approaching' ? approachPosition : sailPosition;

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-sky-900 via-sky-700 to-blue-900 overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-blue-950 via-blue-800 to-transparent" />
        
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="absolute bottom-0 left-0 right-0 h-32"
            style={{
              background: `linear-gradient(to top, rgba(30, 58, 138, ${0.3 + i * 0.2}), transparent)`,
            }}
            animate={{ x: [0, -50, 0] }}
            transition={{
              duration: 3 + i,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.5
            }}
          />
        ))}
      </div>

      <AnimatePresence>
        {(phase === 'land_ahead' || phase === 'naming' || phase === 'approaching') && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ 
              opacity: 1, 
              scale: phase === 'approaching' ? 1.2 : 1,
              x: phase === 'approaching' ? -50 : 0
            }}
            transition={{ duration: phase === 'approaching' ? 1.5 : 0.5 }}
            className="absolute top-1/3 right-1/4 transform -translate-y-1/2"
          >
            <div className="relative">
              <div className="w-64 h-32 bg-gradient-to-t from-green-900 to-green-700 rounded-t-full opacity-70" />
              <div className="absolute left-8 -top-4 w-20 h-24 bg-gradient-to-t from-green-800 to-green-600 rounded-t-full opacity-60" />
              <div className="absolute right-12 -top-2 w-16 h-20 bg-gradient-to-t from-green-700 to-green-500 rounded-t-full opacity-50" />
              {[...Array(5)].map((_, i) => (
                <div 
                  key={i}
                  className="absolute -top-8 w-4 h-8 bg-green-600 rounded-t-full"
                  style={{ left: `${20 + i * 40}px` }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="absolute bottom-1/3 z-10"
        style={{ left: `${currentBoatPosition}%` }}
        animate={phase !== 'approaching' ? { y: [0, -8, 0] } : { y: [0, -4, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="relative w-48 h-auto">
          <img 
            src="/sprites/pirate/sailboat-side.png" 
            alt="Sailboat Hull"
            className="w-full h-auto drop-shadow-2xl"
            style={{ imageRendering: 'pixelated' }}
          />
          <motion.img 
            src="/sprites/pirate/sailboat-sails-side.png" 
            alt="Sails"
            className="absolute top-0 left-0 w-full h-auto"
            style={{ imageRendering: 'pixelated' }}
            animate={{ rotate: [-1, 1, -1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          
          <div className="absolute bottom-[45%] left-1/2 transform -translate-x-1/2 flex gap-1">
            <img 
              src="/sprites/miniworld/Characters/Soldiers/Melee/AxemanTemplate.png" 
              alt="Axeman"
              className="w-8 h-8 object-contain"
              style={{ 
                imageRendering: 'pixelated',
                transform: 'scaleX(-1)'
              }}
            />
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {phase === 'sailing' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-8 left-1/2 transform -translate-x-1/2 text-center"
          >
            <p className="text-sky-200 text-lg font-cinzel tracking-wider">
              Sailing the endless seas...
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {phase === 'land_ahead' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -50 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="text-center">
              <motion.h1
                initial={{ y: 50 }}
                animate={{ y: 0 }}
                className="text-6xl md:text-8xl font-cinzel font-bold text-amber-400 drop-shadow-[0_0_30px_rgba(251,191,36,0.5)]"
              >
                LAND AHEAD!
              </motion.h1>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-4 flex items-center justify-center gap-2"
              >
                <p className="text-xl text-amber-200 font-cinzel">
                  An uncharted island awaits...
                </p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {phase === 'naming' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-24 left-1/2 transform -translate-x-1/2 z-30"
          >
            <div className="bg-slate-900/90 border border-amber-600/50 backdrop-blur-sm rounded-lg p-4 w-72">
              <h3 className="text-lg font-cinzel text-amber-400 text-center mb-3">
                Name Your Island
              </h3>
              <Input
                value={islandName}
                onChange={(e) => setIslandName(e.target.value)}
                placeholder="Enter island name..."
                className="bg-slate-800 border-slate-600 text-white text-center font-cinzel mb-3"
                maxLength={24}
                data-testid="input-island-name"
                onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
              />
              <Button
                onClick={handleNameSubmit}
                disabled={!islandName.trim()}
                className="w-full bg-amber-600 hover:bg-amber-500 text-white font-cinzel"
                data-testid="button-claim-island"
              >
                <Anchor className="w-4 h-4 mr-2" />
                Set Sail
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {phase === 'approaching' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute top-8 left-1/2 transform -translate-x-1/2 text-center"
          >
            <p className="text-amber-200 text-xl font-cinzel tracking-wider">
              Approaching {islandName}...
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute bottom-4 right-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (phase === 'naming') {
              handleNameSubmit();
            } else if (phase === 'approaching') {
              onComplete(islandName.trim() || defaultName);
            } else {
              setPhase('naming');
            }
          }}
          className="text-slate-400 hover:text-white"
          data-testid="button-skip-cutscene"
        >
          {phase === 'naming' ? 'Use Default Name' : phase === 'approaching' ? 'Skip' : 'Skip'}
        </Button>
      </div>
    </div>
  );
}
