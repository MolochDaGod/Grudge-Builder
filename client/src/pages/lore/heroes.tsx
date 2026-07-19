import { Link } from 'wouter';
import { LoreLayout } from './LoreLayout';
import { FACTIONS, SECTOR_LORE, type FactionId } from '@shared/definitions/lore';
import { CANONICAL_HERO_CODEX } from '@shared/definitions/heroCodex';

const ORDER: FactionId[] = ['crusade', 'legion', 'fabled'];

export default function LoreHeroesPage() {
  return (
    <LoreLayout
      title="Canonical heroes"
      subtitle="24 roster warlords from HERO_ROSTER — full profiles in the Hero Codex."
    >
      <div className="mb-6 flex flex-wrap gap-3 items-center">
        <Link href="/hero-codex">
          <a
            className="px-4 py-2 rounded-lg text-xs font-bold no-underline"
            style={{ background: 'linear-gradient(180deg,#f6c945,#d8a819)', color: '#20180a' }}
          >
            Open full Hero Codex
          </a>
        </Link>
        <span className="text-[11px] text-slate-500">{CANONICAL_HERO_CODEX.length} heroes · SSOT lore.ts + heroCodex.ts</span>
      </div>

      {ORDER.map((fid) => {
        const heroes = CANONICAL_HERO_CODEX.filter((h) => h.factionId === fid);
        const f = FACTIONS[fid];
        return (
          <section key={fid} className="mb-10">
            <h2 className="text-lg font-bold mb-4" style={{ color: f.color, fontFamily: "'Cinzel', serif" }}>
              {f.name}
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {heroes.map((h) => (
                <article
                  key={h.id}
                  className="rounded-xl border border-white/10 bg-[#0b0f1e] p-4 flex flex-col"
                >
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">
                    {h.race} · {h.className} · Lv {h.level}
                  </div>
                  <h3 className="text-base font-bold text-white" style={{ fontFamily: "'Cinzel', serif" }}>
                    {h.name}
                  </h3>
                  <p className="text-xs italic mb-2" style={{ color: f.color }}>
                    {h.title}
                  </p>
                  <p className="text-[12px] text-slate-500 line-clamp-3 flex-1 leading-relaxed">{h.lore}</p>
                  <div className="mt-3 text-[10px] text-slate-600">
                    Spawns · {SECTOR_LORE[h.sectorSpawn]?.name ?? h.sectorSpawn}
                  </div>
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </LoreLayout>
  );
}
