/**
 * SurfaceFlyby — unified cinematic flyby for any trailer surface:
 * sector / lobby / home island / tutorial.
 *
 * Builds waypoints from live engine nodes when present, else catalog templates.
 * Records WebM + PNG snapshots for trailer assembly.
 */
import * as THREE from 'three';
import type { Island3DEngine } from '../engine/Island3DEngine';
import {
  getNodesByCategory,
  type IslandNode,
  type AIPatrolNode,
  type NPCCampNode,
} from '@shared/definitions/zoneServerNodes';
import {
  getTrailerSurface,
  pathTemplatesForSurface,
  resolveTrailerSurfaceId,
  type TrailerSurfaceDef,
  type TrailerWaypointTemplate,
} from '@shared/definitions/trailerShotCatalog';
import {
  playCinematicPath,
  captureCanvasPng,
  startCanvasRecorder,
  type CinematicWaypoint,
} from './CinematicCamera';

export interface SurfaceFlybyResult {
  surfaceId: string;
  title: string;
  videoBlob: Blob | null;
  snapshots: Array<{ id: string; label: string; dataUrl: string; titleCard?: string }>;
  durationSec: number;
  waypointsHit: number;
}

export interface SurfaceFlybyOpts {
  record?: boolean;
  snapshotEachWp?: boolean;
  surfaceId?: string;
  /** Extra title card at start */
  openTitle?: string;
}

export interface SurfaceFlybyHandle {
  playing: boolean;
  start: (opts?: SurfaceFlybyOpts) => Promise<SurfaceFlybyResult>;
  stop: () => void;
  dispose: () => void;
}

function waterY(engine: Island3DEngine): number {
  return engine.zoneSector?.terrain3d.waterLevel ?? 0;
}

function centerOf(engine: Island3DEngine): THREE.Vector3 {
  const wy = waterY(engine);
  if (engine.character) {
    const p = engine.character.getPosition();
    return new THREE.Vector3(p.x, wy + 10, p.z);
  }
  return new THREE.Vector3(0, wy + 20, 0);
}

function templateToWorld(
  t: TrailerWaypointTemplate,
  center: THREE.Vector3,
  scale = 1,
): CinematicWaypoint {
  return {
    id: t.id,
    label: t.label,
    position: new THREE.Vector3(
      center.x + t.offset[0] * scale,
      center.y + t.offset[1] * scale,
      center.z + t.offset[2] * scale,
    ),
    lookAt: new THREE.Vector3(
      center.x + t.lookOffset[0] * scale,
      Math.max(center.y * 0.2, t.lookOffset[1] + waterYFromCenter(center)),
      center.z + t.lookOffset[2] * scale,
    ),
    duration: t.durationSec,
    titleCard: t.titleCard,
    proofId: t.kind,
  };
}

function waterYFromCenter(c: THREE.Vector3): number {
  return c.y - 10;
}

