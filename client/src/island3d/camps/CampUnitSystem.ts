/**
 * CampUnitSystem — Claim Flag spawns unarmed race garrison; buildings buff units;
 * F1–F5 orders on player-owned camps (defend, follow, home, attack, group).
 */
import * as THREE from 'three';
import {
  CLAIM_FLAG_SPAWN,
  CLAIM_FLAG_UPGRADE_ID,
  CAMP_UNIT_BASE_STATS,
  CAMP_UNIT_ORDERS,
  CAMP_ORDER_BY_HOTKEY,
  CAMP_UNIT_T0_LOADOUT,
  aggregateCampUnitBuffs,
  applyBuffsToUnitStats,
  professionsAvailableAtCamp,
  getCampOrder,
  type CampUnitOrderId,
  type AggregatedCampUnitBuffs,
  type CampBenchProfessionLink,
} from '@shared/definitions/campUnits';
import { RACE_GRUDGE6, defaultModel3d, normalizeRaceId } from '@shared/fleet';
import { setupGrudge6Equipment } from '@/lib/grudge6Equipment';
import { loadCharacterModel } from '@/lib/modelLoader';
import { fitCharacterRootToHeightM, PLAYER_HEIGHT_M } from '../zoneWorldScale';
import type { AllyManager, AllyController, CombatTarget } from '../ai/AllyController';
import type { RuntimeCamp, NpcCampSystem } from './NpcCampSystem';

export interface CampUnitRecord {
  unitId: string;
  allyId: string;
  campId: string;
  raceId: string;
  slotIndex: number;
  homeLocal: [number, number, number];
  order: CampUnitOrderId;
  buffs: AggregatedCampUnitBuffs;
  equipT0: boolean;
  weaponSkills: string[];
  harvestRate: number;
  harvestYield: number;
  armor: number;
}

export interface CampUnitSystemOpts {
  scene: THREE.Scene;
  campSystem: NpcCampSystem;
  allyManager: AllyManager | null;
  /** Player race for unarmed garrison mesh */
  playerRaceId: string;
  playerAccountId: string;
  getPlayerPosition: () => THREE.Vector3;
  getEnemies?: () => CombatTarget[];
  sampleHeight?: (x: number, z: number) => number | null;
  waterLevel?: number;
  onProfessionCraft?: (link: CampBenchProfessionLink, xp: number) => void;
}

const RACE_LABEL: Record<string, string> = {
  human: 'Human',
  barbarian: 'Barbarian',
  elf: 'Elf',
  dwarf: 'Dwarf',
  orc: 'Orc',
  undead: 'Undead',
};

export class CampUnitSystem {
  private scene: THREE.Scene;
  private campSystem: NpcCampSystem;
  private allyManager: AllyManager | null;
  private playerRaceId: string;
  private playerAccountId: string;
  private getPlayerPosition: () => THREE.Vector3;
  private getEnemies: () => CombatTarget[];
  private sampleHeight?: (x: number, z: number) => number | null;
  private waterLevel: number;
  private onProfessionCraft?: (link: CampBenchProfessionLink, xp: number) => void;

  /** unitId → record */
  private units = new Map<string, CampUnitRecord>();
  /** Optional engine budget registration (distance cull unit meshes) */
  private budgetRegister:
    | ((id: string, obj: THREE.Object3D, opts?: { radius?: number; getPosition?: () => THREE.Vector3 }) => void)
    | null = null;
  private budgetUnregister: ((id: string) => void) | null = null;

  /** Wire Island3DEngine distance budget (call once after construct). */
  setRenderBudget(
    register: CampUnitSystem['budgetRegister'],
    unregister: CampUnitSystem['budgetUnregister'],
  ): void {
    this.budgetRegister = register;
    this.budgetUnregister = unregister;
  }
  /** campId → unitIds spawned from claim flag */
  private campGarrison = new Map<string, string[]>();
  /** Visual roots parented to camp (optional race GLBs) */
  private unitMeshes = new Map<string, THREE.Object3D>();

  private lastOrder: CampUnitOrderId | null = null;

