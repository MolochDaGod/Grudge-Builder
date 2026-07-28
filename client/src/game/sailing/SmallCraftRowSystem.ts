/**
 * Small-craft oar progression — teach rowing without the main warship.
 *
 * Tiers (lesson order):
 *   1. raft        — oars only, wide drag, slow
 *   2. dinghy      — dual oar stroke (barca)
 *   3. fishingBoat — oars + optional small sail (T raise / R oars down)
 *
 * Controls (while boarded):
 *   R / O       — OAR mode (sails down) — precision near islands/docks
 *   T           — SAIL mode on fishingBoat (wind assist)
 *   W/S or ↑/↓  — oar stroke (OAR) or sheet (SAIL)
 *   A/D or ←/→  — yaw / sweep
 *   Space       — rest stroke (OAR)
 *   F           — cast line (fishingBoat only, near island fish spots)
 *   E           — board / disembark when near craft
 *
 * Animation: procedural oar bones + optional character clips (row, fishing_*).
 * SSOT drive modes: OpenWaterDriveMode (no conflicting sail+oar thrust).
 */
import * as THREE from "three";
import {
  OpenWaterDriveController,
  sailWindThrust,
  type CraftDriveClass,
} from "./OpenWaterDriveMode";
import type { WeatherConfig } from "./types";
import { DEFAULT_WEATHER } from "./types";
import { applySailMaterialsToShip } from "./SailMaterialSystem";

export type CraftTier = "raft" | "dinghy" | "fishingBoat";

export interface CraftTierConfig {
  label: string;
  speed: number;
  turn: number;
  oarPeriod: number;
  drag: number;
  lengthM: number;
  widthM: number;
  lesson: string;
}

export const CRAFT_TIERS: Record<CraftTier, CraftTierConfig> = {
  raft: {
    label: "Raft",
    speed: 2.8,
    turn: 1.1,
    oarPeriod: 1.35,
    drag: 0.92,
    lengthM: 2.8,
    widthM: 1.8,
    lesson: "Raft: push the oar with W — long strokes, feel the drag. A/D turn.",
  },
  dinghy: {
    label: "Dinghy (barca)",
    speed: 4.2,
    turn: 1.6,
    oarPeriod: 1.05,
    drag: 0.88,
    lengthM: 3.6,
    widthM: 1.4,
    lesson: "Dinghy: even dual-oar rhythm. Feather at the end of each stroke (Space to rest).",
  },
  fishingBoat: {
    label: "Fishing boat",
    speed: 3.6,
    turn: 1.25,
    oarPeriod: 1.15,
    drag: 0.9,
    lengthM: 4.5,
    widthM: 1.6,
    lesson: "Fishing boat: row to island shallows, then F to cast — no main ship needed.",
  },
};

export type RowLessonStep = "raft" | "dinghy" | "fishingBoat" | "complete";

export interface SmallCraftOpts {
  scene: THREE.Scene;
  waterLevel: number;
  /** Optional existing boat mesh (barca from islands). */
  hull?: THREE.Object3D | null;
  tier?: CraftTier;
  /**
   * When true (default), completing a tier upgrades this craft in-place
   * (raft → dinghy → fishingBoat). Set false when multiple fixed crafts
   * exist on the scene (cinema lesson chain).
   */
  autoAdvanceLesson?: boolean;
  onPrompt?: (msg: string | null) => void;
  onLesson?: (step: RowLessonStep, detail: string) => void;
  onFishCatch?: (fishId: string) => void;
}

export class SmallCraftRowSystem {
  readonly root = new THREE.Group();
  private scene: THREE.Scene;
  private waterLevel: number;
  private tier: CraftTier;
  private cfg: CraftTierConfig;
  private onPrompt?: (msg: string | null) => void;
  private onLesson?: (step: RowLessonStep, detail: string) => void;
  private onFishCatch?: (fishId: string) => void;
  private autoAdvanceLesson: boolean;

