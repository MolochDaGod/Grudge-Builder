/**
 * EventIslandSystem — spiral mountain (skybox stripped) as sink/raise event islands.
 *
 * Lyoko is reserved for ethereal floating stacks; spiral mountain drives
 * mountain + plains event islands with rotating NPCs / bosses and portals
 * into boss rooms (e.g. Hoth frozen chamber).
 */
import * as THREE from 'three';
import {
  FLOATING_ISLAND_LOAD_ORDER,
  HOTH_BOSS_ROOM,
  SPIRAL_MOUNTAIN_EVENT,
  pickBossRoomInstance,
  type EventIslandBiome,
} from '@shared/definitions/floatingIslandBossAssets';
import {
  fitObjectHeight,
  loadGlbFirst,
  stripSkyboxFromObject,
} from './gltfSceneUtils';

export type EventIslandPhase = 'raised' | 'sinking' | 'sunken' | 'rising';

export interface EventIslandCallbacks {
  onPhase?: (phase: EventIslandPhase, islandId: string) => void;
  onBossSpawn?: (bossId: string, islandId: string) => void;
  onPortalReady?: (portalKind: string, worldPos: THREE.Vector3) => void;
  onPrompt?: (msg: string | null) => void;
}

export interface EventIslandOpts {
  scene: THREE.Scene;
  sectorId: string;
  biome?: EventIslandBiome | string;
  zoneSizeM: number;
  waterLevel: number;
  sampleGround?: (x: number, z: number) => number | null;
  cb?: EventIslandCallbacks;
}

interface LiveIsland {
  id: string;
  root: THREE.Group;
  baseY: number;
  phase: EventIslandPhase;
  phaseT: number;
  bossId: string;
  npcRole: string;
  portalLocal: THREE.Vector3;
}

export class EventIslandSystem {
  readonly root = new THREE.Group();
  private scene: THREE.Scene;
  private sectorId: string;
  private waterLevel: number;
  private zoneSize: number;
  private cb: EventIslandCallbacks;
  private islands: LiveIsland[] = [];
  private template: THREE.Object3D | null = null;
  private cycle = SPIRAL_MOUNTAIN_EVENT.cycleSeconds;
  private disposed = false;

  constructor(opts: EventIslandOpts) {
    this.scene = opts.scene;
    this.sectorId = opts.sectorId;
    this.waterLevel = opts.waterLevel;
    this.zoneSize = opts.zoneSizeM;
    this.cb = opts.cb ?? {};
    this.root.name = 'EventIslands_SpiralMountain';
    this.scene.add(this.root);
    void this.boot(opts);
  }

  private async boot(opts: EventIslandOpts) {
    const scene = await loadGlbFirst(FLOATING_ISLAND_LOAD_ORDER.spiralMountain);
    if (scene) {
      this.template = scene;
      if (SPIRAL_MOUNTAIN_EVENT.stripSkybox) {
        const gone = stripSkyboxFromObject(this.template);
        if (gone.length) {
          console.info('[EventIsland] stripped skybox nodes:', gone.slice(0, 12));
        }
      }
      fitObjectHeight(this.template, SPIRAL_MOUNTAIN_EVENT.targetHeightM);
    } else {
      console.warn('[EventIsland] spiral mountain CDN+local failed — cone fallback');
      this.template = this.fallbackMountain();
    }
    if (this.disposed) return;

    // mountain → 2 islands; plains → 1
    const isPlains =
      opts.biome === 'plains' ||
      opts.sectorId === 'haven_shore' ||
      opts.sectorId === 'ashen_wastes';
    const count = isPlains ? 1 : 2;
    for (let i = 0; i < count; i++) {
      this.spawnIsland(i, opts);
    }
  }

  private fallbackMountain(): THREE.Group {
    const g = new THREE.Group();
    const m = new THREE.Mesh(
      new THREE.ConeGeometry(22, 70, 8),
      new THREE.MeshStandardMaterial({ color: 0x6b7280, roughness: 0.9 }),
    );
    m.position.y = 35;
    g.add(m);
    return g;
  }

