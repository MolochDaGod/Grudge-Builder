/**
 * SectionalDamageSystem — progressive hide-chunk damage for boats, objects,
 * assets, enemies, buildings, and vehicles.
 *
 * Design (fleet SSOT):
 *   1. Assets register **sections** (child meshes / named chunks).
 *   2. Impacts reduce section HP; at 0 the chunk is **hidden** (= damaged).
 *   3. Optional three-pinata fracture on section destroy (full shatter).
 *   4. Repair via BuildHammerRepair: toolkit + 1 wood, RMB target → LMB fix.
 *
 * Ref: https://github.com/dgreenheck/three-pinata (DestructibleMesh / hide chunks)
 * Pair: BuildHammerRepair.ts · PhysicsWorld.addDynamicFragment (debris)
 *
 * SI meters · no per-frame alloc in hot paths where possible.
 */

import * as THREE from "three";

// ── Types ────────────────────────────────────────────────────────────────────

export type DamageAssetKind =
  | "boat"
  | "vehicle"
  | "building"
  | "enemy"
  | "object"
  | "asset";

export type SectionState = "intact" | "damaged" | "destroyed";

export interface DamageSection {
  /** Unique section id: `${assetId}:${localId}` */
  id: string;
  assetId: string;
  kind: DamageAssetKind;
  /** Mesh / group that is hidden when damaged */
  mesh: THREE.Object3D;
  label: string;
  maxHp: number;
  hp: number;
  state: SectionState;
  /** Wood cost to restore one damaged section (default 1) */
  repairCostWood: number;
  /** When true, attempt pinata fracture on first destroy */
  pinataOnDestroy: boolean;
  /** Cached world center for range / highlight */
  center: THREE.Vector3;
  /** Original visibility before hide */
  wasVisible: boolean;
}

export interface RegisterAssetOpts {
  assetId: string;
  root: THREE.Object3D;
  kind: DamageAssetKind;
  /** Per-section max HP (default by kind) */
  sectionMaxHp?: number;
  repairCostWood?: number;
  pinataOnDestroy?: boolean;
  /**
   * Auto-detect mode:
   *  - "named" — only meshes matching damage_/section_/part_/chunk_ or userData.damageSection
   *  - "children" — each direct Mesh child of root
   *  - "classified" — ship-like parts (hull/deck/mast/rail/cannon) via name heuristics
   *  - "all-meshes" — every Mesh under root (capped)
   */
  mode?: "named" | "children" | "classified" | "all-meshes";
  /** Max sections when using all-meshes (default 24) */
  maxSections?: number;
  /** Explicit section list overrides auto-detect */
  sections?: Array<{
    localId: string;
    mesh: THREE.Object3D;
    label?: string;
    maxHp?: number;
  }>;
}

export interface ImpactResult {
  sectionId: string;
  assetId: string;
  damage: number;
  hp: number;
  maxHp: number;
  becameDamaged: boolean;
  destroyed: boolean;
  center: THREE.Vector3;
}

export interface SectionalDamageHost {
  /** Optional pinata fracture hook (three-pinata adapter) */
  onSectionDestroy?: (
    section: DamageSection,
    point: THREE.Vector3 | null,
  ) => void;
  /** Feedback toast / HUD */
  onPrompt?: (msg: string | null) => void;
  /** Impact VFX */
  onImpactFx?: (point: THREE.Vector3, scale: number) => void;
}

const DEFAULT_HP: Record<DamageAssetKind, number> = {
  boat: 40,
  vehicle: 35,
  building: 50,
  enemy: 25,
  object: 20,
  asset: 30,
};

const _box = new THREE.Box3();
const _center = new THREE.Vector3();
const _size = new THREE.Vector3();

const CLASSIFIED_RE =
  /hull|deck|mast|sail|rail|cannon|keel|bow|stern|plank|wall|roof|door|wheel|engine|turret|armor|cabin|bridge|rudder|oars?|gun|tower|gate|window|pillar|fence|floor|ceiling|foundation/i;

const NAMED_SECTION_RE =
  /^(damage|section|part|chunk|break|dmg)[_-]/i;

