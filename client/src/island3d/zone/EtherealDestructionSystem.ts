/**
 * EtherealDestructionSystem — NW diagonal destruction field in ethereal_falls.
 *
 * - Surface physics broken (ships, ground entities); flight exempt
 * - Islands / water drift toward top-left tip
 * - Ships that enter do not return
 * - Player death voids all drops
 * - Ally NPC death is permanent for this instance
 */
import * as THREE from 'three';
import {
  ETHEREAL_DESTRUCTION_RULES,
  ETHEREAL_FALLS_SECTOR_ID,
  destructionDepth01,
  destructionTipProximity01,
  destructionTipWorld,
  isFlightExemptKind,
  isInEtherealDestructionHalf,
  surfacePhysicsBroken,
  worldXZToEtherealUV,
  type EtherealEntityKind,
} from '@shared/definitions/etherealDestructionZone';

export interface EtherealDestructionCallbacks {
  onEnterField?: (kind: EtherealEntityKind) => void;
  onTipKill?: (kind: EtherealEntityKind, id: string) => void;
  onShipNoReturn?: (shipId: string) => void;
  onVoidDrops?: (characterId: string) => void;
  onAllyPermaDeath?: (allyId: string) => void;
  onPrompt?: (msg: string | null) => void;
}

export interface TrackedEntity {
  id: string;
  kind: EtherealEntityKind;
  /** Mutable world position (system may write pull). */
  position: THREE.Vector3;
  /** Optional velocity (m/s). */
  velocity?: THREE.Vector3;
  /** Ground-locked until flight. */
  flying?: boolean;
  /** Ship already marked no-return. */
  noReturn?: boolean;
  /** Ally already perma-dead. */
  permaDead?: boolean;
  /** Last known in-field for edge events. */
  inField?: boolean;
}

export class EtherealDestructionSystem {
  readonly sectorId = ETHEREAL_FALLS_SECTOR_ID;
  private zoneSize: number;
  private tip: THREE.Vector3;
  private cb: EtherealDestructionCallbacks;
  private entities = new Map<string, TrackedEntity>();
  private shipsTrapped = new Set<string>();
  private alliesPermaDead = new Set<string>();
  private voidDropCharacters = new Set<string>();
  private waterLiftMesh: THREE.Mesh | null = null;
  private tipMarker: THREE.Group | null = null;
  private scene: THREE.Scene | null = null;
  private t = 0;

  constructor(
    zoneSizeMeters: number,
    cb: EtherealDestructionCallbacks = {},
  ) {
    this.zoneSize = zoneSizeMeters;
    this.cb = cb;
    const tip = destructionTipWorld(zoneSizeMeters, 48);
    this.tip = new THREE.Vector3(tip.x, tip.y, tip.z);
  }

  attachScene(scene: THREE.Scene) {
    this.scene = scene;
    this.buildVisuals();
  }

  get tipWorld(): THREE.Vector3 {
    return this.tip.clone();
  }

  /** Classify UV for a world position. */
  sample(pos: THREE.Vector3): {
    u: number;
    v: number;
    inField: boolean;
    depth: number;
    tipProx: number;
  } {
    const { u, v } = worldXZToEtherealUV(pos.x, pos.z, this.zoneSize);
    const inField = isInEtherealDestructionHalf(u, v);
    return {
      u,
      v,
      inField,
      depth: destructionDepth01(u, v),
      tipProx: destructionTipProximity01(u, v),
    };
  }

  track(entity: TrackedEntity) {
    this.entities.set(entity.id, entity);
  }

  untrack(id: string) {
    this.entities.delete(id);
  }

  isShipTrapped(shipId: string): boolean {
    return this.shipsTrapped.has(shipId);
  }

  isAllyPermaDead(allyId: string): boolean {
    return this.alliesPermaDead.has(allyId);
  }

  /**
   * Call when a character dies. Returns whether drops should be voided.
   */
  onCharacterDeath(characterId: string, deathPos: THREE.Vector3): {
    voidDrops: boolean;
    inField: boolean;
  } {
    const s = this.sample(deathPos);
    if (s.inField && ETHEREAL_DESTRUCTION_RULES.deathVoidsAllDrops) {
      this.voidDropCharacters.add(characterId);
      this.cb.onVoidDrops?.(characterId);
      this.cb.onPrompt?.(
        'The Cosmic Waterfall claims all — your drops dissolve into light.',
      );
      return { voidDrops: true, inField: true };
    }
    return { voidDrops: false, inField: s.inField };
  }

  /**
   * Call when an ally dies. Permanent if in destruction half.
   */
  onAllyDeath(allyId: string, deathPos: THREE.Vector3): boolean {
    const s = this.sample(deathPos);
    if (s.inField && ETHEREAL_DESTRUCTION_RULES.allyPermanentDeath) {
      this.alliesPermaDead.add(allyId);
      this.cb.onAllyPermaDeath?.(allyId);
      this.cb.onPrompt?.(
        'Ally lost to the Falls — permanent death in this instance.',
      );
      return true;
    }
    return false;
  }

  /** Whether surface locomotion should ignore ground / use broken physics. */
  shouldBreakSurfacePhysics(
    pos: THREE.Vector3,
    kind: EtherealEntityKind,
    flying = false,
  ): boolean {
    const effective: EtherealEntityKind =
      flying && (kind === 'player_surface' || kind === 'player_flying')
        ? 'player_flying'
        : flying && kind.startsWith('creature')
          ? 'creature_flying'
          : kind;
    const s = this.sample(pos);
    return surfacePhysicsBroken(effective, s.inField);
  }

