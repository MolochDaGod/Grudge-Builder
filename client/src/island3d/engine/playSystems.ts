/**
 * playSystems — ONE matrix of what is allowed to run per Island3D mode.
 *
 * Problem we solve: lobby + zone + home-island features were all ticking
 * every frame even when irrelevant, causing lag and conflicting scripts
 * (capture points during home harvest, dual wildlife AI, camp AI on lobby, etc.).
 *
 * Mode meanings:
 *   procedural — home island / test-play board (harvest, build, farm, light wildlife)
 *   lobby      — multiplayer lobby map (ships, capture, factions)
 *   zone       — open-world sector (camps, creatures, dungeons, multiplayer)
 */
export type PlayMode = 'procedural' | 'lobby' | 'zone';

export interface PlaySystemsFlags {
  /** Player character controller + soft-lock */
  character: boolean;
  /** Trees/rocks/home harvestables + drops */
  harvestables: boolean;
  /** Harvest zones (regrow forest circles) */
  harvestZones: boolean;
  /** Grass/sand detail LOD layers */
  detailLayers: boolean;
  /** Farm plots / hoe tools */
  farming: boolean;
  /** Building placement ghost */
  building: boolean;
  /** Wildlife CreatureManager */
  creatures: boolean;
  /** Ally garrison AI */
  allies: boolean;
  /** NpcCamp + CampUnit claim-flag systems */
  camps: boolean;
  /** Mine entrances / mine runs */
  mines: boolean;
  /** Mountain triad dungeon portal */
  mountainTriad: boolean;
  /** Hidden mountain city encounter */
  hiddenMountainCity: boolean;
  /** Haven shore foundation props */
  havenFoundation: boolean;
  /** Fabled zone foundation */
  fabledFoundation: boolean;
  /** Zone capital landmark anims */
  zoneCapital: boolean;
  /** Zone dungeon portal prompts */
  zoneDungeonPortals: boolean;
  /** ZoneSceneBuilder tick */
  zoneScene: boolean;
  /** Lobby ship / deck control */
  lobbyShip: boolean;
  /** Lobby capture points */
  lobbyCapture: boolean;
  /** Lobby play zone NPCs */
  lobbyPlayZone: boolean;
  /** Faction lobby islands */
  factionIslands: boolean;
  /** Day/night cycle */
  dayNight: boolean;
  /** Multiplayer room sync (engine-owned) */
  multiplayer: boolean;
  /** World FX bus (fire/smoke) — keep on, cheap */
  worldFx: boolean;
  /** Distance render budget */
  renderBudget: boolean;
  /** Board grid overlay */
  boardGrid: boolean;
}

/** Frame-skip intervals for non-critical systems (1 = every frame). */
export interface PlayTickRates {
  harvestables: number;
  detailLayers: number;
  creatures: number;
  camps: number;
  foundations: number;
  dayNight: number;
  external: number;
}

const PROCEDURAL: PlaySystemsFlags = {
  character: true,
  harvestables: true,
  harvestZones: true,
  detailLayers: true,
  farming: true,
  building: true,
  creatures: true,
  allies: true,
  camps: true,
  mines: true,
  mountainTriad: true,
  hiddenMountainCity: false,
  havenFoundation: false,
  fabledFoundation: false,
  zoneCapital: false,
  zoneDungeonPortals: false,
  zoneScene: false,
  lobbyShip: false,
  lobbyCapture: false,
  lobbyPlayZone: false,
  factionIslands: false,
  dayNight: true,
  multiplayer: true,
  worldFx: true,
  renderBudget: true,
  boardGrid: true,
};

const LOBBY: PlaySystemsFlags = {
  character: true,
  /** Hub harvest ring only (via LobbyPlayZone) — not full home-island harvest sim */
  harvestables: true,
  harvestZones: true,
  detailLayers: false,
  farming: false,
  building: false,
  /** Light fish only around lobby docks — no land wildlife swarm */
  creatures: true,
  allies: false,
  camps: false,
  mines: false,
  mountainTriad: true, // lobby dungeon event on north island
  hiddenMountainCity: false,
  havenFoundation: false,
  fabledFoundation: false,
  zoneCapital: false,
  zoneDungeonPortals: false,
  zoneScene: false,
  lobbyShip: true,
  lobbyCapture: true,
  lobbyPlayZone: true,
  factionIslands: true,
  dayNight: true,
  multiplayer: true,
  worldFx: true,
  renderBudget: true,
  boardGrid: false,
};

const ZONE: PlaySystemsFlags = {
  character: true,
  harvestables: true,
  harvestZones: true,
  detailLayers: false, // zone uses terrain materials; skip extra grass rings
  farming: false,
  building: true,
  creatures: true,
  allies: true,
  camps: true,
  mines: false,
  mountainTriad: false,
  hiddenMountainCity: true,
  havenFoundation: true,
  fabledFoundation: true,
  zoneCapital: true,
  zoneDungeonPortals: true,
  zoneScene: true,
  lobbyShip: false,
  lobbyCapture: false,
  lobbyPlayZone: false,
  factionIslands: false,
  dayNight: true,
  multiplayer: true,
  worldFx: true,
  renderBudget: true,
  boardGrid: false,
};

const TICK_PROCEDURAL: PlayTickRates = {
  harvestables: 1,
  detailLayers: 2,
  creatures: 1,
  camps: 2,
  foundations: 3,
  dayNight: 2,
  external: 1,
};

const TICK_LOBBY: PlayTickRates = {
  harvestables: 99,
  detailLayers: 99,
  creatures: 99,
  camps: 99,
  foundations: 99,
  dayNight: 2,
  external: 1,
};

const TICK_ZONE: PlayTickRates = {
  harvestables: 2,
  detailLayers: 99,
  creatures: 1,
  camps: 2,
  foundations: 3,
  dayNight: 2,
  external: 1,
};

export function resolvePlaySystems(mode: PlayMode | undefined): PlaySystemsFlags {
  switch (mode) {
    case 'lobby':
      return { ...LOBBY };
    case 'zone':
      return { ...ZONE };
    case 'procedural':
    default:
      return { ...PROCEDURAL };
  }
}

export function resolvePlayTickRates(mode: PlayMode | undefined): PlayTickRates {
  switch (mode) {
    case 'lobby':
      return { ...TICK_LOBBY };
    case 'zone':
      return { ...TICK_ZONE };
    case 'procedural':
    default:
      return { ...TICK_PROCEDURAL };
  }
}

/** Human-readable list for console / debug HUD */
export function describePlaySystems(flags: PlaySystemsFlags): string {
  return Object.entries(flags)
    .filter(([, v]) => v)
    .map(([k]) => k)
    .join(', ');
}
