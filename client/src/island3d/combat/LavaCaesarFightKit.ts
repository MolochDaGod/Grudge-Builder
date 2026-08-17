/**
 * Lava Caesar fight kit — platforms, dive/rise, tornado, 3 Mixamo minions,
 * fireball stun pickup. Owned by LargeBossFightSystem (not a second engine).
 *
 * Annihilate Mutant pattern for adds: chase → attack LoopOnce → cooldown.
 * One AnimationMixer per body. Rapier arena stays on the volcanic instance.
 */
import * as THREE from 'three';
import { LoopOnce, LoopRepeat } from 'three';
import {
  LAVA_CAESAR_KIT,
  LAVA_CAESAR_LOAD,
  clipNameIncludes,
  lavaPlatformLocal,
  type LavaCaesarKitDef,
} from '@shared/definitions/lavaCaesarBossFight';
import { loadAssetGltf, cloneGltfScene } from '@/lib/three/SharedGltfPipeline';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { BossCinemaFx } from './BossCinemaFx';

export type LavaStunPhase = 'none' | 'collapse' | 'hands' | 'rewind';

interface LavaPlatform {
  root: THREE.Group;
  deck: THREE.Mesh;
  index: number;
  baseY: number;
  health: number;
  cracked: boolean;
  shake: number;
}

interface LavaMinion {
  root: THREE.Group;
  mixer: THREE.AnimationMixer;
  clip: THREE.AnimationClip;
  action: THREE.AnimationAction;
  hp: number;
  platformIndex: number;
  mode: 'idle' | 'chase' | 'attack' | 'dead';
  attackCd: number;
  window: [number, number];
}

interface FireballOrb {
  root: THREE.Group;
  mixer: THREE.AnimationMixer | null;
  alive: boolean;
}

interface LinearTwister {
  root: THREE.Group;
  vel: THREE.Vector3;
  life: number;
  hitT: number;
}

interface RiseTornado {
  root: THREE.Group;
  t: number;
  fromY: number;
  toY: number;
}

export interface LavaKitHost {
  root: THREE.Group;
  mesh: THREE.Object3D;
  arenaCenter: THREE.Vector3;
  cinema: BossCinemaFx;
  emitHit: (playerPos: THREE.Vector3, kind: string, damage: number, origin: THREE.Vector3) => void;
  onPrompt?: (msg: string | null) => void;
}

async function loadFirst(urls: readonly string[]): Promise<GLTF | null> {
  for (const url of urls) {
    const gltf = await loadAssetGltf(url, 'medium');
    if (gltf?.scene) return gltf;
  }
  return null;
}

function fitHeight(root: THREE.Object3D, targetH: number): number {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const h = Math.max(0.01, box.max.y - box.min.y);
  const s = targetH / h;
  root.scale.multiplyScalar(s);
  root.updateMatrixWorld(true);
  const box2 = new THREE.Box3().setFromObject(root);
  root.position.y -= box2.min.y;
  return s;
}

function findClip(clips: THREE.AnimationClip[], ...needles: string[]): THREE.AnimationClip | null {
  return clips.find((c) => clipNameIncludes(c.name, ...needles)) ?? clips[0] ?? null;
}

export class LavaCaesarFightKit {
  readonly kit: LavaCaesarKitDef;
  readonly platforms: LavaPlatform[] = [];
  lavaY: number;
  private host: LavaKitHost;
  private scene: THREE.Scene;
  private tornadoGltf: GLTF | null = null;
  private tornadoUpGltf: GLTF | null = null;
  private minionGltf: GLTF | null = null;
  private fireballGltf: GLTF | null = null;
  private minions: LavaMinion[] = [];
  private orbs: FireballOrb[] = [];
  private twisters: LinearTwister[] = [];
  private riseFx: RiseTornado[] = [];
  private mixer: THREE.AnimationMixer | null = null;
  private clips: THREE.AnimationClip[] = [];
  private currentAction: THREE.AnimationAction | null = null;
  private stunPhase: LavaStunPhase = 'none';
  private stunT = 0;
  private deadAction: THREE.AnimationAction | null = null;
  private waveT = 0;
  private waveActive = false;
  private sampleHeight: ((x: number, z: number) => number | null) | null;
  private disposed = false;
  private tmp = new THREE.Vector3();

