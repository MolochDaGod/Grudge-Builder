/**
 * Lobby Islands SSOT — pirate open-world hub (Chicken Gun / pirate-islands).
 *
 * Describes every island on the lobby map: contents, activities, game zones.
 * Used by LobbyMiniMap UI, agents (skill), and future zone routing.
 *
 * Coordinate convention (same as LobbyGameplay capture points):
 *   worldX = center.x + offset.ox * size.x
 *   worldZ = center.z + offset.oz * size.z
 *   island radius ≈ radiusFrac * min(size.x, size.z)
 *
 * Primary focus island: **Shipwreck Cove** — beached pirate ship wreck.
 */


import {
  FACTION_LOBBY_ISLANDS,
  FACTION_ISLAND_TEMPLATE,
  type FactionIslandDef,
} from './factionLobbyIslands';

export const LOBBY_MAP_ID = 'pirate-islands' as const;
export const LOBBY_ISLAND_ID = 'grudge-open-world' as const;
export const LOBBY_MAP_FAMILY = 'chicken_gun_lobby' as const;

/** What the player does in a zone */
export type LobbyActivityKind =
  | 'social'
  | 'trade'
  | 'quest'
  | 'harvest'
  | 'scavenge'
  | 'craft'
  | 'combat_pve'
  | 'capture'
  | 'sail'
  | 'board'
  | 'explore'
  | 'loot'
  | 'rest'
  | 'tutorial_bridge';

/** Gameplay zone category for routing / filters */
export type LobbyGameZoneKind =
  | 'safe_hub'
  | 'market'
  | 'capture_point'
  | 'harvest_ring'
  | 'pve_ring'
  | 'dock'
  | 'shipwreck'
  | 'beach'
  | 'camp'
  | 'battery'
  | 'open_water'
  | 'story';

export interface LobbyActivity {
  id: string;
  kind: LobbyActivityKind;
  title: string;
  detail: string;
  /** Optional keybind / interaction hint */
  hint?: string;
}

export interface LobbyIslandContents {
  /** Landmark meshes / props expected on the island */
  landmarks: string[];
  /** Resource / harvest types */
  resources: string[];
  /** NPC / creature roles */
  inhabitants: string[];
  /** Structures (dock, tent, wreck, etc.) */
  structures: string[];
}

export interface LobbyIslandDef {
  id: string;
  name: string;
  shortName: string;
  /** One-line role on the hub */
  role: string;
  description: string;
  /**
   * Offset as fraction of lobby.size (LobbyGameplay convention).
   * Free Port is near (0, small +oz). Shipwreck is a satellite landmass.
   */
  offset: { ox: number; oz: number };
  /** Radius as fraction of min(size.x, size.z) */
  radiusFrac: number;
  /** Minimap / legend color (hex) */
  color: string;
  gameZones: LobbyGameZoneKind[];
  contents: LobbyIslandContents;
  activities: LobbyActivity[];
  /** Linked capture point id from LobbyGameplay, if any */
  capturePointId?: string;
  /** If true, show first when player is near or on open detail */
  featured?: boolean;
  /** Tags for search / agent skill */
  tags: string[];
}

// ─── Islands ─────────────────────────────────────────────────────────────────

/**
 * Shipwreck Cove — the island with the wrecked pirate ship the player is looking at.
 * Beach + hull + scavenge loop; light PvE; story / tutorial-adjacent.
 */
