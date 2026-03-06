import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function IntroPage() {
  const [, setLocation] = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showEnter, setShowEnter] = useState(false);

  useEffect(() => {
    // Show enter button after a short delay or when video ends
    const timer = setTimeout(() => setShowEnter(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleEnter = () => {
    setLocation("/home");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-60"
        onEnded={() => setShowEnter(true)}
      >
        <source src="https://i.imgur.com/qpcjvpR.mp4" type="video/mp4" />
      </video>

      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/50" />

      <div className="relative z-10 flex flex-col items-center justify-center text-center p-6 max-w-4xl w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
        >
          <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-red-500 to-red-900 tracking-tighter drop-shadow-[0_0_15px_rgba(220,38,38,0.5)] mb-2 font-serif">
            GRUDGE
          </h1>
          <h2 className="text-3xl md:text-5xl font-bold text-stone-300 tracking-[0.2em] mb-12 font-serif border-b-2 border-red-900/50 pb-4 inline-block">
            WARLORDS
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: showEnter ? 1 : 0 }}
          transition={{ duration: 1 }}
          className="flex flex-col gap-6 items-center"
        >
          <p className="text-stone-400 max-w-lg text-lg leading-relaxed font-serif italic">
            "In the ashes of the old world, three factions rise to claim dominion. Choose your allegiance, forge your destiny."
          </p>

          <Button 
            onClick={handleEnter}
            size="lg"
            className="mt-8 text-xl px-12 py-8 bg-red-900/80 hover:bg-red-800 text-stone-100 border border-red-700 shadow-[0_0_20px_rgba(153,27,27,0.4)] transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_rgba(220,38,38,0.6)] font-serif tracking-widest uppercase"
          >
            Enter World
          </Button>
        </motion.div>
      </div>
      
      <div className="absolute bottom-8 text-stone-600 text-xs tracking-widest uppercase">
        Click to begin your journey
      </div>
    </div>
  );
}
