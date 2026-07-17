/**
 * ToonSoldierController — Mixamo-retargeted packs + native clips + colliders.
 *
 * Packs: pistol | rifle | shooter | longbow | adventure (loco/climb/swim)
 * Skeleton: chicken_gun `Bone` hierarchy — baked Bip001 JSON is retargeted at load.
 *
 * Consumers: grudge-builder, shooters, gun games, editors, Nexus Era bows.
 */

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  discoverToonBoneRoles,
  parseBakedClipJson,
  retargetClipToToon,
  type RoleMap,
} from "./toonBoneMap";
import {
  CLASS_DEFAULT_MODE,
  colliderForClass,
  packClipUrls,
  resolvePack,
  type ColliderProfile,
  type ToonAnimState,
  type ToonWeaponMode,
  BAKED_ANIM_BASE,
} from "./toonAnimPacks";

export type ToonLocoState =
  | "idle"
  | "walk"
  | "run"
  | "sprint"
  | "swim"
  | "swimIdle"
  | "climb"
  | "crouch"
  | "sneak";

export type ToonOneShot =
  | "attack"
  | "fire"
  | "fire2"
  | "reload"
  | "draw"
  | "dodge"
  | "dodgeBack"
  | "dodgeLeft"
  | "dodgeRight"
  | "roll"
  | "jump"
  | "hit"
  | "death"
  | "ability"
  | "climb"
  | "climbDown"
  | "swimToLedge";

export interface ToonControllerStates {
  idle?: string | null;
  walk?: string | null;
  run?: string | null;
  attack?: string | null;
  ability?: string[];
  hit?: string | null;
  death?: string | null;
  reload?: string | null;
}

export interface ToonSoldierLoadOpts {
  meshUrl: string;
  states?: ToonControllerStates;
  scale?: number;
  /** Class id for default packs + colliders */
  classId?: string;
  /** Initial weapon / adventure mode */
  mode?: ToonWeaponMode;
  animPack?: "rifle" | "pistol" | "longbow" | "shooter" | "adventure";
  /** Baked JSON base (default arena CDN) */
  bakedBase?: string;
  /** Load Mixamo/baked packs and retarget (default true) */
  loadRetargetPacks?: boolean;
  /** Extra modes to preload (e.g. longbow for archer swap) */
  preloadModes?: ToonWeaponMode[];
}

const LOADER = new GLTFLoader();
const clipFetchCache = new Map<string, Promise<THREE.AnimationClip | null>>();

function scoreClip(name: string, role: string): number {
  const n = name.toLowerCase();
  switch (role) {
    case "idle":
      return /idle|stand|pose/.test(n) ? 10 : /action/.test(n) ? 3 : 0;
    case "walk":
      return /walk|strafe/.test(n) ? 10 : 0;
    case "run":
      return /run|sprint/.test(n) ? 10 : 0;
    case "attack":
    case "fire":
      return /fire|shoot|gunplay|attack|firing|recoil/.test(n)
        ? 12
        : /action/.test(n)
          ? 6
          : 0;
    case "hit":
      return /hit|hurt|react/.test(n) ? 10 : 0;
    case "death":
      return /death|die|dying/.test(n) ? 10 : 0;
    case "reload":
      return /reload/.test(n) ? 10 : 0;
    default:
      return 0;
  }
}

function pickClip(
  clips: THREE.AnimationClip[],
  preferred: string | null | undefined,
  role: string,
): THREE.AnimationClip | null {
  if (preferred) {
    const exact = clips.find((c) => c.name === preferred);
    if (exact) return exact;
    const fuzzy = clips.find((c) =>
      c.name.toLowerCase().includes(preferred.toLowerCase()),
    );
    if (fuzzy) return fuzzy;
  }
  let best: THREE.AnimationClip | null = null;
  let bestScore = 0;
  for (const c of clips) {
    const s = scoreClip(c.name, role);
    if (s > bestScore) {
      bestScore = s;
      best = c;
    }
  }
  if (!best && (role === "idle" || role === "attack" || role === "fire") && clips.length) {
    return clips[0];
  }
  return best;
}

async function fetchBakedClip(
  url: string,
  name: string,
): Promise<THREE.AnimationClip | null> {
  const key = `${url}#${name}`;
  if (!clipFetchCache.has(key)) {
    clipFetchCache.set(
      key,
      (async () => {
        try {
          const res = await fetch(url);
          if (!res.ok) return null;
          const data = await res.json();
          return parseBakedClipJson(data, name);
        } catch {
          return null;
        }
      })(),
    );
  }
  return clipFetchCache.get(key)!;
}