export const SHIPWRECK_ISLAND: LobbyIslandDef = {
  id: 'shipwreck_cove',
  name: 'Shipwreck Cove',
  shortName: 'Shipwreck',
  role: 'Wrecked pirate ship · scavenge & story beach',
  description:
    'A satellite island where a pirate hull lies broken on the sand. Driftwood, stones, ' +
    'and flotsam litter the beach. Explore the wreck for chests, harvest the shore, and ' +
    'clear scavengers before sailing back to Free Port.',
  // SE of Free Port — matches common pirate-islands satellite wreck placement
  offset: { ox: 0.28, oz: 0.22 },
  radiusFrac: 0.12,
  color: '#c4a574',
  gameZones: ['shipwreck', 'beach', 'story', 'pve_ring'],
  featured: true,
  capturePointId: undefined,
  tags: ['shipwreck', 'pirate_ship', 'wreck', 'beach', 'scavenge', 'tutorial_adjacent', 'featured'],
  contents: {
    landmarks: [
      'Wrecked pirate ship (hull + mast fragments)',
      'Beached prow on sand',
      'Flotsam line at high-tide mark',
      'Rocky spit toward open water',
    ],
    resources: ['driftwood / sticks', 'shore stones', 'hemp rope scraps', 'crate planks'],
    inhabitants: ['Shore scavengers (bandits)', 'Wild boar (outer sand)', 'Crabs / ambient beach'],
    structures: [
      'Broken pirate hull (boardable wreck interior)',
      'Scattered barrels & crates',
      'Loot chest in hold',
      'Makeshift driftwood lean-to',
    ],
  },
  activities: [
    {
      id: 'sw_inspect_wreck',
      kind: 'explore',
      title: 'Inspect the wreck',
      detail: 'Walk the broken deck and hold. Learn the island layout from the hull landmark.',
      hint: 'Approach the pirate ship mesh',
    },
    {
      id: 'sw_scavenge_beach',
      kind: 'scavenge',
      title: 'Scavenge the beach',
      detail: 'Gather sticks (×3) and stones (×2) from driftwood and shore rock — same loop as solo shipwreck tutorial.',
      hint: 'Harvest mode · E / tool',
    },
    {
      id: 'sw_loot_hold',
      kind: 'loot',
      title: 'Loot the hold',
      detail: 'Open chests and barrels in the wrecked hull for starter supplies.',
      hint: 'Interact on chest',
    },
    {
      id: 'sw_clear_scavengers',
      kind: 'combat_pve',
      title: 'Clear scavengers',
      detail: 'Defeat beach bandits camping the wreck — light PvE before returning to Free Port.',
      hint: 'Tab → Combat',
    },
    {
      id: 'sw_craft_campfire',
      kind: 'craft',
      title: 'Beach campfire',
      detail: 'Quick-craft a campfire from scavenged sticks/stones; cook if you skinned a boar.',
      hint: 'Main panel · quick-craft',
    },
    {
      id: 'sw_sail_return',
      kind: 'sail',
      title: 'Sail back to Free Port',
      detail: 'Board at South Dock (or rowboat) and return to the market hub.',
      hint: 'E at dock · helm WASD',
    },
    {
      id: 'sw_tutorial_bridge',
      kind: 'tutorial_bridge',
      title: 'Tutorial-adjacent loop',
      detail:
        'Same fantasy beats as /tutorial (shipwreck room): wash-up energy, sticks/stones, campfire, combat — but multiplayer lobby instance.',
    },
  ],
};

export const FREE_PORT_ISLAND: LobbyIslandDef = {
  id: 'free_port',
  name: "Racalvin's Free Port",
  shortName: 'Free Port',
  role: 'Safe hub · vendors · contracts · spawn',
  description:
    'Neutral harbor market at the center of the pirate lobby. Vendors, guards, wayshrine, ' +
    'contract board, and the player spawn. Capture flags and PvE sit outside the safe ring.',
  offset: { ox: 0, oz: 0.05 },
  radiusFrac: 0.16,
  color: '#fbbf24',
  gameZones: ['safe_hub', 'market'],
  tags: ['hub', 'vendors', 'spawn', 'free_port'],
  contents: {
    landmarks: ['Harbor banner pillar', 'Market ring', 'Wayshrine'],
    resources: ['Vendor goods (buy/sell)', 'Contract rewards'],
    inhabitants: [
      'Saltwind Trader (supplies)',
      'Ironhook Smith (weapons)',
      'Embassy Broker (faction)',
      'Harbor Master (quests)',
      'Port Guards',
      'Dockhands / sailors',
    ],
    structures: ['Market tents', 'Harbor campfire', 'Harbor chest', 'Shrine'],
  },
  activities: [
    {
      id: 'fp_trade',
      kind: 'trade',
      title: 'Trade with vendors',
      detail: 'Supplies & potions, weapons & armor, faction quartermaster.',
    },
    {
      id: 'fp_contracts',
      kind: 'quest',
      title: 'Take contracts',
      detail: 'Harbor Master contract board — open-world jobs and capture directives.',
    },
    {
      id: 'fp_rest',
      kind: 'rest',
      title: 'Rest at the shrine',
      detail: 'Wayshrine attendant — safe hub recovery / social hangout.',
    },
    {
      id: 'fp_social',
      kind: 'social',
      title: 'Party & queue',
      detail: 'Multiplayer social hub before sailing to sectors or capturing points.',
    },
  ],
};

