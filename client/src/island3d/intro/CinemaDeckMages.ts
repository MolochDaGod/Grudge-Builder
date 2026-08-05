/**
 * CinemaDeckMages — deck caster SPECS + optional helper class.
 *
 * SSOT ownership (do not invent a second deck system):
 *  - **Runtime tick / plant / pathfind** live in `LeviathanOceanCinema`
 *    (`tickMageCycles`, `plantDeckMages`, mageDirectors[]).
 *  - **This file owns** `DECK_MAGE_SPECS`, phase types, and `castHintsForVariant`.
 *  - `CinemaDeckMages` class is an optional bind/tick helper for previews/tests —
 *    production intro does NOT instantiate it (avoids dual mixer ownership).
 *
 * HARD: never mesh.scale; root SI only at spawn. Mixer update BEFORE spine IK.
 */
import * as THREE from 'three';
import { CinemaAnimDirector } from './CinemaAnimDirector';
import { faceYawToward } from './cinemaGrudge6';
import { animHintsFor, type CinAnimHint } from './LeviathanBattleScript';

export type DeckMagePhase = 'idle' | 'walk' | 'cast' | 'ragdoll';

export type DeckMageSpec = {
  /** Delay before first cast cycle (s) */
  castOffset: number;
  /** Full cycle length idle+walk+cast (s) — individuality */
  period: number;
  /** Seconds spent casting each cycle */
  castDur: number;
  /** Seconds of idle after cast */
  idleDur: number;
  /** Seconds of walk before cast */
  walkDur: number;
  /** Side-step amplitude along ship-local X (port/starboard, m) */
  walkAmp: number;
  /** Forward/aft amplitude along ship-local Z (m) — deck pathfinding pace */
  walkAmpZ: number;
  /** Clip timeScale */
  timeScale: number;
  /** Prefer which 2H attack index (0..2) */
  castVariant: 0 | 1 | 2;
  /** Idle timeScale (breathing pace) */
  idleScale: number;
};

/** Four personalities — never all in sync; XZ walk for deck pathfinding */
export const DECK_MAGE_SPECS: DeckMageSpec[] = [
  {
    castOffset: 0.0,
    period: 4.2,
    castDur: 1.85,
    idleDur: 1.1,
    walkDur: 0.72,
    walkAmp: 0.55,
    walkAmpZ: 0.85,
    timeScale: 1.0,
    castVariant: 0,
    idleScale: 0.95,
  },
  {
    castOffset: 0.72,
    period: 4.8,
    castDur: 1.55,
    idleDur: 1.4,
    walkDur: 0.85,
    walkAmp: -0.65,
    walkAmpZ: -0.7,
    timeScale: 0.92,
    castVariant: 1,
    idleScale: 1.05,
  },
  {
    castOffset: 1.35,
    period: 5.1,
    castDur: 2.05,
    idleDur: 0.9,
    walkDur: 0.65,
    walkAmp: 0.4,
    walkAmpZ: 1.1,
    timeScale: 1.08,
    castVariant: 2,
    idleScale: 0.88,
  },
  {
    castOffset: 0.4,
    period: 3.9,
    castDur: 1.4,
    idleDur: 1.25,
    walkDur: 0.78,
    walkAmp: -0.48,
    walkAmpZ: -0.95,
    timeScale: 0.98,
    castVariant: 0,
    idleScale: 1.12,
  },
];

export type DeckMageRuntime = {
  index: number;
  root: THREE.Group;
  mesh: THREE.Object3D;
  director: CinemaAnimDirector | null;
  spec: DeckMageSpec;
  phase: DeckMagePhase;
  /** Local clock for phase (s) */
  phaseT: number;
  /** Cycle clock after offset (s) */
  cycleT: number;
  baseX: number;
  baseZ: number;
  deckY: number;
  /** Last requested anim hint from beat (for non-combat) */
  beatAnim: CinAnimHint | null;
  castingMode: boolean;
  ragdoll: null | {
    vel: THREE.Vector3;
    ang: THREE.Vector3;
    life: number;
  };
};

/** Shared cast clip fuzzy list — used by LOC.tickMageCycles + optional class. */
export function castHintsForVariant(v: 0 | 1 | 2): string[] {
  if (v === 0) {
    return ['2h_magic_attack_1', '2h_magic_attack', 'cast', '2h_cast', 'attack', 'combat'];
  }
  if (v === 1) {
    return ['2h_magic_attack_2', '2h_magic_attack', 'cast2', 'attack', 'combat'];
  }
  return ['2h_magic_attack_3', '2h_magic_attack_fallback', '1h_magic_attack', 'cast3', 'attack'];
}

export class CinemaDeckMages {
  readonly actors: DeckMageRuntime[] = [];
  private castingActive = false;
  private pinata = false;
  private sharedClipsLoaded = false;

