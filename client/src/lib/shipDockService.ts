/**
 * shipDockService — player ship roster, active ship, and dock build flow.
 * Persists to localStorage until Railway ship API is wired.
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

const STORAGE_PREFIX = 'grudge-ships';

export interface PlayerShipRoster {
  ships: Ship[];
  activeShipId: string | null;
  dockId: DockId;
}

function storageKey(accountId: string): string {
  return `${STORAGE_PREFIX}:${accountId || 'guest'}`;
}

export function loadRoster(accountId: string): PlayerShipRoster {
  try {
    const raw = localStorage.getItem(storageKey(accountId));
    if (raw) return JSON.parse(raw) as PlayerShipRoster;
  } catch { /* ignore */ }
  return { ships: [], activeShipId: null, dockId: RTS_SOUTH_DOCK.id };
}

export function saveRoster(accountId: string, roster: PlayerShipRoster): void {
  localStorage.setItem(storageKey(accountId), JSON.stringify(roster));
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

/** Build a ship at the dock using canonical catalog costs. */
export function buildShipAtDock(opts: BuildShipOptions): { ok: true; ship: Ship } | { ok: false; error: string } {
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
  return { ok: true, ship };
}

/** Ensure guest account has a free rowboat at the RTS south dock. */
export function ensureStarterShip(accountId: string, captainId: string | null): Ship {
  const roster = loadRoster(accountId);
  if (roster.ships.length > 0) {
    return getActiveShip(accountId)!;
  }
  const result = buildShipAtDock({
    accountId,
    captainId,
    size: 'rowboat',
    dockId: RTS_SOUTH_DOCK.id,
    name: 'Starter Rowboat',
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