export const NORTH_HARBOR_ISLAND: LobbyIslandDef = {
  id: 'north_harbor',
  name: 'North Harbor',
  shortName: 'N Harbor',
  role: 'Capture point · northern dock works',
  description: 'Northern capture flag. Claim for your party; staging ground for north-side sail routes.',
  offset: { ox: 0, oz: -0.35 },
  radiusFrac: 0.1,
  color: '#38bdf8',
  gameZones: ['capture_point', 'dock'],
  capturePointId: 'north-harbor',
  tags: ['capture', 'north', 'harbor'],
  contents: {
    landmarks: ['Capture flag', 'North harbor approach'],
    resources: ['Capture control (RTS score)'],
    inhabitants: ['Contesting players / AI reclaim'],
    structures: ['Flag pole', 'Harbor ring'],
  },
  activities: [
    {
      id: 'nh_capture',
      kind: 'capture',
      title: 'Capture North Harbor',
      detail: 'Stand in the ring and hold to claim the flag for your side.',
      hint: 'E near flag · hold',
    },
  ],
};

export const SOUTH_DOCK_ISLAND: LobbyIslandDef = {
  id: 'south_dock',
  name: 'South Dock',
  shortName: 'S Dock',
  role: 'Primary ship dock · board & sail',
  description:
    'Southern pier with dockable ship. Board with E, helm on deck, disembark at Free Port or other shores.',
  offset: { ox: 0, oz: 0.35 },
  radiusFrac: 0.1,
  color: '#34d399',
  gameZones: ['dock', 'capture_point'],
  capturePointId: 'south-dock',
  tags: ['dock', 'sail', 'ship', 'south', 'capture'],
  contents: {
    landmarks: ['South pier', 'Moored vessel'],
    resources: [],
    inhabitants: ['Dock crew (ambient)'],
    structures: ['Dock GLB / pier', 'Active ship hull'],
  },
  activities: [
    {
      id: 'sd_board',
      kind: 'board',
      title: 'Board ship',
      detail: 'Press E at the pier to board; WASD helm; E again to disembark.',
      hint: 'E near dock',
    },
    {
      id: 'sd_capture',
      kind: 'capture',
      title: 'Capture South Dock',
      detail: 'Claim the southern capture flag controlling dock access pressure.',
    },
    {
      id: 'sd_sail',
      kind: 'sail',
      title: 'Sail the open water',
      detail: 'Reach Shipwreck Cove, other islands, or sector travel staging.',
    },
  ],
};

export const EAST_BATTERY_ISLAND: LobbyIslandDef = {
  id: 'east_battery',
  name: 'East Battery',
  shortName: 'E Battery',
  role: 'Capture · fortified eastern rise',
  description: 'Eastern high ground / battery capture point. Contested sightline over the eastern channel.',
  offset: { ox: 0.35, oz: 0 },
  radiusFrac: 0.09,
  color: '#f97316',
  gameZones: ['capture_point', 'battery'],
  capturePointId: 'east-battery',
  tags: ['capture', 'east', 'battery'],
  contents: {
    landmarks: ['Battery flag', 'Eastern ridge'],
    resources: [],
    inhabitants: ['Contesting forces'],
    structures: ['Flag pole', 'Battery emplacement markers'],
  },
  activities: [
    {
      id: 'eb_capture',
      kind: 'capture',
      title: 'Capture East Battery',
      detail: 'Hold the eastern flag; useful staging before Shipwreck Cove SE of Free Port.',
    },
  ],
};

