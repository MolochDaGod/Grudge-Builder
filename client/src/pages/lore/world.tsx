import { Link } from 'wouter';
import { LoreLayout } from './LoreLayout';
import { SECTOR_LORE, WORLD_CITIES, DUNGEON_DEFINITIONS, type SectorPosition } from '@shared/definitions/lore';
import { FACTIONS } from '@shared/definitions/lore';
import { listSectorDossiers } from '@shared/definitions/sectorDossiers';
import { LEGACY_TO_ZONE_ID, type LegacySectorId } from '@shared/definitions/sectorBridge';

const GRID: SectorPosition[][] = [
  ['NW', 'N', 'NE'],
  ['W', 'CENTER', 'E'],
  ['SW', 'S', 'SE'],
];

export default function LoreWorldPage() {
  return (
    <LoreLayout
      title="World & seas"
      subtitle="Nine production sectors (snake_case) map the 3×3 grid. Full rewrite dossiers live under Sectors — lore first, then build, then flyby proof."
    >
      <div className="mb-6 rounded-lg border border-violet-500/20 bg-violet-500/[.05] px-3 py-2 text-[12px] text-slate-400">
        Production rewrites use{' '}
        <Link href="/lore/sectors">
          <a className="text-violet-300 underline">sector dossiers</a>
        </Link>{' '}
        (one at a time). Active pilot: Ethereal Falls.
      </div>

      <div className="grid grid-cols-3 gap-2 mb-10 max-w-3xl">
        {GRID.flatMap((row) =>
          row.map((pos) => {
            const s = SECTOR_LORE[pos];
            const zoneId = LEGACY_TO_ZONE_ID[pos as LegacySectorId];
            const dossier = listSectorDossiers().find((d) => d.sectorId === zoneId);
            const control = s.controllingFaction ? FACTIONS[s.controllingFaction] : null;
            return (
              <Link key={pos} href={`/lore/sectors/${zoneId}`}>
                <a
                  className="block rounded-xl border border-white/10 bg-[#0b0f1e] p-3 min-h-[110px] no-underline hover:border-amber-500/30"
                  style={
                    control
                      ? { borderColor: `${control.color}40`, boxShadow: `inset 0 0 40px ${control.color}08` }
                      : undefined
                  }
                >
                  <div className="text-[9px] text-slate-600 font-mono mb-1">
                    {pos} · {zoneId}
                  </div>
                  <div className="text-sm font-bold text-white" style={{ fontFamily: "'Cinzel', serif" }}>
                    {dossier?.name ?? s.name}
                  </div>
                  <div className="text-[10px] text-slate-500 italic mb-1">
                    {dossier?.subtitle ?? s.subtitle}
                  </div>
                  <div className="text-[10px] text-slate-600">
                    {dossier ? `stage · ${dossier.stage}` : `Diff ${s.difficulty} · ${s.biome}`}
                  </div>
                </a>
              </Link>
            );
          }),
        )}
      </div>

      <div className="space-y-4 mb-12">
        {Object.values(SECTOR_LORE).map((s) => (
          <article key={s.position} className="rounded-xl border border-white/10 bg-black/25 p-4">
            <h3 className="text-base font-bold text-amber-400/90" style={{ fontFamily: "'Cinzel', serif" }}>
              {s.name}{' '}
              <span className="text-slate-600 font-normal text-xs font-mono">({s.position})</span>
            </h3>
            <p className="text-sm text-slate-400 mt-1 leading-relaxed">{s.description}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {s.specialFeatures.map((f) => (
                <span key={f} className="text-[10px] px-2 py-0.5 rounded bg-white/[.04] text-slate-500 border border-white/[.06]">
                  {f}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>

      <h2 className="text-lg font-bold text-white mb-3" style={{ fontFamily: "'Cinzel', serif" }}>
        Cities
      </h2>
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2 mb-10">
        {WORLD_CITIES.map((c) => (
          <div key={c.id} className="rounded-lg border border-white/10 px-3 py-2 text-sm">
            <span className="text-slate-200 font-medium">{c.name}</span>
            <span className="text-slate-600 text-xs ml-2">
              {c.sector} · unlock {c.unlockLevel}
            </span>
          </div>
        ))}
      </div>

      <h2 className="text-lg font-bold text-white mb-3" style={{ fontFamily: "'Cinzel', serif" }}>
        Dungeons
      </h2>
      <div className="grid sm:grid-cols-2 gap-3">
        {DUNGEON_DEFINITIONS.map((d) => (
          <div key={d.id} className="rounded-xl border border-white/10 bg-[#0b0f1e] p-4">
            <div className="text-[10px] uppercase text-slate-600">{d.type} · Lv {d.minLevel}+</div>
            <div className="font-semibold text-slate-100">{d.name}</div>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">{d.description}</p>
            <div className="text-[11px] text-amber-500/70 mt-2">
              Boss · {d.bossName}
            </div>
          </div>
        ))}
      </div>
    </LoreLayout>
  );
}