  constructor(opts: CampUnitSystemOpts) {
    this.scene = opts.scene;
    this.campSystem = opts.campSystem;
    this.allyManager = opts.allyManager;
    this.playerRaceId = normalizeRaceId(opts.playerRaceId);
    this.playerAccountId = opts.playerAccountId;
    this.getPlayerPosition = opts.getPlayerPosition;
    this.getEnemies = opts.getEnemies ?? (() => []);
    this.sampleHeight = opts.sampleHeight;
    this.waterLevel = opts.waterLevel ?? 0;
    this.onProfessionCraft = opts.onProfessionCraft;
  }

  setAllyManager(m: AllyManager | null): void {
    this.allyManager = m;
  }

  setPlayerRace(raceId: string): void {
    this.playerRaceId = normalizeRaceId(raceId);
  }

  setPlayerAccount(accountId: string): void {
    this.playerAccountId = accountId;
  }

  getUnits(): CampUnitRecord[] {
    return Array.from(this.units.values());
  }

  getUnitsForCamp(campId: string): CampUnitRecord[] {
    return (this.campGarrison.get(campId) ?? [])
      .map((id) => this.units.get(id))
      .filter(Boolean) as CampUnitRecord[];
  }

  getLastOrder(): CampUnitOrderId | null {
    return this.lastOrder;
  }

  /** Owned camps for this player (ownerAccountId match). */
  getOwnedCamps(): RuntimeCamp[] {
    return this.campSystem.getCamps().filter(
      (c) => c.data.ownerAccountId === this.playerAccountId,
    );
  }

  /** Nearest owned camp within radius. */
  findNearestOwnedCamp(radius = 40): RuntimeCamp | null {
    const pos = this.getPlayerPosition();
    let best: RuntimeCamp | null = null;
    let bestD = radius;
    for (const camp of this.getOwnedCamps()) {
      const [cx, , cz] = camp.data.position;
      const d = Math.hypot(cx - pos.x, cz - pos.z);
      if (d < bestD) {
        bestD = d;
        best = camp;
      }
    }
    return best;
  }

  /** Whether player is near an owned camp (orders UI / hotkeys active). */
  isNearOwnedCamp(radius = 40): boolean {
    return this.findNearestOwnedCamp(radius) != null;
  }

  // ── Claim Flag ─────────────────────────────────────────────────────────────

