/**
 * DungeonRoom.ts
 * ─────────────────────────────────────────────────────────────
 * Instanced dungeon room entered from cave portals in SectorRooms.
 *
 * Features:
 *   - Multi-floor progression (clear all enemies → next floor)
 *   - Boss fight on final floor with 3-phase mechanics
 *   - Loot drops with rarity tiers
 *   - Party scaling (enemy HP/count scales with players)
 *   - Completion tracking
 *   - Exit portal returns players to their source sector
 *   - Self-disposes when empty or after completion timeout
 * ─────────────────────────────────────────────────────────────
 */

import { Room, Client } from "colyseus";
import { Schema, MapSchema, type } from "@colyseus/schema";

// ── Schemas ─────────────────────────────────────────────────

class DungeonPlayer extends Schema {
  @type("string")  id: string = "";
  @type("string")  accountId: string = "";
  @type("string")  characterId: string = "";
  @type("string")  characterName: string = "";
  @type("string")  heroClass: string = "";
  @type("number")  level: number = 1;
  @type("number")  x: number = 0;
  @type("number")  y: number = 0;
  @type("number")  z: number = 0;
  @type("number")  facing: number = 0;
  @type("string")  action: string = "idle";
  @type("number")  health: number = 200;
  @type("number")  maxHealth: number = 200;
  @type("boolean") isReady: boolean = false;
  @type("boolean") isAlive: boolean = true;
  @type("string")  sourceSector: string = "CENTER";
}

class DungeonMonster extends Schema {
  @type("string")  id: string = "";
  @type("string")  monsterType: string = "";
  @type("number")  x: number = 0;
  @type("number")  y: number = 0;
  @type("number")  z: number = 0;
  @type("number")  health: number = 50;
  @type("number")  maxHealth: number = 50;
  @type("number")  level: number = 1;
  @type("string")  state: string = "idle";
  @type("boolean") isBoss: boolean = false;
  @type("number")  phase: number = 1;
}

class LootItem extends Schema {
  @type("string") id: string = "";
  @type("string") name: string = "";
  @type("string") rarity: string = "common";
  @type("string") itemType: string = "";
  @type("number") value: number = 0;
  @type("number") x: number = 0;
  @type("number") z: number = 0;
}

class DungeonState extends Schema {
  @type("string")  dungeonId: string = "";
  @type("string")  dungeonName: string = "";
  @type("string")  dungeonType: string = "cave";
  @type("number")  difficulty: number = 1;
  @type("number")  currentFloor: number = 1;
  @type("number")  totalFloors: number = 1;
  @type("number")  tick: number = 0;
  @type("string")  phase: string = "waiting";
  @type("boolean") exitPortalOpen: boolean = false;
  @type({ map: DungeonPlayer })  players = new MapSchema<DungeonPlayer>();
  @type({ map: DungeonMonster }) monsters = new MapSchema<DungeonMonster>();
  @type({ map: LootItem })      loot = new MapSchema<LootItem>();
  @type({ map: "boolean" })     discoveredTiles = new MapSchema<boolean>();
  @type("number")  monstersKilled: number = 0;
  @type("number")  monstersTotal: number = 0;
  @type("string")  bossName: string = "";
}

// ── Constants ───────────────────────────────────────────────

const TICK_RATE = 20;
const DUNGEON_TIMEOUT_MS = 30 * 60 * 1000;
const COMPLETION_LINGER_MS = 60_000;
const FLOOR_SIZE = 100;
const ENEMIES_BASE = 5;
const ENEMIES_PER_PLAYER = 2;
const HP_SCALE_PER_PLAYER = 0.25;

const LOOT_WEIGHTS: Record<string, number> = { common: 0.50, uncommon: 0.25, rare: 0.15, epic: 0.08, legendary: 0.02 };
const LOOT_VALUES: Record<string, number> = { common: 5, uncommon: 15, rare: 50, epic: 150, legendary: 500 };
const LOOT_NAMES: Record<string, string[]> = {
  weapons: ["Rusty Cutlass", "Storm Blade", "Void Dagger", "Ember Axe", "Leviathan Harpoon"],
  armor:   ["Barnacle Plate", "Tide Guard", "Ash Mail", "Crystal Vest", "Abyssal Shell"],
  relics:  ["Odin's Shard", "Madra's Eye", "Omni Fragment", "Gould Ember", "Echo Stone"],
  gold:    ["Gold Pouch", "Treasure Chest", "Jeweled Crown", "Ancient Coins", "Ruby Chalice"],
  mixed:   ["Supply Crate", "Salvage Kit", "Pirate Stash", "Sealed Barrel", "Driftwood Chest"],
};