  /** Ship may not plot a course out once trapped. */
  canShipLeave(shipId: string, shipPos: THREE.Vector3): boolean {
    if (!ETHEREAL_DESTRUCTION_RULES.shipsDoNotReturn) return true;
    if (this.shipsTrapped.has(shipId)) return false;
    const s = this.sample(shipPos);
    if (s.inField) {
      this.shipsTrapped.add(shipId);
      this.cb.onShipNoReturn?.(shipId);
      this.cb.onPrompt?.(
        'Your ship will not return from the Falls — the current only runs toward the tip.',
      );
      return false;
    }
    return true;
  }

  update(dt: number) {
    this.t += dt;
    const rules = ETHEREAL_DESTRUCTION_RULES;

    for (const ent of this.entities.values()) {
      if (ent.permaDead) continue;

      const flying =
        !!ent.flying || isFlightExemptKind(ent.kind);
      const kind: EtherealEntityKind = flying
        ? ent.kind === 'ship'
          ? 'ship'
          : ent.kind.includes('creature')
            ? 'creature_flying'
            : ent.kind === 'ally_npc'
              ? 'ally_npc'
              : 'player_flying'
        : ent.kind;

      const s = this.sample(ent.position);
      if (s.inField && !ent.inField) {
        this.cb.onEnterField?.(kind);
        if (kind === 'ship' || ent.kind === 'ship') {
          this.shipsTrapped.add(ent.id);
          this.cb.onShipNoReturn?.(ent.id);
        }
      }
      ent.inField = s.inField;

      if (!s.inField) continue;

      // Flight exempt: no pull, no kill from tip
      if (flying && rules.flightExempt && ent.kind !== 'ship') {
        continue;
      }

      // Pull surface entities toward tip
      if (rules.floatTowardTip) {
        const toTip = this.tip.clone().sub(ent.position);
        toTip.y *= 0.35; // stronger horizontal drift
        if (toTip.lengthSq() > 0.01) {
          toTip.normalize();
          const accel = rules.tipPullAccel * (0.35 + s.depth * 0.65);
          const pull = toTip.multiplyScalar(accel * dt);
          ent.position.add(pull);
          if (ent.velocity) {
            ent.velocity.add(toTip.multiplyScalar(accel * 0.15 * dt));
          }
          // Water lift
          ent.position.y +=
            Math.sin(this.t * 0.7 + s.depth * 4) *
            0.02 *
            rules.waterLiftMaxM *
            s.depth;
          ent.position.y += rules.waterLiftMaxM * s.depth * 0.002;
        }
      }

      // Island drift
      if (ent.kind === 'island' && rules.floatTowardTip) {
        const toTip = new THREE.Vector3(
          this.tip.x - ent.position.x,
          0,
          this.tip.z - ent.position.z,
        );
        if (toTip.lengthSq() > 1) {
          toTip.normalize();
          ent.position.add(
            toTip.multiplyScalar(rules.islandDriftSpeed * s.depth * dt),
          );
          ent.position.y += s.depth * 0.15 * dt;
        }
      }

      // Tip kill (surface)
      if (s.tipProx >= rules.tipKillProximity && !flying) {
        this.cb.onTipKill?.(ent.kind, ent.id);
        if (ent.kind === 'ally_npc') {
          ent.permaDead = true;
          this.alliesPermaDead.add(ent.id);
          this.cb.onAllyPermaDeath?.(ent.id);
        }
      }
    }

    this.updateVisuals(dt);
  }

  private buildVisuals() {
    if (!this.scene) return;

    // Destruction tip marker — luminous hole
    const g = new THREE.Group();
    g.name = 'EtherealDestructionTip';
    const hole = new THREE.Mesh(
      new THREE.RingGeometry(8, 22, 48),
      new THREE.MeshBasicMaterial({
        color: 0xbf40ff,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    hole.rotation.x = -Math.PI / 2;
    g.add(hole);
    const core = new THREE.Mesh(
      new THREE.CircleGeometry(8, 32),
      new THREE.MeshBasicMaterial({
        color: 0x00e5ff,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    core.rotation.x = -Math.PI / 2;
    core.position.y = 0.2;
    g.add(core);
    // Vertical void column
    const col = new THREE.Mesh(
      new THREE.CylinderGeometry(6, 14, 80, 16, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0x2d1b69,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    col.position.y = 40;
    g.add(col);
    g.position.copy(this.tip);
    g.position.y = 2;
    this.scene.add(g);
    this.tipMarker = g;

    // Diagonal fracture plane indicator (thin, low opacity)
    const diag = new THREE.Mesh(
      new THREE.PlaneGeometry(this.zoneSize * 1.2, 4),
      new THREE.MeshBasicMaterial({
        color: 0x67e8f9,
        transparent: true,
        opacity: 0.12,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    diag.rotation.x = -Math.PI / 2;
    diag.rotation.z = Math.PI / 4; // NE–SW diagonal
    diag.position.set(0, 1.5, 0);
    diag.name = 'EtherealDestructionDiagonal';
    this.scene.add(diag);
  }

  private updateVisuals(dt: number) {
    void dt;
    if (this.tipMarker) {
      const pulse = 0.5 + Math.sin(this.t * 1.8) * 0.2;
      this.tipMarker.scale.setScalar(0.9 + pulse * 0.25);
      this.tipMarker.rotation.y += 0.15 * dt;
    }
  }

  dispose() {
    if (this.scene && this.tipMarker) {
      this.scene.remove(this.tipMarker);
    }
    this.entities.clear();
    this.shipsTrapped.clear();
    this.alliesPermaDead.clear();
  }
}
