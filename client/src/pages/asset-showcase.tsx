/**
 * Warlords Asset Showcase — mounts, buildings, benches, towers, boats.
 * Costs, HP, abilities, armor/weapons, add-ons for in-game usage.
 *
 * Route: /asset-showcase · /assets
 * SSOT: shared/definitions/warlordsAssetShowcase.ts + BuildAssetManifest merge
 */
import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import {
  Anchor,
  Castle,
  Download,
  Hammer,
  Mountain,
  Search,
  Shield,
  Ship,
  Swords,
  Tent,
  Wrench,
} from 'lucide-react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getMergedWarlordsAssetShowcase } from '@/lib/mergeBuildAssetShowcase';
import {
  filterShowcase,
  type ShowcaseFamily,
  type WarlordsShowcaseAsset,
} from '@shared/definitions/warlordsAssetShowcase';

const FAMILY_META: Record<
  ShowcaseFamily | 'all',
  { label: string; emoji: string; blurb: string }
> = {
  all: { label: 'All', emoji: '📦', blurb: 'Full production catalog' },
  mount: { label: 'Mounts', emoji: '🐴', blurb: 'Race cavalry (CDN uMMORPG)' },
  boat: { label: 'Boats', emoji: '⛵', blurb: 'Ships, waveboard, enemy states' },
  bench: { label: 'Benches', emoji: '🔨', blurb: 'Profession craft stations' },
  tower: { label: 'Towers', emoji: '🏰', blurb: 'Watchtowers + unit training' },
  building: { label: 'Buildings', emoji: '🏠', blurb: 'Homes, RTS, props' },
  camp: { label: 'Camps', emoji: '⛺', blurb: 'Outposts, tents, claim flag' },
  dock: { label: 'Docks', emoji: '⚓', blurb: 'Floating pads + fishing' },
  siege: { label: 'Siege', emoji: '💣', blurb: 'Catapult / bolt thrower' },
  modular: { label: 'Modular', emoji: '🧩', blurb: 'T1 wood snap pieces' },
  addon: { label: 'Add-ons', emoji: '➕', blurb: 'Storage & upgrades' },
  unit: { label: 'Units', emoji: '🛡️', blurb: 'Deployable captains / NPCs' },
};

function formatCost(a: WarlordsShowcaseAsset): string {
  const parts = a.cost
    .filter((c) => c.quantity > 0)
    .map((c) => `${c.quantity}× ${c.label ?? c.itemId}`);
  if (a.goldCost && a.goldCost > 0) parts.push(`${a.goldCost} gold`);
  return parts.length ? parts.join(' · ') : 'Free / no craft cost';
}

function StatusPill({ status }: { status: WarlordsShowcaseAsset['status'] }) {
  const cls =
    status === 'live'
      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-600/40'
      : status === 'partial'
        ? 'bg-amber-500/20 text-amber-200 border-amber-600/40'
        : 'bg-stone-500/20 text-stone-300 border-stone-600/40';
  return (
    <span className={cn('text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border', cls)}>
      {status}
    </span>
  );
}

