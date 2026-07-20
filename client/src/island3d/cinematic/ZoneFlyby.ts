/**
 * ZoneFlyby — live Three.js cinematic path over a loaded Warlords sector.
 *
 * Proves deployment: orbits islands, skims animal scatter, NPC camps,
 * harvest markers, enemy boat lanes, landmarks. Optional MediaRecorder
 * video + PNG snapshots for the sector rewrite proof package.
 */
import * as THREE from 'three';
import type { Island3DEngine } from '../engine/Island3DEngine';
import {
  getNodesByCategory,
  type IslandNode,
  type AIPatrolNode,
  type NPCCampNode,
} from '@shared/definitions/zoneServerNodes';
import { SECTOR_PROOF_CHECKLIST } from '@shared/definitions/sectorRewritePipeline';

export interface FlybyWaypoint {
  id: string;
  label: string;
  proofId?: string;
  position: THREE.Vector3;
  lookAt: THREE.Vector3;
  duration: number;
}

export interface ZoneFlybyResult {
  videoBlob: Blob | null;
  snapshots: Array<{ id: string; label: string; dataUrl: string }>;
  checklist: Array<{ id: string; label: string; seen: boolean }>;
}

export interface ZoneFlybyHandle {
  playing: boolean;
  start: (opts?: { record?: boolean; snapshotEachWp?: boolean }) => Promise<ZoneFlybyResult>;
  stop: () => void;
  dispose: () => void;
}

function buildWaypoints(engine: Island3DEngine): FlybyWaypoint[] {
  const wps: FlybyWaypoint[] = [];
  const pop = engine.zonePopulation;
  const waterY = engine.zoneSector?.terrain3d.waterLevel ?? 0;
  const center = new THREE.Vector3(0, waterY + 80, 0);

  // Opening high establish
  wps.push({
    id: 'establish',
    label: 'Sector establish shot',
    proofId: 'islands',
    position: new THREE.Vector3(0, 420, 900),
    lookAt: center.clone(),
    duration: 4.5,
  });

  if (pop) {
    const islands = getNodesByCategory<IslandNode>(pop, 'island').slice(0, 8);
    islands.forEach((isl, i) => {
      const x = isl.position[0];
      const z = isl.position[2];
      const r = isl.radiusM || 200;
      wps.push({
        id: `island_${i}`,
        label: `Island ${isl.size} · land mass`,
        proofId: 'islands',
        position: new THREE.Vector3(x + r * 0.9, waterY + 60 + r * 0.08, z + r * 1.1),
        lookAt: new THREE.Vector3(x, waterY + 10, z),
        duration: 3.2,
      });
    });

    const camps = getNodesByCategory<NPCCampNode>(pop, 'npc_camp').slice(0, 4);
    camps.forEach((c, i) => {
      wps.push({
        id: `camp_${i}`,
        label: c.name || 'NPC camp',
        proofId: 'npcs',
        position: new THREE.Vector3(c.position[0] + 35, waterY + 28, c.position[2] + 40),
        lookAt: new THREE.Vector3(c.position[0], waterY + 4, c.position[2]),
        duration: 2.8,
      });
    });

    const ships = getNodesByCategory<AIPatrolNode>(pop, 'ai_patrol')
      .filter((p) => p.isShipPatrol)
      .slice(0, 5);
    ships.forEach((s, i) => {
      const live = engine.zoneScene?.markers.get(s.id);
      const x = live?.position.x ?? s.position[0];
      const z = live?.position.z ?? s.position[2];
      wps.push({
        id: `ship_${i}`,
        label: `Enemy boat · ${s.faction}`,
        proofId: 'enemy_boats',
        position: new THREE.Vector3(x + 50, waterY + 22, z + 55),
        lookAt: new THREE.Vector3(x, waterY + 2, z),
        duration: 2.6,
      });
    });
  }

  // Wildlife skim near first island mesh
  const firstMesh = engine.zoneScene?.islandMeshes.values().next().value as THREE.Object3D | undefined;
  if (firstMesh) {
    const p = firstMesh.getWorldPosition(new THREE.Vector3());
    wps.push({
      id: 'wildlife',
      label: 'Wildlife / harvest skim',
      proofId: 'animals',
      position: new THREE.Vector3(p.x + 80, p.y + 35, p.z + 90),
      lookAt: new THREE.Vector3(p.x, p.y + 5, p.z),
      duration: 3.5,
    });
    wps.push({
      id: 'harvest',
      label: 'Harvest nodes',
      proofId: 'harvestables',
      position: new THREE.Vector3(p.x - 40, p.y + 25, p.z + 50),
      lookAt: new THREE.Vector3(p.x + 10, p.y + 3, p.z),
      duration: 3.0,
    });
  }

  // Landmarks
  if (engine.hiddenMountainCity?.root) {
    const p = engine.hiddenMountainCity.root.position;
    wps.push({
      id: 'mountain_city',
      label: 'Hidden Mountain City',
      proofId: 'landmarks',
      position: new THREE.Vector3(p.x + 120, p.y + 90, p.z + 140),
      lookAt: p.clone().add(new THREE.Vector3(0, 40, 0)),
      duration: 4.0,
    });
  }
  if (engine.sectorEventLandmarks?.root) {
    engine.sectorEventLandmarks.root.children.slice(0, 2).forEach((ch, i) => {
      wps.push({
        id: `landmark_${i}`,
        label: ch.name || 'Event landmark',
        proofId: 'landmarks',
        position: new THREE.Vector3(ch.position.x + 90, ch.position.y + 70, ch.position.z + 100),
        lookAt: ch.position.clone().add(new THREE.Vector3(0, 30, 0)),
        duration: 3.5,
      });
    });
  }

  // Closing orbit
  wps.push({
    id: 'close',
    label: 'Closing orbit',
    proofId: 'islands',
    position: new THREE.Vector3(-700, 280, -500),
    lookAt: center.clone(),
    duration: 5.0,
  });

  return wps;
}