function meshWorldCenter(obj: THREE.Object3D): THREE.Vector3 {
  _box.setFromObject(obj);
  if (_box.isEmpty()) {
    obj.getWorldPosition(_center);
    return _center.clone();
  }
  return _box.getCenter(_center).clone();
}

function isMesh(o: THREE.Object3D): o is THREE.Mesh {
  return (o as THREE.Mesh).isMesh === true;
}

function meshVolume(obj: THREE.Object3D): number {
  _box.setFromObject(obj);
  _box.getSize(_size);
  return Math.max(0.001, _size.x * _size.y * _size.z);
}

// ── System ───────────────────────────────────────────────────────────────────

export class SectionalDamageSystem {
  private sections = new Map<string, DamageSection>();
  private byAsset = new Map<string, Set<string>>();
  private meshToSection = new Map<THREE.Object3D, string>();
  private host: SectionalDamageHost;
  private highlight: THREE.Object3D | null = null;
  private selectedId: string | null = null;

  constructor(host: SectionalDamageHost = {}) {
    this.host = host;
  }

  setHost(host: SectionalDamageHost): void {
    this.host = { ...this.host, ...host };
  }

  get size(): number {
    return this.sections.size;
  }

  get selectedSectionId(): string | null {
    return this.selectedId;
  }

  getSection(id: string): DamageSection | undefined {
    return this.sections.get(id);
  }

  getAssetSections(assetId: string): DamageSection[] {
    const ids = this.byAsset.get(assetId);
    if (!ids) return [];
    const out: DamageSection[] = [];
    for (const id of ids) {
      const s = this.sections.get(id);
      if (s) out.push(s);
    }
    return out;
  }

  /** 1 = pristine, 0 = all sections destroyed/hidden */
  getAssetIntegrity(assetId: string): number {
    const list = this.getAssetSections(assetId);
    if (list.length === 0) return 1;
    let sum = 0;
    for (const s of list) sum += s.hp / s.maxHp;
    return sum / list.length;
  }

  getDamagedSections(assetId?: string): DamageSection[] {
    const src = assetId
      ? this.getAssetSections(assetId)
      : Array.from(this.sections.values());
    return src.filter((s) => s.state !== "intact" || s.hp < s.maxHp);
  }

  getHiddenDamaged(assetId?: string): DamageSection[] {
    const src = assetId
      ? this.getAssetSections(assetId)
      : Array.from(this.sections.values());
    return src.filter((s) => s.state === "damaged" || s.state === "destroyed");
  }

  // ── Registration ─────────────────────────────────────────────────────────

