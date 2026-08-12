/**
 * craftHarvestDeposit — harvest → Railway craft bag SSOT.
 *
 * Surfaces: home-island, tutorial, town, Multiverse (via window.GrudgeFleet).
 * Live craft UI: grudgewarlords.com/craft/ (same bag).
 * Offline: Puter KV / localStorage queue via grudge-fleet.js (when present),
 * or localStorage fallback when fleet script is not loaded.
 *
 * @see docs/CRAFT_HARVEST_WIRING_SSOT.md
 */
import { playerResourcesAPI } from '@/lib/api';

const OFFLINE_LS = 'grudge_offline_harvest_queue';

/** Play-surface labels → craft material ids (mirrors grudge-fleet.js). */
const RESOURCE_ALIASES: Record<string, string> = {
  wood: 't0_wood',
  stick: 't0_wood',
  sticks: 't0_wood',
  forest: 't0_wood',
  timber: 't0_wood',
  driftwood: 't0_wood',
  log: 't0_wood',
  tree: 't0_wood',
  stone: 't0_stone',
  stones: 't0_stone',
  rock: 't0_stone',
  rocks: 't0_stone',
  ore: 't0_copper',
  copper: 't0_copper',
  iron: 't0_iron',
  crystal: 't0_crystal',
  crystals: 't0_crystal',
  gem: 't0_crystal',
  fiber: 't0_fiber',
  herb: 't0_herb',
  herbs: 't0_herb',
  fish: 't0_fish',
  hide: 't0_hide',
  meat: 't0_meat',
};

export function canonicalizeCraftResourceId(raw: string): string {
  const s = String(raw || '').trim();
  if (!s) return '';
  const lower = s.toLowerCase();
  if (RESOURCE_ALIASES[lower]) return RESOURCE_ALIASES[lower];
  if (/^t\d+_/i.test(s)) return s;
  return lower.replace(/\s+/g, '_');
}

export type HarvestLootMap = Record<string, number>;

export interface DepositHarvestResult {
  ok: boolean;
  queued?: boolean;
  error?: string;
}

declare global {
  interface Window {
    GrudgeFleet?: {
      depositHarvestLoot?: (
        loot: HarvestLootMap | Array<{ resourceId: string; amount: number }>,
        opts?: { source?: string },
      ) => Promise<DepositHarvestResult>;
      flushOfflineHarvestQueue?: () => Promise<{ ok: boolean; flushed?: number; error?: string }>;
      version?: string;
    };
  }
}

function toItems(loot: HarvestLootMap | Array<{ resourceId?: string; amount?: number; qty?: number }>) {
  if (Array.isArray(loot)) {
    return loot
      .map((row) => ({
        resourceId: canonicalizeCraftResourceId(row.resourceId || ''),
        amount: Math.floor(Number(row.amount ?? row.qty) || 0),
      }))
      .filter((r) => r.resourceId && r.amount > 0);
  }
  return Object.entries(loot || {})
    .map(([k, v]) => ({
      resourceId: canonicalizeCraftResourceId(k),
      amount: Math.floor(Number(v) || 0),
    }))
    .filter((r) => r.resourceId && r.amount > 0);
}

function enqueueLocal(items: Array<{ resourceId: string; amount: number }>, source: string) {
  try {
    const raw = localStorage.getItem(OFFLINE_LS);
    const queue: Array<{ ts: number; source: string; items: typeof items }> = raw
      ? JSON.parse(raw)
      : [];
    queue.push({ ts: Date.now(), source, items });
    while (queue.length > 200) queue.shift();
    localStorage.setItem(OFFLINE_LS, JSON.stringify(queue));
  } catch {
    /* private mode */
  }
}

/**
 * Deposit harvest into Railway account resources (craft bag).
 * Prefers window.GrudgeFleet.depositHarvestLoot when fleet script is loaded.
 */
export async function depositHarvestLoot(
  loot: HarvestLootMap | Array<{ resourceId?: string; amount?: number; qty?: number }>,
  opts?: { source?: string },
): Promise<DepositHarvestResult> {
  const source = opts?.source || 'spa-harvest';
  const items = toItems(loot);
  if (!items.length) return { ok: false, error: 'empty_loot' };

  const fleet = typeof window !== 'undefined' ? window.GrudgeFleet : undefined;
  if (fleet?.depositHarvestLoot) {
    try {
      return await fleet.depositHarvestLoot(
        items.reduce<HarvestLootMap>((acc, it) => {
          acc[it.resourceId] = (acc[it.resourceId] || 0) + it.amount;
          return acc;
        }, {}),
        { source },
      );
    } catch (e) {
      console.warn('[craftHarvestDeposit] fleet deposit failed', e);
    }
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    enqueueLocal(items, source);
    return { ok: true, queued: true };
  }

  try {
    await playerResourcesAPI.batchAdd(items);
    try {
      window.dispatchEvent(
        new CustomEvent('grudge:harvest:deposited', { detail: { items, source } }),
      );
    } catch {
      /* optional */
    }
    return { ok: true };
  } catch (e) {
    enqueueLocal(items, source);
    return {
      ok: true,
      queued: true,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/** Convenience: single resource gather. */
export async function depositHarvestResource(
  resourceType: string,
  quantity = 1,
  source = 'spa-harvest',
): Promise<DepositHarvestResult> {
  const id = canonicalizeCraftResourceId(resourceType);
  if (!id) return { ok: false, error: 'bad_resource' };
  return depositHarvestLoot({ [id]: Math.max(1, Math.floor(quantity)) }, { source });
}

/** Flush offline queue (fleet preferred). */
export async function flushOfflineHarvestQueue(): Promise<{ ok: boolean; flushed?: number; error?: string }> {
  const fleet = typeof window !== 'undefined' ? window.GrudgeFleet : undefined;
  if (fleet?.flushOfflineHarvestQueue) {
    return fleet.flushOfflineHarvestQueue();
  }
  // localStorage-only flush via SPA API
  try {
    const raw = localStorage.getItem(OFFLINE_LS);
    if (!raw) return { ok: true, flushed: 0 };
    const queue = JSON.parse(raw) as Array<{ items?: Array<{ resourceId: string; amount: number }> }>;
    const merged: HarvestLootMap = {};
    for (const entry of queue) {
      for (const it of entry.items || []) {
        const id = canonicalizeCraftResourceId(it.resourceId);
        const amt = Math.floor(Number(it.amount) || 0);
        if (id && amt > 0) merged[id] = (merged[id] || 0) + amt;
      }
    }
    const items = Object.entries(merged).map(([resourceId, amount]) => ({ resourceId, amount }));
    if (!items.length) {
      localStorage.removeItem(OFFLINE_LS);
      return { ok: true, flushed: 0 };
    }
    await playerResourcesAPI.batchAdd(items);
    localStorage.removeItem(OFFLINE_LS);
    return { ok: true, flushed: items.length };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
