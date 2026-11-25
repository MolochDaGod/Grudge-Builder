/**
 * T0 mage/priest totem — drops on Mage Shield (20s recast CD).
 * Lasts 2 minutes. Only one echo totem at a time (a new drop replaces it).
 * Red (Tyr) echoes every hostile spell; green (Loki) echoes every friendly
 * spell, 1s later — not a one-cast drop. Green: same ally, else lowest-HP
 * if gone / over 90% HP / unique buff-shield already on them.
 *
 * Author GLBs lie on +Z; play bake stands them on +Y at TOTEM_HEIGHT_M (1.2 m).
 * Drop anim: EarthAbility spike — pole climbs out of a small cracked-earth AOE.
 */
import * as THREE from 'three';
import {
  TOTEM_DURATION_SEC,
  TOTEM_ECHO_DELAY_SEC,
  TOTEM_ALLY_HP_REROUTE,
  TOTEM_HEIGHT_M,
  TOTEM_MESH_URL,
  STUN_TOTEM_AOE_M,
  STUN_TOTEM_STUN_SEC,
  STUN_TOTEM_LIFE_SEC,
  skillCannotStackOnSame,
  type SkillIntent,
  type TotemPaint,
} from '@shared/definitions/skillIntent';
import { loadGltfCached, cloneGltfScene } from '@/lib/three/SharedGltfPipeline';
import { assetUrl } from '@/lib/assetConfig';
import type { CombatTarget } from './ProductionSkillCombatRuntime';

export interface TotemEchoEvent {
  skillId: string;
  intent: SkillIntent;
  target: CombatTarget | null;
  paint: TotemPaint;
}

export interface SpellTotem {
  id: string;
  paint: TotemPaint;
  root: THREE.Group;
  visual: THREE.Group;
  expiresAt: number;
  pending: Array<{ at: number; event: TotemEchoEvent }>;
  mixer: THREE.AnimationMixer | null;
  /** Unique buff/shield already landed on these target ids (skillId → ids). */
  uniqueOn: Map<string, Set<string>>;
  emergeAge: number;
  apron: THREE.Object3D[];
  kind: 'echo' | 'stun';
  aoeRadius: number;
  stunFired: boolean;
  burstMesh: THREE.Mesh | null;
  burstAge: number;
  light: THREE.PointLight | null;
}

const PAINT_HEX: Record<TotemPaint, number> = {
  red: 0xb42318,
  green: 0x2e8b4a,
  purple: 0x8b5cf6,
};

/** EarthAbility rock palette (settings.earth), SI-small for a 1.2 m pole. */
const EARTH_ROCK = 0x5a6b44;
const EARTH_DARK = 0x2d3a24;
const EMERGE_SEC = 0.72;
const APRON_LIFE = 1.85;
const AOE_R = 1.85;
const BURST_LIFE = 0.55;

const _size = new THREE.Vector3();
const _box = new THREE.Box3();

const PLATE_GEO = new THREE.BoxGeometry(0.44, 0.07, 0.32);
const SPIKE_GEO = new THREE.ConeGeometry(0.2, 1.35, 6);
const BURST_GEO = new THREE.SphereGeometry(0.35, 16, 12);
const ROCK_MAT = new THREE.MeshStandardMaterial({
  color: EARTH_ROCK,
  roughness: 0.92,
  metalness: 0.04,
});
const DARK_MAT = new THREE.MeshStandardMaterial({
  color: EARTH_DARK,
  roughness: 0.95,
  metalness: 0.02,
});

/** Stand longest axis on +Y, scale height to metres, feet on group origin. */
export function fitTotemPole(root: THREE.Object3D, heightM = TOTEM_HEIGHT_M): number {
  root.updateMatrixWorld(true);
  _box.setFromObject(root);
  _box.getSize(_size);
  if (_size.z >= _size.y && _size.z >= _size.x) {
    root.rotation.x = -Math.PI / 2;
  } else if (_size.x >= _size.y && _size.x >= _size.z) {
    root.rotation.z = Math.PI / 2;
  }
  root.updateMatrixWorld(true);
  _box.setFromObject(root);
  _box.getSize(_size);
  const s = heightM / Math.max(_size.y, 1e-4);
  root.scale.multiplyScalar(s);
  root.updateMatrixWorld(true);
  _box.setFromObject(root);
  root.position.y -= _box.min.y;
  return s;
}