interface DungeonJoinOptions {
  dungeonId?: string; dungeonName?: string; dungeonType?: string;
  floors?: number; difficulty?: number;
  bossId?: string; bossName?: string; bossHp?: number;
  enemyTypes?: string[]; lootTheme?: string;
  accountId?: string; characterId?: string; characterName?: string;
  heroClass?: string; level?: number; sourceSector?: string;
}

// ── Room ────────────────────────────────────────────────────

export class DungeonRoom extends Room<DungeonState> {
  maxClients = 4;
  private config: DungeonJoinOptions = {};
  private timeoutH: ReturnType<typeof setTimeout> | null = null;
  private completeH: ReturnType<typeof setTimeout> | null = null;

  onCreate(options: DungeonJoinOptions) {
    this.config = options;
    const s = new DungeonState();
    s.dungeonId = options.dungeonId || `d_${Date.now()}`;
    s.dungeonName = options.dungeonName || "Unknown Dungeon";
    s.dungeonType = options.dungeonType || "cave";
    s.difficulty = options.difficulty || 1;
    s.totalFloors = options.floors || 1;
    s.bossName = options.bossName || "Dungeon Boss";
    s.phase = "waiting";
    this.setState(s);
    this.setMetadata({ dungeonId: s.dungeonId, dungeonName: s.dungeonName, difficulty: s.difficulty });

    this.setSimulationInterval((dt) => {
      s.tick++;
      if (s.phase === "active" || s.phase === "boss") { this.updateAI(); this.checkClear(); }
    }, 1000 / TICK_RATE);

    this.timeoutH = setTimeout(() => {
      if (s.phase !== "complete") { s.phase = "failed"; this.broadcast("dungeon_timeout", {}); this.disconnect(); }
    }, DUNGEON_TIMEOUT_MS);

    this.onMessage("ready", (c) => { const p = s.players.get(c.sessionId); if (p) { p.isReady = true; this.tryStart(); } });
    this.onMessage("move", (c, d: any) => { const p = s.players.get(c.sessionId); if (p?.isAlive) { p.x = d.x; p.y = d.y; p.z = d.z; p.facing = d.facing; p.action = d.action; this.discover(d.x, d.z); } });
    this.onMessage("attack", (c, d: any) => this.attack(c, d));
    this.onMessage("pickup_loot", (c, d: any) => { const i = s.loot.get(d.lootId); if (i) { s.loot.delete(d.lootId); c.send("loot_acquired", { id: i.id, name: i.name, rarity: i.rarity, itemType: i.itemType, value: i.value }); } });
    this.onMessage("exit_dungeon", (c) => { const p = s.players.get(c.sessionId); if (p) c.send("return_to_sector", { sectorId: p.sourceSector }); });

    console.log(`[Dungeon] ${s.dungeonName} created (${s.totalFloors} floors, diff ${s.difficulty})`);
  }

  onJoin(c: Client, o: DungeonJoinOptions) {
    const p = new DungeonPlayer();
    p.id = c.sessionId; p.accountId = o.accountId || ""; p.characterId = o.characterId || "";
    p.characterName = o.characterName || "Hero"; p.heroClass = o.heroClass || "warrior";
    p.level = o.level || 1; p.sourceSector = o.sourceSector || "CENTER";
    p.x = FLOOR_SIZE / 2 + (Math.random() - 0.5) * 10; p.z = FLOOR_SIZE - 10;
    p.health = 200 + p.level * 10; p.maxHealth = p.health;
    this.state.players.set(c.sessionId, p);
    console.log(`[Dungeon:${this.state.dungeonName}] ${p.characterName} joined`);
  }

  onLeave(c: Client) { this.state.players.delete(c.sessionId); }

  onDispose() {
    if (this.timeoutH) clearTimeout(this.timeoutH);
    if (this.completeH) clearTimeout(this.completeH);
    console.log(`[Dungeon:${this.state.dungeonName}] Disposed`);
  }

  // ── Start ─────────────────────────────────────────────────

  private tryStart() {
    if (this.state.phase !== "waiting") return;
    let ok = true; this.state.players.forEach(p => { if (!p.isReady) ok = false; });
    if (ok && this.state.players.size > 0) this.startFloor();
  }

