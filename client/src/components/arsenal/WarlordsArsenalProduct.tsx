/**
 * Warlords-era Arsenal product UI — icons, tiers, WCS craft links, tooltips.
 * Data: ObjectStore master-items / master-recipes (info.* mirror).
 * Class kits: WAND · GRIMOIRE · RANGER_LOG · BATTLE_DUAL (not voxel).
 */
import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Loader2, Search, Sparkles, Wrench } from 'lucide-react';
import { getTierDef } from '@shared/definitions/tierSystem';
import {
  craftSuiteUrl,
  itemTooltipLines,
  loadWarlordsArsenalCatalog,
  uniqueCategories,
  type WarlordsArsenalItem,
  type WarlordsRecipeBrief,
} from '@/lib/warlordsArsenalItems';
import { iconOnError } from '@/lib/iconResolver';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function WarlordsArsenalProduct({
  onOpenStudio,
}: {
  onOpenStudio?: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<WarlordsArsenalItem[]>([]);
  const [recipes, setRecipes] = useState<Map<string, WarlordsRecipeBrief>>(
    () => new Map(),
  );
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [tier, setTier] = useState<number | 'all'>('all');
  const [classOnly, setClassOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { items: list, recipesByUuid } = await loadWarlordsArsenalCatalog();
        if (cancelled) return;
        setItems(list);
        setRecipes(recipesByUuid);
        if (list[0]) setSelectedId(list[0].uuid);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load arsenal');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(() => uniqueCategories(items), [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if (classOnly && !i.isClassItem) return false;
      if (category !== 'all' && i.category !== category && i.weaponType !== category) {
        return false;
      }
      if (tier !== 'all' && i.tier !== tier) return false;
      if (!q) return true;
      return (
        i.name.toLowerCase().includes(q) ||
        i.baseName.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q) ||
        i.weaponType.toLowerCase().includes(q) ||
        i.uuid.toLowerCase().includes(q)
      );
    });
  }, [items, search, category, tier, classOnly]);

  const selected =
    filtered.find((i) => i.uuid === selectedId) ||
    items.find((i) => i.uuid === selectedId) ||
    filtered[0] ||
    null;

  const recipe = selected?.recipeUuid
    ? recipes.get(selected.recipeUuid) ?? null
    : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-amber-100 tracking-wide flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-400" /> Warlords Arsenal
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-xl">
            Live catalog from info / ObjectStore · T0–T8 tiers · craft on WCS.
            Class kits (Wand, Grimoire, Ranger Log, Battle Dual) are Warlords-only
            — not migrated to voxel / GRUDOX.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={craftSuiteUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider px-3 py-2 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20"
          >
            <Wrench className="w-3.5 h-3.5" /> Craft suite (WCS)
            <ExternalLink className="w-3 h-3 opacity-60" />
          </a>
          {onOpenStudio && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenStudio}
              className="text-xs border-slate-600 text-slate-300"
            >
              Mesh studio (?studio=1)
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[12rem]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search weapons, armor, tools…"
            className="w-full pl-8 pr-3 py-2 rounded-lg bg-black/50 border border-slate-700 text-sm text-slate-100 outline-none focus:border-amber-500/50"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-2 py-2 rounded-lg bg-black/50 border border-slate-700 text-xs text-slate-200"
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={tier === 'all' ? 'all' : String(tier)}
          onChange={(e) =>
            setTier(e.target.value === 'all' ? 'all' : Number(e.target.value))
          }
          className="px-2 py-2 rounded-lg bg-black/50 border border-slate-700 text-xs text-slate-200"
        >
          <option value="all">All tiers</option>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((t) => (
            <option key={t} value={t}>
              T{t} {t === 0 ? 'Starter' : getTierDef(t).label}
            </option>
          ))}
        </select>
        <label className="inline-flex items-center gap-1.5 text-xs text-violet-200/90 cursor-pointer px-2 py-2 rounded-lg border border-violet-500/30 bg-violet-500/10">
          <input
            type="checkbox"
            checked={classOnly}
            onChange={(e) => setClassOnly(e.target.checked)}
          />
          Class kits only
        </label>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-slate-400 py-16 justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
          Loading master-items…
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-800/50 bg-rose-950/40 p-4 text-sm text-rose-200">
          {error}
          <p className="text-xs text-rose-300/70 mt-1">
            Expected ObjectStore / objectstore.grudge-studio.com master-items.json
          </p>
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[28rem]">
          <div className="lg:col-span-7 rounded-xl border border-slate-700/60 bg-black/40 overflow-hidden flex flex-col">
            <div className="px-3 py-2 border-b border-slate-700/50 text-[11px] text-slate-400 uppercase tracking-wider">
              {filtered.length} items
            </div>
            <div className="flex-1 overflow-y-auto max-h-[32rem] p-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {filtered.map((item) => {
                const tDef = getTierDef(Math.max(1, item.tier || 1));
                const on = selected?.uuid === item.uuid;
                const tip = itemTooltipLines(item, recipes.get(item.recipeUuid || '')).join(
                  '\n',
                );
                return (
                  <button
                    key={item.uuid}
                    type="button"
                    title={tip}
                    onClick={() => setSelectedId(item.uuid)}
                    className={cn(
                      'text-left rounded-lg border p-2 transition bg-slate-950/60 hover:border-amber-500/40',
                      on
                        ? 'border-amber-400/60 shadow-[0_0_16px_rgba(251,191,36,0.15)]'
                        : 'border-slate-700/50',
                      item.isClassItem && 'ring-1 ring-violet-500/30',
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <img
                        src={item.iconUrl}
                        alt=""
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        decoding="async"
                        className="w-10 h-10 rounded object-contain bg-black/50 border border-slate-700/50 shrink-0"
                        onError={(e) =>
                          iconOnError(e, {
                            category: item.category,
                            weaponType: item.weaponType,
                            name: item.name,
                            type: item.type,
                          })
                        }
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-100 truncate">
                          {item.name}
                        </div>
                        <div
                          className="text-[10px] font-medium"
                          style={{ color: tDef.color }}
                        >
                          T{item.tier} · {item.tierLabel}
                        </div>
                        {item.isClassItem && (
                          <div className="text-[9px] uppercase tracking-wider text-violet-300 mt-0.5">
                            Class kit
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <p className="col-span-full text-center text-sm text-slate-500 py-12">
                  No items match filters.
                </p>
              )}
            </div>
          </div>

          <aside className="lg:col-span-5 rounded-xl border border-amber-700/30 bg-black/50 p-4 space-y-3">
            {selected ? (
              <>
                <div className="flex gap-3">
                  <img
                    src={selected.iconUrl}
                    alt={selected.name}
                    referrerPolicy="no-referrer"
                    decoding="async"
                    className="w-20 h-20 rounded-lg object-contain bg-black/60 border border-amber-500/20"
                    onError={(e) =>
                      iconOnError(e, {
                        category: selected.category,
                        weaponType: selected.weaponType,
                        name: selected.name,
                        type: selected.type,
                      })
                    }
                  />
                  <div className="min-w-0">
                    <h2 className="font-display text-lg text-amber-50">
                      {selected.name}
                    </h2>
                    <p
                      className="text-sm font-semibold"
                      style={{
                        color: getTierDef(Math.max(1, selected.tier || 1)).color,
                      }}
                    >
                      T{selected.tier} · {selected.tierLabel}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1 font-mono truncate">
                      {selected.uuid}
                    </p>
                  </div>
                </div>

                {selected.isClassItem && (
                  <div className="rounded-lg border border-violet-500/40 bg-violet-950/40 px-3 py-2 text-xs text-violet-100">
                    <strong>Warlords class item</strong> — {selected.classRole}. Not
                    available as a voxel / GRUDOX prefab.
                  </div>
                )}

                <div className="grid grid-cols-2 gap-1.5">
                  {Object.entries(selected.stats || {}).map(([k, v]) => (
                    <div
                      key={k}
                      className="flex justify-between text-[11px] px-2 py-1 rounded bg-slate-900/80 border border-slate-700/40"
                    >
                      <span className="text-slate-400 capitalize">{k}</span>
                      <span className="text-amber-100 font-mono">{v}</span>
                    </div>
                  ))}
                </div>

                <div className="text-xs text-slate-400 space-y-1 border-t border-slate-700/50 pt-3">
                  <p>
                    <span className="text-slate-500">Type:</span> {selected.type} ·{' '}
                    {selected.weaponType || selected.category}
                  </p>
                  {selected.craftedBy && (
                    <p>
                      <span className="text-slate-500">Profession:</span>{' '}
                      {selected.craftedBy}
                    </p>
                  )}
                  {selected.modelR2Key && (
                    <p className="font-mono text-[10px] truncate">
                      Mesh: {selected.modelR2Key}
                    </p>
                  )}
                  {recipe?.ingredients && (
                    <p>
                      <span className="text-slate-500">Recipe:</span>{' '}
                      {recipe.ingredients
                        .slice(0, 6)
                        .map((i) => `${i.count ?? 1}× ${i.name || '?'}`)
                        .join(', ')}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <a
                    href={craftSuiteUrl(selected.recipeUuid)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider px-3 py-2 rounded-lg bg-gradient-to-b from-amber-500 to-amber-800 text-black border border-amber-300/40"
                  >
                    Craft in WCS
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Tooltip: hover grid cards for full stats. Icons from info.* /
                  assets CDN. Tiers match GRUDGE Item Database (T1 Common → T8
                  Legendary).
                </p>
              </>
            ) : (
              <p className="text-sm text-slate-500 py-12 text-center">
                Select an item
              </p>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