export class SpellTotemSystem {
  private scene: THREE.Scene;
  private totem: SpellTotem | null = null;
  private stun: SpellTotem | null = null;
  private zoneRing: THREE.Mesh | null = null;
  private seq = 0;
  onEcho: ((ev: TotemEchoEvent) => void) | null = null;
  onStunPulse: ((at: THREE.Vector3, radius: number, stunSec: number) => void) | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  get active(): SpellTotem | null {
    return this.totem;
  }

  spawn(origin: THREE.Vector3, paint: TotemPaint, now = performance.now()): SpellTotem {
    this.clear();
    const root = new THREE.Group();
    root.name = `spell_totem_${paint}`;
    root.position.copy(origin);

    const visual = new THREE.Group();
    visual.name = 'totem_visual';
    visual.position.y = -TOTEM_HEIGHT_M;
    root.add(visual);

    const color = PAINT_HEX[paint];
    const light = new THREE.PointLight(color, 0.55, 6);
    light.position.y = TOTEM_HEIGHT_M * 0.85;
    light.castShadow = false;
    visual.add(light);

    const apron = addEarthApron(root);
    this.scene.add(root);

    this.totem = {
      id: `totem-${++this.seq}`,
      paint,
      root,
      visual,
      expiresAt: now + TOTEM_DURATION_SEC * 1000,
      pending: [],
      mixer: null,
      uniqueOn: new Map(),
      emergeAge: 0,
      apron,
      kind: 'echo',
      aoeRadius: AOE_R,
      stunFired: true,
      burstMesh: null,
      burstAge: 0,
      light,
    };
    void this.attachMesh(this.totem);
    return this.totem;
  }

  /**
   * Freya stun totem at a selected ground zone. Does not replace the echo totem.
   * Rises from under, then one purple burst.
   */
  spawnStun(origin: THREE.Vector3, radius = STUN_TOTEM_AOE_M, now = performance.now()): SpellTotem {
    this.clearStun();
    this.setZonePreview(null, 0);
    const root = new THREE.Group();
    root.name = 'spell_totem_stun';
    root.position.copy(origin);

    const visual = new THREE.Group();
    visual.name = 'totem_visual';
    visual.position.y = -TOTEM_HEIGHT_M;
    root.add(visual);

    const color = PAINT_HEX.purple;
    const light = new THREE.PointLight(color, 0.85, Math.min(10, radius * 2.2));
    light.position.y = TOTEM_HEIGHT_M * 0.85;
    light.castShadow = false;
    visual.add(light);

    const apron = addEarthApron(root, radius);
    this.scene.add(root);

    this.stun = {
      id: `totem-stun-${++this.seq}`,
      paint: 'purple',
      root,
      visual,
      expiresAt: now + STUN_TOTEM_LIFE_SEC * 1000,
      pending: [],
      mixer: null,
      uniqueOn: new Map(),
      emergeAge: 0,
      apron,
      kind: 'stun',
      aoeRadius: radius,
      stunFired: false,
      burstMesh: null,
      burstAge: 0,
      light,
    };
    void this.attachMesh(this.stun);
    return this.stun;
  }