/** Build live-aware waypoints for the current engine state. */
export function buildSurfaceWaypoints(
  engine: Island3DEngine,
  surface: TrailerSurfaceDef,
): CinematicWaypoint[] {
  const wps: CinematicWaypoint[] = [];
  const wy = waterY(engine);
  const center = centerOf(engine);
  const pop = engine.zonePopulation;
  const compact = surface.kind === 'tutorial' || surface.kind === 'home_island';
  const scale = compact ? 1 : 1;

  // 1) Catalog establish / title
  const templates = pathTemplatesForSurface(surface);
  const establish = templates.find((t) => t.kind === 'establish') ?? templates[0];
  if (establish) {
    const wp = templateToWorld(establish, center, scale);
    wp.titleCard = surface.title;
    wps.push(wp);
  }

  // 2) Live sector nodes
  if (pop && surface.kind === 'sector') {
    const islands = getNodesByCategory<IslandNode>(pop, 'island').slice(0, 6);
    islands.forEach((isl, i) => {
      const x = isl.position[0];
      const z = isl.position[2];
      const r = isl.radiusM || 200;
      wps.push({
        id: `island_${i}`,
        label: `Island · ${isl.size ?? 'land'}`,
        proofId: 'island',
        position: new THREE.Vector3(x + r * 0.9, wy + 60 + r * 0.08, z + r * 1.1),
        lookAt: new THREE.Vector3(x, wy + 10, z),
        duration: 3.0,
      });
    });

    getNodesByCategory<NPCCampNode>(pop, 'npc_camp').slice(0, 3).forEach((c, i) => {
      wps.push({
        id: `camp_${i}`,
        label: c.name || 'NPC camp',
        proofId: 'camp',
        position: new THREE.Vector3(c.position[0] + 35, wy + 28, c.position[2] + 40),
        lookAt: new THREE.Vector3(c.position[0], wy + 4, c.position[2]),
        duration: 2.6,
      });
    });

    getNodesByCategory<AIPatrolNode>(pop, 'ai_patrol')
      .filter((p) => p.isShipPatrol)
      .slice(0, 4)
      .forEach((s, i) => {
        const live = engine.zoneScene?.markers.get(s.id);
        const x = live?.position.x ?? s.position[0];
        const z = live?.position.z ?? s.position[2];
        wps.push({
          id: `ship_${i}`,
          label: `Enemy boat · ${s.faction}`,
          proofId: 'ship',
          position: new THREE.Vector3(x + 50, wy + 22, z + 55),
          lookAt: new THREE.Vector3(x, wy + 2, z),
          duration: 2.5,
        });
      });
  }

  // 3) Lobby ship / character
  if (surface.kind === 'lobby') {
    const p = engine.character?.getPosition() ?? center;
    wps.push({
      id: 'deck',
      label: 'Deck / sail',
      proofId: 'ship',
      position: new THREE.Vector3(p.x + 28, p.y + 18, p.z + 32),
      lookAt: new THREE.Vector3(p.x, p.y + 3, p.z),
      duration: 3.2,
    });
    wps.push({
      id: 'capture',
      label: 'Capture points',
      proofId: 'camp',
      position: new THREE.Vector3(p.x - 60, p.y + 40, p.z + 80),
      lookAt: new THREE.Vector3(p.x + 20, p.y, p.z),
      duration: 3.0,
    });
  }

  // 4) Hero shot (home / tutorial / haven)
  if (surface.shotKinds.includes('hero') && engine.character) {
    const p = engine.character.getPosition();
    wps.push({
      id: 'hero',
      label: 'Hero',
      proofId: 'hero',
      position: new THREE.Vector3(p.x + 6, p.y + 3.2, p.z + 9),
      lookAt: new THREE.Vector3(p.x, p.y + 1.5, p.z),
      duration: 2.8,
      titleCard: surface.kind === 'tutorial' ? 'WAKE' : undefined,
    });
  }

  // 5) Wildlife / harvest from first mesh
  const firstMesh = engine.zoneScene?.islandMeshes?.values().next().value as
    | THREE.Object3D
    | undefined;
  if (firstMesh) {
    const p = firstMesh.getWorldPosition(new THREE.Vector3());
    wps.push({
      id: 'wildlife',
      label: 'Wildlife skim',
      proofId: 'wildlife',
      position: new THREE.Vector3(p.x + 80, p.y + 35, p.z + 90),
      lookAt: new THREE.Vector3(p.x, p.y + 5, p.z),
      duration: 3.0,
    });
    wps.push({
      id: 'harvest',
      label: 'Harvestables',
      proofId: 'harvest',
      position: new THREE.Vector3(p.x - 40, p.y + 25, p.z + 50),
      lookAt: new THREE.Vector3(p.x + 10, p.y + 3, p.z),
      duration: 2.8,
    });
  } else if (compact) {
    // Template harvest/coast for home/tutorial
    for (const t of templates) {
      if (t.kind === 'establish' || t.kind === 'close' || t.kind === 'hero') continue;
      if (wps.some((w) => w.id === t.id)) continue;
      wps.push(templateToWorld(t, center, scale));
    }
  }

  // 6) Landmarks
  if (engine.hiddenMountainCity?.root) {
    const p = engine.hiddenMountainCity.root.position;
    wps.push({
      id: 'mountain_city',
      label: 'Hidden Mountain City',
      proofId: 'landmark',
      position: new THREE.Vector3(p.x + 120, p.y + 90, p.z + 140),
      lookAt: p.clone().add(new THREE.Vector3(0, 40, 0)),
      duration: 3.8,
    });
  }
  if (engine.sectorEventLandmarks?.root) {
    engine.sectorEventLandmarks.root.children.slice(0, 2).forEach((ch, i) => {
      wps.push({
        id: `landmark_${i}`,
        label: ch.name || 'Landmark',
        proofId: 'landmark',
        position: new THREE.Vector3(ch.position.x + 90, ch.position.y + 70, ch.position.z + 100),
        lookAt: ch.position.clone().add(new THREE.Vector3(0, 30, 0)),
        duration: 3.2,
      });
    });
  }

  // 7) Close + brand card
  const close = templates.find((t) => t.kind === 'close');
  if (close) {
    const wp = templateToWorld(close, center, scale);
    wp.titleCard = wp.titleCard ?? 'GRUDGE WARLORDS';
    wps.push(wp);
  }

  return wps;
}

