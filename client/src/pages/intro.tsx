import { useState, useRef, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { LogIn } from "lucide-react";
import {
  RACE_PORTRAITS,
  CLASS_STAGE_BACKGROUNDS, CLASS_ACCENT_COLORS, CLASS_CYCLE,
} from "@/lib/artAssets";
import { useFleetVideo } from "@/hooks/use-fleet-video";
import { FactionEmblemRow } from "@/components/FactionEmblems";
import { useAuth } from "@/contexts/AuthContext";

const PARTICLE_COUNT = 50;

export default function IntroPage() {
  const [, setLocation] = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const introVideoSrc = useFleetVideo('warlordsIntro');
  const [showEnter, setShowEnter] = useState(false);
  const [activeClass, setActiveClass] = useState<string>("warrior");
  const { isAuthenticated, user, openLogin } = useAuth();

  // Stable particle definitions (no re-randomize on render)
  const particles = useMemo(() =>
    Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 20}s`,
      duration: `${6 + Math.random() * 14}s`,
      size: `${1 + Math.random() * 2.5}px`,
    })),
  []);

  useEffect(() => {
    const timer = setTimeout(() => setShowEnter(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Cycle through class backgrounds every 7s (matches RTS-Grudge MenuScreen)
  useEffect(() => {
    let idx = 0;
    const timer = setInterval(() => {
      idx = (idx + 1) % CLASS_CYCLE.length;
      setActiveClass(CLASS_CYCLE[idx]);
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  const handleEnter = () => {
    try {
      localStorage.setItem('warlords_opening_seen_v1', '1');
    } catch {
      /* ignore */
    }
    // Production pipeline: opening → create / tutorial / open world / home@20
    setLocation('/warlords/start');
  };
  const accentColor = CLASS_ACCENT_COLORS[activeClass] ?? "#f6c945";

  return (
    <div className="fixed inset-0 z-50 bg-[#05060c] flex items-center justify-center overflow-hidden">
      <style>{`
        @keyframes intro-spin { to { transform: rotate(360deg) } }
        @keyframes intro-drift {
          0% { opacity:0; transform:translateY(0) scale(.6) }
          10% { opacity:.8 }
          100% { opacity:0; transform:translateY(-110vh) scale(1.3) }
        }
        .stage-bg {
          position:absolute; inset:-4%; background-size:cover; background-position:center;
          filter:saturate(1.1) brightness(.4); transform:scale(1.06);
          transition:opacity 1.4s ease, transform 8s ease; opacity:0;
        }
        .stage-bg.active { opacity:1; transform:scale(1.02) }
        .race-card {
          position:relative; cursor:pointer; border:1px solid rgba(255,255,255,.08);
          border-radius:12px; overflow:hidden; background:#0b0f1e;
          transition:transform .22s ease, border-color .22s ease, box-shadow .22s ease;
        }
        .race-card:hover { transform:translateY(-3px); border-color:rgba(255,255,255,.22) }
        .race-card .portrait {
          position:absolute; inset:0; background-size:cover; background-position:center top;
          transform:scale(1.03); transition:transform .5s ease, filter .3s ease;
          filter:saturate(.85) brightness(.8);
        }
        .race-card:hover .portrait { transform:scale(1.12); filter:saturate(1.1) brightness(1) }
        .race-card::after {
          content:""; position:absolute; inset:0;
          background:linear-gradient(180deg, transparent 35%, rgba(6,8,16,.85));
        }
        .race-card .race-label {
          position:absolute; left:0; right:0; bottom:3px; z-index:2; text-align:center;
          font-family:'Cinzel',serif; font-size:8px; letter-spacing:1.5px; color:#fff;
          text-shadow:0 2px 6px rgba(0,0,0,.9); text-transform:capitalize;
        }
      `}</style>

      {/* Cycling class stage backgrounds */}
      <div className="absolute inset-0 overflow-hidden">
        {CLASS_CYCLE.map(cls => (
          <div
            key={cls}
            className={`stage-bg${cls === activeClass ? " active" : ""}`}
            style={{ backgroundImage: `url('${CLASS_STAGE_BACKGROUNDS[cls]}')` }}
          />
        ))}

        {/* Warlords era intro video (grudge loadin.mp4) */}
        {introVideoSrc && (
          <video
            ref={videoRef}
            src={introVideoSrc}
            autoPlay muted playsInline loop
            className="absolute inset-0 w-full h-full object-cover opacity-20"
          />
        )}

        {/* Dark vignette overlay */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(1200px 700px at 50% 110%, rgba(0,0,0,.78), transparent 55%), radial-gradient(900px 500px at 10% -10%, rgba(5,6,18,.65), transparent 60%), linear-gradient(180deg, rgba(5,6,12,.5), rgba(5,6,12,.88))' }} />

        {/* Accent-colored conic sheen that changes with active class */}
        <div className="absolute -inset-[20%] pointer-events-none opacity-70" style={{ background: `conic-gradient(from 0deg at 30% 40%, ${accentColor}18, transparent 25%, rgba(199,146,255,.10) 55%, transparent 80%)`, filter: 'blur(60px)', animation: 'intro-spin 40s linear infinite' }} />

        {/* Floating particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden mix-blend-screen opacity-70">
          {particles.map(p => (
            <span key={p.id} className="absolute block rounded-full bg-white" style={{ width: p.size, height: p.size, left: p.left, bottom: '-10px', opacity: 0, animation: `intro-drift ${p.duration} ${p.delay} linear infinite` }} />
          ))}
        </div>
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

          {/* Class cycle indicator dots */}
          <div className="flex items-center justify-center gap-2 mt-3">
            {CLASS_CYCLE.map(cls => (
              <div key={cls} className="transition-all duration-400" style={{
                width: 8, height: 8, borderRadius: '50%',
                background: cls === activeClass ? CLASS_ACCENT_COLORS[cls] : 'rgba(255,255,255,.15)',
                boxShadow: cls === activeClass ? `0 0 12px ${CLASS_ACCENT_COLORS[cls]}` : 'none',
              }} />
            ))}
          </div>
        </motion.div>

        {/* Faction emblems */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: showEnter ? 1 : 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex gap-4 mb-6"
        >
          <FactionEmblemRow size={30} />
        </motion.div>

        {/* Race portrait strip — animated card style from RTS-Grudge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: showEnter ? 1 : 0, y: showEnter ? 0 : 10 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="flex gap-2.5 mb-8"
        >
          {Object.entries(RACE_PORTRAITS).map(([race, src]) => (
            <div key={race} className="race-card" style={{ width: 56, height: 56 }}>
              <div className="portrait" style={{ backgroundImage: `url('${src}')` }} />
              <span className="race-label">{race}</span>
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

          <div className="flex flex-col sm:flex-row items-center gap-3 mt-4">
            {/* Primary CTA — authenticated users go straight in, guests see the same */}
            <button
              onClick={handleEnter}
              className="font-cinzel font-black text-lg px-14 py-4 rounded-xl border-0 cursor-pointer transition-all hover:-translate-y-1"
              style={{
                background: 'linear-gradient(180deg, #f6c945, #d8a819)',
                color: '#20180a',
                boxShadow: '0 14px 40px -10px rgba(246,201,69,.6)',
                letterSpacing: '2px',
              }}
            >
              {isAuthenticated ? 'CONTINUE' : 'ENTER WORLD'}
            </button>

            {/* Sign In button — only shown when not authenticated */}
            {!isAuthenticated && (
              <button
                onClick={openLogin}
                className="flex items-center gap-2 font-cinzel font-bold text-sm px-8 py-3 rounded-xl cursor-pointer transition-all hover:-translate-y-0.5"
                style={{
                  background: 'rgba(255,255,255,.06)',
                  color: '#cfd5f5',
                  border: '1px solid rgba(255,255,255,.12)',
                  letterSpacing: '2px',
                }}
              >
                <LogIn className="w-4 h-4" />
                SIGN IN
              </button>
            )}
          </div>

          {/* Welcome back line for authenticated users */}
          {isAuthenticated && user && (
            <p className="text-amber-400/60 text-xs mt-3 font-cinzel tracking-wider">
              Welcome back, {user.username || 'Warlord'}
            </p>
          )}
        </motion.div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 text-[#9aa3c7]/30 text-[10px] tracking-[4px] font-cinzel">
        GRUDGE WARLORDS v2.6.0 · © GRUDGE STUDIO
      </div>
    </div>
  );
}
