/**
 * /lore/sectors/:sectorId — full dossier for grudge.studio info/lore.
 */
import { useRoute, Link } from 'wouter';
import { LoreLayout } from './LoreLayout';
import { getSectorDossier } from '@shared/definitions/sectorDossiers';
import { getSectorProductionContent } from '@shared/definitions/sectorProductionContent';
import { SECTOR_PROOF_CHECKLIST } from '@shared/definitions/sectorRewritePipeline';

export default function LoreSectorDetailPage() {
  const [, params] = useRoute('/lore/sectors/:sectorId');
  const sectorId = params?.sectorId ?? '';
  const d = getSectorDossier(sectorId);
  const prod = getSectorProductionContent(sectorId);

  if (!d) {
    return (
      <LoreLayout title="Unknown sector">
        <p className="text-slate-400">No dossier for <code className="text-amber-400">{sectorId}</code>.</p>
        <Link href="/lore/sectors">
          <a className="text-cyan-400 text-sm">← All sectors</a>
        </Link>
      </LoreLayout>
    );
  }

  return (
    <LoreLayout title={d.name} subtitle={d.subtitle}>
      <div className="flex flex-wrap gap-2 mb-6 text-[11px]">
        <Link href="/lore/sectors">
          <a className="text-slate-500 hover:text-amber-400 no-underline">← Dossiers</a>
        </Link>
        <span className="text-slate-700">·</span>
        <span className="font-mono text-slate-500">{d.sectorId}</span>
        <span className="text-slate-700">·</span>
        <span className="uppercase tracking-wider text-amber-500/80">{d.stage.replace('_', ' ')}</span>
        <span className="text-slate-700">·</span>
        <span className="text-slate-500">{d.mapCorner}</span>
      </div>

      <p className="text-lg text-slate-300 italic mb-6 leading-relaxed border-l-2 border-violet-500/40 pl-4">
        {d.tagline}
      </p>

      <section className="mb-10">
        <h2 className="text-lg font-bold text-amber-400/90 mb-2" style={{ fontFamily: "'Cinzel', serif" }}>
          Lore
        </h2>
        <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-line">{d.lore}</p>
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-bold text-amber-400/90 mb-2" style={{ fontFamily: "'Cinzel', serif" }}>
          Tone & design
        </h2>
        <p className="text-sm text-slate-400 leading-relaxed">{d.tone}</p>
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-bold text-amber-400/90 mb-3" style={{ fontFamily: "'Cinzel', serif" }}>
          Locals
        </h2>
        {d.locals.length === 0 ? (
          <p className="text-sm text-slate-600">Locals TBD — sector still queued for describe stage.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {d.locals.map((l) => (
              <article key={l.id} className="rounded-xl border border-white/10 bg-black/25 p-3">
                <div className="flex justify-between gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-white">{l.name}</h3>
                  <span className="text-[9px] uppercase text-slate-500">{l.role}</span>
                </div>
                {l.faction && (
                  <p className="text-[10px] text-violet-400/80 font-mono mb-1">{l.faction}</p>
                )}
                <p className="text-[12px] text-slate-400 leading-relaxed">{l.description}</p>
                {l.services && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {l.services.map((s) => (
                      <span
                        key={s}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-white/[.04] text-slate-500 border border-white/[.06]"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      {d.gameplayPillars.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-bold text-amber-400/90 mb-2" style={{ fontFamily: "'Cinzel', serif" }}>
            Gameplay pillars
          </h2>
          <ul className="list-disc list-inside text-sm text-slate-400 space-y-1">
            {d.gameplayPillars.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </section>
      )}

      {d.buildWants.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-bold text-amber-400/90 mb-3" style={{ fontFamily: "'Cinzel', serif" }}>
            Build wants (approved for this sector)
          </h2>
          <div className="space-y-3">
            {d.buildWants.map((b) => (
              <div key={b.id} className="rounded-lg border border-white/10 p-3 bg-[#0b0f1e]">
                <h3 className="text-sm font-semibold text-cyan-300/90">{b.title}</h3>
                <p className="text-[12px] text-slate-400 mt-1">{b.whyItFits}</p>
                <p className="text-[10px] text-slate-600 mt-1 font-mono">
                  depends: {b.dependsOn.join(' · ')}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {prod && (
        <section className="mb-10">
          <h2 className="text-lg font-bold text-amber-400/90 mb-3" style={{ fontFamily: "'Cinzel', serif" }}>
            Production package (live SSOT)
          </h2>
          <div className="grid sm:grid-cols-2 gap-2 text-[12px] text-slate-400 font-mono">
            <div className="rounded border border-white/10 p-2">ecosystem · {prod.ecosystemId}</div>
            <div className="rounded border border-white/10 p-2">PBR · {prod.harvest.groundPbr}</div>
            <div className="rounded border border-white/10 p-2">
              heightmap · {prod.terrain.heightmapModifier}
            </div>
            <div className="rounded border border-white/10 p-2">
              animals · {prod.wildlife.animals.join(', ')}
            </div>
            <div className="rounded border border-white/10 p-2 col-span-full">
              landmarks · {prod.events.landmarks.map((l) => l.id).join(', ') || '—'}
            </div>
          </div>
        </section>
      )}

      <section className="mb-10">
        <h2 className="text-lg font-bold text-amber-400/90 mb-2" style={{ fontFamily: "'Cinzel', serif" }}>
          Proof checklist
        </h2>
        <ul className="grid sm:grid-cols-2 gap-1 text-[12px] text-slate-500 mb-4">
          {SECTOR_PROOF_CHECKLIST.map((c) => (
            <li key={c.id}>□ {c.label}</li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <a
            href={d.playUrl.replace('https://client.grudge-studio.com', '')}
            className="px-3 py-2 rounded-lg bg-violet-700/80 hover:bg-violet-600 text-white text-xs no-underline"
          >
            Open live zone
          </a>
          <a
            href={d.flybyUrl.replace('https://client.grudge-studio.com', '')}
            className="px-3 py-2 rounded-lg bg-amber-700/80 hover:bg-amber-600 text-white text-xs no-underline"
          >
            Open with flyby proof
          </a>
        </div>
      </section>

      {d.notes && d.notes.length > 0 && (
        <section className="text-[11px] text-slate-600 space-y-1">
          {d.notes.map((n) => (
            <p key={n}>· {n}</p>
          ))}
        </section>
      )}
    </LoreLayout>
  );
}
