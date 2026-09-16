/**
 * Warlords product landing — primary surface for grudge.studio / grudgewarlords.com
 * Art-forward: section backgrounds, faction cards, race tiles, production path.
 */
import { Link, useLocation } from 'wouter';
import { motion } from 'framer-motion';
import {
  BookOpen, Crown, Map, Swords, User, ChevronRight, Flame, Anchor, Globe, Leaf,
} from 'lucide-react';
import { WarlordsShell } from '@/components/WarlordsShell';
import { CrusadeEmblem, FabledEmblem, LegionEmblem } from '@/components/FactionEmblems';
import { useFleetVideo } from '@/hooks/use-fleet-video';
import { FACTIONS, GODS, SECTOR_LORE } from '@shared/definitions/lore';
import { gcsCreateHeroUrl } from '@/lib/warlordsProduct';
import {
  CLASS_STAGE_BACKGROUNDS,
  CLASS_ACCENT_COLORS,
  CLASS_CYCLE,
  RACE_PORTRAITS,
  LANDING_SECTION_ART,
  PRODUCTION_PATH_ART,
  hideBrokenImage,
} from '@/lib/artAssets';
import { useEffect, useState } from 'react';

const FACTION_UI = [
  {
    id: 'crusade' as const,
    Emblem: CrusadeEmblem,
    blurb: 'Humans and barbarians under Odin — valor, steel, and the Red Storm prophecy.',
    art: LANDING_SECTION_ART.crusade,
  },
  {
    id: 'legion' as const,
    Emblem: LegionEmblem,
    blurb: 'Orcs and undead of Madra — entropy, rebirth, and the expanding Waterfall.',
    art: LANDING_SECTION_ART.legion,
  },
  {
    id: 'fabled' as const,
    Emblem: FabledEmblem,
    blurb: 'Elves and dwarves of The Omni — balance, forge-craft, and ancient law.',
    art: LANDING_SECTION_ART.fabled,
  },
];

const PLAY_PATH = [
  {
    n: '01',
    title: 'War council',
    detail: 'Meet your crew · choose a world',
    href: '/lobby',
    icon: Flame,
    art: PRODUCTION_PATH_ART.opening,
  },
  {
    n: '02',
    title: 'Create hero',
    detail: 'Choose your race and calling',
    href: '/create-character',
    icon: Swords,
    art: PRODUCTION_PATH_ART.createHero,
  },
  {
    n: '03',
    title: 'Airship',
    detail: 'Prepare for your first voyage',
    href: '/combat',
    icon: Anchor,
    art: PRODUCTION_PATH_ART.tutorial,
  },
  {
    n: '04',
    title: 'Tutorial island',
    detail: 'Shipwreck · craft raft',
    href: '/tutorial',
    icon: Globe,
    art: PRODUCTION_PATH_ART.openWorld,
  },
  {
    n: '05',
    title: 'Home island',
    detail: 'Build a home beyond the storm',
    href: '/home-island',
    icon: Leaf,
    art: PRODUCTION_PATH_ART.homeIsland,
  },
];