function AssetCard({ asset }: { asset: WarlordsShowcaseAsset }) {
  const meta = FAMILY_META[asset.family];
  return (
    <article className="rounded-xl border border-stone-700/70 bg-stone-950/70 p-4 flex flex-col gap-3 hover:border-amber-700/50 transition-colors">
      <header className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 text-xs text-stone-500 mb-1">
            <span>{meta.emoji}</span>
            <span className="uppercase tracking-wide">{asset.family}</span>
            <StatusPill status={asset.status} />
          </div>
          <h3 className="text-base font-semibold text-stone-100 leading-tight">{asset.name}</h3>
          <p className="text-[11px] font-mono text-stone-500 mt-0.5">{asset.id}</p>
        </div>
      </header>

      <p className="text-sm text-stone-400 leading-snug line-clamp-3">{asset.description}</p>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs">
        {asset.stats.maxHp != null && (
          <div className="rounded-md bg-stone-900/80 px-2 py-1.5 border border-stone-800">
            <div className="text-stone-500">HP</div>
            <div className="text-rose-300 font-semibold">{asset.stats.maxHp}</div>
          </div>
        )}
        {asset.stats.armor != null && asset.stats.armor > 0 && (
          <div className="rounded-md bg-stone-900/80 px-2 py-1.5 border border-stone-800">
            <div className="text-stone-500">Armor</div>
            <div className="text-sky-300 font-semibold">{asset.stats.armor}</div>
          </div>
        )}
        {asset.stats.defense != null && (
          <div className="rounded-md bg-stone-900/80 px-2 py-1.5 border border-stone-800">
            <div className="text-stone-500">Defense</div>
            <div className="text-amber-300 font-semibold">{asset.stats.defense}</div>
          </div>
        )}
        {asset.stats.moveSpeedMps != null && (
          <div className="rounded-md bg-stone-900/80 px-2 py-1.5 border border-stone-800">
            <div className="text-stone-500">Speed</div>
            <div className="text-emerald-300 font-semibold">{asset.stats.moveSpeedMps} m/s</div>
          </div>
        )}
        {asset.stats.cannonSlots != null && asset.stats.cannonSlots > 0 && (
          <div className="rounded-md bg-stone-900/80 px-2 py-1.5 border border-stone-800">
            <div className="text-stone-500">Cannons</div>
            <div className="text-orange-300 font-semibold">{asset.stats.cannonSlots}</div>
          </div>
        )}
        {asset.stats.crewCap != null && (
          <div className="rounded-md bg-stone-900/80 px-2 py-1.5 border border-stone-800">
            <div className="text-stone-500">Crew</div>
            <div className="text-stone-200 font-semibold">{asset.stats.crewCap}</div>
          </div>
        )}
        {asset.stats.storageSlots != null && (
          <div className="rounded-md bg-stone-900/80 px-2 py-1.5 border border-stone-800">
            <div className="text-stone-500">Storage</div>
            <div className="text-stone-200 font-semibold">{asset.stats.storageSlots}</div>
          </div>
        )}
        {asset.stats.cargoCap != null && (
          <div className="rounded-md bg-stone-900/80 px-2 py-1.5 border border-stone-800">
            <div className="text-stone-500">Cargo</div>
            <div className="text-stone-200 font-semibold">{asset.stats.cargoCap}</div>
          </div>
        )}
      </div>

      {/* Recipe */}
      <div className="text-xs">
        <div className="text-stone-500 mb-0.5 flex items-center gap-1">
          <Hammer className="h-3 w-3" /> Recipe / cost
        </div>
        <div className="text-amber-100/90 font-medium">{formatCost(asset)}</div>
        {(asset.craftStation || asset.recipeId) && (
          <div className="text-stone-500 mt-0.5">
            {asset.craftStation && <span>Station: {asset.craftStation}</span>}
            {asset.craftTimeSec != null && asset.craftTimeSec > 0 && (
              <span> · {asset.craftTimeSec}s</span>
            )}
            {asset.recipeId && <span className="font-mono"> · {asset.recipeId}</span>}
          </div>
        )}
      </div>

      {/* Abilities */}
      {asset.abilities.length > 0 && (
        <div className="text-xs space-y-1">
          <div className="text-stone-500 flex items-center gap-1">
            <ZapIcon /> Abilities
          </div>
          <ul className="space-y-1">
            {asset.abilities.map((ab) => (
              <li key={ab.id} className="rounded bg-stone-900/60 px-2 py-1 border border-stone-800/80">
                <span className="text-violet-300 font-medium">{ab.name}</span>
                <span className="text-stone-500"> — {ab.description}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Attachments / weapons / armor */}
      {asset.attachments.length > 0 && (
        <div className="text-xs">
          <div className="text-stone-500 mb-1 flex items-center gap-1">
            <Swords className="h-3 w-3" /> Weapons / armor / attachments
          </div>
          <div className="flex flex-wrap gap-1">
            {asset.attachments.map((at) => (
              <span
                key={`${at.kind}-${at.id}`}
                className="rounded-full border border-stone-700 bg-stone-900 px-2 py-0.5 text-stone-300"
                title={at.notes}
              >
                <span className="text-stone-500">{at.kind}:</span> {at.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Unlocks / addons */}
      {(asset.unlocks?.length || asset.addOns?.length) ? (
        <div className="text-xs space-y-1 border-t border-stone-800 pt-2">
          {asset.unlocks?.length ? (
            <div>
              <span className="text-stone-500">Unlocks: </span>
              <span className="text-emerald-300/90">{asset.unlocks.join(' · ')}</span>
            </div>
          ) : null}
          {asset.addOns?.length ? (
            <div>
              <span className="text-stone-500">Add-ons: </span>
              <span className="text-sky-300/90">{asset.addOns.join(' · ')}</span>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Model path */}
      {asset.modelPath && (
        <div className="text-[10px] font-mono text-stone-600 truncate" title={asset.modelPath}>
          {asset.modelPath}
          {asset.nodeName ? ` :: ${asset.nodeName}` : ''}
        </div>
      )}
    </article>
  );
}

function ZapIcon() {
  return <span className="text-violet-400">⚡</span>;
}

export default function AssetShowcasePage() {
  const catalog = useMemo(() => getMergedWarlordsAssetShowcase(), []);
  const [family, setFamily] = useState<ShowcaseFamily | 'all'>('all');
  const [query, setQuery] = useState('');

  const filtered = useMemo(
    () => filterShowcase(catalog, { family, query }),
    [catalog, family, query],
  );

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(catalog, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `warlords-asset-showcase-v${catalog.version}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const buffs = catalog.campUnitRules.buildingBuffs;
  const loadout = catalog.campUnitRules.t0Loadout;
  const base = catalog.campUnitRules.baseStats;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-8 pb-16 px-3 sm:px-4">
        <header className="space-y-3 pt-2">
          <div className="flex flex-wrap items-center gap-2 text-amber-400">
            <Castle className="h-5 w-5" />
            <h1 className="text-2xl font-bold text-stone-100">Warlords Asset Showcase</h1>
            <span className="text-xs text-stone-500 font-mono">v{catalog.version}</span>
          </div>
          <p className="text-stone-400 text-sm max-w-3xl leading-relaxed">
            {catalog.summary} Use this as the in-game usage index for recipes, build cost, health,
            abilities, armor/weapons attached, and add-ons.
          </p>
          <div className="flex flex-wrap gap-2 text-xs">
            <Link href="/systems" className="text-amber-400/80 hover:underline">
              Systems
            </Link>
            <span className="text-stone-600">·</span>
            <Link href="/arsenal" className="text-amber-400/80 hover:underline">
              Arsenal (weapons/armor)
            </Link>
            <span className="text-stone-600">·</span>
            <Link href="/crafting" className="text-amber-400/80 hover:underline">
              Crafting
            </Link>
            <span className="text-stone-600">·</span>
            <Link href="/island-3d" className="text-amber-400/80 hover:underline">
              Island 3D build
            </Link>
            <span className="text-stone-600">·</span>
            <Link href="/sailing" className="text-amber-400/80 hover:underline">
              Sailing
            </Link>
          </div>
        </header>

        {/* Counts */}
        <section className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          {(
            [
              ['mount', Tent],
              ['boat', Ship],
              ['bench', Hammer],
              ['tower', Castle],
              ['building', Castle],
              ['camp', Mountain],
              ['dock', Anchor],
              ['siege', Shield],
              ['modular', Wrench],
            ] as const
          ).map(([key, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFamily(key)}
              className={cn(
                'rounded-lg border px-3 py-2 text-left transition-colors',
                family === key
                  ? 'border-amber-600/70 bg-amber-950/40'
                  : 'border-stone-800 bg-stone-950/50 hover:border-stone-600',
              )}
            >
              <div className="flex items-center gap-1.5 text-stone-400 text-xs">
                <Icon className="h-3.5 w-3.5" />
                {FAMILY_META[key].label}
              </div>
              <div className="text-lg font-bold text-stone-100 tabular-nums">
                {catalog.counts[key] ?? 0}
              </div>
            </button>
          ))}
          <div className="rounded-lg border border-stone-700 bg-stone-900/60 px-3 py-2">
            <div className="text-stone-400 text-xs">Total</div>
            <div className="text-lg font-bold text-amber-200 tabular-nums">{catalog.counts.total}</div>
          </div>
        </section>

        {/* Camp unit rules strip */}
        <section className="rounded-xl border border-emerald-900/40 bg-emerald-950/15 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-emerald-200">Camp units · tower training · T0 kit</h2>
          <div className="grid sm:grid-cols-3 gap-3 text-xs text-stone-400">
            <div>
              <div className="text-stone-500 mb-1">Base garrison stats</div>
              <div>
                HP {base.maxHp} · DMG {base.damage} · Armor {base.armor} · Speed {base.moveSpeed}
              </div>
            </div>
            <div>
              <div className="text-stone-500 mb-1">Tower unlocks (T0 loadout)</div>
              <div className="text-amber-100/90">
                {loadout.mainHand} + {loadout.armor}
              </div>
              <div className="text-violet-300/90 mt-0.5">{loadout.weaponSkills.join(', ')}</div>
            </div>
            <div>
              <div className="text-stone-500 mb-1">Building buffs</div>
              <div>
                Tower AI ×{buffs.tower.aiAbilityMult}, +{buffs.tower.armorBonus} armor, +
                {buffs.tower.maxHpBonus} HP · Storage yield ×{buffs.storage.harvestYieldMult}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px]">
            {catalog.campUnitRules.orders.map((o) => (
              <span
                key={o.id}
                className="rounded border border-stone-700 bg-stone-900/70 px-2 py-0.5 text-stone-300"
              >
                <kbd className="text-amber-400">{o.hotkey}</kbd> {o.shortLabel}
              </span>
            ))}
          </div>
        </section>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, id, cost item, ability…"
              className="w-full rounded-lg border border-stone-700 bg-stone-950 pl-9 pr-3 py-2 text-sm text-stone-100 placeholder:text-stone-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(FAMILY_META) as Array<ShowcaseFamily | 'all'>).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFamily(f)}
                className={cn(
                  'text-xs px-2.5 py-1.5 rounded-full border transition-colors',
                  family === f
                    ? 'bg-amber-600/90 border-amber-500 text-stone-950 font-medium'
                    : 'border-stone-700 text-stone-400 hover:border-stone-500',
                )}
              >
                {FAMILY_META[f].emoji} {FAMILY_META[f].label}
              </button>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={downloadJson}
            className="border-stone-600 text-stone-200"
          >
            <Download className="h-4 w-4 mr-1.5" />
            JSON
          </Button>
        </div>

        <p className="text-xs text-stone-500">
          Showing <span className="text-stone-300 font-medium">{filtered.length}</span> of{' '}
          {catalog.counts.total}
          {family !== 'all' ? ` · ${FAMILY_META[family].blurb}` : ''}
        </p>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((a) => (
            <AssetCard key={a.id} asset={a} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center text-stone-500 py-16">No assets match this filter.</div>
        )}

        {/* SSOT footer */}
        <footer className="rounded-xl border border-stone-800 bg-stone-950/50 p-4 text-xs text-stone-500 space-y-1 font-mono">
          <div className="text-stone-400 font-sans font-semibold mb-2">SSOT index</div>
          {Object.entries(catalog.ssotIndex).map(([k, v]) => (
            <div key={k}>
              <span className="text-amber-600/80">{k}</span>: {v}
            </div>
          ))}
          <div className="pt-2 font-sans text-stone-500">
            Docs: <code className="text-stone-400">docs/WARLORDS_ASSET_SHOWCASE.md</code> · Definition:{' '}
            <code className="text-stone-400">shared/definitions/warlordsAssetShowcase.ts</code>
          </div>
        </footer>
      </div>
    </Layout>
  );
}
