/**
 * Airship Solo Zone — SSOT for deck + cabin + 3 captains.
 *
 * First visit: boatvoxelinside cabin → create grudge6 character → walk out to deck.
 * NPCs (2 m tall, Mixamo-style skinned meshes):
 *  - Captain John Wayne — helm wheel only
 *  - Scourge Faithbearer — front top deck patrol
 *  - Racalvin Pirate King — cabin mentor, then deck wander
 */

export const AIRSHIP_ZONE_VERSION = '1.0.0';

export const AIRSHIP_ZONE_PATHS = {
  /**
   * Opener hull/islands — D:\Games\Models\scene (2).glb
   * welded + meshopt + webp → opener-scene.glb (~1.5 MB)
   */
  airship: '/models/airship-zone/opener-scene.glb',
  /** Fallback if opener fails */
  airshipLegacy: '/models/airship-zone/airship.glb',
  /** Cabin create (boatinside voxel) */
  interior: '/models/airship-zone/boatvoxelinside.glb',
  camera: '/models/airship-zone/scene-camera.json',
  perspectiveCamera: '/models/airship-zone/PerspectiveCamera.json',
  npcs: {
    johnWayne: '/models/airship-zone/npcs/cptjohnwayne.fbx',
    scourge: '/models/airship-zone/npcs/scourgefaith.fbx',
    racalvin: '/models/airship-zone/npcs/racalvinking.glb',
  },
} as const;

/** All heroes in this zone target 2.0 m (user SSOT for this scene). */
export const AIRSHIP_HERO_HEIGHT_M = 2.0;

export type AirshipNpcId = 'john_wayne' | 'scourge_faithbearer' | 'racalvin_king';

export interface AirshipNpcDef {
  id: AirshipNpcId;
  displayName: string;
  title: string;
  modelPath: string;
  /** mixamo | bip001 | custom */
  skeletonClass: 'mixamo' | 'bip001_grudge6' | 'custom';
  heightM: number;
  /** deck | cabin | both */
  realm: 'deck' | 'cabin' | 'both';
  /** Fixed pose key */
  role: 'helm' | 'bow_patrol' | 'mentor_wander';
  /** Local deck waypoints (metres, ship-local) — tuned after airship load bounds */
  waypoints: Array<{ x: number; y: number; z: number }>;
  dialogue: string[];
  /** Camera focus offset when selecting from top bar */
  cameraFocusLocal: { x: number; y: number; z: number };
}

export const AIRSHIP_NPCS: AirshipNpcDef[] = [
  {
    id: 'john_wayne',
    displayName: 'Captain John Wayne',
    title: 'Helmsman',
    modelPath: AIRSHIP_ZONE_PATHS.npcs.johnWayne,
    skeletonClass: 'mixamo',
    heightM: AIRSHIP_HERO_HEIGHT_M,
    realm: 'deck',
    role: 'helm',
    // Stern / upper deck wheel — adjusted at runtime to probed helm if found
    waypoints: [{ x: 0, y: 3.5, z: -6 }],
    dialogue: [
      'Steady as she goes. The wheel is mine — always.',
      'You want to sail, you talk to Racalvin. I keep us in the sky.',
      'Wind is fair. Hold course north by north-east.',
    ],
    cameraFocusLocal: { x: 0, y: 5, z: -8 },
  },
  {
    id: 'scourge_faithbearer',
    displayName: 'Scourge Faithbearer',
    title: 'Bow Sentinel',
    modelPath: AIRSHIP_ZONE_PATHS.npcs.scourge,
    skeletonClass: 'mixamo',
    heightM: AIRSHIP_HERO_HEIGHT_M,
    realm: 'deck',
    role: 'bow_patrol',
    // Front top deck only
    waypoints: [
      { x: -1.5, y: 2.8, z: 7 },
      { x: 1.5, y: 2.8, z: 8 },
      { x: 0, y: 2.8, z: 9.5 },
      { x: -1.2, y: 2.8, z: 8 },
    ],
    dialogue: [
      'The bow is sacred. Storms break here first.',
      'Faith is a blade. Keep yours sharp.',
      'Racalvin trusts you. Prove him right.',
    ],
    cameraFocusLocal: { x: 0, y: 4.5, z: 10 },
  },
  {
    id: 'racalvin_king',
    displayName: 'Racalvin',
    title: 'Pirate King',
    modelPath: AIRSHIP_ZONE_PATHS.npcs.racalvin,
    skeletonClass: 'custom',
    heightM: AIRSHIP_HERO_HEIGHT_M,
    realm: 'both',
    role: 'mentor_wander',
    waypoints: [
      { x: 0, y: 1.2, z: 0 },
      { x: 2, y: 2.2, z: -2 },
      { x: -2, y: 2.2, z: 2 },
      { x: 0, y: 2.2, z: 4 },
    ],
    dialogue: [
      'Welcome aboard, free captain. Forge your legend here.',
      'Pick your grudge6 race. Bake it proper — mesh, atlas, feet on deck.',
      'When you are ready, walk out that hatch. The sky is ours.',
      'John holds the wheel. Scourge holds the bow. I hold the creed.',
    ],
    cameraFocusLocal: { x: 0, y: 3, z: 2 },
  },
];

export const AIRSHIP_STORAGE_KEYS = {
  hasCharacter: 'grudge_airship_has_character',
  characterJson: 'grudge_airship_player_character',
  firstVisitDone: 'grudge_airship_first_visit_done',
} as const;

export function airshipHasSavedCharacter(): boolean {
  try {
    return localStorage.getItem(AIRSHIP_STORAGE_KEYS.hasCharacter) === '1';
  } catch {
    return false;
  }
}

export function markAirshipCharacterCreated(payload: {
  id: string;
  name: string;
  raceId: string;
  classId: string;
}): void {
  try {
    localStorage.setItem(AIRSHIP_STORAGE_KEYS.hasCharacter, '1');
    localStorage.setItem(AIRSHIP_STORAGE_KEYS.characterJson, JSON.stringify(payload));
    localStorage.setItem(AIRSHIP_STORAGE_KEYS.firstVisitDone, '1');
  } catch {
    /* ignore */
  }
}

export function loadAirshipCharacter(): {
  id: string;
  name: string;
  raceId: string;
  classId: string;
} | null {
  try {
    const raw = localStorage.getItem(AIRSHIP_STORAGE_KEYS.characterJson);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Door / hatch on deck → cabin */
export const AIRSHIP_CABIN_DOOR_LOCAL = { x: 0, y: 2.4, z: 1.5 };

/** Player spawn on deck after create */
export const AIRSHIP_DECK_SPAWN_LOCAL = { x: 0, y: 2.5, z: 2 };

/** Player spawn in cabin on first visit */
export const AIRSHIP_CABIN_SPAWN_LOCAL = { x: 0, y: 0.15, z: 0 };