  private boarded = false;
  private yaw = 0;
  private vel = new THREE.Vector3();
  private oarPhase = 0;
  private strokePower = 0;
  private oarL: THREE.Group;
  private oarR: THREE.Group;
  private keys = new Set<string>();
  private fishCooldown = 0;
  private lessonProgress: Record<CraftTier, number> = {
    raft: 0,
    dinghy: 0,
    fishingBoat: 0,
  };
  private lessonAnnounced: Partial<Record<CraftTier | "complete", boolean>> = {};
  private fishSpots: THREE.Vector3[] = [];
  private drive: OpenWaterDriveController;
  private weather: WeatherConfig = { ...DEFAULT_WEATHER };
  private sailVis: THREE.Mesh | null = null;

  private _kd: ((e: KeyboardEvent) => void) | null = null;
  private _ku: ((e: KeyboardEvent) => void) | null = null;

  constructor(opts: SmallCraftOpts) {
    this.scene = opts.scene;
    this.waterLevel = opts.waterLevel;
    this.tier = opts.tier ?? "dinghy";
    this.cfg = CRAFT_TIERS[this.tier];
    this.onPrompt = opts.onPrompt;
    this.onLesson = opts.onLesson;
    this.onFishCatch = opts.onFishCatch;
    this.autoAdvanceLesson = opts.autoAdvanceLesson !== false;
    this.drive = new OpenWaterDriveController(
      this.tier as CraftDriveClass,
      (s) => this.onPrompt?.(s.prompt),
    );

    this.root.name = `SmallCraft_${this.tier}`;
    this.root.userData.smallCraft = true;
    this.root.userData.craftTier = this.tier;

    if (opts.hull) {
      // Reparent external barca (takeable dinghy from islands GLB)
      const h = opts.hull;
      h.updateMatrixWorld(true);
      const p = new THREE.Vector3();
      const q = new THREE.Quaternion();
      const s = new THREE.Vector3();
      h.matrixWorld.decompose(p, q, s);
      h.parent?.remove(h);
      this.root.position.copy(p);
      this.root.quaternion.copy(q);
      // Normalize scale into root
      this.root.scale.set(1, 1, 1);
      h.position.set(0, 0, 0);
      h.quaternion.identity();
      h.scale.copy(s);
      h.userData.takeableBoat = true;
      h.userData.craftTier = this.tier;
      this.root.add(h);
    } else {
      this.root.add(this.buildProceduralHull(this.tier));
      this.root.position.set(6, this.waterLevel + 0.15, 12);
    }

    this.oarL = this.buildOar(-1);
    this.oarR = this.buildOar(1);
    this.root.add(this.oarL, this.oarR);
    if (this.tier === "fishingBoat") {
      this.attachSmallSail();
    }
    applySailMaterialsToShip(this.root);
    this.scene.add(this.root);

    this._kd = (e) => this.keys.add(e.key.toLowerCase());
    this._ku = (e) => this.keys.delete(e.key.toLowerCase());
    window.addEventListener("keydown", this._kd);
    window.addEventListener("keyup", this._ku);

    this.onPrompt?.(
      `E board ${this.cfg.label} · ${this.cfg.lesson}`,
    );
    this.onLesson?.(this.tier, this.cfg.lesson);
  }

  /** Weather for wind assist when sails up (fishing boat). */
  setWeather(w: WeatherConfig): void {
    this.weather = w;
  }

  getDriveMode() {
    return this.drive.getState();
  }

