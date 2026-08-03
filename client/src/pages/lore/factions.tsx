/**
 * /lore/factions — Warlords three player factions + pirate NPC confederacy.
 * Icons: FactionEmblems SVG (production gold/red/cyan). Heroes: hero-codex portraits.
 */
import { Link } from 'wouter';
import { LoreLayout } from './LoreLayout';
import {
  FACTIONS,
  FACTION_LORE_BLURB,
  FACTION_RACE_LABELS,
  GODS,
  NPC_FACTIONS,
  SECTOR_LORE,
  type FactionId,
} from '@shared/definitions/lore';
import { CANONICAL_HERO_CODEX } from '@shared/definitions/heroCodex';
import { CrusadeEmblem, FabledEmblem, LegionEmblem } from '@/components/FactionEmblems';
import { LANDING_SECTION_ART, hideBrokenImage } from '@/lib/artAssets';
import { ExternalLink, Map, Swords } from 'lucide-react';

const EMBLEM = {
  crusade: CrusadeEmblem,
  legion: LegionEmblem,
  fabled: FabledEmblem,
} as const;

const ORDER: FactionId[] = ['crusade', 'legion', 'fabled'];

/** Home-sector flavor for each faction (from SECTOR_LORE / roster spawn). */
const FACTION_HOME: Record<FactionId, string> = {
  crusade: 'Cold marches · northern coasts · Red Storm prophecy',
  legion: 'Ash forges · southern fire · Waterfall chaos edge',
  fabled: 'Central isles · forges under ice & starlaw',
};