function ArtPanel({
  src,
  className = '',
  children,
  dark = 0.72,
}: {
  src: string;
  className?: string;
  children: React.ReactNode;
  dark?: number;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/10 ${className}`}>
      <div
        className="absolute inset-0 bg-cover bg-center scale-105"
        style={{
          backgroundImage: `url('${src}'), linear-gradient(160deg,#12182a,#07090f)`,
          filter: 'saturate(0.9) brightness(0.55)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg,rgba(5,6,12,${dark * 0.35}) 0%,rgba(5,6,12,${dark}) 100%)`,
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export default function WarlordsLandingPage() {
  const [, setLocation] = useLocation();
  const introVideoSrc = useFleetVideo('warlordsIntro');
  const [activeClass, setActiveClass] = useState('warrior');
  const [heroBgFailed, setHeroBgFailed] = useState(false);

  useEffect(() => {
    let idx = 0;
    const t = setInterval(() => {
      idx = (idx + 1) % CLASS_CYCLE.length;
      setActiveClass(CLASS_CYCLE[idx]);
    }, 7000);
    return () => clearInterval(t);
  }, []);

  const accent = CLASS_ACCENT_COLORS[activeClass] ?? '#f6c945';
  const heroArt = heroBgFailed
    ? LANDING_SECTION_ART.heroFallback
    : CLASS_STAGE_BACKGROUNDS[activeClass] || LANDING_SECTION_ART.heroFallback;

  return (
    <WarlordsShell>
      {/* Hero */}
      <section className="relative min-h-[88vh] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          {/* Fallback base so we never show empty black if class art fails */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url('${LANDING_SECTION_ART.heroFallback}')`,
              filter: 'saturate(1.05) brightness(0.32)',
            }}
          />
          {CLASS_CYCLE.map((cls) => (
            <div
              key={cls}
              className="absolute inset-0 bg-cover bg-center transition-opacity duration-[1400ms]"
              style={{
                backgroundImage: `url('${CLASS_STAGE_BACKGROUNDS[cls]}')`,
                opacity: !heroBgFailed && cls === activeClass ? 1 : 0,
                filter: 'saturate(1.1) brightness(0.38)',
              }}
            />
          ))}
          {/* Probe class art once */}
          <img
            src={heroArt}
            alt=""
            className="hidden"
            onError={() => setHeroBgFailed(true)}
          />
          {introVideoSrc && (
            <video
              src={introVideoSrc}
              autoPlay
              muted
              playsInline
              loop
              preload="auto"
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover opacity-25 mix-blend-lighten"
            />
          )}
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(1000px 600px at 50% 100%,rgba(0,0,0,.85),transparent 55%),linear-gradient(180deg,rgba(5,6,12,.4),rgba(5,6,12,.93))',
            }}
          />
          <div
            className="absolute -inset-[20%] opacity-50 pointer-events-none"
            style={{
              background: `conic-gradient(from 0deg at 30% 40%, ${accent}18, transparent 30%)`,
              filter: 'blur(50px)',
            }}
          />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-4 py-20 w-full">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9 }}>
            <p className="text-[11px] tracking-[0.35em] uppercase text-amber-500/80 mb-3 font-medium">
              Warlords era · Freeform ARPG · grudge.studio
            </p>
            <h1
              className="text-5xl md:text-7xl font-black tracking-[0.12em] mb-2"
              style={{
                fontFamily: "'Cinzel', serif",
                background: 'linear-gradient(180deg,#f6c945 0%,#fff3c2 45%,#f6c945 70%,#8b6914 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              GRUDGE
            </h1>
            <h2
              className="text-2xl md:text-4xl tracking-[0.35em] text-[#cfd5f5] mb-4"
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              WARLORDS
            </h2>
            <p className="text-slate-400 max-w-xl text-base leading-relaxed mb-2">
              Three gods. Three factions. Nine seas of islands. The Cosmic Waterfall consumes the edge of existence —
              while Racalvin&apos;s Domain holds the center.
            </p>
            <p className="text-slate-500 text-sm mb-8 italic">By Racalvin the Pirate King</p>

            <div className="flex flex-wrap gap-3 mb-10">
              {/* Single primary CTA → /home resolves next production step (create / voyage / home island) */}
              <button
                type="button"
                onClick={() => {
                  setLocation('/lobby');
                }}
                className="px-8 py-3.5 rounded-xl font-bold tracking-wider border-0 cursor-pointer"
                style={{
                  fontFamily: "'Cinzel', serif",
                  background: 'linear-gradient(180deg,#f6c945,#d8a819)',
                  color: '#20180a',
                  boxShadow: '0 14px 40px -10px rgba(246,201,69,.55)',
                }}
              >
                ENTER THE LOBBY
              </button>
              <Link href="/lore">
                <a className="px-6 py-3.5 rounded-xl text-sm font-semibold tracking-wide border border-white/10 text-slate-300 no-underline inline-flex items-center gap-2 hover:border-amber-500/40">
                  <BookOpen className="w-4 h-4" />
                  Read the lore
                </a>
              </Link>
              <a
                href="/lore/tome-of-seasons-and-gods.html"
                className="px-6 py-3.5 rounded-xl text-sm font-semibold tracking-wide border border-white/10 text-slate-300 no-underline inline-flex items-center gap-2 hover:border-amber-500/40"
              >
                Black Tome
              </a>
            </div>

            <div className="flex gap-2 flex-wrap">
              {Object.entries(RACE_PORTRAITS).slice(0, 6).map(([race, src]) => (
                <div
                  key={race}
                  className="w-14 h-14 rounded-xl overflow-hidden border border-white/12 bg-[#0b0f1e] relative shadow-lg shadow-black/40 group"
                  title={race}
                >
                  <img
                    src={src}
                    alt={race}
                    className="absolute inset-0 w-full h-full object-cover object-top scale-105 group-hover:scale-110 transition-transform"
                    onError={hideBrokenImage}
                  />
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />
                  <span className="absolute bottom-0.5 inset-x-0 text-center text-[8px] uppercase tracking-wider text-white/80 capitalize">
                    {race}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Production path with art tiles */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold tracking-wide text-amber-400" style={{ fontFamily: "'Cinzel', serif" }}>
              Begin your journey
            </h3>
            <p className="text-slate-500 text-sm mt-1">
              Gather in the lobby, choose a hero, and set sail.
            </p>
          </div>
          <Link href="/lobby">
            <a className="text-xs text-amber-500/80 hover:text-amber-400 no-underline flex items-center gap-1">
              Open war council <ChevronRight className="w-3.5 h-3.5" />
            </a>
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {PLAY_PATH.map((step) => {
            const Icon = step.icon;
            return (
              <button
                key={step.n}
                type="button"
                onClick={() => setLocation(step.href)}
                className="group relative overflow-hidden rounded-2xl border border-white/10 text-left min-h-[140px] cursor-pointer"
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                  style={{
                    backgroundImage: `url('${step.art}')`,
                    filter: 'saturate(0.85) brightness(0.45)',
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/20" />
                <div className="relative z-10 p-3 h-full flex flex-col justify-end">
                  <span className="text-[10px] font-mono text-amber-400/80">{step.n}</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Icon className="w-3.5 h-3.5 text-amber-300/90" />
                    <span className="text-sm font-bold text-white" style={{ fontFamily: "'Cinzel', serif" }}>
                      {step.title}
                    </span>
                  </div>
                  <p className="text-[10px] text-white/50 mt-0.5">{step.detail}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Factions — art-backed cards */}
      <section className="relative py-16 overflow-hidden">
        <div
          className="absolute inset-0 opacity-30 bg-cover bg-center"
          style={{
            backgroundImage: `url('${LANDING_SECTION_ART.factions}')`,
            filter: 'saturate(0.7) brightness(0.35)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#05060c] via-[#05060c]/85 to-[#05060c]" />
        <div className="relative max-w-6xl mx-auto px-4">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h3 className="text-2xl font-bold tracking-wide text-amber-400" style={{ fontFamily: "'Cinzel', serif" }}>
                Three factions
              </h3>
              <p className="text-slate-500 text-sm mt-1">Choose your allegiance — or sail as a free warlord.</p>
            </div>
            <Link href="/lore/factions">
              <a className="text-xs text-amber-500/80 hover:text-amber-400 no-underline flex items-center gap-1">
                All faction lore <ChevronRight className="w-3.5 h-3.5" />
              </a>
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {FACTION_UI.map(({ id, Emblem, blurb, art }) => {
              const f = FACTIONS[id];
              return (
                <Link key={id} href="/lore/factions">
                  <a
                    className="group block relative overflow-hidden rounded-2xl min-h-[220px] border no-underline transition-transform hover:-translate-y-1"
                    style={{ borderColor: `${f.color}55` }}
                  >
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                      style={{
                        backgroundImage: `url('${art}')`,
                        filter: 'saturate(0.9) brightness(0.5)',
                      }}
                    />
                    <div
                      className="absolute inset-0"
                      style={{
                        background: `linear-gradient(160deg, ${f.color}33 0%, transparent 45%), linear-gradient(180deg, transparent 20%, #05060c 95%)`,
                      }}
                    />
                    <div className="relative z-10 p-5 h-full flex flex-col justify-end">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="rounded-xl bg-black/40 border border-white/10 p-1.5 backdrop-blur-sm overflow-hidden shadow-[0_0_24px_rgba(0,0,0,.45)]">
                          <Emblem size={52} className="drop-shadow-lg" />
                        </div>
                        <div>
                          <div className="font-bold text-white" style={{ fontFamily: "'Cinzel', serif" }}>
                            {f.name}
                          </div>
                          <div className="text-[11px] text-white/55">{f.motto}</div>
                        </div>
                      </div>
                      <p className="text-sm text-slate-300/90 leading-relaxed">{blurb}</p>
                      <div className="mt-3 text-[10px] uppercase tracking-wider" style={{ color: f.color }}>
                        Patron · {GODS[f.patronGodId].name}
                      </div>
                    </div>
                  </a>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* World + path */}
      <section className="max-w-6xl mx-auto px-4 py-10 grid md:grid-cols-2 gap-6">
        <ArtPanel src={LANDING_SECTION_ART.world} className="p-6 min-h-[280px]" dark={0.78}>
          <div className="flex items-center gap-2 text-amber-400 mb-3">
            <Map className="w-5 h-5" />
            <h3 className="font-bold tracking-wide" style={{ fontFamily: "'Cinzel', serif" }}>
              Nine sectors
            </h3>
          </div>
          <p className="text-sm text-slate-300/90 mb-4">
            Explore distant shores, frozen frontiers, and volcanic depths.
          </p>
          <ul className="grid grid-cols-2 gap-1.5 text-xs text-slate-400">
            {Object.values(SECTOR_LORE).slice(0, 6).map((s) => (
              <li key={s.position} className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-amber-500/70" />
                <span className="text-slate-200">{s.name}</span>
              </li>
            ))}
            <li className="text-amber-400/80">+ more…</li>
          </ul>
          <Link href="/lore/world">
            <a className="inline-flex items-center gap-1 mt-5 text-xs text-amber-300 no-underline hover:text-amber-200">
              World lore <ChevronRight className="w-3 h-3" />
            </a>
          </Link>
        </ArtPanel>

        <ArtPanel src={LANDING_SECTION_ART.path} className="p-6 min-h-[280px]" dark={0.8}>
          <div className="flex items-center gap-2 text-amber-400 mb-3">
            <Crown className="w-5 h-5" />
            <h3 className="font-bold tracking-wide" style={{ fontFamily: "'Cinzel', serif" }}>
              Your warlord path
            </h3>
          </div>
          <ol className="space-y-3 text-sm text-slate-300/90">
            <li className="flex gap-3">
              <span className="text-amber-400 font-mono text-xs">01</span>
              Sign in and gather your crew
            </li>
            <li className="flex gap-3">
              <span className="text-amber-400 font-mono text-xs">02</span>
              Choose an existing hero or create a new warlord
            </li>
            <li className="flex gap-3">
              <span className="text-amber-400 font-mono text-xs">03</span>
              Learn at Shipwreck Cove and explore the island sectors
            </li>
          </ol>
          <div className="flex flex-wrap gap-2 mt-5">
            <Link href="/account">
              <a className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold border border-white/20 text-slate-100 no-underline hover:border-amber-500/40 bg-black/30">
                <User className="w-3.5 h-3.5" /> Account
              </a>
            </Link>
            <Link href="/hero-codex">
              <a className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold border border-white/20 text-slate-100 no-underline hover:border-amber-500/40 bg-black/30">
                Hero codex
              </a>
            </Link>
            <button
              type="button"
              onClick={() => {
                window.location.href = gcsCreateHeroUrl();
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer border-0"
              style={{ background: 'rgba(246,201,69,.2)', color: '#f6c945' }}
            >
              <Swords className="w-3.5 h-3.5" /> Create hero
            </button>
          </div>
        </ArtPanel>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-10 flex flex-wrap gap-6 text-sm text-amber-300">
        <Link href="/lobby">Game lobby</Link>
        <Link href="/lobby/maps">Explore maps</Link>
        <Link href="/account">Your account</Link>
        <Link href="/diagnostics">Connection help</Link>
      </section>
    </WarlordsShell>
  );
}