  /**
   * Called when camp_flag is placed or camp is claimed by the player.
   * Spawns unarmed race variant garrison if not already present.
   */
  async onClaimFlagPlaced(camp: RuntimeCamp): Promise<CampUnitRecord[]> {
    if (camp.data.ownerAccountId !== this.playerAccountId) {
      // Still claim for player if they own it after flag
      if (!camp.data.ownerAccountId) {
        camp.data.ownerAccountId = this.playerAccountId;
      } else {
        console.warn('[CampUnits] Claim flag on non-owned camp — skip garrison');
        return [];
      }
    }

    const existing = this.campGarrison.get(camp.data.id);
    if (existing && existing.length > 0) {
      // Refresh buffs from current buildings
      this.refreshCampBuffs(camp.data.id);
      return this.getUnitsForCamp(camp.data.id);
    }

    const kinds = camp.data.upgrades.map((u) => u.kind);
    const buffs = aggregateCampUnitBuffs(kinds);
    const stats = applyBuffsToUnitStats(CAMP_UNIT_BASE_STATS, buffs);
    const raceId = this.playerRaceId;
    const raceLabel = RACE_LABEL[raceId] ?? 'Human';
    const spawned: CampUnitRecord[] = [];
    const ids: string[] = [];

    const count = Math.min(
      CLAIM_FLAG_SPAWN.garrisonSize,
      CLAIM_FLAG_SPAWN.spawnOffsets.length,
    );

    for (let i = 0; i < count; i++) {
      const local = CLAIM_FLAG_SPAWN.spawnOffsets[i];
      const world = this.localToWorld(camp, local);
      const name = CLAIM_FLAG_SPAWN.namePattern.replace('{race}', raceLabel);
      const unitId = `campunit_${camp.data.id}_${i}`;

      // Ally AI brain
      let allyId = unitId;
      if (this.allyManager) {
        const ally = this.allyManager.deploy({
          name: `${name} ${i + 1}`,
          stats: {
            maxHp: stats.maxHp,
            damage: stats.damage,
            attackRange: stats.attackRange,
            attackCooldown: stats.attackCooldown,
            moveSpeed: stats.moveSpeed,
            aggroRadius: stats.aggroRadius,
            followDistance: stats.followDistance,
          },
          position: world.clone(),
          guardPosition: world.clone(),
          sourceCharacterId: `claim_${camp.data.id}`,
        });
        if (ally) {
          allyId = ally.id;
          ally.commandGuard();
          // Hide default green capsule if we load race mesh
          void this.attachRaceMesh(ally, raceId, buffs).then((mesh) => {
            if (mesh) {
              this.unitMeshes.set(unitId, mesh);
              this.budgetRegister?.(unitId, mesh, {
                radius: 1.2,
                getPosition: () => ally.model.getWorldPosition(new THREE.Vector3()),
              });
            }
          });
        }
      } else {
        // No ally manager — still show a race mesh at post
        const mesh = await this.loadUnarmedRaceMesh(raceId, buffs);
        if (mesh) {
          mesh.position.copy(world);
          this.scene.add(mesh);
          this.unitMeshes.set(unitId, mesh);
          this.budgetRegister?.(unitId, mesh, {
            radius: 1.2,
            getPosition: () => mesh.getWorldPosition(new THREE.Vector3()),
          });
        }
      }

      const rec: CampUnitRecord = {
        unitId,
        allyId,
        campId: camp.data.id,
        raceId,
        slotIndex: i,
        homeLocal: local,
        order: 'defend_camp',
        buffs,
        equipT0: buffs.equipT0Weapons,
        weaponSkills: buffs.weaponSkillUsage ? [...CAMP_UNIT_T0_LOADOUT.weaponSkills] : [],
        harvestRate: stats.harvestRate,
        harvestYield: stats.harvestYield,
        armor: stats.armor,
      };
      this.units.set(unitId, rec);
      ids.push(unitId);
      spawned.push(rec);
    }

    this.campGarrison.set(camp.data.id, ids);
    console.log(
      `[CampUnits] Claim Flag: spawned ${spawned.length} unarmed ${raceId} units at ${camp.data.id}`,
      buffs.equipT0Weapons ? '(T0 trained)' : '(unarmed)',
    );
    return spawned;
  }

  /** Refresh unit stats when buildings are added. */
  refreshCampBuffs(campId: string): void {
    const camp = this.campSystem.getCamp(campId);
    if (!camp) return;
    const kinds = camp.data.upgrades.map((u) => u.kind);
    const buffs = aggregateCampUnitBuffs(kinds);
    const stats = applyBuffsToUnitStats(CAMP_UNIT_BASE_STATS, buffs);

    for (const unit of this.getUnitsForCamp(campId)) {
      unit.buffs = buffs;
      unit.equipT0 = buffs.equipT0Weapons;
      unit.weaponSkills = buffs.weaponSkillUsage ? [...CAMP_UNIT_T0_LOADOUT.weaponSkills] : [];
      unit.harvestRate = stats.harvestRate;
      unit.harvestYield = stats.harvestYield;
      unit.armor = stats.armor;

      const ally = this.findAlly(unit.allyId);
      if (ally) {
        // Patch live stats (AllyController.stats is readonly shape but object is mutable)
        const s = ally.stats as { maxHp: number; damage: number; attackCooldown: number; aggroRadius: number };
        s.maxHp = stats.maxHp;
        s.damage = stats.damage;
        s.attackCooldown = stats.attackCooldown;
        s.aggroRadius = stats.aggroRadius;
        if (ally.hp > stats.maxHp) ally.hp = stats.maxHp;
      }
    }

    if (buffs.equipT0Weapons) {
      for (const unit of this.getUnitsForCamp(campId)) {
        const mesh = this.unitMeshes.get(unit.unitId);
        if (mesh) this.applyT0Visual(mesh, unit.raceId);
      }
    }
  }

