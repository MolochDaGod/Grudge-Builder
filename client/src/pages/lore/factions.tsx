import { LoreLayout } from './LoreLayout';
import { FACTIONS, GODS, RACES, NPC_FACTIONS, type FactionId } from '@shared/definitions/lore';
import { CrusadeEmblem, FabledEmblem, LegionEmblem } from '@/components/FactionEmblems';

const EMBLEM = {
  crusade: CrusadeEmblem,
  legion: LegionEmblem,
  fabled: FabledEmblem,
} as const;

const ORDER: FactionId[] = ['crusade', 'legion', 'fabled'];

export default function LoreFactionsPage() {
  return (
    <LoreLayout
      title="Factions"
      subtitle="Player factions, races, and the pirate confederacy that watches the center seas."
    >
      <div className="space-y-6">
        {ORDER.map((id) => {
          const f = FACTIONS[id];
          const Emblem = EMBLEM[id];
          const god = GODS[f.patronGodId];
          return (
            <article
              key={id}
              className="rounded-2xl border p-6 bg-[#0b0f1e] flex flex-col md:flex-row gap-6"
              style={{ borderColor: `${f.color}35` }}
            >
              <div className="shrink-0 flex md:flex-col items-center gap-3">
                <Emblem size={64} />
                <div className="w-3 h-3 rounded-full" style={{ background: f.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "'Cinzel', serif" }}>
                  {f.name}
                </h2>
                <p className="text-sm text-slate-500 mb-1">{f.title}</p>
                <p className="text-amber-500/80 text-sm italic mb-4">&ldquo;{f.motto}&rdquo;</p>
                <p className="text-sm text-slate-400 mb-4">
                  Patron <strong className="text-slate-200">{god.name}</strong> — {god.domain}
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {f.races.map((rid) => (
                    <span
                      key={rid}
                      className="px-2.5 py-1 rounded-md text-xs border border-white/10 text-slate-300 bg-black/30"
                    >
                      {RACES[rid]?.name ?? rid}
                    </span>
                  ))}
                </div>
                <div className="text-xs text-slate-500">
                  Hostile to:{' '}
                  {f.hostileTo.map((h) => FACTIONS[h].name).join(', ')}
                </div>
              </div>
            </article>
          );
        })}

        <article className="rounded-2xl border border-amber-900/40 bg-amber-950/15 p-6">
          <h2 className="text-xl font-bold text-amber-400 mb-2" style={{ fontFamily: "'Cinzel', serif" }}>
            {NPC_FACTIONS.pirate.name}
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            NPC faction under Racalvin. Default disposition: neutral, with docks and black-market services.
            Becomes hostile when a player holds a claim in the Nexus sector (
            {NPC_FACTIONS.pirate.hostilityCondition}).
          </p>
        </article>
      </div>
    </LoreLayout>
  );
}