  /** Purple AOE ring while picking a stun-totem zone. Null hides. */
  setZonePreview(origin: THREE.Vector3 | null, radius: number): void {
    if (!origin || radius <= 0) {
      if (this.zoneRing) this.zoneRing.visible = false;
      return;
    }
    if (!this.zoneRing) {
      const geo = new THREE.RingGeometry(0.12, 1, 48);
      geo.rotateX(-Math.PI / 2);
      const mat = new THREE.MeshBasicMaterial({
        color: PAINT_HEX.purple,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      this.zoneRing = new THREE.Mesh(geo, mat);
      this.zoneRing.name = 'stun_totem_zone_preview';
      this.scene.add(this.zoneRing);
    }
    this.zoneRing.visible = true;
    this.zoneRing.position.set(origin.x, origin.y + 0.06, origin.z);
    this.zoneRing.scale.setScalar(radius);
    const mat = this.zoneRing.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.32 + Math.sin(performance.now() * 0.006) * 0.1;
  }

  /** Queue an echo of a matching-color spell. */
  noteCast(
    skillId: string,
    intent: SkillIntent,
    target: CombatTarget | null,
    now = performance.now(),
  ): void {
    const t = this.totem;
    if (!t) return;
    if (now >= t.expiresAt) {
      this.clear();
      return;
    }
    const paint = t.paint;
    if (paint === 'purple') return;
    if (paint === 'red' && intent !== 'hostile') return;
    if (paint === 'green' && intent === 'hostile') return;
    if (paint === 'green' && intent === 'self') return;
    t.pending.push({
      at: now + TOTEM_ECHO_DELAY_SEC * 1000,
      event: { skillId, intent, target, paint },
    });
    if (skillCannotStackOnSame(skillId) && target?.id) {
      markUnique(t.uniqueOn, skillId, target.id);
    }
  }

  update(
    dt: number,
    now: number,
    hostiles: CombatTarget[],
    friendlies: CombatTarget[],
  ): void {
    this.tickOne(this.totem, dt, now, hostiles, friendlies);
    this.tickOne(this.stun, dt, now, hostiles, friendlies);
  }

  private tickOne(
    t: SpellTotem | null,
    dt: number,
    now: number,
    hostiles: CombatTarget[],
    friendlies: CombatTarget[],
  ): void {
    if (!t) return;
    t.mixer?.update(dt);
    t.emergeAge += dt;
    tickEarthEmerge(t);
    tickPurpleBurst(t, dt);
    if (t.kind === 'stun' && !t.stunFired && t.emergeAge >= EMERGE_SEC) {
      t.stunFired = true;
      beginPurpleBurst(t);
      this.onStunPulse?.(t.root.position.clone(), t.aoeRadius, STUN_TOTEM_STUN_SEC);
    }
    if (now >= t.expiresAt) {
      if (t.kind === 'stun') this.clearStun();
      else this.clear();
      return;
    }
    if (t.kind !== 'echo') return;
    const due = t.pending.filter((p) => p.at <= now);
    t.pending = t.pending.filter((p) => p.at > now);
    for (const p of due) {
      const ev = this.resolveEchoTarget(p.event, hostiles, friendlies);
      if (!ev.target && skillCannotStackOnSame(ev.skillId)) continue;
      if (ev.target && skillCannotStackOnSame(ev.skillId)) {
        markUnique(t.uniqueOn, ev.skillId, ev.target.id);
      }
      this.onEcho?.(ev);
    }
  }

  resolveEchoTarget(
    ev: TotemEchoEvent,
    hostiles: CombatTarget[],
    friendlies: CombatTarget[],
  ): TotemEchoEvent {
    if (ev.intent === 'hostile') {
      const still =
        ev.target && hostiles.some((h) => h.id === ev.target!.id && (h.hpFrac ?? 1) > 0);
      if (still) return ev;
      const next = hostiles
        .filter((h) => (h.hpFrac ?? 1) > 0)
        .sort((a, b) => a.position.distanceToSquared(ev.target?.position ?? a.position) - b.position.distanceToSquared(ev.target?.position ?? b.position))[0];
      return { ...ev, target: next ?? null };
    }
    const living = friendlies.filter((f) => (f.hpFrac ?? 1) > 0);
    const orig = ev.target
      ? living.find((f) => f.id === ev.target!.id) ?? (ev.target.hpFrac != null && ev.target.hpFrac > 0 ? ev.target : null)
      : null;
    const unique = skillCannotStackOnSame(ev.skillId);
    const already =
      unique && orig
        ? targetHasUnique(orig, ev.skillId, this.totem?.uniqueOn)
        : false;
    const gone = !orig;
    const overHp = (orig?.hpFrac ?? 1) > TOTEM_ALLY_HP_REROUTE;
    if (orig && !gone && !overHp && !already) {
      return { ...ev, target: orig };
    }
    const blocked = unique
      ? this.totem?.uniqueOn.get(ev.skillId) ?? new Set<string>()
      : new Set<string>();
    const lowest = living
      .filter((f) => {
        if (unique && (blocked.has(f.id) || targetHasUnique(f, ev.skillId, this.totem?.uniqueOn))) {
          return false;
        }
        return true;
      })
      .sort((a, b) => (a.hpFrac ?? 1) - (b.hpFrac ?? 1))[0];
    return { ...ev, target: lowest ?? (unique ? null : orig) };
  }

  clear(): void {
    this.disposeTotem(this.totem);
    this.totem = null;
  }

  clearStun(): void {
    this.disposeTotem(this.stun);
    this.stun = null;
  }

  dispose(): void {
    this.clear();
    this.clearStun();
    this.setZonePreview(null, 0);
    if (this.zoneRing) {
      this.scene.remove(this.zoneRing);
      this.zoneRing.geometry.dispose();
      (this.zoneRing.material as THREE.Material).dispose();
      this.zoneRing = null;
    }
  }

  private disposeTotem(t: SpellTotem | null): void {
    if (!t) return;
    t.mixer?.stopAllAction();
    if (t.mixer) {
      try {
        t.mixer.uncacheRoot(t.visual);
      } catch {
        /* clip already gone */
      }
    }
    t.mixer = null;
    t.burstMesh = null;
    this.scene.remove(t.root);
    t.root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      if (m.userData?.shared) return;
      if (m.userData?.procedural && m.geometry) m.geometry.dispose();
      const mat = m.material;
      if (m.userData?.procedural) {
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else (mat as THREE.Material | undefined)?.dispose?.();
      }
    });
  }

