/**
 * SpiritualSwordSystem — color-organized FreeSwords as combat VFX.
 *
 * Modes:
 *  - projectile  — fly toward target (straight or slight arc)
 *  - aura        — large orbit ring around attach target
 *  - spin        — quick magical spin slash (short life)
 *  - fall        — multi sword rain with proper gravity fall + plant
 *  - block       — fan shield in front of caster
 *  - stack_player — small swords orbit player (1 per stack)
 *  - stack_enemy  — small swords over enemy head (1 per stack)
 *
 * Textures: /models/vfx/spiritual-swords/{blue|green|white|lava}/
 * Mesh: procedural spiritual blade (meshes not in FreeSwords pack — textures only).
 */

import * as THREE from 'three';
import {
  SPIRITUAL_SWORD_BY_COLOR,
  SPIRITUAL_SWORD_SCALE,
  SPIRITUAL_SWORD_STACK,
  spiritualColorFromSchool,
  type SpiritualSwordColor,
  type SpiritualSwordMode,
} from '@shared/definitions/spiritualSwords';

export interface SpiritualSwordSpawnOpts {
  mode: SpiritualSwordMode;
  color?: SpiritualSwordColor;
  school?: string;
  damageType?: string;
  /** World origin / caster */
  position?: THREE.Vector3;
  /** Attach for aura / stacks (player or enemy root) */
  attachTo?: THREE.Object3D | null;
  /** Projectile / fall target */
  target?: THREE.Vector3;
  /** Count for fall / multi spin */
  count?: number;
  /** Stack count (stack_* modes) */
  stacks?: number;
  scale?: number;
  /** Projectile flight speed m/s */
  speed?: number;
  durationSec?: number;
  /** Yaw facing for block fan (radians) */
  yaw?: number;
  onImpact?: (point: THREE.Vector3, color: SpiritualSwordColor) => void;
}

type BladeInstance = {
  root: THREE.Group;
  mode: SpiritualSwordMode;
  color: SpiritualSwordColor;
  age: number;
  duration: number;
  attachTo: THREE.Object3D | null;
  holdPos: THREE.Vector3;
  from: THREE.Vector3;
  to: THREE.Vector3;
  phase: number;
  index: number;
  total: number;
  spinSpeed: number;
  velocityY: number;
  planted: boolean;
  scale: number;
  onImpact?: (point: THREE.Vector3, color: SpiritualSwordColor) => void;
};

const _tmp = new THREE.Vector3();
const _tmp2 = new THREE.Vector3();
const texLoader = new THREE.TextureLoader();
const matCache = new Map<string, THREE.MeshStandardMaterial>();
const texCache = new Map<string, THREE.Texture>();

function loadTex(url: string): THREE.Texture {
  let t = texCache.get(url);
  if (t) return t;
  t = texLoader.load(url);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.anisotropy = 4;
  texCache.set(url, t);
  return t;
}

function materialFor(color: SpiritualSwordColor): THREE.MeshStandardMaterial {
  const key = color;
  let mat = matCache.get(key);
  if (mat) return mat.clone();

  const def = SPIRITUAL_SWORD_BY_COLOR[color];
  const albedo = loadTex(def.albedoPath);
  const emission = loadTex(def.emissionPath);
  mat = new THREE.MeshStandardMaterial({
    map: albedo,
    emissiveMap: emission,
    emissive: new THREE.Color(def.emissiveHex),
    emissiveIntensity: 1.35,
    color: new THREE.Color(def.hex),
    metalness: 0.55,
    roughness: 0.35,
    transparent: true,
    opacity: 0.95,
    side: THREE.DoubleSide,
  });
  matCache.set(key, mat);
  return mat.clone();
}

/**
 * Procedural spiritual blade — grip + crossguard + double-edge blade.
 * SI: tip-to-pommel ~0.95 m at scale 1.
 */