  private spawnIsland(index: number, opts: EventIslandOpts) {
    if (!this.template) return;
    const half = this.zoneSize * 0.32;
    const ang = (index / 2) * Math.PI + 0.9;
    const x = Math.cos(ang) * half * (0.55 + index * 0.12);
    const z = Math.sin(ang) * half * (0.5 + index * 0.1);
    let y = this.waterLevel + SPIRAL_MOUNTAIN_EVENT.raiseHeightM;
    if (opts.sampleGround) {
      const h = opts.sampleGround(x, z);
      if (h != null) y = Math.max(h, this.waterLevel) + 4;
    }

    const mesh = this.template.clone(true);
    const g = new THREE.Group();
    const id = `event_spiral_${index}`;
    g.name = id;
    g.userData.eventIsland = true;
    g.add(mesh);
    g.position.set(x, y, z);
    g.rotation.y = ang;

    // Portal pad on island (leads to Hoth boss room when frozen/event)
    const pad = new THREE.Mesh(
      new THREE.TorusGeometry(2.2, 0.25, 8, 24),
      new THREE.MeshStandardMaterial({
        color: 0x7dd3fc,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.7,
      }),
    );
    pad.rotation.x = Math.PI / 2;
    pad.position.set(0, 8, 6);
    pad.name = 'EventIslandPortal';
    pad.userData.portal = true;
    pad.userData.portalTarget =
      pickBossRoomInstance({ sectorId: opts.sectorId })?.id ?? HOTH_BOSS_ROOM.id;
    pad.userData.entrySource = 'event_island_portal';
    g.add(pad);

    const marker = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.4, 6, 6),
      new THREE.MeshBasicMaterial({
        color: 0xfbbf24,
        transparent: true,
        opacity: 0.65,
      }),
    );
    marker.position.set(0, 12, 6);
    g.add(marker);

    this.root.add(g);

    const bossId =
      SPIRAL_MOUNTAIN_EVENT.bossIds[index % SPIRAL_MOUNTAIN_EVENT.bossIds.length]!;
    const npcRole =
      SPIRAL_MOUNTAIN_EVENT.npcRoles[index % SPIRAL_MOUNTAIN_EVENT.npcRoles.length]!;

    this.islands.push({
      id,
      root: g,
      baseY: y,
      phase: index === 0 ? 'raised' : 'rising',
      phaseT: index * 20,
      bossId,
      npcRole,
      portalLocal: new THREE.Vector3(0, 8, 6),
    });

    this.cb.onBossSpawn?.(bossId, id);
    const worldPortal = new THREE.Vector3(x, y + 8, z + 6);
    this.cb.onPortalReady?.('hoth_boss_room', worldPortal);
    this.cb.onPrompt?.(
      `Event island: ${SPIRAL_MOUNTAIN_EVENT.name} — boss ${bossId}, NPC ${npcRole}`,
    );
  }

  update(dt: number) {
    const sink = SPIRAL_MOUNTAIN_EVENT.sinkDepthM;
    const raise = SPIRAL_MOUNTAIN_EVENT.raiseHeightM;
    const halfCycle = this.cycle * 0.5;

    for (const isl of this.islands) {
      isl.phaseT += dt;
      const prev = isl.phase;

      // Simple state machine: raised → sinking → sunken → rising → raised
      if (isl.phase === 'raised' && isl.phaseT > halfCycle * 0.45) {
        isl.phase = 'sinking';
        isl.phaseT = 0;
      } else if (isl.phase === 'sinking') {
        const k = Math.min(1, isl.phaseT / 25);
        isl.root.position.y = THREE.MathUtils.lerp(
          isl.baseY,
          this.waterLevel - sink * 0.35,
          k,
        );
        if (k >= 1) {
          isl.phase = 'sunken';
          isl.phaseT = 0;
        }
      } else if (isl.phase === 'sunken' && isl.phaseT > halfCycle * 0.25) {
        isl.phase = 'rising';
        isl.phaseT = 0;
      } else if (isl.phase === 'rising') {
        const k = Math.min(1, isl.phaseT / 28);
        const target = Math.max(isl.baseY, this.waterLevel + raise * 0.5);
        isl.root.position.y = THREE.MathUtils.lerp(
          this.waterLevel - sink * 0.35,
          target,
          k,
        );
        if (k >= 1) {
          isl.phase = 'raised';
          isl.phaseT = 0;
          // Rotate boss/NPC cast when fully raised again
          const bi =
            (SPIRAL_MOUNTAIN_EVENT.bossIds.indexOf(isl.bossId) + 1) %
            SPIRAL_MOUNTAIN_EVENT.bossIds.length;
          isl.bossId = SPIRAL_MOUNTAIN_EVENT.bossIds[bi]!;
          const ni =
            (SPIRAL_MOUNTAIN_EVENT.npcRoles.indexOf(isl.npcRole) + 1) %
            SPIRAL_MOUNTAIN_EVENT.npcRoles.length;
          isl.npcRole = SPIRAL_MOUNTAIN_EVENT.npcRoles[ni]!;
          this.cb.onBossSpawn?.(isl.bossId, isl.id);
        }
      }

      if (prev !== isl.phase) this.cb.onPhase?.(isl.phase, isl.id);

      // Gentle yaw while raised
      if (isl.phase === 'raised') {
        isl.root.rotation.y += dt * 0.04;
      }
    }
  }

  /** Nearest event portal world position (for E interact). */
  nearestPortal(
    player: THREE.Vector3,
    range = 8,
  ): { islandId: string; pos: THREE.Vector3; target: string } | null {
    let best: { islandId: string; pos: THREE.Vector3; target: string } | null =
      null;
    let bestD = range;
    for (const isl of this.islands) {
      if (isl.phase === 'sunken' || isl.phase === 'sinking') continue;
      const pos = isl.root.localToWorld(isl.portalLocal.clone());
      const d = player.distanceTo(pos);
      if (d < bestD) {
        bestD = d;
        best = {
          islandId: isl.id,
          pos,
          target:
            pickBossRoomInstance({ sectorId: this.sectorId })?.id ?? HOTH_BOSS_ROOM.id,
        };
      }
    }
    return best;
  }

  dispose() {
    this.disposed = true;
    this.scene.remove(this.root);
    this.root.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry?.dispose();
        const m = o.material;
        if (Array.isArray(m)) m.forEach((x) => x.dispose());
        else (m as THREE.Material)?.dispose?.();
      }
    });
    this.islands = [];
  }
}