  private startFloor() {
    const fl = this.state.currentFloor;
    const isBoss = fl === this.state.totalFloors;
    this.state.phase = isBoss ? "boss" : "active";
    this.state.monstersKilled = 0;
    this.state.monsters.clear(); this.state.loot.clear();

    const pc = Math.max(1, this.state.players.size);
    const types = this.config.enemyTypes || ["goblin", "skeleton"];

    if (isBoss) {
      const b = new DungeonMonster();
      b.id = `boss_${this.state.dungeonId}`; b.monsterType = this.config.bossId || "boss";
      b.isBoss = true; b.phase = 1; b.x = FLOOR_SIZE / 2; b.z = 15;
      const hp = this.config.bossHp || 1000;
      b.maxHealth = Math.round(hp * (1 + (pc - 1) * HP_SCALE_PER_PLAYER)); b.health = b.maxHealth;
      b.level = this.state.difficulty * 2 + fl;
      this.state.monsters.set(b.id, b);
      for (let i = 0; i < 2 + pc; i++) this.spawnMob(types, fl, pc);
      this.state.monstersTotal = 3 + pc;
    } else {
      const n = ENEMIES_BASE + fl * 2 + (pc - 1) * ENEMIES_PER_PLAYER;
      for (let i = 0; i < n; i++) this.spawnMob(types, fl, pc);
      this.state.monstersTotal = n;
    }
    this.broadcast("floor_started", { floor: fl, isBossFloor: isBoss, monstersTotal: this.state.monstersTotal, bossName: isBoss ? this.state.bossName : null });
  }