export interface ToonColliderHandles {
  profile: ColliderProfile;
  /** Visual debug mesh (optional attach) */
  debugMesh: THREE.Mesh;
  /** Capsule params for Rapier / custom physics */
  capsule: { halfHeight: number; radius: number; center: THREE.Vector3 };
  /** AABB for simple engines */
  box: { halfExtents: THREE.Vector3; center: THREE.Vector3 };
  /** Foot contact ray origin local */
  footOrigin: THREE.Vector3;
}

export class ToonSoldierController {
  readonly root: THREE.Group;
  readonly mixer: THREE.AnimationMixer;
  readonly clips: THREE.AnimationClip[];
  readonly classId: string;
  readonly roleMap: RoleMap;
  readonly collider: ToonColliderHandles;

  private actions = new Map<string, THREE.AnimationAction>();
  private roleActions = new Map<string, THREE.AnimationAction>();
  private loco: ToonLocoState = "idle";
  private mode: ToonWeaponMode;
  private oneShot: THREE.AnimationAction | null = null;
  private busy = false;
  private states: ToonControllerStates;
  private bakedBase: string;
  private locomotionWeight = 1;
  private aiming = false;

  private constructor(
    root: THREE.Group,
    clips: THREE.AnimationClip[],
    opts: ToonSoldierLoadOpts,
    roleMap: RoleMap,
  ) {
    this.root = root;
    this.clips = clips;
    this.classId = opts.classId ?? "infantry";
    this.roleMap = roleMap;
    this.states = opts.states ?? {};
    this.bakedBase = opts.bakedBase ?? BAKED_ANIM_BASE;
    this.mode =
      opts.mode ??
      opts.animPack ??
      CLASS_DEFAULT_MODE[this.classId] ??
      "rifle";
    this.mixer = new THREE.AnimationMixer(root);
    this.collider = this.buildCollider();

    for (const c of clips) {
      this.actions.set(c.name, this.mixer.clipAction(c));
    }

    // Native fallbacks
    const idle = pickClip(clips, this.states.idle, "idle");
    const walk = pickClip(clips, this.states.walk, "walk");
    const run = pickClip(clips, this.states.run, "run");
    const attack = pickClip(clips, this.states.attack, "attack");
    if (idle) this.bindRole("idle", idle);
    if (walk) this.bindRole("walk", walk);
    if (run) this.bindRole("run", run);
    if (attack) {
      this.bindRole("attack", attack);
      this.bindRole("fire", attack);
    }

    const start = this.roleActions.get("idle") ?? (clips[0] ? this.mixer.clipAction(clips[0]) : null);
    if (start) start.reset().setLoop(THREE.LoopRepeat, Infinity).play();

    this.mixer.addEventListener("finished", (e) => {
      const finished = (e as { action?: THREE.AnimationAction }).action;
      if (!this.busy || !finished || finished !== this.oneShot) return;
      this.busy = false;
      this.oneShot?.fadeOut(0.15);
      this.oneShot = null;
      this.resumeLoco(0.18);
    });
  }

  private buildCollider(): ToonColliderHandles {
    const profile = colliderForClass(this.classId);
    // Scale profile to measured height when possible
    const box = new THREE.Box3().setFromObject(this.root);
    const size = new THREE.Vector3();
    box.getSize(size);
    const height = size.y > 0.2 ? size.y : profile.centerY * 2;
    const scale = height / (profile.centerY * 2 || 1.7);
    const halfHeight = profile.halfHeight * scale;
    const radius = profile.radius * scale;
    const centerY = profile.centerY * scale;

    const geo = new THREE.CapsuleGeometry(radius, halfHeight * 2, 4, 8);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    const debugMesh = new THREE.Mesh(geo, mat);
    debugMesh.name = "ToonColliderDebug";
    debugMesh.position.y = centerY;
    debugMesh.visible = false;
    this.root.add(debugMesh);

    return {
      profile: {
        ...profile,
        halfHeight,
        radius,
        centerY,
        boxHalfExtents: [
          profile.boxHalfExtents[0] * scale,
          height / 2,
          profile.boxHalfExtents[2] * scale,
        ],
      },
      debugMesh,
      capsule: {
        halfHeight,
        radius,
        center: new THREE.Vector3(0, centerY, 0),
      },
      box: {
        halfExtents: new THREE.Vector3(
          profile.boxHalfExtents[0] * scale,
          height / 2,
          profile.boxHalfExtents[2] * scale,
        ),
        center: new THREE.Vector3(0, height / 2, 0),
      },
      footOrigin: new THREE.Vector3(0, 0.05, 0),
    };
  }

  private bindRole(role: string, clip: THREE.AnimationClip) {
    const a = this.mixer.clipAction(clip);
    this.roleActions.set(role, a);
    this.actions.set(clip.name, a);
  }

  private resumeLoco(fade = 0.18) {
    const a = this.roleActions.get(this.loco) ?? this.roleActions.get("idle");
    if (!a) return;
    a.enabled = true;
    a.setEffectiveWeight(this.locomotionWeight);
    a.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(fade).play();
  }

