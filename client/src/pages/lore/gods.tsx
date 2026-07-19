import { LoreLayout } from './LoreLayout';
import { GODS, FACTIONS, type GodId } from '@shared/definitions/lore';

const ORDER: GodId[] = ['odin', 'madra', 'omni'];

export default function LoreGodsPage() {
  return (
    <LoreLayout title="The Three Gods" subtitle="Patrons of war, chaos, and balance.">
      <div className="grid md:grid-cols-3 gap-5">
        {ORDER.map((id) => {
          const g = GODS[id];
          const faction = FACTIONS[g.factionId];
          return (
            <article
              key={id}
              className="rounded-2xl border p-5 bg-[#0b0f1e]"
              style={{ borderColor: `${faction.color}40` }}
            >
              <div className="text-[10px] uppercase tracking-widest mb-2" style={{ color: faction.color }}>
                {g.title}
              </div>
              <h2 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: "'Cinzel', serif" }}>
                {g.name}
              </h2>
              <p className="text-xs text-slate-500 mb-4">{g.domain}</p>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                Blessing: <span className="text-slate-300">{g.blessingEffect}</span>
              </p>
              <div className="text-[11px] text-slate-500 mb-2">Artifacts</div>
              <ul className="text-xs text-slate-400 space-y-1 mb-4">
                {g.artifacts.map((a) => (
                  <li key={a}>· {a}</li>
                ))}
              </ul>
              <div className="text-[11px] text-slate-500">
                Temple · <span className="text-slate-400">{g.templeLocation}</span>
              </div>
              <div className="mt-3 text-[10px] uppercase tracking-wider" style={{ color: faction.color }}>
                Patron of {faction.name}
              </div>
            </article>
          );
        })}
      </div>
    </LoreLayout>
  );
}