export function createSpiritualBladeMesh(color: SpiritualSwordColor): THREE.Group {
  const mat = materialFor(color);
  const g = new THREE.Group();
  g.name = `spiritual_blade_${color}`;

  // Blade (point +Y)
  const blade = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.72, 0.018),
    mat,
  );
  blade.position.y = 0.48;
  // Taper via scale on a second tip piece
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.14, 4), mat);
  tip.position.y = 0.91;
  tip.rotation.y = Math.PI / 4;

  // Crossguard
  const guard = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.04, 0.04),
    mat,
  );
  guard.position.y = 0.12;

  // Grip
  const grip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.03, 0.16, 8),
    mat,
  );
  grip.position.y = 0.02;

  // Pommel
  const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), mat);
  pommel.position.y = -0.08;

  // Soft glow shell
  const glowMat = new THREE.MeshBasicMaterial({
    color: SPIRITUAL_SWORD_BY_COLOR[color].emissiveHex,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const glow = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 0.05), glowMat);
  glow.position.y = 0.5;

  g.add(blade, tip, guard, grip, pommel, glow);
  return g;
}

function resolveColor(opts: SpiritualSwordSpawnOpts): SpiritualSwordColor {
  if (opts.color) return opts.color;
  return spiritualColorFromSchool(opts.damageType ?? opts.school);
}