  constructor(
    scene: THREE.Scene,
    host: LavaKitHost,
    opts?: {
      lavaY?: number;
      kit?: LavaCaesarKitDef;
      sampleHeight?: (x: number, z: number) => number | null;
    },
  ) {
    this.scene = scene;
    this.host = host;
    this.kit = opts?.kit ?? LAVA_CAESAR_KIT;
    this.lavaY = opts?.lavaY ?? host.arenaCenter.y + 1.1;
    this.sampleHeight = opts?.sampleHeight ?? null;
    this.buildPlatforms();
  }

  bindBossAnims(mesh: THREE.Object3D, clips: THREE.AnimationClip[]): void {
    this.mixer?.stopAllAction();
    this.mixer = new THREE.AnimationMixer(mesh);
    this.clips = clips.slice();
    this.playBoss('idle', { loop: true });
  }

  playBoss(
    kind: 'idle' | 'born' | 'atk' | 'run' | 'spell1' | 'spell2' | 'spell4' | 'dead',
    opts?: { loop?: boolean; fade?: number; timeScale?: number },
  ): THREE.AnimationAction | null {
    if (!this.mixer || !this.clips.length) return null;
    const needles: Record<typeof kind, string[]> = {
      idle: ['idle'],
      born: ['born'],
      atk: ['atk1', 'atk'],
      run: ['run'],
      spell1: ['spell1'],
      spell2: ['spell2'],
      spell4: ['spell4'],
      dead: ['dead', 'death'],
    };
    const clip = findClip(this.clips, ...needles[kind]);
    if (!clip) return null;
    const next = this.mixer.clipAction(clip);
    next.enabled = true;
    next.paused = false;
    next.timeScale = opts?.timeScale ?? 1;
    next.setLoop(opts?.loop ? LoopRepeat : LoopOnce, opts?.loop ? Infinity : 1);
    next.clampWhenFinished = !opts?.loop;
    next.reset();
    if (this.currentAction && this.currentAction !== next) {
      this.currentAction.crossFadeTo(next, opts?.fade ?? 0.18, false);
    }
    next.play();
    this.currentAction = next;
    return next;
  }

  async preload(): Promise<void> {
    const [t, tu, m, f] = await Promise.all([
      loadFirst(LAVA_CAESAR_LOAD.tornado),
      loadFirst(LAVA_CAESAR_LOAD.tornadoUp),
      loadFirst(LAVA_CAESAR_LOAD.minion),
      loadFirst(LAVA_CAESAR_LOAD.fireball),
    ]);
    if (this.disposed) return;
    this.tornadoGltf = t;
    this.tornadoUpGltf = tu;
    this.minionGltf = m;
    this.fireballGltf = f;
  }

