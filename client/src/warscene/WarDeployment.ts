/**
 * WarDeployment — Conqueror's Blade–style company deploy + reinforcement waves.
 *
 * Units are NOT all on the map at start. Proxies become a reserve pool:
 *  - Deploy phase: place limited companies into faction zones
 *  - Siege phase: timed reinforcement waves from remaining reserve
 */
import * as THREE from 'three';
import type { WarFactionId, WarUnitArchetype } from '@shared/definitions/medievalBattleScene';
import { archetypeForPgMat } from '@shared/definitions/medievalBattleScene';

export interface UnitProxySlot {
  id: string;
  object: THREE.Object3D;
  matId: number;
  archetype: WarUnitArchetype;
  faction: WarFactionId;
  /** Original scene pose (world after center) */
  homePosition: THREE.Vector3;
  homeRotationY: number;
  /** Which deploy zone this slot belongs to */
  zoneId: string;
  /** Reserved for later wave; not deployed yet */
  status: 'reserve' | 'deployed' | 'queued';
}

export interface DeployZone {
  id: string;
  label: string;
  faction: WarFactionId;
  /** World-space AABB for placement */
  box: THREE.Box3;
  center: THREE.Vector3;
  /** Max units player can field here in open deploy */
  deployCap: number;
  color: number;
}

export interface DeploymentConfig {
  /** Units allowed on field at deploy commit (per side, roughly) */
  initialDeployPerFaction?: number;
  /** Wave size during siege */
  waveSize?: number;
  /** Seconds between reinforcement waves */
  waveIntervalSec?: number;
  /** Max concurrent animated units (perf) */
  maxFielded?: number;
}

const DEFAULTS = {
  initialDeployPerFaction: 10,
  waveSize: 6,
  waveIntervalSec: 28,
  maxFielded: 64,
} as const;

export class WarDeployment {
  readonly slots: UnitProxySlot[] = [];
  readonly zones: DeployZone[] = [];
  private cfg: Required<DeploymentConfig>;
  private waveTimer = 0;
  private waveIndex = 0;
  private siegeActive = false;
  /** Marker meshes for deploy UI */
  private markers: THREE.Object3D[] = [];
  private sceneRoot: THREE.Object3D | null = null;

  constructor(cfg?: DeploymentConfig) {
    this.cfg = { ...DEFAULTS, ...cfg };
  }

  get initialDeployPerFaction(): number {
    return this.cfg.initialDeployPerFaction;
  }

  get waveIntervalSec(): number {
    return this.cfg.waveIntervalSec;
  }

  get maxFielded(): number {
    return this.cfg.maxFielded;
  }

  /** Build slots from PG proxies; hide all until deployed. */
  ingestProxies(
    proxies: Array<{
      object: THREE.Object3D;
      matId: number;
      position: THREE.Vector3;
      rotationY: number;
    }>,
  ): void {
    this.slots.length = 0;
    for (let i = 0; i < proxies.length; i++) {
      const p = proxies[i]!;
      const arch = archetypeForPgMat(p.matId);
      // Hide every proxy — no free units on map until deploy/wave
      p.object.visible = false;
      this.slots.push({
        id: `slot_${i}_m${p.matId}`,
        object: p.object,
        matId: p.matId,
        archetype: arch,
        faction: arch.faction,
        homePosition: p.position.clone(),
        homeRotationY: p.rotationY,
        zoneId: '',
        status: 'reserve',
      });
    }
    this.buildZonesFromSlots();
    this.assignSlotsToZones();
  }