  private async attachMesh(t: SpellTotem): Promise<void> {
    try {
      const rel = TOTEM_MESH_URL[t.paint];
      let gltf;
      try {
        gltf = await loadGltfCached(assetUrl(rel));
      } catch {
        gltf = await loadGltfCached(rel);
      }
      if (this.totem !== t && this.stun !== t) return;
      const mesh = cloneGltfScene(gltf);
      mesh.name = `totem_mesh_${t.paint}`;
      fitTotemPole(mesh, TOTEM_HEIGHT_M);
      t.visual.add(mesh);
      const clips = gltf.animations ?? [];
      if (clips.length > 0) {
        t.mixer = new THREE.AnimationMixer(mesh);
        const clip = clips.find((c) => /bands/i.test(c.name)) ?? clips[0]!;
        const action = t.mixer.clipAction(clip);
        action.setLoop(THREE.LoopRepeat, Infinity);
        action.play();
      }
    } catch (err) {
      console.warn('[SpellTotem] GLB load failed — pole fallback', t.paint, err);
      if (this.totem === t || this.stun === t) this.attachFallbackPole(t);
    }
  }

  private attachFallbackPole(t: SpellTotem): void {
    const color = PAINT_HEX[t.paint];
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.1, TOTEM_HEIGHT_M, 8),
      new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.08 }),
    );
    pole.position.y = TOTEM_HEIGHT_M * 0.5;
    pole.castShadow = true;
    pole.userData.procedural = true;
    t.visual.add(pole);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 10, 8),
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.55,
        roughness: 0.4,
      }),
    );
    head.position.y = TOTEM_HEIGHT_M;
    head.userData.procedural = true;
    t.visual.add(head);
  }
}

function outQuint(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return 1 - (1 - x) ** 5;
}

function inCubic(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * x;
}