export const WEST_CAMP_ISLAND: LobbyIslandDef = {
  id: 'west_camp',
  name: 'West Camp',
  shortName: 'W Camp',
  role: 'Capture · harvest fringe camp',
  description: 'Western camp capture near the outer harvest / PvE ring. Tents and resource nodes nearby.',
  offset: { ox: -0.35, oz: 0 },
  radiusFrac: 0.09,
  color: '#a78bfa',
  gameZones: ['capture_point', 'camp', 'harvest_ring'],
  capturePointId: 'west-camp',
  tags: ['capture', 'west', 'camp', 'harvest'],
  contents: {
    landmarks: ['Camp flag', 'Western treeline'],
    resources: ['Wood', 'Stone', 'Hemp (harvest zones)'],
    inhabitants: ['Wildlife outside safe hub', 'Camp claim units'],
    structures: ['Flag pole', 'Camp scatter'],
  },
  activities: [
    {
      id: 'wc_capture',
      kind: 'capture',
      title: 'Capture West Camp',
      detail: 'Claim the western flag.',
    },
    {
      id: 'wc_harvest',
      kind: 'harvest',
      title: 'Harvest the fringe',
      detail: 'Trees, rocks, crystals, and hemp in the lobby harvest ring beyond Free Port.',
      hint: 'Harvest mode',
    },
    {
      id: 'wc_pve',
      kind: 'combat_pve',
      title: 'PvE ring',
      detail: 'Aggressive land creatures between hub radius and outer ring.',
    },
  ],
};

// ── Faction race islands (border ring) — SSOT: factionLobbyIslands.ts ─────────

/** Convert production faction island → LobbyMiniMap / SSOT island entry */
export function factionIslandAsLobbyDef(f: FactionIslandDef): LobbyIslandDef {
  const color = `#${f.bannerColor.toString(16).padStart(6, '0')}`;
  return {
    id: f.id,
    name: f.name,
    shortName: f.raceId.charAt(0).toUpperCase() + f.raceId.slice(1),
    role: f.subtitle,
    description:
      f.notes ??
      `${f.name}: race capital outpost on the pirate open-world border. ` +
        `${FACTION_ISLAND_TEMPLATE.docks} docks · ${FACTION_ISLAND_TEMPLATE.buildings} buildings · ` +
        `captain on mount · traveler network · blacksmith · profession benches · siege · starter boat.`,
    offset: { ox: f.borderOffset.ox, oz: f.borderOffset.oz },
    // ~42m radius as fraction of typical lobby size (minimap ellipse scale)
    radiusFrac: 0.075,
    color,
    gameZones: ['camp', 'dock', 'safe_hub', 'market'],
    tags: ['faction', f.raceId, 'border', 'capital_outpost', 'generated'],
    contents: {
      landmarks: [
        `${f.name} hall`,
        'Race banner pole',
        'Fresh water hole',
        'Watch towers',
        'Dock respawn waypoint',
      ],
      resources: ['Profession bench crafting', 'Blacksmith forge', 'Campfire cook'],
      inhabitants: [
        'Race captain (mounted)',
        '8 unarmed civilians',
        '8 faction heroes',
        'Network traveler (auction · leaderboards · teleport · vendor)',
        'Race blacksmith',
        'Dock quest traveler',
      ],
      structures: [
        '4 docks',
        '5 buildings + blacksmith',
        '4 tents · 2 campfires',
        'Profession benches (all)',
        'Catapult / bolt thrower · towers',
        'Unity-style starter boat on dock',
      ],
    },
    activities: [
      {
        id: `${f.raceId}_captain`,
        kind: 'social',
        title: 'Meet the race captain',
        detail: 'Captain on cavalry mount at plaza center (Unity capital style).',
      },
      {
        id: `${f.raceId}_traveler`,
        kind: 'trade',
        title: 'Network traveler',
        detail: 'Neutral vendor · auction · leaderboards · teleport network tool.',
        hint: 'Interact traveler',
      },
      {
        id: `${f.raceId}_blacksmith`,
        kind: 'craft',
        title: 'Faction blacksmith',
        detail: 'Race blacksmith forge + profession benches for all crafts.',
        hint: 'E at bench / forge',
      },
      {
        id: `${f.raceId}_boat`,
        kind: 'board',
        title: 'Board starter boat',
        detail: 'Unity game boat on dock with quest traveler + respawn waypoint.',
        hint: 'E at dock boat',
      },
      {
        id: `${f.raceId}_siege`,
        kind: 'explore',
        title: 'Siege & towers',
        detail: 'Catapult / bolt thrower and watch towers available on the outpost.',
      },
    ],
  };
}