export function createSurfaceFlyby(engine: Island3DEngine): SurfaceFlybyHandle {
  let playing = false;
  let cancel = false;

  return {
    get playing() {
      return playing;
    },
    async start(opts = {}) {
      const record = opts.record !== false;
      const snapshotEachWp = opts.snapshotEachWp !== false;
      cancel = false;
      playing = true;

      const surfaceId =
        opts.surfaceId
        ?? resolveTrailerSurfaceId({
          mode: engine.getPlayMode?.() ?? 'zone',
          sectorId: engine.zoneSector?.id ?? engine.zonePopulation?.sectorId,
        });
      const surface =
        getTrailerSurface(surfaceId)
        ?? getTrailerSurface('haven_shore')!;

      engine.beginCinematicCamera();
      if (engine.character) {
        engine.character.cinematicLock = true;
      }

      const waypoints = buildSurfaceWaypoints(engine, surface);
      if (opts.openTitle && waypoints[0]) {
        waypoints[0].titleCard = opts.openTitle;
      }

      const snapshots: SurfaceFlybyResult['snapshots'] = [];
      const cam = engine.getCamera();
      const scene = engine.getScene();
      const canvas = engine.getRenderer().domElement as HTMLCanvasElement;
      const rec = record ? startCanvasRecorder(canvas) : null;
      const tStart = performance.now();

      const { reached } = await playCinematicPath(cam, waypoints, {
        shouldCancel: () => cancel,
        onWaypoint: (wp) => {
          if (!snapshotEachWp || cancel) return;
          try {
            const dataUrl = captureCanvasPng(engine.getRenderer(), scene, cam);
            snapshots.push({
              id: wp.id,
              label: wp.label,
              dataUrl,
              titleCard: wp.titleCard,
            });
          } catch {
            /* ignore */
          }
        },
      });

      let videoBlob: Blob | null = null;
      if (rec) {
        videoBlob = await rec.stop();
      }

      engine.endCinematicCamera();
      if (engine.character) {
        engine.character.cinematicLock = false;
      }
      playing = false;

      const durationSec = (performance.now() - tStart) / 1000;
      console.info(
        '[SurfaceFlyby]',
        surface.id,
        `wp=${reached}/${waypoints.length}`,
        `snaps=${snapshots.length}`,
        videoBlob ? `video=${(videoBlob.size / 1e6).toFixed(1)}MB` : 'no-video',
      );

      return {
        surfaceId: surface.id,
        title: surface.title,
        videoBlob,
        snapshots,
        durationSec,
        waypointsHit: reached,
      };
    },
    stop() {
      cancel = true;
      playing = false;
    },
    dispose() {
      cancel = true;
      playing = false;
    },
  };
}

/** @deprecated use createSurfaceFlyby — kept for ZoneFlybyHUD compat */
export { createSurfaceFlyby as createZoneFlyby };