function beginPurpleBurst(t: SpellTotem): void {
  if (t.burstMesh) {
    t.root.remove(t.burstMesh);
    const old = t.burstMesh.material as THREE.Material;
    old.dispose();
  }
  const mat = new THREE.MeshBasicMaterial({
    color: PAINT_HEX.purple,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const ball = new THREE.Mesh(BURST_GEO, mat);
  ball.position.y = 0.45;
  ball.userData.procedural = true;
  ball.userData.shared = true;
  t.root.add(ball);
  t.burstMesh = ball;
  t.burstAge = 0;
  if (t.light) t.light.intensity = 1.6;
}

function tickPurpleBurst(t: SpellTotem, dt: number): void {
  const ball = t.burstMesh;
  if (!ball) return;
  t.burstAge += dt;
  const u = Math.min(1, t.burstAge / BURST_LIFE);
  const s = 1 + u * (t.aoeRadius / 0.35) * 1.05;
  ball.scale.setScalar(s);
  const mat = ball.material as THREE.MeshBasicMaterial;
  mat.opacity = 0.72 * (1 - u);
  if (t.light) t.light.intensity = 0.85 + 0.75 * (1 - u);
  if (u >= 1) {
    t.root.remove(ball);
    mat.dispose();
    t.burstMesh = null;
    if (t.light) t.light.intensity = 0.85;
  }
}

/** Small cracked-earth apron + spike (EarthAbility tower, 1.2 m scale). */
function addEarthApron(root: THREE.Group, radius = AOE_R): THREE.Object3D[] {
  const bits: THREE.Object3D[] = [];
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2;
    const r = radius * (0.42 + (i % 3) * 0.08);
    const plate = new THREE.Mesh(PLATE_GEO, i % 2 ? DARK_MAT : ROCK_MAT);
    plate.userData.procedural = true;
    plate.userData.shared = true;
    plate.userData.kind = 'plate';
    plate.userData.ang = ang;
    plate.userData.r = r;
    plate.position.set(Math.cos(ang) * r, -0.1, Math.sin(ang) * r);
    plate.rotation.y = ang + 0.2;
    plate.castShadow = true;
    root.add(plate);
    bits.push(plate);
  }
  const spike = new THREE.Mesh(SPIKE_GEO, DARK_MAT);
  spike.userData.procedural = true;
  spike.userData.shared = true;
  spike.userData.kind = 'spike';
  spike.position.y = -1.4;
  spike.castShadow = true;
  root.add(spike);
  bits.push(spike);
  return bits;
}

function tickEarthEmerge(t: SpellTotem): void {
  const climb = outQuint(t.emergeAge / EMERGE_SEC);
  t.visual.position.y = -TOTEM_HEIGHT_M * (1 - climb);
  const sink = inCubic(Math.max(0, (t.emergeAge - EMERGE_SEC) / 0.95));
  for (const o of t.apron) {
    const kind = o.userData.kind;
    if (kind === 'spike') {
      o.position.y = -1.35 * (1 - climb) + 0.08 * climb - sink * 1.6;
      o.scale.setScalar(Math.max(0.001, 1 - sink));
      o.visible = sink < 1;
    } else if (kind === 'plate') {
      const ang = o.userData.ang as number;
      const r = o.userData.r as number;
      const bite = outQuint(Math.max(0, (t.emergeAge - 0.08) / 0.28));
      const retract = inCubic(Math.max(0, (t.emergeAge - APRON_LIFE * 0.55) / 0.7));
      o.position.set(
        Math.cos(ang) * (r + bite * 0.16),
        -0.08 + bite * 0.14 - retract * 0.35,
        Math.sin(ang) * (r + bite * 0.16),
      );
      o.rotation.z = (ang % 2 === 0 ? 1 : -1) * bite * 0.35 * (1 - retract);
      o.visible = retract < 1;
    }
  }
}

function markUnique(map: Map<string, Set<string>>, skillId: string, targetId: string): void {
  let set = map.get(skillId);
  if (!set) {
    set = new Set();
    map.set(skillId, set);
  }
  set.add(targetId);
}

function targetHasUnique(
  target: CombatTarget,
  skillId: string,
  uniqueOn: Map<string, Set<string>> | undefined,
): boolean {
  if (target.statusIds?.includes(skillId)) return true;
  return uniqueOn?.get(skillId)?.has(target.id) ?? false;
}