export const FACTION_LOBBY_ISLAND_DEFS: LobbyIslandDef[] =
  FACTION_LOBBY_ISLANDS.map(factionIslandAsLobbyDef);

/** Ordered list — featured shipwreck first for agent/UI defaults after hub */
export const LOBBY_ISLANDS: LobbyIslandDef[] = [
  FREE_PORT_ISLAND,
  SHIPWRECK_ISLAND,
  NORTH_HARBOR_ISLAND,
  SOUTH_DOCK_ISLAND,
  EAST_BATTERY_ISLAND,
  WEST_CAMP_ISLAND,
  ...FACTION_LOBBY_ISLAND_DEFS,
];

export const LOBBY_ISLAND_BY_ID: Record<string, LobbyIslandDef> = Object.fromEntries(
  LOBBY_ISLANDS.map((i) => [i.id, i]),
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getLobbyIsland(id: string): LobbyIslandDef | undefined {
  return LOBBY_ISLAND_BY_ID[id];
}

export function getFeaturedLobbyIslands(): LobbyIslandDef[] {
  return LOBBY_ISLANDS.filter((i) => i.featured);
}

/** Default selection when opening minimap detail (player looking at wreck) */
export function getDefaultFocusIslandId(): string {
  return SHIPWRECK_ISLAND.id;
}

export function lobbyIslandWorldPos(
  island: LobbyIslandDef,
  center: { x: number; z: number },
  size: { x: number; z: number },
): { x: number; z: number } {
  return {
    x: center.x + island.offset.ox * size.x,
    z: center.z + island.offset.oz * size.z,
  };
}

export function lobbyIslandRadius(
  island: LobbyIslandDef,
  size: { x: number; z: number },
): number {
  return island.radiusFrac * Math.min(size.x, size.z);
}

export function findNearestLobbyIsland(
  worldX: number,
  worldZ: number,
  center: { x: number; z: number },
  size: { x: number; z: number },
): LobbyIslandDef | null {
  let best: LobbyIslandDef | null = null;
  let bestD = Infinity;
  for (const island of LOBBY_ISLANDS) {
    const p = lobbyIslandWorldPos(island, center, size);
    const dx = worldX - p.x;
    const dz = worldZ - p.z;
    const d = Math.hypot(dx, dz);
    const r = lobbyIslandRadius(island, size);
    // Prefer islands you're inside; else nearest center
    const score = d <= r ? d * 0.25 : d;
    if (score < bestD) {
      bestD = score;
      best = island;
    }
  }
  return best;
}

/** Agent / skill summary block for one island */
export function formatLobbyIslandBrief(island: LobbyIslandDef): string {
  const acts = island.activities.map((a) => `  - [${a.kind}] ${a.title}: ${a.detail}`).join('\n');
  return [
    `## ${island.name} (\`${island.id}\`)`,
    island.role,
    '',
    island.description,
    '',
    `Zones: ${island.gameZones.join(', ')}`,
    `Landmarks: ${island.contents.landmarks.join('; ')}`,
    `Resources: ${island.contents.resources.join('; ') || '—'}`,
    `Inhabitants: ${island.contents.inhabitants.join('; ')}`,
    `Structures: ${island.contents.structures.join('; ')}`,
    '',
    'Activities:',
    acts,
  ].join('\n');
}

export function formatAllLobbyIslandsBrief(): string {
  return LOBBY_ISLANDS.map(formatLobbyIslandBrief).join('\n\n---\n\n');
}