  get weaponMode(): ToonWeaponMode {
    return this.mode;
  }

  get boneRoles(): RoleMap {
    return this.roleMap;
  }

  setColliderDebug(visible: boolean) {
    this.collider.debugMesh.visible = visible;
  }

  /**
   * Load + retarget a weapon/adventure pack from baked Mixamo/Bip001 JSON.
   * Native clips remain fallbacks when a state is missing.
   */
  async loadWeaponMode(mode: ToonWeaponMode): Promise<void> {
    if (mode === "native") {
      this.mode = "native";
      return;
    }
    this.mode = mode;
    const pack = resolvePack(mode, this.classId);
    const urls = packClipUrls(pack, this.bakedBase);

    await Promise.all(
      Object.entries(urls).map(async ([state, url]) => {
        if (!url) return;
        const src = await fetchBakedClip(url, `toon:${mode}:${state}`);
        if (!src || !src.tracks.length) return;
        const retargeted = retargetClipToToon(src, this.roleMap, {
          name: `toon:${mode}:${state}`,
        });
        if (!retargeted.tracks.length) return;
        // Register under state role (overrides native for this mode)
        this.bindRole(state, retargeted);
      }),
    );

    // Ensure fire aliases attack
    if (!this.roleActions.has("fire") && this.roleActions.has("attack")) {
      this.roleActions.set("fire", this.roleActions.get("attack")!);
    }
    if (!this.roleActions.has("attack") && this.roleActions.has("fire")) {
      this.roleActions.set("attack", this.roleActions.get("fire")!);
    }
  }

  setAiming(aiming: boolean) {
    this.aiming = aiming;
    if (aiming && this.roleActions.has("aimIdle") && !this.busy) {
      const prev = this.roleActions.get(this.loco);
      const aim = this.roleActions.get("aimIdle")!;
      aim.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(0.15).play();
      prev?.fadeOut(0.15);
      this.loco = "idle";
      this.roleActions.set("idle", aim);
    }
  }

  /**
   * speed01: 0 idle … 1 sprint. Modes: ground | swim | climb | crouch | sneak
   */
  setGait(
    speed01: number,
    opts?: {
      sprint?: boolean;
      swim?: boolean;
      climb?: boolean;
      crouch?: boolean;
      sneak?: boolean;
    },
  ) {
    if (this.busy) return;
    const sprint = !!opts?.sprint;
    let next: ToonLocoState = "idle";

    if (opts?.climb) {
      next = this.roleActions.has("climb") ? "climb" : "idle";
    } else if (opts?.swim) {
      next =
        speed01 > 0.08
          ? this.roleActions.has("swim")
            ? "swim"
            : "walk"
          : this.roleActions.has("swimIdle")
            ? "swimIdle"
            : "idle";
    } else if (opts?.sneak) {
      next = this.roleActions.has("sneak") ? "sneak" : "walk";
    } else if (opts?.crouch) {
      next = this.roleActions.has("crouch") ? "crouch" : "idle";
    } else if (speed01 > 0.75 || sprint) {
      next = this.roleActions.has("sprint")
        ? "sprint"
        : this.roleActions.has("run")
          ? "run"
          : "walk";
    } else if (speed01 > 0.45) {
      next = this.roleActions.has("run") ? "run" : "walk";
    } else if (speed01 > 0.08) {
      next = this.roleActions.has("walk") ? "walk" : "idle";
    } else {
      next = "idle";
    }

    if (next === this.loco) {
      // Time-scale blend for speed feel
      const a = this.roleActions.get(next);
      if (a && speed01 > 0.08) {
        a.setEffectiveTimeScale(0.7 + Math.min(1, speed01) * 0.6);
      }
      return;
    }

    const prev = this.roleActions.get(this.loco);
    const nAct =
      this.roleActions.get(next) ??
      this.roleActions.get("walk") ??
      this.roleActions.get("idle");
    this.loco = next;
    if (!nAct) return;
    nAct.enabled = true;
    nAct.setEffectiveWeight(this.locomotionWeight);
    nAct.setEffectiveTimeScale(
      next === "sprint" ? 1.4 : next === "swim" ? 0.85 : 1,
    );
    nAct.reset().setLoop(THREE.LoopRepeat, Infinity).play();
    if (prev && prev !== nAct) prev.crossFadeTo(nAct, 0.22, false);
    else nAct.fadeIn(0.16);
  }

  setMoving(moving: boolean, sprint = false) {
    this.setGait(moving ? (sprint ? 0.9 : 0.4) : 0, { sprint });
  }

  setSwimming(active: boolean, speed01 = 0.4) {
    this.setGait(active ? speed01 : 0, { swim: active });
  }