export default function LoreFactionsPage() {
  return (
    <LoreLayout
      title="Factions"
      subtitle="Three player allegiances under Odin, Madra, and The Omni — plus the Pirate Confederacy at the center seas. Roster art from the Hero Codex."
    >
      <div className="space-y-8">
        {ORDER.map((id) => {
          const f = FACTIONS[id];
          const Emblem = EMBLEM[id];
          const god = GODS[f.patronGodId];
          const heroes = CANONICAL_HERO_CODEX.filter((h) => h.factionId === id);
          const raceLabels = FACTION_RACE_LABELS[id];
          const bg = LANDING_SECTION_ART[id];

          return (
            <article
              key={id}
              id={id}
              className="relative overflow-hidden rounded-2xl border bg-[#0b0f1e]"
              style={{ borderColor: `${f.color}40` }}
            >
              {/* Faction plate art */}
              <div
                className="absolute inset-0 bg-cover bg-center opacity-40"
                style={{
                  backgroundImage: bg ? `url('${bg}')` : undefined,
                  filter: 'saturate(0.85) brightness(0.45)',
                }}
              />
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(120deg, ${f.color}28 0%, transparent 42%), linear-gradient(180deg, #05060c 0%, transparent 28%, #05060c 100%)`,
                }}
              />

              <div className="relative z-10 p-5 md:p-7 flex flex-col gap-6">
                <div className="flex flex-col sm:flex-row gap-5">
                  <div
                    className="shrink-0 w-20 h-20 rounded-2xl flex items-center justify-center border bg-black/50 backdrop-blur-sm"
                    style={{ borderColor: `${f.color}55` }}
                    aria-hidden
                  >
                    <Emblem size={56} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h2
                        className="text-2xl md:text-3xl font-bold text-white"
                        style={{ fontFamily: "'Cinzel', serif" }}
                      >
                        {f.name}
                      </h2>
                      <span
                        className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border"
                        style={{ borderColor: `${f.color}66`, color: f.color }}
                      >
                        Player faction
                      </span>
                    </div>
                    <p className="text-sm text-white/60 mb-1">{f.title}</p>
                    <p className="text-sm italic mb-3" style={{ color: f.color }}>
                      &ldquo;{f.motto}&rdquo;
                    </p>
                    <p className="text-sm text-slate-300/90 leading-relaxed max-w-3xl">
                      {FACTION_LORE_BLURB[id]}
                    </p>
                    <p className="text-xs text-slate-500 mt-3">
                      Patron{' '}
                      <strong className="text-slate-200">{god.name}</strong>
                      {' · '}
                      {god.title} — {god.domain}
                    </p>
                    <p className="text-[11px] text-slate-600 mt-1">{FACTION_HOME[id]}</p>
                  </div>
                </div>

                {/* Race chips — SSOT labels (Human+Barbarian, not Orc on Crusade) */}
                <div className="flex flex-wrap gap-2">
                  {raceLabels.map((label) => (
                    <span
                      key={label}
                      className="px-3 py-1 rounded-lg text-xs border font-medium"
                      style={{
                        borderColor: `${f.color}44`,
                        color: '#e2e8f0',
                        background: 'rgba(0,0,0,.35)',
                      }}
                    >
                      {label}
                    </span>
                  ))}
                  <span className="px-3 py-1 rounded-lg text-[11px] border border-white/10 text-slate-500">
                    Hostile · {f.hostileTo.map((h) => FACTIONS[h].name).join(' · ')}
                  </span>
                </div>

                {/* Canonical heroes with portraits */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <h3
                      className="text-sm font-bold tracking-wide"
                      style={{ color: f.color, fontFamily: "'Cinzel', serif" }}
                    >
                      Canonical heroes
                    </h3>
                    <Link href="/lore/heroes">
                      <a className="text-[11px] text-slate-500 hover:text-amber-400 no-underline">
                        Full roster →
                      </a>
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {heroes.map((h) => (
                      <Link key={h.id} href={`/hero-codex#${h.id}`}>
                        <a
                          className="group block rounded-xl border border-white/10 bg-black/40 overflow-hidden no-underline hover:border-white/25 transition-colors"
                        >
                          <div className="aspect-[4/5] relative bg-[#0a0c14]">
                            <img
                              src={h.portrait}
                              alt={h.name}
                              className="absolute inset-0 w-full h-full object-cover object-top opacity-90 group-hover:opacity-100 transition-opacity"
                              onError={(e) => {
                                const el = e.currentTarget;
                                if (h.sprite && el.src !== h.sprite) {
                                  el.src = h.sprite;
                                  return;
                                }
                                hideBrokenImage(e);
                              }}
                            />
                            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black via-black/70 to-transparent" />
                            <div className="absolute bottom-0 left-0 right-0 p-2">
                              <div className="text-[11px] font-bold text-white leading-tight truncate">
                                {h.name}
                              </div>
                              <div className="text-[9px] text-white/55 truncate">
                                {h.race} · {h.className}
                              </div>
                            </div>
                          </div>
                        </a>
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <Link href="/create-character">
                    <a
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold no-underline"
                      style={{ background: f.color, color: '#0a0a10' }}
                    >
                      <Swords className="w-3.5 h-3.5" /> Create in this era
                    </a>
                  </Link>
                  <Link href="/lore/sectors">
                    <a className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs border border-white/15 text-slate-300 no-underline hover:border-white/30">
                      <Map className="w-3.5 h-3.5" /> Sector dossiers
                    </a>
                  </Link>
                </div>
              </div>
            </article>
          );
        })}

        {/* Pirate NPC confederacy */}
        <article className="rounded-2xl border border-amber-900/45 bg-gradient-to-br from-amber-950/40 to-[#0b0f1e] p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="shrink-0 w-16 h-16 rounded-xl border border-amber-500/30 bg-black/40 overflow-hidden flex items-center justify-center">
              <img
                src="/hero-codex/hero-portraits/pirate_king.png"
                alt="Pirate King Racalvin"
                className="w-full h-full object-cover object-top"
                onError={hideBrokenImage}
              />
            </div>
            <div className="flex-1">
              <h2
                className="text-xl font-bold text-amber-400 mb-1"
                style={{ fontFamily: "'Cinzel', serif" }}
              >
                {NPC_FACTIONS.pirate.name}
              </h2>
              <p className="text-[11px] text-amber-500/70 mb-2">
                NPC · not selectable at create · center seas · Racalvin
              </p>
              <p className="text-sm text-slate-400 leading-relaxed">
                Neutral docks, embassies, and black-market services under the Pirate King.
                Default disposition is neutral toward all player factions. Turns hostile when a
                player holds a claim in the Nexus sector (
                {NPC_FACTIONS.pirate.hostilityCondition}).
              </p>
              <p className="text-[11px] text-slate-600 mt-2">
                Center · {SECTOR_LORE.CENTER?.name ?? 'Nexus waters'}
              </p>
            </div>
          </div>
        </article>

        <p className="text-[11px] text-slate-600 flex items-center gap-1.5">
          <ExternalLink className="w-3 h-3" />
          SSOT: <code className="text-slate-500">shared/definitions/lore.ts</code> + hero codex
          portraits · sector live inspect opens in Forge
        </p>
      </div>
    </LoreLayout>
  );
}
