/**
 * Assassination Grounds — playable map SSOT.
 *
 * GLB: ultimate_assassination_grounds (CDN) / ultimate_assasination_grounds (local typo filename).
 * Systems deploy on named scene markers (targets, helper wedges as portals).
 * Entrances / exits prompt Return to Danger Room (yes → open.grudge-studio.com/danger).
 */

export const ASSASSINATION_GROUNDS_MAP_ID = 'assassination_grounds' as const;
export const ASSASSINATION_GROUNDS_ZONE_ID = 'map_assassination_grounds_v1' as const;

/** Production Danger Room (Open). */
export const DANGER_ROOM_URL = 'https://open.grudge-studio.com/danger' as const;

export const ASSASSINATION_GROUNDS_GLB = {
  id: ASSASSINATION_GROUNDS_MAP_ID,
  label: 'Ultimate Assassination Grounds',
  description:
    'Authorable kill-house map with full navmesh, target dummies, and Danger Room portal gates.',
  /** Prefer correctly spelled CDN key; local Documents file uses double-s typo. */
  glbUrls: [
    'https://assets.grudge-studio.com/models/maps/assassination_grounds/ultimate_assassination_grounds.glb',
    '/models/maps/assassination_grounds/ultimate_assassination_grounds.glb',
    '/models/maps/assassination_grounds/ultimate_assasination_grounds.glb',
  ] as const,
  sourceLocal: 'Documents/ultimate_assasination_grounds.glb',
  entryPath: '/assassination-grounds',
  entryAlternates: ['/maps/assassination-grounds', '/danger-grounds'],
  skydomeId: 'sky_doom_19',
  dangerRoomUrl: DANGER_ROOM_URL,
} as const;

export type AssassinationSystemKind =
  | 'target'
  | 'entrance'
  | 'exit'
  | 'spawn'
  | 'prop';

export interface AssassinationSystemMarker {
  id: string;
  kind: AssassinationSystemKind;
  /** Exact GLTF node name (or prefix) to bind */
  nodeName: string;
  label: string;
  /** Portal radius (m) for entrance/exit walk-through */
  triggerRadiusM?: number;
  /** When true, walking through opens Danger Room yes/no UI */
  dangerPortal?: boolean;
}

/**
 * Named markers from ultimate_assasination_grounds.glb (usg.fbx).
 * Targets = mannequin parts + katanas. Helper wedges = portal anchors.
 */
export const ASSASSINATION_SYSTEM_MARKERS: readonly AssassinationSystemMarker[] = [
  // ── Targets (assassination dummies) ──────────────────────────────────────
  { id: 'target_head_1', kind: 'target', nodeName: 'Head1', label: 'Target Head 1' },
  { id: 'target_head_2', kind: 'target', nodeName: 'Head2', label: 'Target Head 2' },
  { id: 'target_head_3', kind: 'target', nodeName: 'Head3', label: 'Target Head 3' },
  { id: 'target_torso_1', kind: 'target', nodeName: 'Torso1', label: 'Target Torso 1' },
  { id: 'target_torso_2', kind: 'target', nodeName: 'Torso2', label: 'Target Torso 2' },
  { id: 'target_torso_3', kind: 'target', nodeName: 'Torso3', label: 'Target Torso 3' },
  { id: 'target_arm_l_1', kind: 'target', nodeName: 'LeftArm1', label: 'Target Left Arm 1' },
  { id: 'target_arm_l_2', kind: 'target', nodeName: 'LeftArm2', label: 'Target Left Arm 2' },
  { id: 'target_arm_l_3', kind: 'target', nodeName: 'LeftArm3', label: 'Target Left Arm 3' },
  { id: 'target_arm_r_1', kind: 'target', nodeName: 'RightArm1', label: 'Target Right Arm 1' },
  { id: 'target_arm_r_2', kind: 'target', nodeName: 'RightArm2', label: 'Target Right Arm 2' },
  { id: 'target_arm_r_3', kind: 'target', nodeName: 'RightArm3', label: 'Target Right Arm 3' },
  { id: 'target_katana_1', kind: 'target', nodeName: 'Katana1', label: 'Target Katana 1' },
  { id: 'target_katana_2', kind: 'target', nodeName: 'Katana2', label: 'Target Katana 2' },
  { id: 'target_katana_3', kind: 'target', nodeName: 'Katana3', label: 'Target Katana 3' },

  // ── Entrances / exits (Helperwedge) → Danger Room portals ────────────────
  {
    id: 'entrance_1',
    kind: 'entrance',
    nodeName: 'Helperwedge1',
    label: 'Entrance 1',
    triggerRadiusM: 2.4,
    dangerPortal: true,
  },
  {
    id: 'entrance_2',
    kind: 'entrance',
    nodeName: 'Helperwedge2',
    label: 'Entrance 2',
    triggerRadiusM: 2.4,
    dangerPortal: true,
  },
  {
    id: 'entrance_3',
    kind: 'entrance',
    nodeName: 'Helperwedge3',
    label: 'Entrance 3',
    triggerRadiusM: 2.4,
    dangerPortal: true,
  },
  {
    id: 'exit_1',
    kind: 'exit',
    nodeName: 'Helperwedge4',
    label: 'Exit 1',
    triggerRadiusM: 2.4,
    dangerPortal: true,
  },
  {
    id: 'exit_2',
    kind: 'exit',
    nodeName: 'Helperwedge5',
    label: 'Exit 2',
    triggerRadiusM: 2.4,
    dangerPortal: true,
  },
  {
    id: 'exit_3',
    kind: 'exit',
    nodeName: 'Helperwedge6',
    label: 'Exit 3',
    triggerRadiusM: 2.4,
    dangerPortal: true,
  },
] as const;

export const ASSASSINATION_NAV = {
  zoneId: ASSASSINATION_GROUNDS_ZONE_ID,
  /** Grid cell size for height-sample bake (metres) */
  cellSizeM: 1.25,
  /** Max agent step height when sampling floor */
  maxStepM: 0.55,
  /** Player eye / capsule */
  playerHeightM: 1.8,
  playerRadiusM: 0.35,
  walkSpeedMps: 4.2,
  runSpeedMps: 7.5,
} as const;

export function assassinationPortalMarkers(): AssassinationSystemMarker[] {
  return ASSASSINATION_SYSTEM_MARKERS.filter((m) => m.dangerPortal);
}

export function assassinationTargetMarkers(): AssassinationSystemMarker[] {
  return ASSASSINATION_SYSTEM_MARKERS.filter((m) => m.kind === 'target');
}
