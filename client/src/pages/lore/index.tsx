import { Link } from 'wouter';
import { LoreLayout } from './LoreLayout';
import { GODS, FACTIONS, WATERFALL_CONFIG, HERO_ROSTER } from '@shared/definitions/lore';
import { ChevronRight } from 'lucide-react';

export default function LoreIndexPage() {
  return (
    <LoreLayout
      title="The Warlords Era"
      subtitle="Canonical cosmology for Grudge Warlords — gods, factions, heroes, and the nine seas."
    >
      <div className="prose prose-invert max-w-none">
        <div className="rounded-2xl border border-white/10 bg-[#0b0f1e] p-6 mb-8">
          <p className="text-slate-300 leading-relaxed text-[15px] m-0">
            The floating islands drift in an infinite sky. At the edge of existence, the{' '}
            <strong className="text-amber-400">Cosmic Waterfall</strong> — Madra&apos;s expanding domain of
            entropy — consumes land and memory. The Omni raised the islands so mortals might survive; Odin
            forges warriors to hold the line; Madra remakes those who fall.
          </p>
          <p className="text-slate-500 text-sm mt-4 mb-0 italic">{WATERFALL_CONFIG.description}</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { href: '/lore/gods', label: 'Gods', count: Object.keys(GODS).length, desc: 'Odin · Madra · Omni' },
            { href: '/lore/factions', label: 'Factions', count: Object.keys(FACTIONS).length, desc: 'Crusade · Legion · Fabled' },
            { href: '/lore/heroes', label: 'Heroes', count: HERO_ROSTER.length, desc: 'Canonical roster' },
            { href: '/lore/world', label: 'World', count: 9, desc: 'Sectors & cities' },
            { href: '/lore/sectors', label: 'Sectors', count: 9, desc: 'Rewrite dossiers · one at a time' },
          ].map((c) => (
            <Link key={c.href} href={c.href}>
              <a className="block rounded-xl border border-white/10 bg-black/30 p-4 no-underline hover:border-amber-500/30 transition-colors">
                <div className="text-2xl font-bold text-amber-400" style={{ fontFamily: "'Cinzel', serif" }}>
                  {c.count}
                </div>
                <div className="text-sm font-semibold text-white mt-1 flex items-center gap-1">
                  {c.label} <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">{c.desc}</div>
              </a>
            </Link>
          ))}
        </div>

        <div className="mt-10 rounded-xl border border-amber-900/30 bg-amber-950/20 p-5">
          <div className="text-xs uppercase tracking-wider text-amber-500/80 mb-2">Racalvin&apos;s Domain</div>
          <p className="text-sm text-slate-400 m-0 leading-relaxed">
            At the center of the nine sectors sits the Pirate King&apos;s waters — neutral docks, faction embassies,
            the Arena, and merchant guilds. Ships from every warlord sea meet here. Holding a Nexus claim can turn
            pirate NPCs hostile.
          </p>
        </div>
      </div>
    </LoreLayout>
  );
}