  private spawnMob(types: string[], floor: number, pc: number) {
    const m = new DungeonMonster();
    m.id = `mob_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    m.monsterType = types[Math.floor(Math.random() * types.length)];
    m.level = this.state.difficulty + floor;
    const hp = 30 + m.level * 15;
    m.maxHealth = Math.round(hp * (1 + (pc - 1) * HP_SCALE_PER_PLAYER * 0.5)); m.health = m.maxHealth;
    m.x = 10 + Math.random() * (FLOOR_SIZE - 20); m.z = 10 + Math.random() * (FLOOR_SIZE - 30);
    this.state.monsters.set(m.id, m);
  }

  private checkClear() {
    if (this.state.tick % 20 !== 0 || this.state.monsters.size > 0) return;
    if (this.state.currentFloor < this.state.totalFloors) {
      this.state.currentFloor++;
      this.broadcast("floor_cleared", { floor: this.state.currentFloor - 1, nextFloor: this.state.currentFloor });
      this.clock.setTimeout(() => this.startFloor(), 3000);
    } else {
      this.complete();
    }
  }

  // ── Combat ────────────────────────────────────────────────

  private attack(c: Client, d: { targetId: string; skillId: string; damage: number }) {
    const p = this.state.players.get(c.sessionId);
    const m = this.state.monsters.get(d.targetId);
    if (!p?.isAlive || !m) return;
    const dmg = Math.max(1, Math.round(d.damage || 10 + Math.random() * 10));
    m.health = Math.max(0, m.health - dmg);
    this.broadcast("combat_hit", { attackerId: c.sessionId, targetId: d.targetId, damage: dmg, targetHp: m.health, isBoss: m.isBoss });

    if (m.isBoss && m.health > 0) {
      const pct = m.health / m.maxHealth;
      if (pct <= 0.3 && m.phase < 3) { m.phase = 3; this.broadcast("boss_phase", { phase: 3, message: "ENRAGE!" }); }
      else if (pct <= 0.6 && m.phase < 2) {
        m.phase = 2; this.broadcast("boss_phase", { phase: 2, message: "Reinforcements!" });
        const types = this.config.enemyTypes || ["skeleton"];
        for (let i = 0; i < this.state.players.size; i++) this.spawnMob(types, this.state.currentFloor, this.state.players.size);
      }
    }

    if (m.health <= 0) {
      this.state.monstersKilled++;
      this.dropLoot(m.x, m.z, m.isBoss);
      this.clock.setTimeout(() => this.state.monsters.delete(d.targetId), 1500);
      this.broadcast("enemy_killed", { monsterId: d.targetId, killerId: c.sessionId, isBoss: m.isBoss, xp: m.level * (m.isBoss ? 50 : 10) });
    }
  }

  // ── Loot ──────────────────────────────────────────────────

  private dropLoot(x: number, z: number, boss: boolean) {
    const count = boss ? 3 + Math.floor(Math.random() * 3) : (Math.random() < 0.4 ? 1 : 0);
    const theme = this.config.lootTheme || "mixed";
    const names = LOOT_NAMES[theme] || LOOT_NAMES.mixed;
    for (let i = 0; i < count; i++) {
      const it = new LootItem();
      it.id = `loot_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      it.name = names[Math.floor(Math.random() * names.length)];
      it.rarity = this.rollRarity(boss);
      it.itemType = theme === "gold" ? "gold" : ["weapon", "armor", "relic", "material"][Math.floor(Math.random() * 4)];
      it.value = Math.round((LOOT_VALUES[it.rarity] || 5) * (1 + this.state.difficulty * 0.2));
      it.x = x + (Math.random() - 0.5) * 6; it.z = z + (Math.random() - 0.5) * 6;
      this.state.loot.set(it.id, it);
    }
  }

  private rollRarity(boss: boolean): string {
    const r = Math.random(); const boost = boss ? 0.2 : 0; let c = 0;
    for (const [k, w] of Object.entries(LOOT_WEIGHTS)) {
      c += Math.max(0.01, w - (k === "common" ? boost : -boost * 0.5));
      if (r < c) return k;
    }
    return "common";
  }

  // ── Monster AI ────────────────────────────────────────────

  private updateAI() {
    this.state.monsters.forEach((m) => {
      if (m.health <= 0) return;
      let nearest: DungeonPlayer | null = null;
      let dist = m.isBoss ? 80 : 40;
      this.state.players.forEach((p) => {
        if (!p.isAlive) return;
        const d = Math.sqrt((p.x - m.x) ** 2 + (p.z - m.z) ** 2);
        if (d < dist) { dist = d; nearest = p; }
      });
      if (nearest) {
        const dx = (nearest as DungeonPlayer).x - m.x, dz = (nearest as DungeonPlayer).z - m.z;
        const d = Math.sqrt(dx * dx + dz * dz);
        const spd = m.isBoss ? (m.phase >= 3 ? 2.5 : 1.5) : 1.8;
        if (d > 3) { m.x += (dx / d) * spd; m.z += (dz / d) * spd; m.state = "chase"; }
        else {
          m.state = "attacking";
          if (this.state.tick % 40 === 0) {
            const dmg = Math.round((5 + m.level * 2) * (m.isBoss ? 2 : 1) * (m.phase >= 3 ? 1.5 : 1));
            (nearest as DungeonPlayer).health = Math.max(0, (nearest as DungeonPlayer).health - dmg);
            this.broadcast("player_damaged", { playerId: (nearest as DungeonPlayer).id, damage: dmg, hp: (nearest as DungeonPlayer).health });
            if ((nearest as DungeonPlayer).health <= 0) {
              (nearest as DungeonPlayer).isAlive = false;
              this.broadcast("player_died", { playerId: (nearest as DungeonPlayer).id });
              this.checkWipe();
            }
          }
        }
      } else {
        m.state = "idle";
        if (Math.random() < 0.005) { m.x = Math.max(2, Math.min(FLOOR_SIZE - 2, m.x + (Math.random() - 0.5) * 8)); m.z = Math.max(2, Math.min(FLOOR_SIZE - 2, m.z + (Math.random() - 0.5) * 8)); }
      }
    });
  }

  // ── Completion ────────────────────────────────────────────

  private complete() {
    this.state.phase = "complete"; this.state.exitPortalOpen = true;
    this.broadcast("dungeon_complete", { dungeonId: this.state.dungeonId, dungeonName: this.state.dungeonName, floorsCleared: this.state.totalFloors, monstersKilled: this.state.monstersKilled });
    console.log(`[Dungeon:${this.state.dungeonName}] COMPLETE — ${this.state.monstersKilled} kills`);
    this.completeH = setTimeout(() => this.disconnect(), COMPLETION_LINGER_MS);
  }

  private checkWipe() {
    let alive = false; this.state.players.forEach(p => { if (p.isAlive) alive = true; });
    if (!alive) { this.state.phase = "failed"; this.state.exitPortalOpen = true; this.broadcast("party_wipe", {}); }
  }

  private discover(x: number, z: number) {
    const k = `${Math.floor(x / 5)},${Math.floor(z / 5)}`;
    if (!this.state.discoveredTiles.get(k)) this.state.discoveredTiles.set(k, true);
  }
}