  registerAsset(opts: RegisterAssetOpts): DamageSection[] {
    this.unregisterAsset(opts.assetId);

    const maxHp = opts.sectionMaxHp ?? DEFAULT_HP[opts.kind];
    const repairCost = opts.repairCostWood ?? 1;
    const pinata = opts.pinataOnDestroy ?? false;
    const created: DamageSection[] = [];

    const push = (
      localId: string,
      mesh: THREE.Object3D,
      label?: string,
      hp?: number,
    ) => {
      const id = `${opts.assetId}:${localId}`;
      if (this.sections.has(id)) return;
      const section: DamageSection = {
        id,
        assetId: opts.assetId,
        kind: opts.kind,
        mesh,
        label: label ?? (mesh.name || localId),
        maxHp: hp ?? maxHp,
        hp: hp ?? maxHp,
        state: "intact",
        repairCostWood: repairCost,
        pinataOnDestroy: pinata,
        center: meshWorldCenter(mesh),
        wasVisible: mesh.visible,
      };
      this.sections.set(id, section);
      let set = this.byAsset.get(opts.assetId);
      if (!set) {
        set = new Set();
        this.byAsset.set(opts.assetId, set);
      }
      set.add(id);
      this.meshToSection.set(mesh, id);
      mesh.userData.damageSectionId = id;
      mesh.userData.damageAssetId = opts.assetId;
      mesh.userData.damageKind = opts.kind;
      created.push(section);
    };

    if (opts.sections?.length) {
      for (const s of opts.sections) {
        push(s.localId, s.mesh, s.label, s.maxHp);
      }
      return created;
    }

    const mode = opts.mode ?? (opts.kind === "boat" || opts.kind === "vehicle"
      ? "classified"
      : "named");
    const cap = opts.maxSections ?? 24;
    const candidates: THREE.Object3D[] = [];

    if (mode === "children") {
      for (const child of opts.root.children) {
        if (isMesh(child) || child.children.some(isMesh)) candidates.push(child);
      }
    } else if (mode === "named") {
      opts.root.traverse((o) => {
        if (!isMesh(o) && o.children.length === 0) return;
        const n = o.name || "";
        if (
          NAMED_SECTION_RE.test(n) ||
          o.userData?.damageSection === true ||
          o.userData?.section === true
        ) {
          candidates.push(o);
        }
      });
      // Fallback: if no named sections, use classified then all-meshes
      if (candidates.length === 0) {
        opts.root.traverse((o) => {
          if (!isMesh(o)) return;
          if (CLASSIFIED_RE.test(o.name || "")) candidates.push(o);
        });
      }
      if (candidates.length === 0) {
        this.collectLargestMeshes(opts.root, candidates, cap);
      }
    } else if (mode === "classified") {
      opts.root.traverse((o) => {
        if (!isMesh(o)) return;
        if (CLASSIFIED_RE.test(o.name || "")) candidates.push(o);
      });
      if (candidates.length === 0) {
        this.collectLargestMeshes(opts.root, candidates, Math.min(cap, 12));
      }
    } else {
      this.collectLargestMeshes(opts.root, candidates, cap);
    }

    // Dedupe by object identity, prefer larger unique chunks
    const seen = new Set<THREE.Object3D>();
    let i = 0;
    for (const mesh of candidates) {
      if (seen.has(mesh)) continue;
      // Skip tiny debris / LOD placeholders
      if (isMesh(mesh) && meshVolume(mesh) < 0.002) continue;
      seen.add(mesh);
      const localId =
        (mesh.name && mesh.name.replace(/\s+/g, "_")) || `sec_${i}`;
      push(localId, mesh, mesh.name || localId);
      i++;
      if (created.length >= cap) break;
    }

    // Tag root for raycast walk-up
    opts.root.userData.damageAssetId = opts.assetId;
    opts.root.userData.damageKind = opts.kind;

    return created;
  }

  private collectLargestMeshes(
    root: THREE.Object3D,
    out: THREE.Object3D[],
    cap: number,
  ): void {
    const scored: Array<{ o: THREE.Object3D; v: number }> = [];
    root.traverse((o) => {
      if (!isMesh(o)) return;
      // Skip pure shadow / collider-only
      const n = (o.name || "").toLowerCase();
      if (n.includes("collider") || n.includes("lod") || n.includes("shadow")) return;
      scored.push({ o, v: meshVolume(o) });
    });
    scored.sort((a, b) => b.v - a.v);
    for (let i = 0; i < Math.min(cap, scored.length); i++) {
      out.push(scored[i].o);
    }
  }

  unregisterAsset(assetId: string): void {
    const ids = this.byAsset.get(assetId);
    if (!ids) return;
    for (const id of ids) {
      const s = this.sections.get(id);
      if (s) {
        this.meshToSection.delete(s.mesh);
        delete s.mesh.userData.damageSectionId;
        this.sections.delete(id);
      }
    }
    this.byAsset.delete(assetId);
    if (this.selectedId?.startsWith(`${assetId}:`)) {
      this.clearSelection();
    }
  }

  // ── Damage ───────────────────────────────────────────────────────────────