  private buildPlatforms(): void {
    for (let i = 0; i < this.kit.platformCount; i++) {
      const loc = lavaPlatformLocal(i, this.kit);
      const root = new THREE.Group();
      root.name = `LavaPlatform_${i}`;
      const deck = new THREE.Mesh(
        new THREE.CylinderGeometry(this.kit.platformRadiusSizeM, this.kit.platformRadiusSizeM * 0.92, 0.55, 12),
        new THREE.MeshStandardMaterial({
          color: 0x3f1f12,
          emissive: 0xc2410c,
          emissiveIntensity: 0.35,
          roughness: 0.72,
          metalness: 0.18,
        }),
      );
      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(this.kit.platformRadiusSizeM * 0.92, 0.12, 6, 16),
        new THREE.MeshStandardMaterial({
          color: 0x7c2d12,
          emissive: 0xff6a00,
          emissiveIntensity: 0.55,
          roughness: 0.5,
        }),
      );
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 0.3;
      root.add(deck, rim);
      const world = this.worldOnRing(loc.x, loc.z);
      const baseY = world.y;
      root.position.set(world.x, baseY, world.z);
      this.host.root.parent ? this.scene.add(root) : this.scene.add(root);
      this.scene.add(root);
      this.platforms.push({
        root,
        deck,
        index: i,
        baseY,
        health: 2,
        cracked: false,
        shake: 0,
      });
    }
  }

  private worldOnRing(lx: number, lz: number): THREE.Vector3 {
    const c = this.host.arenaCenter;
    const x = c.x + lx;
    const z = c.z + lz;
    const sampled = this.sampleHeight?.(x, z);
    const y =
      sampled != null && Number.isFinite(sampled)
        ? sampled + 0.08
        : this.lavaY + this.kit.platformDeckM;
    return new THREE.Vector3(x, y, z);
  }

  platformWorld(index: number): THREE.Vector3 {
    const p = this.platforms[index];
    if (!p) return this.host.arenaCenter.clone();
    return p.root.position.clone();
  }

  pickPlatformToward(playerPos: THREE.Vector3 | undefined): number {
    if (!playerPos || !this.platforms.length) return 0;
    let best = 0;
    let bestD = Infinity;
    for (const p of this.platforms) {
      if (p.cracked && p.health <= 0) continue;
      const d = p.root.position.distanceToSquared(playerPos);
      if (d < bestD) {
        bestD = d;
        best = p.index;
      }
    }
    return best;
  }

  spawnRiseTornado(platformIndex: number): void {
    const p = this.platforms[platformIndex];
    if (!p) return;
    const src = this.tornadoUpGltf ?? this.tornadoGltf;
    const root = new THREE.Group();
    root.name = 'TornadoUp';
    if (src?.scene) {
      const mesh = cloneGltfScene(src);
      fitHeight(mesh, 7.5);
      root.add(mesh);
    } else {
      root.add(
        new THREE.Mesh(
          new THREE.ConeGeometry(1.4, 7, 10, 1, true),
          new THREE.MeshStandardMaterial({
            color: 0xff6a00,
            emissive: 0xff3d00,
            emissiveIntensity: 1.1,
            transparent: true,
            opacity: 0.85,
            side: THREE.DoubleSide,
          }),
        ),
      );
    }
    root.position.set(p.root.position.x, this.lavaY - 1.5, p.root.position.z);
    this.scene.add(root);
    this.riseFx.push({
      root,
      t: 0,
      fromY: this.lavaY - 1.5,
      toY: p.root.position.y + 5.2,
    });
    p.shake = 1.2;
    this.host.cinema.spawnShockwave(p.root.position, 6, 0, 10);
  }

  spawnMinionWave(): void {
    this.clearMinions(false);
    this.waveActive = true;
    this.waveT = this.kit.minionKillWindowSec;
    for (let i = 0; i < this.kit.platformCount; i++) {
      const p = this.platforms[i];
      if (!p || p.health <= 0) continue;
      this.spawnMinion(i);
    }
    this.host.onPrompt?.('Kill the lava brood on every platform — or they detonate!');
  }

  private spawnMinion(platformIndex: number): void {
    const p = this.platforms[platformIndex];
    if (!p) return;
    const root = new THREE.Group();
    root.name = `LavaMinion_${platformIndex}`;
    let clip = new THREE.AnimationClip('idle', 1, []);
    if (this.minionGltf?.scene) {
      const mesh = cloneGltfScene(this.minionGltf);
      fitHeight(mesh, this.kit.minionHeightM);
      root.add(mesh);
      clip = this.minionGltf.animations[0] ?? clip;
    } else {
      root.add(
        new THREE.Mesh(
          new THREE.CapsuleGeometry(0.45, 1.1, 4, 8),
          new THREE.MeshStandardMaterial({
            color: 0x7c2d12,
            emissive: 0xea580c,
            emissiveIntensity: 0.6,
          }),
        ),
      );
    }
    const mixer = new THREE.AnimationMixer(root);
    const action = mixer.clipAction(clip);
    action.play();
    root.position.copy(p.root.position);
    root.position.y += 0.15;
    this.scene.add(root);
    const idle = this.kit.minionClip.idle;
    this.setClipWindow(action, idle);
    this.minions.push({
      root,
      mixer,
      clip,
      action,
      hp: this.kit.minionHp,
      platformIndex,
      mode: 'idle',
      attackCd: 0.4,
      window: idle,
    });
  }

  private setClipWindow(action: THREE.AnimationAction, win: [number, number]): void {
    action.time = win[0];
    action.setLoop(LoopRepeat, Infinity);
    action.play();
  }

  private tickMinionClip(m: LavaMinion, dt: number): void {
    const [a, b] = m.window;
    if (m.action.time >= b) {
      if (m.mode === 'attack') {
        m.mode = 'chase';
        m.window = this.kit.minionClip.walk;
        m.action.time = this.kit.minionClip.walk[0];
      } else {
        m.action.time = a;
      }
    }
    m.mixer.update(dt);
  }

  spawnLinearTwister(toward: THREE.Vector3): void {
    const src = this.tornadoGltf ?? this.tornadoUpGltf;
    const root = new THREE.Group();
    root.name = 'FireTwister';
    if (src?.scene) {
      const mesh = cloneGltfScene(src);
      fitHeight(mesh, 5.4);
      root.add(mesh);
    } else {
      root.add(
        new THREE.Mesh(
          new THREE.ConeGeometry(1.1, 5.2, 10, 1, true),
          new THREE.MeshStandardMaterial({
            color: 0xffb347,
            emissive: 0xff6a00,
            emissiveIntensity: 1.2,
            transparent: true,
            opacity: 0.88,
            side: THREE.DoubleSide,
          }),
        ),
      );
    }
    const from = this.host.root.position.clone();
    from.y = this.lavaY + 0.4;
    const dir = toward.clone().sub(from).setY(0);
    if (dir.lengthSq() < 0.01) dir.set(0, 0, 1);
    dir.normalize();
    root.position.copy(from);
    this.scene.add(root);
    this.twisters.push({
      root,
      vel: dir.multiplyScalar(this.kit.twisterSpeedMps),
      life: this.kit.twisterLifeSec,
      hitT: 0,
    });
  }

  startStun(): boolean {
    if (this.stunPhase !== 'none') return false;
    const dead = this.playBoss('dead', { loop: false, fade: 0.08, timeScale: 1 });
    this.deadAction = dead;
    if (dead) {
      dead.time = 0;
      dead.paused = false;
      dead.timeScale = 1;
    }
    this.stunPhase = 'collapse';
    this.stunT = 0;
    this.host.onPrompt?.('Caesar stunned — unload on the hands!');
    return true;
  }

  get stunActive(): boolean {
    return this.stunPhase !== 'none';
  }

  get stunPhaseId(): LavaStunPhase {
    return this.stunPhase;
  }

  get waveRemaining(): number {
    return this.waveActive ? this.waveT : 0;
  }

  get livingMinionCount(): number {
    return this.minions.filter((m) => m.mode !== 'dead' && m.hp > 0).length;
  }

  minionRoots(): THREE.Object3D[] {
    return this.minions.filter((m) => m.mode !== 'dead').map((m) => m.root);
  }

  tryHitMinion(point: THREE.Vector3, damage: number): boolean {
    for (const m of this.minions) {
      if (m.mode === 'dead' || m.hp <= 0) continue;
      if (point.distanceTo(m.root.position) > 2.4) continue;
      m.hp -= damage;
      if (m.hp <= 0) this.killMinion(m);
      return true;
    }
    return false;
  }

  private killMinion(m: LavaMinion): void {
    m.mode = 'dead';
    m.hp = 0;
    this.scene.remove(m.root);
    this.spawnFireball(m.root.position);
    if (this.livingMinionCount === 0) {
      this.waveActive = false;
      this.host.onPrompt?.('Brood down — walk the fireballs to stun Caesar.');
    }
  }

  private spawnFireball(at: THREE.Vector3): void {
    const root = new THREE.Group();
    root.name = 'StunFireball';
    let mixer: THREE.AnimationMixer | null = null;
    if (this.fireballGltf?.scene) {
      const mesh = cloneGltfScene(this.fireballGltf);
      fitHeight(mesh, 1.05);
      root.add(mesh);
      if (this.fireballGltf.animations[0]) {
        mixer = new THREE.AnimationMixer(mesh);
        mixer.clipAction(this.fireballGltf.animations[0]).play();
      }
    } else {
      root.add(
        new THREE.Mesh(
          new THREE.SphereGeometry(0.45, 10, 8),
          new THREE.MeshStandardMaterial({
            color: 0xff3d00,
            emissive: 0xff6a00,
            emissiveIntensity: 1.4,
          }),
        ),
      );
    }
    root.position.copy(at);
    root.position.y += 0.7;
    this.scene.add(root);
    this.orbs.push({ root, mixer, alive: true });
  }

  tryCollectFireball(playerPos: THREE.Vector3): boolean {
    for (const o of this.orbs) {
      if (!o.alive) continue;
      if (playerPos.distanceTo(o.root.position) > this.kit.fireballPickupRadiusM) continue;
      o.alive = false;
      this.scene.remove(o.root);
      return this.startStun();
    }
    return false;
  }

  explodeUnkilled(): void {
    for (const m of this.minions) {
      if (m.mode === 'dead' || m.hp <= 0) continue;
      const p = this.platforms[m.platformIndex];
      if (p) this.crackPlatform(p);
      this.host.cinema.spawnShockwave(m.root.position, 5.5, this.kit.platformExplodeDamage, 12);
      m.mode = 'dead';
      this.scene.remove(m.root);
    }
    this.waveActive = false;
    this.minions = this.minions.filter((m) => m.mode !== 'dead');
    this.host.onPrompt?.('Brood detonated — platforms cracked!');
  }

  private crackPlatform(p: LavaPlatform): void {
    p.health -= 1;
    p.shake = 1.6;
    p.cracked = true;
    const mat = p.deck.material as THREE.MeshStandardMaterial;
    mat.emissive.setHex(0x7f1d1d);
    mat.emissiveIntensity = 0.9;
    p.baseY -= 0.85;
    if (p.health <= 0) {
      p.baseY -= 1.1;
      mat.color.setHex(0x1c1917);
    }
  }

  update(
    dt: number,
    playerPos?: THREE.Vector3,
  ): { stunStarted: boolean; waveExpired: boolean; stunDone: boolean } {
    const out = { stunStarted: false, waveExpired: false, stunDone: false };
    this.mixer?.update(dt);

    if (this.stunPhase !== 'none') {
      out.stunDone = this.tickStun(dt);
    }

    const t = performance.now() * 0.001;
    for (const p of this.platforms) {
      p.shake = Math.max(0, p.shake - dt);
      const bob = Math.sin(t * 0.9 + p.index * 2.1) * 0.22;
      const sway = Math.cos(t * 0.55 + p.index) * 0.18;
      const loc = lavaPlatformLocal(p.index, this.kit);
      p.root.position.x = this.host.arenaCenter.x + loc.x + sway;
      p.root.position.z = this.host.arenaCenter.z + loc.z;
      p.root.position.y = p.baseY + bob + (p.shake > 0 ? Math.sin(t * 28) * 0.12 : 0);
      p.root.rotation.y += dt * 0.08;
    }

    for (const fx of this.riseFx) {
      fx.t += dt;
      const u = Math.min(1, fx.t / this.kit.tornadoUpDurationSec);
      fx.root.position.y = THREE.MathUtils.lerp(fx.fromY, fx.toY, u);
      fx.root.rotation.y += dt * 6;
      fx.root.scale.setScalar(0.7 + u * 0.5);
    }
    this.riseFx = this.riseFx.filter((fx) => {
      if (fx.t < this.kit.tornadoUpDurationSec + 0.35) return true;
      this.scene.remove(fx.root);
      return false;
    });

    for (const tw of this.twisters) {
      tw.life -= dt;
      tw.hitT -= dt;
      tw.root.position.addScaledVector(tw.vel, dt);
      tw.root.rotation.y += dt * 7.5;
      if (playerPos && tw.hitT <= 0) {
        const d = playerPos.distanceTo(tw.root.position);
        if (d < this.kit.twisterHitRadiusM) {
          this.host.emitHit(playerPos, 'fire_twister', 240, tw.root.position);
          tw.hitT = 0.45;
        }
      }
    }
    this.twisters = this.twisters.filter((tw) => {
      if (tw.life > 0) return true;
      this.scene.remove(tw.root);
      return false;
    });

    if (this.waveActive) {
      this.waveT -= dt;
      if (this.waveT <= 0) {
        this.explodeUnkilled();
        out.waveExpired = true;
      }
    }

    if (playerPos) {
      for (const m of this.minions) {
        if (m.mode === 'dead') continue;
        this.updateMinion(m, dt, playerPos);
      }
      if (this.tryCollectFireball(playerPos)) out.stunStarted = true;
    }

    for (const o of this.orbs) {
      if (!o.alive) continue;
      o.mixer?.update(dt);
      o.root.position.y += Math.sin(t * 3 + o.root.id) * 0.01;
      o.root.rotation.y += dt * 1.6;
    }

    return out;
  }

  private updateMinion(m: LavaMinion, dt: number, playerPos: THREE.Vector3): void {
    m.attackCd = Math.max(0, m.attackCd - dt);
    const to = this.tmp.copy(playerPos).sub(m.root.position);
    to.y = 0;
    const dist = to.length();
    if (dist > 0.05) {
      m.root.rotation.y = Math.atan2(to.x, to.z);
    }
    if (dist > this.kit.minionAttackRangeM) {
      if (m.mode !== 'chase') {
        m.mode = 'chase';
        m.window = this.kit.minionClip.walk;
        m.action.time = m.window[0];
      }
      to.normalize();
      m.root.position.addScaledVector(to, this.kit.minionSpeedMps * dt);
      const ground = this.sampleHeight?.(m.root.position.x, m.root.position.z);
      if (ground != null) m.root.position.y = ground + 0.05;
    } else if (m.attackCd <= 0) {
      m.mode = 'attack';
      m.window = this.kit.minionClip.attack;
      m.action.time = m.window[0];
      m.attackCd = this.kit.minionAttackCooldownSec;
      this.host.emitHit(playerPos, 'lava_minion', this.kit.minionDamage, m.root.position);
    }
    this.tickMinionClip(m, dt);
  }

  private tickStun(dt: number): boolean {
    this.stunT += dt;
    const act = this.deadAction;
    if (this.stunPhase === 'collapse') {
      if (act) {
        if (act.time >= this.kit.stunDeadToSec) {
          act.time = this.kit.stunDeadToSec;
          act.paused = true;
          this.stunPhase = 'hands';
          this.stunT = 0;
        }
      } else if (this.stunT >= this.kit.stunDeadToSec) {
        this.stunPhase = 'hands';
        this.stunT = 0;
      }
      return false;
    }
    if (this.stunPhase === 'hands') {
      const lo = this.kit.stunLoopMinSec;
      const hi = this.kit.stunLoopMaxSec;
      const tripDur = Math.max(0.01, hi - lo);
      const trips = this.kit.stunLoopRepeats;
      if (act) {
        act.paused = true;
        const trip = Math.min(trips - 1, Math.floor(this.stunT / tripDur));
        const u = THREE.MathUtils.clamp((this.stunT - trip * tripDur) / tripDur, 0, 1);
        // Even trip: 2.5 → 2.0; odd trip: 2.0 → 2.5
        const down = trip % 2 === 0;
        act.time = THREE.MathUtils.lerp(down ? hi : lo, down ? lo : hi, u);
      }
      // Hands planted on nearest platform — ease boss XZ toward it
      const p = this.platforms[this.pickPlatformToward(this.host.root.position)];
      if (p) {
        const dest = p.root.position;
        this.host.root.position.x = THREE.MathUtils.damp(
          this.host.root.position.x,
          dest.x,
          2.2,
          dt,
        );
        this.host.root.position.z = THREE.MathUtils.damp(
          this.host.root.position.z,
          dest.z,
          2.2,
          dt,
        );
      }
      if (this.stunT >= trips * tripDur) {
        this.stunPhase = 'rewind';
        this.stunT = 0;
        if (act) {
          act.paused = false;
          act.timeScale = -1;
          act.time = act.time || lo;
        }
      }
      return false;
    }
    if (this.stunPhase === 'rewind') {
      if (act && act.time <= 0.04) {
        act.time = 0;
        act.paused = true;
        this.stunPhase = 'none';
        this.playBoss('idle', { loop: true, fade: 0.2 });
        this.host.onPrompt?.(null);
        return true;
      }
      if (!act && this.stunT >= this.kit.stunRewindSec) {
        this.stunPhase = 'none';
        this.playBoss('idle', { loop: true, fade: 0.2 });
        return true;
      }
    }
    return false;
  }

  setBossY(surfaceY: number, submerged: boolean, t01: number): void {
    const h = this.kit.bossHeightM;
    const under = this.lavaY - h * 0.85;
    if (submerged) {
      this.host.root.position.y = THREE.MathUtils.lerp(surfaceY, under, t01);
    } else {
      this.host.root.position.y = THREE.MathUtils.lerp(under, surfaceY, t01);
    }
  }

  surfaceY(): number {
    return this.lavaY + 0.15;
  }

  dispose(): void {
    this.disposed = true;
    this.mixer?.stopAllAction();
    for (const p of this.platforms) this.scene.remove(p.root);
    for (const m of this.minions) this.scene.remove(m.root);
    for (const o of this.orbs) this.scene.remove(o.root);
    for (const tw of this.twisters) this.scene.remove(tw.root);
    for (const fx of this.riseFx) this.scene.remove(fx.root);
    this.platforms.length = 0;
    this.minions.length = 0;
    this.orbs.length = 0;
    this.twisters.length = 0;
    this.riseFx.length = 0;
  }
}