  private buildZonesFromSlots(): void {
    this.zones.length = 0;
    const byFac = new Map<WarFactionId, THREE.Vector3[]>();
    for (const s of this.slots) {
      if (s.faction === 'neutral') continue;
      let arr = byFac.get(s.faction);
      if (!arr) {
        arr = [];
        byFac.set(s.faction, arr);
      }
      arr.push(s.homePosition);
    }

    const colors: Record<string, number> = {
      crimson: 0xb91c1c,
      azure: 0x0284c7,
      gold: 0xd97706,
    };

    for (const [faction, pts] of byFac) {
      if (!pts.length) continue;
      const box = new THREE.Box3();
      for (const p of pts) box.expandByPoint(p);
      // Expand into a real deploy pad
      box.expandByScalar(4);
      box.min.y = Math.min(box.min.y, 0);
      box.max.y = Math.max(box.max.y, 6);
      const center = box.getCenter(new THREE.Vector3());
      // Pull pads slightly off fort center for CB-style staging
      const pull = center.clone().normalize().multiplyScalar(6);
      if (pull.lengthSq() < 0.01) pull.set(faction === 'crimson' ? -20 : 20, 0, 15);
      center.add(pull);
      box.translate(pull);

      this.zones.push({
        id: `zone_${faction}`,
        label:
          faction === 'crimson'
            ? 'Crimson Beach Camp'
            : faction === 'azure'
              ? 'Azure Keep Yard'
              : 'Gold Contingent',
        faction,
        box,
        center,
        deployCap: this.cfg.initialDeployPerFaction,
        color: colors[faction] ?? 0x888888,
      });
    }
  }

  private assignSlotsToZones(): void {
    for (const s of this.slots) {
      const z = this.zones.find((z) => z.faction === s.faction);
      s.zoneId = z?.id ?? '';
    }
  }