  // ── Orders F1–F5 ───────────────────────────────────────────────────────────

  /**
   * Issue order to all garrison units of nearest owned camp (or all owned camps).
   * Returns false if player not near owned camp.
   */
  issueOrder(orderId: CampUnitOrderId, opts?: { allOwnedCamps?: boolean }): boolean {
    const camps = opts?.allOwnedCamps
      ? this.getOwnedCamps()
      : (() => {
          const n = this.findNearestOwnedCamp(48);
          return n ? [n] : [];
        })();

    if (camps.length === 0) return false;

    const playerPos = this.getPlayerPosition();
    this.lastOrder = orderId;
    const def = getCampOrder(orderId);

    for (const camp of camps) {
      for (const unit of this.getUnitsForCamp(camp.data.id)) {
        unit.order = orderId;
        this.applyOrderToAlly(unit, camp, orderId, playerPos);
      }
    }

    console.log(`[CampUnits] Order ${def.hotkey} ${def.label} → ${camps.length} camp(s)`);
    return true;
  }

  /** Handle F1–F5 keyboard (only when near owned camp). Shift+F keeps form switch. */
  handleHotkey(key: string, shiftKey: boolean): boolean {
    if (shiftKey) return false;
    const orderId = CAMP_ORDER_BY_HOTKEY[key.toUpperCase()];
    if (!orderId) return false;
    if (!this.isNearOwnedCamp(48)) return false;
    return this.issueOrder(orderId);
  }

  private applyOrderToAlly(
    unit: CampUnitRecord,
    camp: RuntimeCamp,
    order: CampUnitOrderId,
    playerPos: THREE.Vector3,
  ): void {
    const ally = this.findAlly(unit.allyId);
    if (!ally) {
      // Move visual mesh only
      const mesh = this.unitMeshes.get(unit.unitId);
      if (mesh && order === 'go_home') {
        mesh.position.copy(this.localToWorld(camp, unit.homeLocal));
      }
      return;
    }

    switch (order) {
      case 'defend_camp': {
        const home = this.localToWorld(camp, unit.homeLocal);
        ally.commandDefendCamp(home);
        break;
      }
      case 'follow':
        ally.commandFollow(playerPos);
        ally.joinParty = true;
        break;
      case 'go_home': {
        const home = this.localToWorld(camp, unit.homeLocal);
        ally.commandGoHome(home);
        ally.joinParty = false;
        break;
      }
      case 'attack':
        ally.commandAttackAggressive();
        break;
      case 'group_on_me':
        ally.commandGroupOnMe(playerPos);
        ally.joinParty = true;
        break;
    }
  }

  // ── Benches / profession craft ─────────────────────────────────────────────

  /** Professions available at nearest owned camp with benches. */
  getCampProfessions(campId?: string): CampBenchProfessionLink[] {
    const camp = campId
      ? this.campSystem.getCamp(campId)
      : this.findNearestOwnedCamp(24);
    if (!camp || camp.data.ownerAccountId !== this.playerAccountId) return [];
    return professionsAvailableAtCamp(camp.data.upgrades.map((u) => u.upgradeId));
  }