  /**
   * Apply damage to a section. When HP hits 0 the mesh is hidden (damaged).
   * Returns null if section missing / already destroyed.
   */
  applyImpact(
    sectionId: string,
    damage: number,
    point?: THREE.Vector3 | null,
  ): ImpactResult | null {
    const s = this.sections.get(sectionId);
    if (!s || s.state === "destroyed") return null;
    if (damage <= 0) return null;

    const prevHp = s.hp;
    s.hp = Math.max(0, s.hp - damage);
    s.center.copy(meshWorldCenter(s.mesh));

    let becameDamaged = false;
    let destroyed = false;

    if (s.hp <= 0 && prevHp > 0) {
      this.hideSection(s);
      becameDamaged = true;
      destroyed = true;
      s.state = "destroyed";
      if (s.pinataOnDestroy) {
        this.host.onSectionDestroy?.(s, point ?? s.center.clone());
      }
    } else if (s.hp < s.maxHp && s.state === "intact") {
      // Partial damage: flash only; full hide at 0
      s.state = "intact";
    }

    if (point || becameDamaged) {
      this.host.onImpactFx?.(point ?? s.center, becameDamaged ? 1.4 : 0.8);
    }

    return {
      sectionId: s.id,
      assetId: s.assetId,
      damage,
      hp: s.hp,
      maxHp: s.maxHp,
      becameDamaged,
      destroyed,
      center: s.center.clone(),
    };
  }

  /** Damage nearest section to a world point within radius (m). */
  applyImpactAtPoint(
    point: THREE.Vector3,
    damage: number,
    radius = 2.5,
  ): ImpactResult | null {
    let best: DamageSection | null = null;
    let bestD = radius * radius;
    for (const s of this.sections.values()) {
      if (s.state === "destroyed") continue;
      s.center.copy(meshWorldCenter(s.mesh));
      const d = s.center.distanceToSquared(point);
      if (d <= bestD) {
        bestD = d;
        best = s;
      }
    }
    if (!best) return null;
    return this.applyImpact(best.id, damage, point);
  }

  /** Resolve section from a raycast hit object (walks parents). */
  resolveSectionFromObject(obj: THREE.Object3D | null): DamageSection | null {
    let o: THREE.Object3D | null = obj;
    while (o) {
      const id =
        (o.userData?.damageSectionId as string | undefined) ??
        this.meshToSection.get(o);
      if (id) {
        const s = this.sections.get(id);
        if (s) return s;
      }
      o = o.parent;
    }
    return null;
  }

  raycastSection(raycaster: THREE.Raycaster): DamageSection | null {
    const roots: THREE.Object3D[] = [];
    const seen = new Set<THREE.Object3D>();
    for (const s of this.sections.values()) {
      // Prefer asset root if tagged
      let root = s.mesh;
      while (root.parent && !root.userData?.damageAssetId) {
        root = root.parent;
      }
      if (!seen.has(root)) {
        seen.add(root);
        roots.push(root);
      }
    }
    if (roots.length === 0) return null;
    const hits = raycaster.intersectObjects(roots, true);
    for (const h of hits) {
      const sec = this.resolveSectionFromObject(h.object);
      if (sec) return sec;
    }
    return null;
  }

  // ── Visual hide / show (damaged = hidden chunk) ──────────────────────────

  private hideSection(s: DamageSection): void {
    s.wasVisible = s.mesh.visible;
    s.mesh.visible = false;
    s.state = "damaged";
    s.mesh.userData.damagedHidden = true;
  }

  private showSection(s: DamageSection): void {
    s.mesh.visible = s.wasVisible !== false;
    s.mesh.userData.damagedHidden = false;
    s.state = "intact";
  }

  /**
   * Restore a damaged/destroyed section (used by hammer repair).
   * Does NOT spend wood — caller handles inventory.
   */
  repairSection(sectionId: string, fullHp = true): boolean {
    const s = this.sections.get(sectionId);
    if (!s) return false;
    if (s.state === "intact" && s.hp >= s.maxHp) return false;

    this.showSection(s);
    s.hp = fullHp ? s.maxHp : Math.min(s.maxHp, s.hp + Math.ceil(s.maxHp * 0.5));
    s.state = s.hp >= s.maxHp ? "intact" : "intact";
    s.center.copy(meshWorldCenter(s.mesh));
    return true;
  }

  /** Repair all hidden sections on an asset (admin / full shipyard). */
  repairAsset(assetId: string): number {
    let n = 0;
    for (const s of this.getAssetSections(assetId)) {
      if (s.hp < s.maxHp || s.state !== "intact") {
        if (this.repairSection(s.id)) n++;
      }
    }
    return n;
  }

