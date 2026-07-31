/**
 * Airship Solo Zone — SSOT for deck + cabin + 3 captains.
 *
 * HARD ASSET RULE (fleet):
 *   Binary meshes live on **Cloudflare R2** → `assets.grudge-studio.com`
 *   Runtime loads via `assetUrl()` → same-origin `/api/assets/...` proxy.
 *   Never commit FBX or multi-MB GLB to GitHub.
 *   Convert: gltf-transform (weld, meshopt, webp, SI scale) → wrangler r2 object put.
 *
 * First visit: cabin → grudge6 create → deck.
 * NPCs: production `.prod.glb` on R2; fallback WK_Characters grudge6 kit.
 */

export const AIRSHIP_ZONE_VERSION = '2.0.0';

/**
 * Site-relative paths — resolved through assetUrl / Vercel /models rewrite to R2.
 * JSON camera pins may remain in repo (tiny); all meshes are CDN-only.
 */
export const AIRSHIP_ZONE_PATHS = {
  /** Opener hull/islands — R2: models/airship-zone/opener-scene.glb */
  airship: '/models/airship-zone/opener-scene.glb',
  /** Legacy hull fallback on R2 */
  airshipLegacy: '/models/airship-zone/airship.glb',
  /**
   * Cabin create — prefer cabin.prod.glb (non-voxel) on R2.
   * boatvoxelinside is temporary until converted cabin ships.
   */
  interior: '/models/airship-zone/cabin.prod.glb',
  interiorFallback: '/models/airship-zone/boatvoxelinside.glb',
  /** Camera pins (JSON only — safe in git under client/public) */
  camera: '/models/airship-zone/scene-camera.json',
  perspectiveCamera: '/models/airship-zone/PerspectiveCamera.json',
  /**
   * Crew — converted GLB only (never .fbx at runtime).
   * Upload: models/airship-zone/npcs/*.prod.glb after FBX→GLB convert + SI fit.
   */
  npcs: {
    johnWayne: '/models/airship-zone/npcs/cptjohnwayne.prod.glb',
    scourge: '/models/airship-zone/npcs/scourgefaith.prod.glb',
    racalvin: '/models/airship-zone/npcs/racalvinking.prod.glb',
  },
  /** Fleet grudge6 kit when custom NPC GLB missing on R2 */
  grudge6HumanFallback: '/models/grudge6/races/WK_Characters.glb',
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
