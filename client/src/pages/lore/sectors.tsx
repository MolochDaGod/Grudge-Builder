/**
 * /lore/sectors — sector rewrite dossiers index (grudge.studio lore).
 */
import { Link } from 'wouter';
import { LoreLayout } from './LoreLayout';
import {
  listSectorDossiers,
  dossierStatuses,
} from '@shared/definitions/sectorDossiers';
import {
  SECTOR_REWRITE_ORDER,
  SECTOR_REWRITE_PRINCIPLES,
  nextPipelineSector,
} from '@shared/definitions/sectorRewritePipeline';

const STAGE_COLOR: Record<string, string> = {
  queued: 'text-slate-500 border-slate-700',
  describe: 'text-sky-400 border-sky-700',
  info_published: 'text-cyan-400 border-cyan-700',
  build_spec: 'text-amber-400 border-amber-600',
  building: 'text-orange-400 border-orange-600',
  proof: 'text-violet-400 border-violet-600',
  complete: 'text-emerald-400 border-emerald-700',
};

export default function LoreSectorsPage() {
  const dossiers = listSectorDossiers();
  const statuses = dossierStatuses();
  const active = nextPipelineSector(statuses);

  return (
    <LoreLayout
      title="Sector dossiers"
      subtitle="One sector at a time: describe lore & locals → publish to info → build what fits → prove with live flyby."
    >
      <div className="mb-8 rounded-xl border border-amber-500/20 bg-amber-500/[.04] p-4">
        <p className="text-[10px] uppercase tracking-widest text-amber-500/80 mb-2">Pipeline</p>
        <p className="text-sm text-slate-300">
          Active sector:{' '}
          <span className="text-amber-300 font-mono font-semibold">{active ?? 'all complete'}</span>
        </p>
        <ol className="mt-3 space-y-1 text-[11px] text-slate-500 list-decimal list-inside">
          {SECTOR_REWRITE_PRINCIPLES.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ol>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-10">
        {SECTOR_REWRITE_ORDER.map((id, idx) => {
          const d = dossiers.find((x) => x.sectorId === id)!;
          const stage = statuses[id] ?? 'queued';
          return (
            <Link key={id} href={`/lore/sectors/${id}`}>
              <a className="block rounded-xl border border-white/10 bg-[#0b0f1e] p-4 no-underline hover:border-amber-500/30 transition-colors min-h-[150px]">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-[9px] font-mono text-slate-600">
                    #{idx + 1} · {d.legacyId}
                  </span>
                  <span
                    className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${STAGE_COLOR[stage] ?? STAGE_COLOR.queued}`}
                  >
                    {stage.replace('_', ' ')}
                  </span>
                </div>
                <h3
                  className="text-base font-bold text-white mb-1"
                  style={{ fontFamily: "'Cinzel', serif" }}
                >
                  {d.name}
                </h3>
                <p className="text-[11px] text-slate-500 italic mb-2">{d.subtitle}</p>
                <p className="text-[12px] text-slate-400 line-clamp-3 leading-relaxed">{d.tagline}</p>
              </a>
            </Link>
          );
        })}
      </div>

      <p className="text-[11px] text-slate-600">
        Production package:{' '}
        <a href="/production/dossiers-content.json" className="text-cyan-500/80 underline">
          dossiers-content.json
        </a>{' '}
        ·{' '}
        <a href="/production/sectors-content.json" className="text-cyan-500/80 underline">
          sectors-content.json
        </a>
      </p>
    </LoreLayout>
  );
}