  /**
   * Register four mages after spawn. Directors use mesh as mixer root.
   */
  bind(
    packs: Array<{ root: THREE.Group; mesh: THREE.Object3D; clips: THREE.AnimationClip[] } | null>,
    deckY: number,
  ): void {
    this.actors.length = 0;
    for (let i = 0; i < 4; i++) {
      const pack = packs[i];
      const root = pack?.root ?? new THREE.Group();
      const mesh = pack?.mesh ?? root;
      const clips = pack?.clips ?? [];
      const director = clips.length ? new CinemaAnimDirector(mesh, clips) : null;
      const spec = DECK_MAGE_SPECS[i] ?? DECK_MAGE_SPECS[0];
      // Seed phase so they don't all start on idle frame 0
      if (director) {
        director.play(['idle', 'stand', 'fight_idle'], {
          fade: 0.15,
          loop: THREE.LoopRepeat,
          timeScale: spec.idleScale,
          restart: true,
        });
        director.seekTime(i * 0.41 + spec.castOffset * 0.15);
      }
      this.actors.push({
        index: i,
        root,
        mesh,
        director,
        spec,
        phase: 'idle',
        phaseT: 0,
        cycleT: -spec.castOffset, // negative = wait offset before cycle
        baseX: root.position.x,
        baseZ: root.position.z,
        deckY,
        beatAnim: 'idle',
        castingMode: false,
        ragdoll: null,
      });
    }
  }

  /** Inject Bip001 + 2H packs into every director; stagger first play. */
  injectClips(clips: THREE.AnimationClip[]): void {
    if (!clips.length) return;
    this.sharedClipsLoaded = true;
    for (const m of this.actors) {
      if (!m.director) continue;
      m.director.addClips(clips);
      // Start idle; cast will kick in when castingMode true
      m.director.play(['idle', 'stand', 'fight_idle'], {
        fade: 0.2,
        loop: THREE.LoopRepeat,
        timeScale: m.spec.idleScale,
        restart: true,
      });
      // Individual time offset so idles don't clone-sync
      m.director.seekTime(m.index * 0.37 + m.spec.castOffset * 0.2);
    }
    console.info(
      `[cinema mages] shared clips ×${clips.length} on ${this.actors.length} directors · staggered idle`,
    );
  }

  setDeckY(y: number): void {
    for (const m of this.actors) m.deckY = y;
  }

  /** Update slot anchors only — do not snap position (walk offset uses base). */
  setBaseSlot(i: number, x: number, z: number, y: number): void {
    const m = this.actors[i];
    if (!m) return;
    m.baseX = x;
    m.baseZ = z;
    m.deckY = y;
  }

  /**
   * Beat-driven mode: when casting (wards/rings), run individual cycles.
   * When not, soft idle + optional beat anim.
   */
  setBeatMode(opts: {
    casting: boolean;
    anims: Array<CinAnimHint | undefined>;
  }): void {
    this.castingActive = opts.casting;
    for (let i = 0; i < this.actors.length; i++) {
      const m = this.actors[i];
      if (!m || m.phase === 'ragdoll') continue;
      m.castingMode = opts.casting;
      m.beatAnim = opts.anims[i] ?? 'idle';
      if (!opts.casting && m.phase !== 'ragdoll') {
        // Soft return to idle — don't hard-restart every beat
        if (m.phase !== 'idle') {
          m.phase = 'idle';
          m.phaseT = 0;
          m.director?.play(animHintsFor(m.beatAnim ?? 'idle'), {
            fade: 0.35,
            loop: THREE.LoopRepeat,
            timeScale: m.spec.idleScale,
          });
        }
      }
    }
  }

  /** Pinata: soft ragdoll each visible mage into world space. */
  explode(scene: THREE.Scene, shipGroup: THREE.Object3D, origin: THREE.Vector3): void {
    this.pinata = true;
    this.castingActive = false;
    for (const m of this.actors) {
      if (!m.root.visible && m.phase === 'ragdoll') continue;
      // Detach to world
      if (m.root.parent === shipGroup) {
        scene.attach(m.root);
      } else if (m.root.parent !== scene) {
        scene.add(m.root);
      }
      m.root.visible = true;
      m.director?.dispose();
      m.director = null;
      m.phase = 'ragdoll';
      m.phaseT = 0;
      const away = m.root.position.clone().sub(origin);
      away.y = 0.4;
      if (away.lengthSq() < 1e-4) {
        away.set((Math.random() - 0.5) * 2, 0.8, (Math.random() - 0.5) * 2);
      }
      away.normalize();
      m.ragdoll = {
        vel: away.multiplyScalar(6 + Math.random() * 10 + m.index * 0.8),
        ang: new THREE.Vector3(
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 10,
        ),
        life: 2.8 + Math.random() * 1.4 + m.index * 0.15,
      };
      // Kick upward individuality
      m.ragdoll.vel.y += 4 + m.index * 0.6 + Math.random() * 3;
    }
  }