  // ── Selection (hammer RMB) ───────────────────────────────────────────────

  selectSection(sectionId: string | null): DamageSection | null {
    this.clearHighlightOnly();
    if (!sectionId) {
      this.selectedId = null;
      return null;
    }
    const s = this.sections.get(sectionId);
    if (!s) {
      this.selectedId = null;
      return null;
    }
    this.selectedId = sectionId;
    this.applyHighlight(s);
    return s;
  }

  clearSelection(): void {
    this.clearHighlightOnly();
    this.selectedId = null;
  }

  private applyHighlight(s: DamageSection): void {
    // Simple emissive pulse on damaged mesh parent or BoxHelper-like ring
    s.center.copy(meshWorldCenter(s.mesh));
    const box = new THREE.Box3().setFromObject(s.mesh);
    if (box.isEmpty()) {
      box.setFromCenterAndSize(s.center, new THREE.Vector3(0.6, 0.6, 0.6));
    }
    const helper = new THREE.Box3Helper(box, s.state === "intact" ? 0x44ff88 : 0xffaa22);
    helper.name = "DamageSectionHighlight";
    // Attach to scene root if possible
    let root: THREE.Object3D = s.mesh;
    while (root.parent) root = root.parent;
    root.add(helper);
    this.highlight = helper;
  }

  private clearHighlightOnly(): void {
    if (this.highlight) {
      this.highlight.parent?.remove(this.highlight);
      const g = this.highlight as THREE.Box3Helper;
      g.geometry?.dispose?.();
      (g.material as THREE.Material | undefined)?.dispose?.();
      this.highlight = null;
    }
  }

  dispose(): void {
    this.clearSelection();
    this.sections.clear();
    this.byAsset.clear();
    this.meshToSection.clear();
  }
}

// ── Convenience registrars ───────────────────────────────────────────────────

export function registerWatercraftSections(
  sys: SectionalDamageSystem,
  assetId: string,
  root: THREE.Object3D,
  opts: Partial<RegisterAssetOpts> = {},
): DamageSection[] {
  return sys.registerAsset({
    assetId,
    root,
    kind: "boat",
    mode: "classified",
    sectionMaxHp: 40,
    repairCostWood: 1,
    pinataOnDestroy: false,
    maxSections: 16,
    ...opts,
  });
}

export function registerBuildingSections(
  sys: SectionalDamageSystem,
  assetId: string,
  root: THREE.Object3D,
  opts: Partial<RegisterAssetOpts> = {},
): DamageSection[] {
  return sys.registerAsset({
    assetId,
    root,
    kind: "building",
    mode: "named",
    sectionMaxHp: 50,
    repairCostWood: 1,
    pinataOnDestroy: false,
    maxSections: 12,
    ...opts,
  });
}

export function registerVehicleSections(
  sys: SectionalDamageSystem,
  assetId: string,
  root: THREE.Object3D,
  opts: Partial<RegisterAssetOpts> = {},
): DamageSection[] {
  return sys.registerAsset({
    assetId,
    root,
    kind: "vehicle",
    mode: "classified",
    sectionMaxHp: 35,
    repairCostWood: 1,
    maxSections: 12,
    ...opts,
  });
}

export function registerEnemySections(
  sys: SectionalDamageSystem,
  assetId: string,
  root: THREE.Object3D,
  opts: Partial<RegisterAssetOpts> = {},
): DamageSection[] {
  return sys.registerAsset({
    assetId,
    root,
    kind: "enemy",
    mode: "classified",
    sectionMaxHp: 25,
    repairCostWood: 1,
    pinataOnDestroy: true,
    maxSections: 10,
    ...opts,
  });
}

export function registerObjectSections(
  sys: SectionalDamageSystem,
  assetId: string,
  root: THREE.Object3D,
  opts: Partial<RegisterAssetOpts> = {},
): DamageSection[] {
  return sys.registerAsset({
    assetId,
    root,
    kind: "object",
    mode: "named",
    sectionMaxHp: 20,
    repairCostWood: 1,
    maxSections: 8,
    ...opts,
  });
}
