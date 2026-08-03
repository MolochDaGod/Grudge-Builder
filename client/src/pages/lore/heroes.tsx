import { Link } from 'wouter';
import { LoreLayout } from './LoreLayout';
import { FACTIONS, SECTOR_LORE, type FactionId } from '@shared/definitions/lore';
import { CANONICAL_HERO_CODEX } from '@shared/definitions/heroCodex';
import { CrusadeEmblem, FabledEmblem, LegionEmblem } from '@/components/FactionEmblems';
import { hideBrokenImage } from '@/lib/artAssets';

const ORDER: FactionId[] = ['crusade', 'legion', 'fabled'];
const EMBLEM = { crusade: CrusadeEmblem, legion: LegionEmblem, fabled: FabledEmblem } as const;

export default function LoreHeroesPage() {
  return (
    <LoreLayout
      title="Canonical heroes"
      subtitle="24 roster warlords from HERO_ROSTER — portraits from hero-codex · full profiles in the Codex."
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
        <Link href="/lore/factions">
          <a className="px-3 py-2 rounded-lg text-xs border border-white/15 text-slate-400 no-underline hover:text-amber-400">
            Faction dossiers
          </a>
        </Link>
        <span className="text-[11px] text-slate-500">
          {CANONICAL_HERO_CODEX.length} heroes · SSOT lore.ts + heroCodex.ts
        </span>
      </div>

      {ORDER.map((fid) => {
        const heroes = CANONICAL_HERO_CODEX.filter((h) => h.factionId === fid);
        const f = FACTIONS[fid];
        const Emblem = EMBLEM[fid];
        return (
          <section key={fid} className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <Emblem size={28} />
              <h2 className="text-lg font-bold" style={{ color: f.color, fontFamily: "'Cinzel', serif" }}>
                {f.name}
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {heroes.map((h) => (
                <article
                  key={h.id}
                  className="rounded-xl border border-white/10 bg-[#0b0f1e] overflow-hidden flex flex-col"
                >
                  <div className="aspect-[5/4] relative bg-black/40">
                    <img
                      src={h.portrait}
                      alt={h.name}
                      className="absolute inset-0 w-full h-full object-cover object-top"
                      onError={(e) => {
                        const el = e.currentTarget;
                        if (h.sprite && !el.src.endsWith(h.sprite)) {
                          el.src = h.sprite;
                          return;
                        }
                        hideBrokenImage(e);
                      }}
                    />
                    <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#0b0f1e] to-transparent" />
                  </div>
                  <div className="p-4 flex flex-col flex-1">
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
                      Spawns · {SECTOR_LORE[h.sectorSpawn as keyof typeof SECTOR_LORE]?.name ?? h.sectorSpawn}
                    </div>
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
