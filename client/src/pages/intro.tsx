import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { RACE_PORTRAITS, FACTION_EMBLEMS, CLASS_HERO_IMAGES, VIDEOS } from "@/lib/artAssets";

export default function IntroPage() {
  const [, setLocation] = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showEnter, setShowEnter] = useState(false);

  useEffect(() => {
    // Show the enter button after 2s regardless of auth state.
    // Authenticated users see "Continue" (goes to /home).
    // Guests see "Enter World" (also goes to /home — no forced redirect).
    const timer = setTimeout(() => setShowEnter(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleEnter = () => {
    // Always navigate to /home. If not authenticated, home.tsx will show
    // a login prompt — never a hard redirect that loops.
    setLocation("/home");
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#05060c] flex items-center justify-center overflow-hidden">
      <style>{`
        @keyframes intro-spin { to { transform: rotate(360deg) } }
        @keyframes intro-drift {
          0% { opacity:0; transform:translateY(0) scale(.6) }
          10% { opacity:.7 }
          100% { opacity:0; transform:translateY(-110vh) scale(1.2) }
        }
      `}</style>

      {/* Video background */}
      <video
        ref={videoRef}
        autoPlay muted playsInline loop
        className="absolute inset-0 w-full h-full object-cover opacity-40"
        onEnded={() => setShowEnter(true)}
      >
        <source src={VIDEOS.pirateKingBanner} type="video/mp4" />
      </video>

      {/* Overlay gradients */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(1200px 700px at 50% 110%, rgba(0,0,0,.8), transparent 55%), radial-gradient(800px 400px at 10% -10%, rgba(10,15,40,.6), transparent 60%), linear-gradient(180deg, rgba(5,6,12,.5), rgba(5,6,12,.9))' }} />

      {/* Animated conic sheen */}
      <div className="absolute -inset-[20%] pointer-events-none opacity-60" style={{ background: 'conic-gradient(from 0deg at 30% 40%, rgba(246,201,69,.06), transparent 25%, rgba(199,146,255,.05) 55%, transparent 80%, rgba(107,220,139,.04))', filter: 'blur(60px)', animation: 'intro-spin 45s linear infinite' }} />

      {/* Particle stars */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden mix-blend-screen opacity-60">
        {Array.from({ length: 30 }).map((_, i) => (
          <span key={i} className="absolute block w-[2px] h-[2px] rounded-full bg-white" style={{ left: `${Math.random() * 100}%`, bottom: `${Math.random() * 20}%`, animation: `intro-drift ${5 + Math.random() * 10}s linear ${Math.random() * 5}s infinite` }} />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center p-6 max-w-4xl w-full">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.3 }}
          className="mb-6"
        >
          <img src="/grudge-logo.png" alt="" className="w-20 h-20 mx-auto mb-4 drop-shadow-2xl" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
          <h1 className="text-6xl md:text-8xl font-cinzel font-black tracking-[6px] mb-1" style={{ background: 'linear-gradient(180deg, #f6c945 0%, #fff3c2 40%, #f6c945 70%, #8b6914 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 4px 20px rgba(246,201,69,0.4))' }}>
            GRUDGE
          </h1>
          <h2 className="text-2xl md:text-4xl font-cinzel font-bold text-[#cfd5f5] tracking-[0.4em] mb-2">
            WARLORDS
          </h2>
          <p className="text-[#9aa3c7] text-xs tracking-[4px] uppercase">By Racalvin The Pirate King</p>
        </motion.div>

        {/* Faction emblems */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: showEnter ? 1 : 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex gap-4 mb-6"
        >
          {Object.entries(FACTION_EMBLEMS).map(([name, src]) => (
            <div key={name} className="w-12 h-12 rounded-xl overflow-hidden border border-white/[.08] bg-[#0b0f1e] hover:border-amber-500/40 hover:scale-110 transition-all" title={name}>
              <img src={src} alt={name} className="w-full h-full object-cover" />
            </div>
          ))}
        </motion.div>

        {/* Race portrait strip */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: showEnter ? 1 : 0, y: showEnter ? 0 : 10 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="flex gap-2.5 mb-8"
        >
          {Object.entries(RACE_PORTRAITS).map(([race, src]) => (
            <div key={race} className="w-14 h-14 rounded-xl overflow-hidden border border-white/[.06] bg-[#0b0f1e] group cursor-pointer hover:-translate-y-1 transition-all hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-900/20">
              <img src={src} alt={race} className="w-full h-full object-cover object-top scale-105 group-hover:scale-115 transition-transform duration-500 saturate-[.85] brightness-[.8] group-hover:saturate-110 group-hover:brightness-100" />
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: showEnter ? 1 : 0 }}
          transition={{ duration: 1, delay: 0.6 }}
          className="flex flex-col gap-5 items-center"
        >
          <p className="text-[#9aa3c7] max-w-lg text-base leading-relaxed italic">
            "In the ashes of the old world, three factions rise to claim dominion. Choose your allegiance, forge your destiny."
          </p>

          <button
            onClick={handleEnter}
            className="mt-4 font-cinzel font-black text-lg px-14 py-4 rounded-xl border-0 cursor-pointer transition-all hover:-translate-y-1"
            style={{
              background: 'linear-gradient(180deg, #f6c945, #d8a819)',
              color: '#20180a',
              boxShadow: '0 14px 40px -10px rgba(246,201,69,.6)',
              letterSpacing: '2px',
            }}
          >
            ENTER WORLD
          </button>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 text-[#9aa3c7]/30 text-[10px] tracking-[4px] font-cinzel">
        GRUDGE WARLORDS v2.6.0 · © GRUDGE STUDIO
      </div>
    </div>
  );
}