  /**
   * Player crafts at camp bench — grants profession XP (client-side event;
   * server should validate similarly).
   */
  craftAtCampBench(
    profession: string,
    campId?: string,
  ): { ok: boolean; xp: number; link?: CampBenchProfessionLink; reason?: string } {
    const links = this.getCampProfessions(campId);
    const link = links.find((l) => l.profession === profession) ?? links[0];
    if (!link) {
      return { ok: false, xp: 0, reason: 'No craft bench at this camp' };
    }
    this.onProfessionCraft?.(link, link.xpPerCraft);
    console.log(
      `[CampUnits] Craft @ camp profession=${link.profession} +${link.xpPerCraft} XP (max ${link.maxProfessionLevel})`,
    );
    return { ok: true, xp: link.xpPerCraft, link };
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  update(dt: number): void {
    // Keep follow / group targets fresh for party units
    const playerPos = this.getPlayerPosition();
    for (const unit of this.units.values()) {
      if (unit.order !== 'follow' && unit.order !== 'group_on_me') continue;
      const ally = this.findAlly(unit.allyId);
      if (!ally) continue;
      if (unit.order === 'follow') ally.commandFollow(playerPos);
      // group_on_me holds after first rally — AllyController handles hold
    }
  }

  dispose(): void {
    for (const mesh of this.unitMeshes.values()) {
      mesh.parent?.remove(mesh);
      mesh.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) {
          const m = o as THREE.Mesh;
          m.geometry?.dispose();
          const mat = m.material;
          if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
          else (mat as THREE.Material | undefined)?.dispose?.();
        }
      });
    }
    this.unitMeshes.clear();
    this.units.clear();
    this.campGarrison.clear();
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  private findAlly(allyId: string): AllyController | null {
    if (!this.allyManager) return null;
    return this.allyManager.getLiving().find((a) => a.id === allyId) ?? null;
  }

  private localToWorld(camp: RuntimeCamp, local: [number, number, number]): THREE.Vector3 {
    const [cx, cy, cz] = camp.data.position;
    const yaw = camp.data.rotationY;
    const cos = Math.cos(yaw);
    const sin = Math.sin(yaw);
    const lx = local[0];
    const lz = local[2];
    const wx = cx + lx * cos - lz * sin;
    const wz = cz + lx * sin + lz * cos;
    let wy = cy + local[1];
    const h = this.sampleHeight?.(wx, wz);
    if (h != null && h > this.waterLevel) wy = h;
    return new THREE.Vector3(wx, wy, wz);
  }

  private async loadUnarmedRaceMesh(
    raceId: string,
    buffs: AggregatedCampUnitBuffs,
  ): Promise<THREE.Object3D | null> {
    const race = RACE_GRUDGE6[raceId] ?? RACE_GRUDGE6.human;
    try {
      const loaded = await loadCharacterModel(race.cdnPath);
      const model3d = defaultModel3d(raceId, {
        weaponSlots: {}, // unarmed
        equippedMeshes: { body: 'A', arms: 'A', legs: 'A', head: 'A' },
      });
      setupGrudge6Equipment(race.prefix, loaded.scene, model3d);
      fitCharacterRootToHeightM(loaded.scene, race.scale, PLAYER_HEIGHT_M * 0.95);
      loaded.scene.name = `camp_unit_${raceId}_unarmed`;
      loaded.scene.userData.campUnit = true;
      loaded.scene.userData.unarmed = true;
      if (buffs.equipT0Weapons) {
        this.applyT0Visual(loaded.scene, raceId);
      }
      return loaded.scene;
    } catch (err) {
      console.warn('[CampUnits] Race mesh load failed, using ally capsule:', err);
      return null;
    }
  }

  private async attachRaceMesh(
    ally: AllyController,
    raceId: string,
    buffs: AggregatedCampUnitBuffs,
  ): Promise<THREE.Object3D | null> {
    const mesh = await this.loadUnarmedRaceMesh(raceId, buffs);
    if (!mesh) return null;
    // Hide placeholder capsule children, attach race
    ally.model.traverse((c) => {
      if ((c as THREE.Mesh).isMesh && c.parent === ally.model) {
        c.visible = false;
      }
    });
    ally.model.add(mesh);
    return mesh;
  }

  /** Show T0 weapon mesh on race pack when buildings unlock training. */
  private applyT0Visual(root: THREE.Object3D, raceId: string): void {
    const race = RACE_GRUDGE6[raceId] ?? RACE_GRUDGE6.human;
    try {
      const em = setupGrudge6Equipment(race.prefix, root, defaultModel3d(raceId, {
        weaponSlots: { sword: 'A' },
        equippedMeshes: { body: 'A', arms: 'A', legs: 'A', head: 'A' },
      }));
      em.equipWeapon('sword', 'A');
      root.userData.equipT0 = true;
      root.userData.t0Loadout = CAMP_UNIT_T0_LOADOUT;
    } catch {
      /* ignore */
    }
  }
}

/** Hotkey list for UI */
export function campOrderHotkeyList(): typeof CAMP_UNIT_ORDERS {
  return CAMP_UNIT_ORDERS;
}