  /**
   * Per-frame: phase machines, walk offsets, face levi, mixer update.
   * Call BEFORE spineIk.updateAll.
   */
  update(
    dt: number,
    opts: {
      leviWorld: THREE.Vector3;
      shipGroup: THREE.Object3D;
      pinataFired: boolean;
    },
  ): void {
    if (opts.pinataFired && !this.pinata) {
      // safety if explode wasn't called
      this.pinata = true;
    }

    for (const m of this.actors) {
      if (m.phase === 'ragdoll' && m.ragdoll) {
        this.tickRagdoll(m, dt);
        continue;
      }
      if (!m.root.visible) continue;

      // Face leviathan (ship-local yaw)
      const leviLocal = opts.shipGroup.worldToLocal(opts.leviWorld.clone());
      faceYawToward(m.root, leviLocal);

      if (m.castingMode && !this.pinata) {
        this.tickCastCycle(m, dt);
      } else if (!this.pinata) {
        // Hold slot + idle
        m.root.position.x = m.baseX;
        m.root.position.z = m.baseZ;
        m.root.position.y = m.deckY;
        m.director?.update(dt);
      }
    }
  }

  /** Mixers only — if update already ran mixers, skip. Public for external loop. */
  updateMixers(dt: number): void {
    for (const m of this.actors) {
      if (m.phase === 'ragdoll') continue;
      m.director?.update(dt);
    }
  }

  private tickCastCycle(m: DeckMageRuntime, dt: number): void {
    m.cycleT += dt;
    if (m.cycleT < 0) {
      // Still in castOffset wait — idle
      this.ensurePhase(m, 'idle', ['idle', 'stand', 'fight_idle'], m.spec.idleScale);
      m.root.position.set(m.baseX, m.deckY, m.baseZ);
      m.director?.update(dt);
      return;
    }

    const t = m.cycleT % m.spec.period;
    const walkEnd = m.spec.walkDur;
    const castEnd = walkEnd + m.spec.castDur;
    // rest of period = idle

    if (t < walkEnd) {
      this.ensurePhase(m, 'walk', ['walk', 'walk2', 'run', 'idle'], m.spec.timeScale);
      const u = walkEnd > 1e-4 ? t / walkEnd : 1;
      // Arc pace on deck: port/starboard + forward/aft (pathfinding XZ)
      const ease = Math.sin(u * Math.PI);
      const stepX = ease * m.spec.walkAmp;
      const stepZ = ease * m.spec.walkAmpZ;
      m.root.position.set(m.baseX + stepX, m.deckY, m.baseZ + stepZ);
    } else if (t < castEnd) {
      this.ensurePhase(
        m,
        'cast',
        castHintsForVariant(m.spec.castVariant),
        m.spec.timeScale,
      );
      m.root.position.set(m.baseX, m.deckY, m.baseZ);
    } else {
      this.ensurePhase(m, 'idle', ['idle', 'stand', 'fight_idle', 'defend'], m.spec.idleScale);
      m.root.position.set(m.baseX, m.deckY, m.baseZ);
    }
    m.director?.update(dt);
  }

  private ensurePhase(
    m: DeckMageRuntime,
    phase: DeckMagePhase,
    hints: string[],
    timeScale: number,
  ): void {
    if (m.phase === phase && m.director?.getCurrentName()) {
      // Keep playing — optional re-timeScale
      m.director.setTimeScale(timeScale);
      return;
    }
    m.phase = phase;
    m.phaseT = 0;
    if (!m.director) return;
    m.director.play(hints, {
      fade: phase === 'cast' ? 0.22 : 0.32,
      loop: THREE.LoopRepeat,
      timeScale,
      restart: true,
    });
    if (phase === 'idle') m.director.seekTime(m.index * 0.41);
    if (phase === 'cast') m.director.seekTime(m.spec.castOffset * 0.15);
  }

  private tickRagdoll(m: DeckMageRuntime, dt: number): void {
    const r = m.ragdoll;
    if (!r) return;
    r.life -= dt;
    r.vel.y -= 12 * dt; // gravity
    m.root.position.addScaledVector(r.vel, dt);
    m.root.rotation.x += r.ang.x * dt;
    m.root.rotation.y += r.ang.y * dt;
    m.root.rotation.z += r.ang.z * dt;
    // Air drag
    r.vel.multiplyScalar(Math.exp(-dt * 0.8));
    r.ang.multiplyScalar(Math.exp(-dt * 1.2));
    if (r.life <= 0 || m.root.position.y < -2) {
      m.root.visible = false;
      m.ragdoll = null;
    }
  }

  dispose(): void {
    for (const m of this.actors) {
      m.director?.dispose();
    }
    this.actors.length = 0;
  }

  get directors(): CinemaAnimDirector[] {
    return this.actors.map((a) => a.director).filter(Boolean) as CinemaAnimDirector[];
  }

  get roots(): THREE.Group[] {
    return this.actors.map((a) => a.root);
  }

  get meshes(): THREE.Object3D[] {
    return this.actors.map((a) => a.mesh);
  }
}