export class SpiritualSwordSystem {
  private scene: THREE.Scene;
  private root = new THREE.Group();
  private active: BladeInstance[] = [];
  /** Player stack state (orbit) */
  private playerStacks = new Map<
    string,
    { attach: THREE.Object3D; color: SpiritualSwordColor; count: number; blades: BladeInstance[] }
  >();
  /** Enemy stack state */
  private enemyStacks = new Map<
    string,
    { attach: THREE.Object3D; color: SpiritualSwordColor; count: number; blades: BladeInstance[] }
  >();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.root.name = 'spiritual_sword_system';
    scene.add(this.root);
  }

  /** Preload all 4 color texture pairs */
  async preload(): Promise<void> {
    const colors: SpiritualSwordColor[] = ['blue', 'green', 'white', 'lava'];
    await Promise.all(
      colors.map(
        (c) =>
          new Promise<void>((resolve) => {
            const def = SPIRITUAL_SWORD_BY_COLOR[c];
            let left = 2;
            const done = () => {
              left -= 1;
              if (left <= 0) resolve();
            };
            loadTex(def.albedoPath);
            loadTex(def.emissionPath);
            // TextureLoader is async via GPU; resolve next frame
            requestAnimationFrame(() => done());
            requestAnimationFrame(() => done());
          }),
      ),
    );
    // Warm materials
    for (const c of colors) materialFor(c);
  }

  spawn(opts: SpiritualSwordSpawnOpts): void {
    const color = resolveColor(opts);
    switch (opts.mode) {
      case 'projectile':
        this.spawnProjectile(opts, color);
        break;
      case 'aura':
        this.spawnAura(opts, color);
        break;
      case 'spin':
        this.spawnSpin(opts, color);
        break;
      case 'fall':
        this.spawnFall(opts, color);
        break;
      case 'block':
        this.spawnBlock(opts, color);
        break;
      case 'stack_player':
        this.setPlayerStacks(opts, color);
        break;
      case 'stack_enemy':
        this.setEnemyStacks(opts, color);
        break;
    }
  }

  /** Convenience: one spiritual projectile toward target */
  fireProjectile(
    from: THREE.Vector3,
    to: THREE.Vector3,
    opts?: Partial<SpiritualSwordSpawnOpts>,
  ): void {
    this.spawn({
      mode: 'projectile',
      position: from,
      target: to,
      ...opts,
    });
  }

  /** Rain swords above an area (fixed fall — gravity + plant) */
  rainFall(
    center: THREE.Vector3,
    opts?: Partial<SpiritualSwordSpawnOpts>,
  ): void {
    this.spawn({
      mode: 'fall',
      position: center,
      count: opts?.count ?? 6,
      ...opts,
    });
  }

  /** Quick spin slash around attach / position */
  spinSlash(
    attachOrPos: THREE.Object3D | THREE.Vector3,
    opts?: Partial<SpiritualSwordSpawnOpts>,
  ): void {
    if (attachOrPos instanceof THREE.Object3D) {
      this.spawn({ mode: 'spin', attachTo: attachOrPos, count: opts?.count ?? 4, ...opts });
    } else {
      this.spawn({ mode: 'spin', position: attachOrPos, count: opts?.count ?? 4, ...opts });
    }
  }

  /** Set player orbit stacks (1 small sword per stack) */
  setStacksOnPlayer(
    id: string,
    attach: THREE.Object3D,
    stacks: number,
    color?: SpiritualSwordColor,
    school?: string,
  ): void {
    const resolved = color ?? spiritualColorFromSchool(school);
    this.setPlayerStacks({ mode: 'stack_player', attachTo: attach, stacks, color: resolved }, resolved);
    const key = id || attach.uuid;
    const entry = this.playerStacks.get(attach.uuid);
    if (entry && key !== attach.uuid) {
      this.playerStacks.delete(attach.uuid);
      this.playerStacks.set(key, entry);
    }
  }

  setStacksOnEnemy(
    id: string,
    attach: THREE.Object3D,
    stacks: number,
    color?: SpiritualSwordColor,
    school?: string,
  ): void {
    const resolved = color ?? spiritualColorFromSchool(school);
    this.setEnemyStacks({ mode: 'stack_enemy', attachTo: attach, stacks, color: resolved }, resolved);
    const key = id || attach.uuid;
    const entry = this.enemyStacks.get(attach.uuid);
    if (entry && key !== attach.uuid) {
      this.enemyStacks.delete(attach.uuid);
      this.enemyStacks.set(key, entry);
    }
  }

  private spawnProjectile(opts: SpiritualSwordSpawnOpts, color: SpiritualSwordColor): void {
    const from = (opts.position ?? new THREE.Vector3()).clone();
    const to = (opts.target ?? from.clone().add(new THREE.Vector3(0, 0, -8))).clone();
    to.y += 1.0;
    from.y += 1.2;
    const scale = opts.scale ?? SPIRITUAL_SWORD_SCALE.projectile;
    const speed = opts.speed ?? 22;
    const dist = from.distanceTo(to);
    const duration = Math.min(2.0, Math.max(0.12, dist / speed));

    const blade = createSpiritualBladeMesh(color);
    blade.scale.setScalar(scale);
    // Point tip along flight (local +Y → lookAt)
    blade.position.copy(from);
    this.root.add(blade);

    this.active.push({
      root: blade,
      mode: 'projectile',
      color,
      age: 0,
      duration,
      attachTo: null,
      holdPos: from.clone(),
      from,
      to,
      phase: 0,
      index: 0,
      total: 1,
      spinSpeed: 12,
      velocityY: 0,
      planted: false,
      scale,
      onImpact: opts.onImpact,
    });
  }

  private spawnAura(opts: SpiritualSwordSpawnOpts, color: SpiritualSwordColor): void {
    const count = opts.count ?? 6;
    const duration = opts.durationSec ?? 4;
    const scale = opts.scale ?? SPIRITUAL_SWORD_SCALE.aura;
    const attach = opts.attachTo ?? null;
    const base = opts.position?.clone() ?? new THREE.Vector3();

    for (let i = 0; i < count; i++) {
      const blade = createSpiritualBladeMesh(color);
      blade.scale.setScalar(scale);
      this.root.add(blade);
      this.active.push({
        root: blade,
        mode: 'aura',
        color,
        age: 0,
        duration,
        attachTo: attach,
        holdPos: base,
        from: base.clone(),
        to: base.clone(),
        phase: (i / count) * Math.PI * 2,
        index: i,
        total: count,
        spinSpeed: 1.6,
        velocityY: 0,
        planted: false,
        scale,
      });
    }
  }

  private spawnSpin(opts: SpiritualSwordSpawnOpts, color: SpiritualSwordColor): void {
    const count = opts.count ?? 4;
    const duration = opts.durationSec ?? 0.55;
    const scale = opts.scale ?? SPIRITUAL_SWORD_SCALE.spin;
    const attach = opts.attachTo ?? null;
    const base = opts.position?.clone() ?? new THREE.Vector3();

    for (let i = 0; i < count; i++) {
      const blade = createSpiritualBladeMesh(color);
      blade.scale.setScalar(scale);
      this.root.add(blade);
      this.active.push({
        root: blade,
        mode: 'spin',
        color,
        age: 0,
        duration,
        attachTo: attach,
        holdPos: base,
        from: base.clone(),
        to: base.clone(),
        phase: (i / count) * Math.PI * 2,
        index: i,
        total: count,
        spinSpeed: 14,
        velocityY: 0,
        planted: false,
        scale,
      });
    }
  }

  /**
   * Fall rain — spawn above target, gravity accelerate, plant on ground.
   * Fixes “sword fall” by using real vy + soft plant (no snap mid-air).
   */
  private spawnFall(opts: SpiritualSwordSpawnOpts, color: SpiritualSwordColor): void {
    const count = Math.max(1, Math.min(16, opts.count ?? 6));
    const center = (opts.position ?? opts.target ?? new THREE.Vector3()).clone();
    const scale = opts.scale ?? SPIRITUAL_SWORD_SCALE.fall;
    const groundY = center.y;

    for (let i = 0; i < count; i++) {
      const blade = createSpiritualBladeMesh(color);
      blade.scale.setScalar(scale);
      // Tip down for fall (blade local +Y is tip — rotate so tip points ground)
      blade.rotation.x = Math.PI; // tip -Y
      const spread = 2.4;
      const ox = (Math.random() - 0.5) * spread;
      const oz = (Math.random() - 0.5) * spread;
      const startY = groundY + 8 + Math.random() * 4 + i * 0.15;
      blade.position.set(center.x + ox, startY, center.z + oz);
      this.root.add(blade);

      this.active.push({
        root: blade,
        mode: 'fall',
        color,
        age: 0,
        duration: 3.5,
        attachTo: null,
        holdPos: new THREE.Vector3(center.x + ox, groundY, center.z + oz),
        from: blade.position.clone(),
        to: new THREE.Vector3(center.x + ox, groundY + 0.02, center.z + oz),
        phase: Math.random() * Math.PI * 2,
        index: i,
        total: count,
        spinSpeed: 2 + Math.random() * 3,
        velocityY: -2 - Math.random() * 2,
        planted: false,
        scale,
        onImpact: opts.onImpact,
      });
    }
  }

  private spawnBlock(opts: SpiritualSwordSpawnOpts, color: SpiritualSwordColor): void {
    const count = opts.count ?? 5;
    const duration = opts.durationSec ?? 2.2;
    const scale = opts.scale ?? SPIRITUAL_SWORD_SCALE.block;
    const attach = opts.attachTo ?? null;
    const base = opts.position?.clone() ?? new THREE.Vector3();
    const yaw = opts.yaw ?? 0;

    for (let i = 0; i < count; i++) {
      const blade = createSpiritualBladeMesh(color);
      blade.scale.setScalar(scale);
      this.root.add(blade);
      const t = count === 1 ? 0.5 : i / (count - 1);
      const fan = (t - 0.5) * 1.1; // radians fan
      this.active.push({
        root: blade,
        mode: 'block',
        color,
        age: 0,
        duration,
        attachTo: attach,
        holdPos: base,
        from: base.clone(),
        to: base.clone(),
        phase: yaw + fan,
        index: i,
        total: count,
        spinSpeed: 0,
        velocityY: 0,
        planted: false,
        scale,
      });
    }
  }

  private setPlayerStacks(opts: SpiritualSwordSpawnOpts, color: SpiritualSwordColor): void {
    const attach = opts.attachTo;
    if (!attach) return;
    const key = attach.uuid;
    const stacks = Math.max(0, Math.min(SPIRITUAL_SWORD_STACK.max, opts.stacks ?? 1));
    let entry = this.playerStacks.get(key);
    if (!entry) {
      entry = { attach, color, count: 0, blades: [] };
      this.playerStacks.set(key, entry);
    }
    entry.color = color;
    entry.attach = attach;
    // Resize blade list
    while (entry.blades.length > stacks) {
      const b = entry.blades.pop()!;
      this.disposeBlade(b);
      const idx = this.active.indexOf(b);
      if (idx >= 0) this.active.splice(idx, 1);
    }
    while (entry.blades.length < stacks) {
      const i = entry.blades.length;
      const blade = createSpiritualBladeMesh(color);
      blade.scale.setScalar(SPIRITUAL_SWORD_SCALE.stack);
      this.root.add(blade);
      const inst: BladeInstance = {
        root: blade,
        mode: 'stack_player',
        color,
        age: 0,
        duration: 1e9,
        attachTo: attach,
        holdPos: new THREE.Vector3(),
        from: new THREE.Vector3(),
        to: new THREE.Vector3(),
        phase: (i / Math.max(1, stacks)) * Math.PI * 2,
        index: i,
        total: stacks,
        spinSpeed: SPIRITUAL_SWORD_STACK.spinSpeed,
        velocityY: 0,
        planted: false,
        scale: SPIRITUAL_SWORD_SCALE.stack,
      };
      entry.blades.push(inst);
      this.active.push(inst);
    }
    // Update phase distribution
    entry.count = stacks;
    entry.blades.forEach((b, i) => {
      b.total = stacks;
      b.index = i;
      b.phase = (i / Math.max(1, stacks)) * Math.PI * 2;
      b.color = color;
      b.attachTo = attach;
    });
  }

  private setEnemyStacks(opts: SpiritualSwordSpawnOpts, color: SpiritualSwordColor): void {
    const attach = opts.attachTo;
    if (!attach) return;
    const key = attach.uuid;
    const stacks = Math.max(0, Math.min(SPIRITUAL_SWORD_STACK.max, opts.stacks ?? 1));
    let entry = this.enemyStacks.get(key);
    if (!entry) {
      entry = { attach, color, count: 0, blades: [] };
      this.enemyStacks.set(key, entry);
    }
    entry.color = color;
    entry.attach = attach;
    while (entry.blades.length > stacks) {
      const b = entry.blades.pop()!;
      this.disposeBlade(b);
      const idx = this.active.indexOf(b);
      if (idx >= 0) this.active.splice(idx, 1);
    }
    while (entry.blades.length < stacks) {
      const i = entry.blades.length;
      const blade = createSpiritualBladeMesh(color);
      blade.scale.setScalar(SPIRITUAL_SWORD_SCALE.stack);
      this.root.add(blade);
      const inst: BladeInstance = {
        root: blade,
        mode: 'stack_enemy',
        color,
        age: 0,
        duration: 1e9,
        attachTo: attach,
        holdPos: new THREE.Vector3(),
        from: new THREE.Vector3(),
        to: new THREE.Vector3(),
        phase: (i / Math.max(1, stacks)) * Math.PI * 2,
        index: i,
        total: stacks,
        spinSpeed: SPIRITUAL_SWORD_STACK.spinSpeed * 0.85,
        velocityY: 0,
        planted: false,
        scale: SPIRITUAL_SWORD_SCALE.stack,
      };
      entry.blades.push(inst);
      this.active.push(inst);
    }
    entry.count = stacks;
    entry.blades.forEach((b, i) => {
      b.total = stacks;
      b.index = i;
      b.phase = (i / Math.max(1, stacks)) * Math.PI * 2;
      b.color = color;
      b.attachTo = attach;
    });
  }

  update(dt: number): void {
    const still: BladeInstance[] = [];
    for (const b of this.active) {
      b.age += dt;
      let keep = true;

      switch (b.mode) {
        case 'projectile':
          keep = this.updateProjectile(b, dt);
          break;
        case 'aura':
          keep = this.updateAura(b, dt);
          break;
        case 'spin':
          keep = this.updateSpin(b, dt);
          break;
        case 'fall':
          keep = this.updateFall(b, dt);
          break;
        case 'block':
          keep = this.updateBlock(b, dt);
          break;
        case 'stack_player':
          keep = this.updateStackPlayer(b, dt);
          break;
        case 'stack_enemy':
          keep = this.updateStackEnemy(b, dt);
          break;
      }

      if (keep) still.push(b);
      else this.disposeBlade(b);
    }
    this.active = still;
  }

  private updateProjectile(b: BladeInstance, _dt: number): boolean {
    const u = Math.min(1, b.age / b.duration);
    // Slight arc
    const arc = Math.sin(u * Math.PI) * 0.45;
    _tmp.lerpVectors(b.from, b.to, u);
    _tmp.y += arc;
    b.root.position.copy(_tmp);
    // Orient tip toward target (+Y local → direction)
    _tmp2.copy(b.to).sub(b.from).normalize();
    if (_tmp2.lengthSq() > 1e-6) {
      const quat = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        _tmp2,
      );
      b.root.quaternion.copy(quat);
    }
    // Spin around flight axis for magical feel
    b.root.rotateY(b.spinSpeed * _dtSafe(_dt));

    if (u >= 1) {
      b.onImpact?.(b.to.clone(), b.color);
      return false;
    }
    return true;
  }

  private updateAura(b: BladeInstance, dt: number): boolean {
    const origin = this.anchor(b);
    const r = 1.6;
    const h = 1.1;
    b.phase += b.spinSpeed * dt;
    const x = Math.cos(b.phase) * r;
    const z = Math.sin(b.phase) * r;
    b.root.position.set(origin.x + x, origin.y + h, origin.z + z);
    // Tip up, face outward tangent
    b.root.rotation.set(0.15, -b.phase + Math.PI / 2, 0.2);
    // Fade near end
    const life = b.age / b.duration;
    if (life > 0.85) this.setOpacity(b.root, 1 - (life - 0.85) / 0.15);
    return b.age < b.duration;
  }

  private updateSpin(b: BladeInstance, dt: number): boolean {
    const origin = this.anchor(b);
    const life = b.age / b.duration;
    const r = 0.9 + life * 1.4;
    b.phase += b.spinSpeed * dt;
    const x = Math.cos(b.phase) * r;
    const z = Math.sin(b.phase) * r;
    b.root.position.set(origin.x + x, origin.y + 1.0 + Math.sin(life * Math.PI) * 0.3, origin.z + z);
    // Blade lies in spin plane (tip outward)
    const quat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(x, 0.05, z).normalize(),
    );
    b.root.quaternion.copy(quat);
    if (life > 0.7) this.setOpacity(b.root, 1 - (life - 0.7) / 0.3);
    return b.age < b.duration;
  }

  private updateFall(b: BladeInstance, dt: number): boolean {
    if (b.planted) {
      // `from.x` stores plant timestamp (age at plant)
      const since = b.age - b.from.x;
      if (since > 1.2) this.setOpacity(b.root, 1 - (since - 1.2) / 0.5);
      return since < 1.7;
    }

    // Gravity + plant (fixes mid-air snap fall)
    b.velocityY -= 28 * dt;
    b.root.position.y += b.velocityY * dt;
    b.root.rotation.y += b.spinSpeed * dt;
    b.root.rotation.z = Math.sin(b.age * 3) * 0.08;

    const groundY = b.to.y;
    if (b.root.position.y <= groundY + 0.45) {
      b.root.position.y = groundY + 0.42;
      b.velocityY = 0;
      b.planted = true;
      b.root.rotation.x = Math.PI; // tip into ground
      b.root.rotation.z = (Math.random() - 0.5) * 0.25;
      b.from.x = b.age; // plant clock
      b.onImpact?.(b.root.position.clone(), b.color);
    }

    return b.age < b.duration;
  }

  private updateBlock(b: BladeInstance, _dt: number): boolean {
    const origin = this.anchor(b);
    const yaw = b.phase;
    const dist = 0.85;
    const h = 1.0 + (b.index - (b.total - 1) / 2) * 0.05;
    b.root.position.set(
      origin.x + Math.sin(yaw) * dist,
      origin.y + h,
      origin.z + Math.cos(yaw) * dist,
    );
    // Face outward (tip up, guard toward threat)
    b.root.rotation.set(0.1, yaw, 0);
    const life = b.age / b.duration;
    if (life > 0.8) this.setOpacity(b.root, 1 - (life - 0.8) / 0.2);
    return b.age < b.duration;
  }

  private updateStackPlayer(b: BladeInstance, dt: number): boolean {
    if (!b.attachTo || b.total <= 0) return false;
    const origin = new THREE.Vector3();
    b.attachTo.getWorldPosition(origin);
    b.phase += b.spinSpeed * dt;
    const angle = b.phase + (b.index / b.total) * Math.PI * 2;
    const r = SPIRITUAL_SWORD_STACK.playerRadius;
    const h = SPIRITUAL_SWORD_STACK.playerHeight;
    b.root.position.set(
      origin.x + Math.cos(angle) * r,
      origin.y + h + Math.sin(b.age * 2 + b.index) * 0.06,
      origin.z + Math.sin(angle) * r,
    );
    // Tip up, slight lean outward
    b.root.rotation.set(0.25, -angle + Math.PI / 2, 0.15);
    return true;
  }

  private updateStackEnemy(b: BladeInstance, dt: number): boolean {
    if (!b.attachTo || b.total <= 0) return false;
    const origin = new THREE.Vector3();
    b.attachTo.getWorldPosition(origin);
    b.phase += b.spinSpeed * dt;
    const n = b.total;
    // Arc over head: spread left-right
    const t = n === 1 ? 0.5 : b.index / (n - 1);
    const xOff = (t - 0.5) * SPIRITUAL_SWORD_STACK.enemySpread * n;
    const bob = Math.sin(b.age * 3 + b.index) * 0.04;
    b.root.position.set(
      origin.x + xOff * Math.cos(b.phase * 0.2),
      origin.y + SPIRITUAL_SWORD_STACK.enemyHeadY + bob,
      origin.z + xOff * Math.sin(b.phase * 0.2) * 0.2,
    );
    // Tip down toward skull (threat markers)
    b.root.rotation.set(Math.PI * 0.85, b.phase * 0.5, 0);
    return true;
  }

  private anchor(b: BladeInstance): THREE.Vector3 {
    if (b.attachTo) {
      b.attachTo.getWorldPosition(_tmp);
      return _tmp;
    }
    return b.holdPos;
  }

  private setOpacity(root: THREE.Object3D, opacity: number): void {
    const o = Math.max(0, Math.min(1, opacity));
    root.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (!m.isMesh) return;
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      for (const mat of mats) {
        if (mat && 'opacity' in mat) {
          (mat as THREE.Material & { opacity: number; transparent: boolean }).transparent = true;
          (mat as THREE.Material & { opacity: number }).opacity = o *
            ((mat as THREE.Material & { userData?: { baseOp?: number } }).userData?.baseOp ?? 0.95);
        }
      }
    });
  }

  private disposeBlade(b: BladeInstance): void {
    this.root.remove(b.root);
    b.root.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (!m.isMesh) return;
      m.geometry?.dispose();
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      for (const mat of mats) mat?.dispose?.();
    });
  }

  dispose(): void {
    for (const b of this.active) this.disposeBlade(b);
    this.active = [];
    this.playerStacks.clear();
    this.enemyStacks.clear();
    this.scene.remove(this.root);
  }
}

function _dtSafe(dt: number): number {
  return Math.min(0.05, Math.max(0, dt));
}