  /** Visual pads on the island during deploy phase */
  attachMarkers(parent: THREE.Object3D): void {
    this.clearMarkers();
    this.sceneRoot = parent;
    for (const z of this.zones) {
      const size = new THREE.Vector3();
      z.box.getSize(size);
      const geo = new THREE.RingGeometry(
        Math.max(4, Math.min(size.x, size.z) * 0.25),
        Math.max(5, Math.min(size.x, size.z) * 0.35),
        48,
      );
      const mat = new THREE.MeshBasicMaterial({
        color: z.color,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(geo, mat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.copy(z.center);
      ring.position.y = 0.35;
      ring.name = `deploy_marker_${z.id}`;
      parent.add(ring);
      this.markers.push(ring);

      // Soft ground disc
      const disc = new THREE.Mesh(
        new THREE.CircleGeometry(Math.max(6, Math.min(size.x, size.z) * 0.4), 40),
        new THREE.MeshBasicMaterial({
          color: z.color,
          transparent: true,
          opacity: 0.12,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      disc.rotation.x = -Math.PI / 2;
      disc.position.copy(z.center);
      disc.position.y = 0.2;
      parent.add(disc);
      this.markers.push(disc);
    }
  }

  setMarkersVisible(v: boolean): void {
    for (const m of this.markers) m.visible = v;
  }

  clearMarkers(): void {
    for (const m of this.markers) {
      m.parent?.remove(m);
      const mesh = m as THREE.Mesh;
      mesh.geometry?.dispose?.();
      if (Array.isArray(mesh.material)) mesh.material.forEach((x) => x.dispose());
      else mesh.material?.dispose?.();
    }
    this.markers = [];
  }

  /** Reserve counts by faction */
  reserveCounts(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const s of this.slots) {
      if (s.status !== 'reserve') continue;
      out[s.faction] = (out[s.faction] ?? 0) + 1;
    }
    return out;
  }

  fieldedCount(): number {
    return this.slots.filter((s) => s.status === 'deployed').length;
  }

  /**
   * Auto-deploy opening companies (CB quick-match style).
   * Returns slots that should spawn as animated units now.
   */
  commitOpeningDeploy(playerFaction?: WarFactionId): UnitProxySlot[] {
    const out: UnitProxySlot[] = [];
    const per = this.cfg.initialDeployPerFaction;
    const factions = [...new Set(this.slots.map((s) => s.faction))].filter(
      (f) => f !== 'neutral',
    ) as WarFactionId[];

    for (const fac of factions) {
      // Prefer captains + infantry first, then archers
      const pool = this.slots
        .filter((s) => s.faction === fac && s.status === 'reserve')
        .sort((a, b) => rolePriority(a.archetype.role) - rolePriority(b.archetype.role));
      const n = Math.min(per, pool.length);
      for (let i = 0; i < n; i++) {
        const s = pool[i]!;
        // Snap into zone if far (staging)
        const zone = this.zones.find((z) => z.id === s.zoneId);
        if (zone) {
          const jitter = new THREE.Vector3(
            (Math.random() - 0.5) * 8,
            0,
            (Math.random() - 0.5) * 8,
          );
          s.homePosition.copy(zone.center).add(jitter);
        }
        s.status = 'deployed';
        out.push(s);
      }
    }

    // Optional: slightly favor player side first wave if set
    void playerFaction;
    return out;
  }

  /** Manual: deploy one more unit of faction if under caps */
  deployOne(faction: WarFactionId, fieldedAlive: number): UnitProxySlot | null {
    if (fieldedAlive >= this.cfg.maxFielded) return null;
    const s = this.slots.find(
      (x) => x.faction === faction && x.status === 'reserve',
    );
    if (!s) return null;
    const zone = this.zones.find((z) => z.faction === faction);
    if (zone) {
      s.homePosition
        .copy(zone.center)
        .add(
          new THREE.Vector3((Math.random() - 0.5) * 10, 0, (Math.random() - 0.5) * 10),
        );
    }
    s.status = 'deployed';
    return s;
  }

  beginSiegeWaves(): void {
    this.siegeActive = true;
    this.waveTimer = this.cfg.waveIntervalSec * 0.35; // first wave sooner
    this.waveIndex = 0;
  }

  /**
   * Call each frame during siege. Returns slots to spawn as reinforcements.
   */
  tickWaves(dt: number, fieldedAlive: number): UnitProxySlot[] {
    if (!this.siegeActive) return [];
    this.waveTimer -= dt;
    if (this.waveTimer > 0) return [];
    this.waveTimer = this.cfg.waveIntervalSec;
    this.waveIndex++;

    const out: UnitProxySlot[] = [];
    const room = this.cfg.maxFielded - fieldedAlive;
    if (room <= 0) return out;

    let remaining = Math.min(this.cfg.waveSize, room);
    // Alternate / balance factions that still have reserve
    const factions = (['crimson', 'azure', 'gold'] as WarFactionId[]).filter((f) =>
      this.slots.some((s) => s.faction === f && s.status === 'reserve'),
    );
    if (!factions.length) return out;

    let fi = this.waveIndex % factions.length;
    while (remaining > 0) {
      const fac = factions[fi % factions.length]!;
      const s = this.slots.find((x) => x.faction === fac && x.status === 'reserve');
      if (!s) {
        // remove empty faction
        factions.splice(fi % factions.length, 1);
        if (!factions.length) break;
        continue;
      }
      const zone = this.zones.find((z) => z.faction === fac);
      if (zone) {
        s.homePosition
          .copy(zone.center)
          .add(
            new THREE.Vector3((Math.random() - 0.5) * 12, 0, (Math.random() - 0.5) * 12),
          );
      }
      s.status = 'deployed';
      out.push(s);
      remaining--;
      fi++;
    }
    return out;
  }

  get nextWaveIn(): number {
    return Math.max(0, this.waveTimer);
  }

  get waveNumber(): number {
    return this.waveIndex;
  }

  dispose(): void {
    this.clearMarkers();
    this.slots.length = 0;
  }
}

function rolePriority(role: string): number {
  switch (role) {
    case 'captain':
      return 0;
    case 'infantry':
      return 1;
    case 'support':
      return 2;
    case 'archer':
      return 3;
    case 'cavalry':
      return 4;
    default:
      return 5;
  }
}