  private attachSmallSail(): void {
    if (this.sailVis) return;
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.05, 2.4, 6),
      new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 }),
    );
    mast.position.set(0, 1.4, -0.2);
    mast.name = "fishing_mast";
    const sail = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 1.8, 4, 4),
      new THREE.MeshStandardMaterial({
        color: 0xe6dcc0,
        roughness: 0.92,
        metalness: 0.02,
        side: THREE.DoubleSide,
      }),
    );
    sail.position.set(0, 1.6, 0.1);
    sail.name = "mainsail";
    sail.userData.sailCanvas = true;
    this.root.add(mast, sail);
    this.sailVis = sail;
  }

  private syncSailVisual(): void {
    if (!this.sailVis) return;
    const d = this.drive.getState();
    // Reef: scale Y down when oar mode / deploy 0
    const deploy = d.sailDeploy;
    this.sailVis.scale.set(1, 0.15 + deploy * 0.85, 1);
    this.sailVis.visible = deploy > 0.08;
    // Slight wind billow
    this.sailVis.rotation.y = Math.sin(performance.now() * 0.002) * 0.08 * deploy;
  }

  setFishSpots(spots: THREE.Vector3[]) {
    this.fishSpots = spots;
  }

  setTier(tier: CraftTier, opts?: { rebuildHull?: boolean }) {
    const prev = this.tier;
    this.tier = tier;
    this.cfg = CRAFT_TIERS[tier];
    this.drive.setCraft(tier as CraftDriveClass);
    this.root.userData.craftTier = tier;
    this.root.name = `SmallCraft_${tier}`;
    if (tier === "fishingBoat") this.attachSmallSail();
    // When lesson advances on a procedural craft, swap hull silhouette
    if (opts?.rebuildHull !== false && prev !== tier) {
      const keep: THREE.Object3D[] = [this.oarL, this.oarR];
      const children = [...this.root.children];
      for (const c of children) {
        if (keep.includes(c)) continue;
        // Preserve external GLB barca (dinghy) — only rebuild procedural
        if (c.userData?.takeableBoat || c.name === "TakeableBarca" || /^barca/i.test(c.name)) {
          continue;
        }
        this.root.remove(c);
        c.traverse((o) => {
          if (o instanceof THREE.Mesh) {
            o.geometry?.dispose();
            const m = o.material;
            if (Array.isArray(m)) m.forEach((x) => x.dispose());
            else (m as THREE.Material)?.dispose?.();
          }
        });
      }
      const hasBarca = this.root.children.some(
        (c) =>
          c.userData?.takeableBoat ||
          c.name === "TakeableBarca" ||
          /^barca/i.test(c.name),
      );
      if (!hasBarca) {
        this.root.add(this.buildProceduralHull(tier));
      }
    }
    this.onLesson?.(tier, this.cfg.lesson);
    this.onPrompt?.(
      this.boarded
        ? this.cfg.lesson
        : `E board ${this.cfg.label} · ${this.cfg.lesson}`,
    );
  }

  get isBoarded() {
    return this.boarded;
  }

  get position() {
    return this.root.position;
  }

  /** Distance check for E board/disembark. */
  tryToggleBoard(playerPos: THREE.Vector3, range = 4.5): boolean {
    const d = playerPos.distanceTo(this.root.position);
    if (d > range && !this.boarded) return false;
    this.boarded = !this.boarded;
    if (this.boarded) {
      this.drive.bindInput();
      this.onPrompt?.(
        `${this.cfg.lesson} · ${this.drive.getState().prompt} · E leave`,
      );
      this.lessonProgress[this.tier] = Math.max(this.lessonProgress[this.tier], 0.1);
    } else {
      this.drive.unbindInput();
      this.strokePower = 0;
      this.onPrompt?.(`E board ${this.cfg.label}`);
    }
    return true;
  }

  forceBoard(on: boolean) {
    this.boarded = on;
    if (on) {
      this.drive.bindInput();
      this.onPrompt?.(this.drive.getState().prompt + " · E leave");
    } else {
      this.drive.unbindInput();
    }
  }

  update(dt: number, playerWorld?: THREE.Vector3 | null): {
    boarded: boolean;
    craftPos: THREE.Vector3;
    yaw: number;
  } {
    // Bob on water (wave-linked amplitude from weather)
    const t = performance.now() * 0.001;
    const waveAmp = 0.05 + this.weather.waveHeight * 0.035;
    const baseY =
      this.waterLevel +
      0.12 +
      Math.sin(t * 1.2 + this.root.position.x) * waveAmp;
    this.drive.updateSailTrim(dt);
    this.syncSailVisual();

    if (!this.boarded) {
      this.root.position.y = baseY;
      this.animateOars(dt, 0);
      return { boarded: false, craftPos: this.root.position.clone(), yaw: this.yaw };
    }

    const drive = this.drive.getState();
    const fwd =
      (this.keys.has("w") || this.keys.has("arrowup") ? 1 : 0) -
      (this.keys.has("s") || this.keys.has("arrowdown") ? 1 : 0);
    const turn =
      (this.keys.has("d") || this.keys.has("arrowright") ? 1 : 0) -
      (this.keys.has("a") || this.keys.has("arrowleft") ? 1 : 0);

    let targetSpeed = 0;
    if (drive.mode === "oar") {
      // ── OAR ONLY (sails down) — precision ─────────────────────
      if (this.keys.has(" ")) {
        this.strokePower *= 0.9;
      } else if (fwd !== 0) {
        this.oarPhase += (dt * (Math.PI * 2)) / this.cfg.oarPeriod;
        const push = Math.max(0, Math.sin(this.oarPhase));
        this.strokePower = THREE.MathUtils.lerp(
          this.strokePower,
          push,
          1 - Math.exp(-6 * dt),
        );
        this.lessonProgress[this.tier] = Math.min(
          1,
          this.lessonProgress[this.tier] + dt * 0.04 * Math.abs(fwd),
        );
      } else {
        this.strokePower *= this.cfg.drag;
      }
      targetSpeed = fwd * this.cfg.speed * this.strokePower;
      this.animateOars(dt, fwd !== 0 ? this.strokePower : 0);
    } else {
      // ── SAIL (fishing boat+) — no oar thrust; wind only ────────
      this.strokePower *= 0.85;
      this.animateOars(dt, 0);
      const windAng = this.weather.windDirection - this.yaw;
      const thrust = sailWindThrust(
        this.weather.windStrength,
        drive.sailDeploy,
        windAng,
        this.cfg.speed * 1.35,
      );
      // W sheets increase; S reduces (already in sailDeploy)
      targetSpeed = thrust * (0.4 + drive.sailDeploy * 0.6);
      this.lessonProgress[this.tier] = Math.min(
        1,
        this.lessonProgress[this.tier] + dt * 0.02 * drive.sailDeploy,
      );
    }

    this.yaw += turn * this.cfg.turn * dt * (drive.mode === "oar" ? 1 : 0.75);
    const dir = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    this.vel.lerp(dir.multiplyScalar(targetSpeed), 1 - Math.exp(-3 * dt));
    this.vel.multiplyScalar(this.cfg.drag);
    this.root.position.x += this.vel.x * dt;
    this.root.position.z += this.vel.z * dt;
    this.root.position.y = baseY;
    this.root.rotation.y = this.yaw;
    this.root.rotation.z =
      Math.sin(this.oarPhase) * 0.04 * (drive.mode === "oar" ? 1 : 0.3);

    // Fishing boat cast
    this.fishCooldown = Math.max(0, this.fishCooldown - dt);
    if (
      this.tier === "fishingBoat" &&
      this.fishCooldown <= 0 &&
      (this.keys.has("f") || this.keys.has("F"))
    ) {
      this.tryFish();
    }

    // Auto-advance lesson when progress complete
    this.maybeAdvanceLesson();

    if (playerWorld && this.boarded) {
      // Keep player visual glued if provided externally
      playerWorld.copy(this.root.position);
      playerWorld.y += 0.9;
    }

    return {
      boarded: true,
      craftPos: this.root.position.clone(),
      yaw: this.yaw,
    };
  }

  private tryFish() {
    // Must be near a fish spot (island shallows) — no main ship
    let near = this.fishSpots.length === 0;
    for (const s of this.fishSpots) {
      if (this.root.position.distanceTo(s) < 22) {
        near = true;
        break;
      }
    }
    if (!near) {
      this.onPrompt?.("Row closer to island shallows to cast (F)");
      return;
    }
    this.fishCooldown = 3.2;
    this.lessonProgress.fishingBoat = Math.min(1, this.lessonProgress.fishingBoat + 0.25);
    const catchId = ["mackerel", "snapper", "grouper", "tuna_small"][
      Math.floor(Math.random() * 4)
    ]!;
    this.onPrompt?.(`Catch! ${catchId} · keep rowing between islands`);
    this.onFishCatch?.(catchId);
    this.maybeAdvanceLesson();
  }

  /** Public progress 0–1 for current tier (cinema HUD / multi-craft). */
  getLessonProgress(tier?: CraftTier): number {
    return this.lessonProgress[tier ?? this.tier] ?? 0;
  }

  private maybeAdvanceLesson() {
    const order: CraftTier[] = ["raft", "dinghy", "fishingBoat"];
    const idx = order.indexOf(this.tier);
    if (this.lessonProgress[this.tier] < 0.85) return;

    if (!this.autoAdvanceLesson) {
      // Fixed multi-craft scene: signal mastery of this hull only (once)
      if (this.tier === "fishingBoat") {
        if (this.lessonAnnounced.complete) return;
        this.lessonAnnounced.complete = true;
        this.onLesson?.(
          "complete",
          "You can row raft, dinghy, and fishing boat — fish islands without the main ship.",
        );
      } else {
        if (this.lessonAnnounced[this.tier]) return;
        this.lessonAnnounced[this.tier] = true;
        const next = order[idx + 1]!;
        this.onLesson?.(
          next,
          `Mastered ${this.cfg.label}. Board the ${CRAFT_TIERS[next].label} next (E).`,
        );
      }
      return;
    }

    if (idx >= 0 && idx < order.length - 1) {
      const next = order[idx + 1]!;
      if (this.lessonProgress[next] < 0.05) {
        this.setTier(next);
        this.onLesson?.(next, `Lesson unlocked: ${CRAFT_TIERS[next].label}`);
      }
    } else if (this.tier === "fishingBoat" && !this.lessonAnnounced.complete) {
      this.lessonAnnounced.complete = true;
      this.onLesson?.(
        "complete",
        "You can row raft, dinghy, and fishing boat — fish islands without the main ship.",
      );
    }
  }

  private animateOars(dt: number, power: number) {
    const swing = Math.sin(this.oarPhase) * (0.55 + power * 0.45);
    this.oarL.rotation.x = -0.4 + swing;
    this.oarR.rotation.x = -0.4 + swing;
    this.oarL.rotation.z = -0.15 + Math.cos(this.oarPhase) * 0.08;
    this.oarR.rotation.z = 0.15 - Math.cos(this.oarPhase) * 0.08;
    void dt;
  }

  private buildOar(side: number): THREE.Group {
    const g = new THREE.Group();
    g.name = side < 0 ? "OarL" : "OarR";
    const wood = new THREE.MeshStandardMaterial({
      color: 0x6b4423,
      roughness: 0.9,
    });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 2.2, 6), wood);
    shaft.rotation.z = Math.PI / 2;
    shaft.position.x = side * 1.1;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.35, 0.45), wood);
    blade.position.set(side * 2.1, 0, 0);
    g.add(shaft, blade);
    g.position.set(0, 0.55, 0.1);
    return g;
  }

  private buildProceduralHull(tier: CraftTier): THREE.Group {
    const g = new THREE.Group();
    const cfg = CRAFT_TIERS[tier];
    const wood = new THREE.MeshStandardMaterial({
      color: tier === "raft" ? 0x8b6914 : tier === "dinghy" ? 0x5c4033 : 0x3d2914,
      roughness: 0.85,
    });
    const hull = new THREE.Mesh(
      new THREE.BoxGeometry(cfg.widthM, 0.45, cfg.lengthM),
      wood,
    );
    hull.position.y = 0.2;
    g.add(hull);
    if (tier !== "raft") {
      const bow = new THREE.Mesh(new THREE.ConeGeometry(cfg.widthM * 0.45, 0.8, 4), wood);
      bow.rotation.x = Math.PI / 2;
      bow.position.set(0, 0.25, cfg.lengthM * 0.45);
      g.add(bow);
    }
    // simple thwarts
    for (let i = -1; i <= 1; i++) {
      const seat = new THREE.Mesh(
        new THREE.BoxGeometry(cfg.widthM * 0.85, 0.08, 0.25),
        wood,
      );
      seat.position.set(0, 0.48, i * cfg.lengthM * 0.22);
      g.add(seat);
    }
    g.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    return g;
  }

  dispose() {
    this.drive.dispose();
    if (this._kd) window.removeEventListener("keydown", this._kd);
    if (this._ku) window.removeEventListener("keyup", this._ku);
    this.scene.remove(this.root);
    this.root.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry?.dispose();
        const m = o.material;
        if (Array.isArray(m)) m.forEach((x) => x.dispose());
        else (m as THREE.Material)?.dispose?.();
      }
    });
  }
}
