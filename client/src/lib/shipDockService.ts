/**
 * shipDockService — player ship roster, active ship, and dock build flow.
 *
 * SSOT: Railway Postgres via /api/ships* (player_ships table).
 * localStorage is a cache + offline fallback only; syncs up on first online load.
 */
import {
  createShip,
  type Ship,
  type ShipConfig,
} from '@/lib/shipSystem';
import {
  getShipCatalogEntry,
  RTS_SOUTH_DOCK,
  type DockId,
  type ShipSize,
} from '@shared/definitions/shipCatalog';
import type { HullColor, SailColor } from '@shared/definitions/islandAssetManifest';
import { apiUrl } from '@/lib/assetConfig';

const STORAGE_PREFIX = 'grudge-ships';

export interface PlayerShipRoster {
  ships: Ship[];
  activeShipId: string | null;
  dockId: DockId;
  source?: 'railway' | 'local';
}

function storageKey(accountId: string): string {
  return `${STORAGE_PREFIX}:${accountId || 'guest'}`;
}

function authHeaders(): HeadersInit {
  const token =
    typeof localStorage !== 'undefined'
      ? localStorage.getItem('grudge_auth_token') ||
        localStorage.getItem('grudge_token') ||
        localStorage.getItem('sso_token')
      : null;
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

function loadLocal(accountId: string): PlayerShipRoster {
  try {
    const raw = localStorage.getItem(storageKey(accountId));
    if (raw) {
      const parsed = JSON.parse(raw) as PlayerShipRoster;
      return { ...parsed, source: 'local' };
    }
  } catch { /* ignore */ }
  return { ships: [], activeShipId: null, dockId: RTS_SOUTH_DOCK.id, source: 'local' };
}

function saveLocal(accountId: string, roster: PlayerShipRoster): void {
  localStorage.setItem(storageKey(accountId), JSON.stringify(roster));
}

/** Map API ship row → client Ship shape */
function apiShipToClient(s: Record<string, unknown>): Ship {
  return {
    id: String(s.id),
    name: String(s.name || 'Ship'),
    size: (s.size as ShipSize) || 'rowboat',
    hullColor: (s.hullColor as HullColor) || 'brown',
    sailColor: (s.sailColor as SailColor) || 'white',
    cannons: Number(s.cannons ?? 0),
    crewIds: Array.isArray(s.crewIds) ? (s.crewIds as string[]) : [],
    captainId: (s.captainId as string) || null,
    hp: Number(s.hp ?? 30),
    maxHp: Number(s.maxHp ?? 30),
    speed: Number(s.speed ?? 4),
    zoneX: Number(s.zoneX ?? 50),
    zoneY: Number(s.zoneY ?? 50),
    travelDestination: (s.travelDestination as Ship['travelDestination']) ?? null,
    travelStartedAt: (s.travelStartedAt as number) ?? null,
    travelArrivalAt: (s.travelArrivalAt as number) ?? null,
    isDamaged: !!s.isDamaged,
    createdAt: Number(s.createdAt ?? Date.now()),
  };
}

/** Load roster: Railway first, then local cache. */
export function loadRoster(accountId: string): PlayerShipRoster {
  return loadLocal(accountId);
}

export function saveRoster(accountId: string, roster: PlayerShipRoster): void {
  saveLocal(accountId, roster);
}

/** Async fetch from Railway SSOT; updates local cache. */
export async function fetchRoster(accountId: string): Promise<PlayerShipRoster> {
  try {
    const res = await fetch(apiUrl(`/api/ships?accountId=${encodeURIComponent(accountId)}`), {
      headers: authHeaders(),
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      const roster: PlayerShipRoster = {
        ships: (data.ships || []).map(apiShipToClient),
        activeShipId: data.activeShipId ?? null,
        dockId: (data.dockId as DockId) || RTS_SOUTH_DOCK.id,
        source: 'railway',
      };
      saveLocal(accountId, roster);
      return roster;
    }
  } catch {
    /* offline */
  }
  return loadLocal(accountId);
}

/** Push local roster to Railway once (migration). */
export async function syncRosterToServer(accountId: string): Promise<PlayerShipRoster> {
  const local = loadLocal(accountId);
  try {
    const res = await fetch(apiUrl('/api/ships/sync'), {
      method: 'POST',
      headers: authHeaders(),
      credentials: 'include',
      body: JSON.stringify({
        accountId,
        ships: local.ships,
        activeShipId: local.activeShipId,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      const roster: PlayerShipRoster = {
        ships: (data.ships || []).map(apiShipToClient),
        activeShipId: data.activeShipId ?? null,
        dockId: (data.dockId as DockId) || RTS_SOUTH_DOCK.id,
        source: 'railway',
      };
      saveLocal(accountId, roster);
      return roster;
    }
  } catch { /* ignore */ }
  return local;
}

export function getActiveShip(accountId: string): Ship | null {
  const roster = loadRoster(accountId);
  if (!roster.activeShipId) return roster.ships[0] ?? null;
  return roster.ships.find((s) => s.id === roster.activeShipId) ?? roster.ships[0] ?? null;
}

export function setActiveShip(accountId: string, shipId: string): Ship | null {
  const roster = loadRoster(accountId);
  const ship = roster.ships.find((s) => s.id === shipId);
  if (!ship) return null;
  roster.activeShipId = shipId;
  saveRoster(accountId, roster);
  // Fire-and-forget Railway
  void fetch(apiUrl('/api/ships/active'), {
    method: 'POST',
    headers: authHeaders(),
    credentials: 'include',
    body: JSON.stringify({ accountId, shipId }),
  }).catch(() => {});
  return ship;
}

export interface BuildShipOptions {
  accountId: string;
  captainId: string | null;
  size: ShipSize;
  hullColor?: HullColor;
  sailColor?: SailColor;
  name?: string;
  dockId?: DockId;
  zoneX?: number;
  zoneY?: number;
}

/** Build a ship at the dock — Railway SSOT with local fallback. */
export function buildShipAtDock(
  opts: BuildShipOptions,
): { ok: true; ship: Ship } | { ok: false; error: string } {
  // Optimistic local create; server is source of truth when online
  const entry = getShipCatalogEntry(opts.size);
  const roster = loadRoster(opts.accountId);

  if (!entry.starterFree) {
    const hasSame = roster.ships.some((s) => s.size === opts.size);
    if (hasSame) {
      return { ok: false, error: `You already own a ${entry.label}.` };
    }
  }

  const ship = createShip(
    opts.size,
    opts.hullColor ?? 'brown',
    opts.sailColor ?? 'white',
    opts.captainId,
    opts.zoneX ?? 50,
    opts.zoneY ?? 50,
    opts.name,
  );

  roster.ships.push(ship);
  roster.activeShipId = ship.id;
  roster.dockId = opts.dockId ?? RTS_SOUTH_DOCK.id;
  saveRoster(opts.accountId, roster);

  void fetch(apiUrl('/api/ships/build'), {
    method: 'POST',
    headers: authHeaders(),
    credentials: 'include',
    body: JSON.stringify({
      accountId: opts.accountId,
      captainId: opts.captainId,
      size: opts.size,
      hullColor: opts.hullColor,
      sailColor: opts.sailColor,
      name: opts.name,
      dockId: opts.dockId ?? RTS_SOUTH_DOCK.id,
      zoneX: opts.zoneX,
      zoneY: opts.zoneY,
    }),
  })
    .then(async (res) => {
      if (!res.ok) return;
      const data = await res.json();
      if (data.ships) {
        saveRoster(opts.accountId, {
          ships: data.ships.map(apiShipToClient),
          activeShipId: data.activeShipId,
          dockId: data.dockId || RTS_SOUTH_DOCK.id,
          source: 'railway',
        });
      }
    })
    .catch(() => {});

  return { ok: true, ship };
}

/** Ensure starter ship — prefers Railway ensure-starter. */
export function ensureStarterShip(accountId: string, captainId: string | null): Ship {
  const roster = loadRoster(accountId);
  if (roster.ships.length > 0) {
    return getActiveShip(accountId)!;
  }

  // Kick Railway ensure (async); local free starter immediately
  void fetch(apiUrl('/api/ships/ensure-starter'), {
    method: 'POST',
    headers: authHeaders(),
    credentials: 'include',
    body: JSON.stringify({ accountId, captainId }),
  })
    .then(async (res) => {
      if (!res.ok) {
        // Try migrate local if any
        await syncRosterToServer(accountId);
        return;
      }
      const data = await res.json();
      if (data.ships?.length) {
        saveRoster(accountId, {
          ships: data.ships.map(apiShipToClient),
          activeShipId: data.activeShipId,
          dockId: data.dockId || RTS_SOUTH_DOCK.id,
          source: 'railway',
        });
      }
    })
    .catch(() => {});

  const result = buildShipAtDock({
    accountId,
    captainId,
    size: 'rowboat',
    dockId: RTS_SOUTH_DOCK.id,
    name: 'Starter Argon Raft',
  });
  return result.ok ? result.ship : createShip('rowboat', 'brown', 'white', captainId, 50, 50);
}

export function getActivePrefabKey(accountId: string): string {
  const ship = getActiveShip(accountId);
  const size = ship?.size ?? 'rowboat';
  return getShipCatalogEntry(size).prefabKey;
}

export function getActiveShipConfig(accountId: string): ShipConfig | null {
  const ship = getActiveShip(accountId);
  if (!ship) return null;
  const { id, name, size, hullColor, sailColor, cannons, crewIds, captainId } = ship;
  return { id, name, size, hullColor, sailColor, cannons, crewIds, captainId };
}