  /** Mixamo treading water — zero-speed swim idle */
  treadWater(): boolean {
    const act = this.roleActions.get("swimIdle");
    if (!act) return this.setSwimming(true, 0), false;
    this.setGait(0, { swim: true });
    return true;
  }

  /** Mixamo swimming-to-edge / ledge exit (one-shot) */
  swimToLedge(): boolean {
    return this.playOneShot("swimToLedge");
  }

  setClimbing(active: boolean) {
    if (active) {
      this.playOneShot("climb");
      this.setGait(0.3, { climb: true });
    } else {
      this.setGait(0);
    }
  }

  /** Primary fire / bow release */
  fire(): boolean {
    return this.playOneShot(this.aiming ? "fire" : "fire") || this.playOneShot("attack");
  }

  /** Bow draw */
  drawBow(): boolean {
    this.setAiming(true);
    return this.playOneShot("draw") || this.roleActions.has("aimIdle");
  }

  dodge(dir: "forward" | "back" | "left" | "right" = "forward"): boolean {
    const map = {
      forward: "dodge",
      back: "dodgeBack",
      left: "dodgeLeft",
      right: "dodgeRight",
    } as const;
    return (
      this.playOneShot(map[dir]) ||
      this.playOneShot("dodge") ||
      this.playOneShot("roll")
    );
  }

  playOneShot(role: ToonOneShot | string): boolean {
    if (this.busy && role !== "death") return false;
    let act = this.roleActions.get(role);
    if (!act && (role === "attack" || role === "fire")) {
      const clip = pickClip(this.clips, this.states.attack, "attack");
      if (clip) {
        this.bindRole("attack", clip);
        this.bindRole("fire", clip);
        act = this.roleActions.get("fire");
      }
    }
    if (!act && role === "ability") {
      for (const n of this.states.ability ?? []) {
        const a = this.actions.get(n);
        if (a) {
          act = a;
          break;
        }
      }
    }
    if (!act) return false;

    this.busy = true;
    this.oneShot = act;
    this.locomotionWeight = 0.15;
    act.reset();
    act.setLoop(THREE.LoopOnce, 1);
    act.clampWhenFinished = true;
    act.enabled = true;
    act.setEffectiveWeight(1);
    act.fadeIn(0.08).play();
    const loco = this.roleActions.get(this.loco);
    if (loco && loco !== act) loco.fadeOut(0.08);
    return true;
  }

  update(dt: number) {
    this.mixer.update(dt);
  }

  dispose() {
    this.mixer.stopAllAction();
    this.collider.debugMesh.geometry.dispose();
    (this.collider.debugMesh.material as THREE.Material).dispose();
    this.root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && m !== this.collider.debugMesh) {
        m.geometry?.dispose();
        const mat = m.material;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose?.();
      }
    });
    this.root.removeFromParent();
  }

  static async load(opts: ToonSoldierLoadOpts): Promise<ToonSoldierController> {
    const gltf = await LOADER.loadAsync(opts.meshUrl);
    const root = new THREE.Group();
    root.name = "ToonSoldier";
    root.add(gltf.scene);
    if (opts.scale != null) root.scale.setScalar(opts.scale);
    // Ground feet
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    if (Number.isFinite(box.min.y)) root.position.y -= box.min.y;

    const roleMap = discoverToonBoneRoles(root);
    const ctrl = new ToonSoldierController(
      root,
      gltf.animations ?? [],
      opts,
      roleMap,
    );

    if (opts.loadRetargetPacks !== false) {
      const modes = new Set<ToonWeaponMode>([
        opts.mode ??
          opts.animPack ??
          CLASS_DEFAULT_MODE[opts.classId ?? "infantry"] ??
          "rifle",
        "adventure",
        ...(opts.preloadModes ?? []),
      ]);
      // Always preload longbow for Nexus bow swap on eligible classes
      if (opts.classId !== "gunner") modes.add("longbow");
      for (const m of modes) {
        if (m === "native") continue;
        try {
          await ctrl.loadWeaponMode(m);
        } catch (e) {
          console.warn(`[ToonSoldier] pack ${m} partial`, e);
        }
      }
      // Re-apply preferred mode last so its roles win
      const preferred =
        opts.mode ??
        opts.animPack ??
        CLASS_DEFAULT_MODE[opts.classId ?? "infantry"] ??
        "rifle";
      await ctrl.loadWeaponMode(preferred);
    }

    return ctrl;
  }
}

/** Resolve CDN mesh for asset id like `toon:scout` or class `gunner`. */
export function toonMeshUrl(
  assetId: string,
  cdnBase = "https://assets.grudge-studio.com/models/toon-soldiers",
): string {
  const id = assetId.replace(/^toon:/, "").toLowerCase();
  const [cls, variant = "a"] = id.split(":");
  return `${cdnBase}/${cls}/${cls}-${variant}.glb`;
}

export type { ToonWeaponMode, ToonAnimState, ColliderProfile };
