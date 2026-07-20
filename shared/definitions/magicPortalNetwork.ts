/**
 * Magic Portal Network — animated_magic_portal.glb
 *
 * Used on:
 *  - Faction lobby islands (teleport network)
 *  - Ethereal Falls / main waterfall island (sector landmark)
 *  - Player-built RTS structure (transport category)
 *
 * Destinations a portal can link to:
 *  - faction town / race capital
 *  - owned camps
 *  - other player-built portals in the network
 *
 * Mesh: models/portals/animated_magic_portal.glb
 * CDN:  assets.grudge-studio.com/models/portals/animated_magic_portal.glb
 */

export const MAGIC_PORTAL_VERSION = '1.0.0';

export const MAGIC_PORTAL_GLB = {
  localPath: '/models/portals/animated_magic_portal.glb',
  cdnKey: 'models/portals/animated_magic_portal.glb',
  /** SI scale — tune after art QA */
  scale: 1,
  interactionRangeM: 4.5,
  promptOffsetY: 3.2,
} as const;

export type PortalDestinationKind =
  | 'faction_town'      // race capital / faction lobby island
  | 'owned_camp'        // player-owned NPC/camp claim
  | 'player_portal'     // another built magic portal
  | 'waterfall_hub'     // ethereal falls main island
  | 'home_island'       // personal home
  | 'custom';

export interface PortalDestination {
  id: string;
  kind: PortalDestinationKind;
  label: string;
  /** World position to teleport (meters) */
  position: [number, number, number];
  /** Optional sector / surface id for multi-zone hops */
  sectorId?: string;
  /** Owner account/captain for ownership checks */
  ownerId?: string | null;
  /** Faction race for faction-town filter */
  raceId?: string | null;
}

export interface MagicPortalDef {
  id: string;
  /** Display name */
  name: string;
  /** Where this portal sits */
  worldPos: [number, number, number];
  yaw?: number;
  /** Linked destinations (player can cycle with E / radial) */
  destinations: PortalDestination[];
  /** Built by player (vs world/system) */
  playerBuilt: boolean;
  ownerId?: string | null;
  /** Faction island this portal belongs to (if any) */
  factionIslandId?: string | null;
  /** System placements */
  systemKind?: 'faction_island' | 'waterfall' | 'player';
}

/** Build cost for player-placed portal (RTS / ModePlayHUD transport) */
export const MAGIC_PORTAL_BUILD = {
  id: 'magic_portal',
  name: 'Magic Portal',
  category: 'transport' as const,
  modelPath: MAGIC_PORTAL_GLB.localPath,
  cdnKey: MAGIC_PORTAL_GLB.cdnKey,
  scale: MAGIC_PORTAL_GLB.scale,
  size: [2.5, 3.5, 2.5] as [number, number, number],
  color: 0x8844ff,
  cost: [
    { itemId: 'crystal', quantity: 12 },
    { itemId: 'iron', quantity: 8 },
    { itemId: 'wood', quantity: 6 },
  ],
  description:
    'Link to your faction town, owned camps, and other portals you control.',
} as const;

/** Ethereal Falls — main waterfall island landmark portal hub */
export const WATERFALL_ISLAND_PORTAL = {
  id: 'waterfall_hub_main',
  sectorId: 'ethereal_falls',
  name: 'Falls Gate',
  /** Relative offset on first large island / sector center until authored pos */
  localOffset: [0, 2, 40] as [number, number, number],
} as const;

/** Per-faction island: one network portal near traveler / docks */
export function factionIslandPortalId(raceId: string): string {
  return `faction_portal_${raceId}`;
}

/**
 * Default destinations for a system portal on a faction island.
 * World positions filled at runtime from FactionIslandRuntime.respawnPoints.
 */
export function defaultFactionPortalDestinations(opts: {
  raceId: string;
  factionLabel: string;
  townPos: [number, number, number];
  waterfallPos?: [number, number, number] | null;
}): PortalDestination[] {
  const dests: PortalDestination[] = [
    {
      id: `town_${opts.raceId}`,
      kind: 'faction_town',
      label: `${opts.factionLabel} Town`,
      position: opts.townPos,
      raceId: opts.raceId,
    },
  ];
  if (opts.waterfallPos) {
    dests.push({
      id: 'waterfall_hub',
      kind: 'waterfall_hub',
      label: 'Ethereal Falls Gate',
      position: opts.waterfallPos,
      sectorId: WATERFALL_ISLAND_PORTAL.sectorId,
    });
  }
  return dests;
}

/**
 * Merge player network: owned camps + other player portals.
 * Call from engine with live camp/portal lists.
 */
export function buildPlayerPortalDestinations(opts: {
  factionTown?: PortalDestination | null;
  ownedCamps: Array<{ id: string; label: string; position: [number, number, number] }>;
  networkPortals: Array<{ id: string; label: string; position: [number, number, number]; ownerId?: string | null }>;
  excludePortalId?: string;
}): PortalDestination[] {
  const out: PortalDestination[] = [];
  if (opts.factionTown) out.push(opts.factionTown);
  for (const c of opts.ownedCamps) {
    out.push({
      id: `camp_${c.id}`,
      kind: 'owned_camp',
      label: c.label || `Camp ${c.id}`,
      position: c.position,
    });
  }
  for (const p of opts.networkPortals) {
    if (opts.excludePortalId && p.id === opts.excludePortalId) continue;
    out.push({
      id: `portal_${p.id}`,
      kind: 'player_portal',
      label: p.label || 'Linked Portal',
      position: p.position,
      ownerId: p.ownerId ?? null,
    });
  }
  return out;
}
