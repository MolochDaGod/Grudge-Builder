/**
 * TutorialT0ToolsPanel — wake-area craft teach for T0 harvest tools + review books.
 * Shows costs (sticks/stones), results, and craft buttons.
 */
import {
  TUTORIAL_REVIEW_BOOKS,
  TUTORIAL_T0_TOOLS,
  canCraftT0Tool,
  type TutorialT0ToolDef,
} from '@shared/definitions/tutorialShipwreckScene';

export interface TutorialT0ToolsPanelProps {
  sticks: number;
  stones: number;
  fiber?: number;
  craftedIds: string[];
  onCraft: (tool: TutorialT0ToolDef) => void;
  onCraftBook?: (bookId: string) => void;
  collapsed?: boolean;
  onToggle?: () => void;
}

export function TutorialT0ToolsPanel({
  sticks,
  stones,
  fiber = 0,
  craftedIds,
  onCraft,
  onCraftBook,
  collapsed,
  onToggle,
}: TutorialT0ToolsPanelProps) {
  if (collapsed) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="pointer-events-auto rounded-xl border border-emerald-700/50 bg-black/80 px-3 py-1.5 text-[11px] font-semibold text-emerald-100"
      >
        🪓 T0 Tools ({sticks}🪵 {stones}🪨)
      </button>
    );
  }

  return (
    <div className="pointer-events-auto w-[min(92vw,22rem)] rounded-2xl border border-emerald-700/40 bg-black/90 shadow-xl backdrop-blur-md overflow-hidden max-h-[min(70vh,28rem)] flex flex-col">
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-300">
          Harvest T0 · Wake Craft
        </span>
        <span className="ml-auto text-[10px] text-slate-400 font-mono">
          {sticks} sticks · {stones} stones
          {fiber > 0 ? ` · ${fiber} fiber` : ''}
        </span>
        {onToggle && (
          <button type="button" onClick={onToggle} className="text-slate-500 hover:text-white text-xs px-1">
            −
          </button>
        )}
      </div>

      <p className="px-3 py-1.5 text-[9px] text-slate-400 leading-snug border-b border-white/5">
        Gather sticks &amp; small stones between the wreck and rocks. Craft tools, then equip in harvest mode.
        Books review what each tool returns.
      </p>

      <div className="overflow-y-auto flex-1 px-2 py-2 space-y-1.5">
        {TUTORIAL_T0_TOOLS.map((tool) => {
          const owned = craftedIds.includes(tool.itemId) || craftedIds.includes(tool.id);
          const ok = canCraftT0Tool(tool, { stick: sticks, stone: stones, fiber });
          return (
            <div
              key={tool.id}
              className={`rounded-xl border px-2.5 py-2 ${
                owned
                  ? 'border-emerald-600/40 bg-emerald-950/30'
                  : 'border-white/10 bg-white/[0.03]'
              }`}
            >
              <div className="flex items-start gap-2">
                <span className="text-lg leading-none">{tool.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-white">{tool.name}</span>
                    {owned && (
                      <span className="text-[8px] uppercase text-emerald-400 font-bold">Owned</span>
                    )}
                  </div>
                  <p className="text-[9px] text-slate-400 leading-snug">{tool.description}</p>
                  <p className="text-[8px] text-amber-500/90 mt-0.5 font-mono">
                    Cost: {tool.cost.stick}🪵 {tool.cost.stone}🪨
                    {(tool.cost.fiber ?? 0) > 0 ? ` ${tool.cost.fiber}🧵` : ''}
                  </p>
                  <ul className="mt-1 space-y-0.5">
                    {tool.results.slice(0, 3).map((r) => (
                      <li key={r} className="text-[8px] text-cyan-300/80 leading-snug pl-2 border-l border-cyan-800/50">
                        {r}
                      </li>
                    ))}
                  </ul>
                  <p className="text-[8px] text-slate-500 mt-0.5">
                    Targets: {tool.harvestTargets.join(', ')}
                  </p>
                </div>
                {!owned && (
                  <button
                    type="button"
                    disabled={!ok}
                    onClick={() => onCraft(tool)}
                    className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold ${
                      ok
                        ? 'bg-emerald-700 text-white hover:bg-emerald-600'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    Craft
                  </button>
                )}
              </div>
            </div>
          );
        })}

        <div className="pt-1 border-t border-white/10 mt-1">
          <p className="text-[8px] uppercase tracking-wider text-slate-500 px-1 mb-1">Review books</p>
          {TUTORIAL_REVIEW_BOOKS.map((book) => {
            const owned = craftedIds.includes(book.id);
            const ok =
              sticks >= book.cost.stick && stones >= book.cost.stone && !owned;
            return (
              <div
                key={book.id}
                className="flex items-start gap-2 rounded-lg border border-white/5 px-2 py-1.5 mb-1"
              >
                <span>{book.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-medium text-amber-100">{book.name}</p>
                  <p className="text-[8px] text-slate-400">{book.summary}</p>
                </div>
                {!owned && onCraftBook && (
                  <button
                    type="button"
                    disabled={!ok}
                    onClick={() => onCraftBook(book.id)}
                    className={`text-[9px] px-1.5 py-0.5 rounded ${
                      ok ? 'bg-amber-800 text-amber-100' : 'bg-slate-800 text-slate-600'
                    }`}
                  >
                    Read
                  </button>
                )}
                {owned && <span className="text-[8px] text-emerald-400">✓</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