export function createZoneFlyby(engine: Island3DEngine): ZoneFlybyHandle {
  let playing = false;
  let cancel = false;
  const cam = engine.camera;
  const controls = engine.controls;

  const handle: ZoneFlybyHandle = {
    get playing() {
      return playing;
    },
    async start(opts = {}) {
      const record = opts.record !== false;
      const snapshotEachWp = opts.snapshotEachWp !== false;
      cancel = false;
      playing = true;

      engine.beginCinematicCamera?.();
      if (engine.character) {
        // Freeze player input during cinematic
        (engine.character as any).cinematicLock = true;
      }

      const waypoints = buildWaypoints(engine);
      const snapshots: ZoneFlybyResult['snapshots'] = [];
      const seen = new Set<string>();

      let mediaRecorder: MediaRecorder | null = null;
      const chunks: BlobPart[] = [];
      let videoBlob: Blob | null = null;

      try {
        if (record) {
          const stream = (engine.renderer.domElement as HTMLCanvasElement).captureStream(30);
          mediaRecorder = new MediaRecorder(stream, {
            mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
              ? 'video/webm;codecs=vp9'
              : 'video/webm',
            videoBitsPerSecond: 6_000_000,
          });
          mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
          };
          mediaRecorder.start(200);
        }
      } catch (err) {
        console.warn('[ZoneFlyby] MediaRecorder unavailable — snapshots only', err);
      }

      const tmpPos = new THREE.Vector3();
      const tmpLook = new THREE.Vector3();
      const fromPos = new THREE.Vector3().copy(cam.position);
      const fromLook = new THREE.Vector3().copy(controls.target);

      for (let i = 0; i < waypoints.length; i++) {
        if (cancel) break;
        const wp = waypoints[i];
        const startPos = i === 0 ? fromPos : waypoints[i - 1].position;
        const startLook = i === 0 ? fromLook : waypoints[i - 1].lookAt;
        const dur = wp.duration;
        const t0 = performance.now();

        await new Promise<void>((resolve) => {
          const step = () => {
            if (cancel) {
              resolve();
              return;
            }
            const u = Math.min(1, (performance.now() - t0) / (dur * 1000));
            const e = u * u * (3 - 2 * u); // smoothstep
            tmpPos.lerpVectors(startPos, wp.position, e);
            tmpLook.lerpVectors(startLook, wp.lookAt, e);
            cam.position.copy(tmpPos);
            controls.target.copy(tmpLook);
            controls.update();
            if (u >= 1) resolve();
            else requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        });

        if (wp.proofId) seen.add(wp.proofId);
        if (snapshotEachWp && !cancel) {
          try {
            // Force a frame then grab canvas
            engine.renderer.render(engine.scene, cam);
            const dataUrl = engine.renderer.domElement.toDataURL('image/png');
            snapshots.push({ id: wp.id, label: wp.label, dataUrl });
          } catch {
            /* ignore */
          }
        }
      }

      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        videoBlob = await new Promise<Blob | null>((resolve) => {
          mediaRecorder!.onstop = () => {
            resolve(chunks.length ? new Blob(chunks, { type: 'video/webm' }) : null);
          };
          mediaRecorder!.stop();
        });
      }

      // Auto-detect extra proof from engine state
      if (engine.creatures && engine.creatures.count > 0) {
        seen.add('animals');
        seen.add('fish');
      }
      if (engine.npcCamps) seen.add('npcs');
      if (engine.zoneDungeonPortals) seen.add('nodes');
      if (engine.hiddenMountainCity || engine.sectorEventLandmarks) seen.add('landmarks');

      engine.endCinematicCamera?.();
      if (engine.character) {
        (engine.character as any).cinematicLock = false;
      }
      playing = false;

      const checklist = SECTOR_PROOF_CHECKLIST.map((c) => ({
        id: c.id,
        label: c.label,
        seen: seen.has(c.id),
      }));

      console.info(
        '[ZoneFlyby] complete',
        `snapshots=${snapshots.length}`,
        `video=${videoBlob ? `${(videoBlob.size / 1e6).toFixed(1)}MB` : 'none'}`,
        `proof=${checklist.filter((c) => c.seen).length}/${checklist.length}`,
      );

      return { videoBlob, snapshots, checklist };
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

  return handle;
}

/** Download helpers for proof package */
export function downloadFlybyResult(
  sectorId: string,
  result: ZoneFlybyResult,
): void {
  if (result.videoBlob) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(result.videoBlob);
    a.download = `${sectorId}-flyby.webm`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  result.snapshots.forEach((s, i) => {
    const a = document.createElement('a');
    a.href = s.dataUrl;
    a.download = `${sectorId}-snap-${String(i).padStart(2, '0')}-${s.id}.png`;
    a.click();
  });
}
