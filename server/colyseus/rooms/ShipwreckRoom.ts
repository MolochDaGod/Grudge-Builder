/**
 * ShipwreckRoom.ts
 * ─────────────────────────────────────────────────────────────
 * Tutorial instance for new characters. Players wash ashore on a
 * small island with a wrecked ship. They learn:
 *   1. Movement (explore the wreck)
 *   2. Combat (fight shore crabs)
 *   3. Harvesting (gather driftwood & stone)
 *   4. Crafting (build a stone axe)
 *   5. Building (construct a raft to leave)
 *
 * One ShipwreckRoom per player (private instance). Completes in
 * ~5 minutes, then the player transitions to their Home Island.
 *
 * Tick rate: 10/sec (moderate — has combat + harvesting)
 * ─────────────────────────────────────────────────────────────
 */

import { Room, Client } from "colyseus";
import {
  ShipwreckState,
  TutorialStep,
  SectorPlayer,
  SectorEnemy,
  HarvestNode,
} from "../schemas/SectorState";

// ── Tutorial step definitions ────────────────────────────────────

const TUTORIAL_STEPS = [
  { id: "explore_wreck",  title: "Explore the Shipwreck" },
  { id: "fight_crab",     title: "Defeat the Shore Crab" },
  { id: "gather_wood",    title: "Gather Driftwood (×3)" },
  { id: "gather_stone",   title: "Gather Stone (×2)" },
  { id: "craft_axe",      title: "Craft a Stone Axe" },
  { id: "build_raft",     title: "Build a Raft" },
];

// ── Join options ─────────────────────────────────────────────────

interface ShipwreckJoinOptions {
  accountId?: string;
  characterId?: string;
  characterName?: string;
  heroClass?: string;
  heroRace?: string;
  faction?: string;
  level?: number;
  baseModelId?: string;
  equippedWeaponType?: string;
}

// ── Constants ────────────────────────────────────────────────────

const TICK_RATE = 10;
const ISLAND_SIZE = 200;  // small tutorial island
const CRAB_SPAWN_DELAY_MS = 10_000;
const CRAB_HP = 30;
const CRAB_DAMAGE = 5;
const CRAB_XP = 15;

// ── ShipwreckRoom ────────────────────────────────────────────────

export class ShipwreckRoom extends Room<ShipwreckState> {
  maxClients = 1; // private instance
  private crabSpawnTimer: ReturnType<typeof setTimeout> | null = null;
  private gatherCounts = { wood: 0, stone: 0 };

  onCreate(options: ShipwreckJoinOptions) {
    const state = new ShipwreckState();
    state.accountId = options.accountId || "";
    state.characterName = options.characterName || "Shipwrecked";
    this.setState(state);

    // Seed tutorial steps
    for (const step of TUTORIAL_STEPS) {
      const ts = new TutorialStep();
      ts.id = step.id;
      ts.title = step.title;
      ts.completed = false;
      state.steps.set(step.id, ts);
    }

    // Seed harvest nodes on the beach
    const nodes = [
      { id: "drift_1", type: "forest", x: 20, z: 15 },
      { id: "drift_2", type: "forest", x: -15, z: 25 },
      { id: "drift_3", type: "forest", x: 30, z: -10 },
      { id: "drift_4", type: "forest", x: -25, z: -20 },
      { id: "stone_1", type: "mining", x: 10, z: -30 },
      { id: "stone_2", type: "mining", x: -20, z: -35 },
      { id: "stone_3", type: "mining", x: 35, z: 5 },
    ];

    for (const n of nodes) {
      const node = new HarvestNode();
      node.id = n.id;
      node.resourceType = n.type;
      node.x = n.x;
      node.z = n.z;
      node.depleted = false;
      state.harvestNodes.set(n.id, node);
    }

    // Simulation loop
    this.setSimulationInterval((delta) => {
      state.tick++;
      this.updateEnemyAI(delta);
    }, 1000 / TICK_RATE);

    // ── Message handlers ──────────────────────────────────────

    // Movement
    this.onMessage("move", (client, data: { x: number; y: number; z: number; facing: number; state: string }) => {
      const player = state.players.get(client.sessionId);
      if (!player) return;
      player.x = data.x;
      player.y = data.y;
      player.z = data.z;
      player.facing = data.facing;
      player.state = data.state;

      // Check if player explored the wreck (within 15m of origin)
      if (!this.isStepComplete("explore_wreck") && Math.abs(data.x) < 15 && Math.abs(data.z) < 15) {
        this.completeStep("explore_wreck");
        // Spawn a crab after a delay
        this.crabSpawnTimer = setTimeout(() => this.spawnCrab(), CRAB_SPAWN_DELAY_MS);
      }
    });

    // PvE attack
    this.onMessage("pve_attack", (client, data: { enemyId: string; damage: number }) => {
      const enemy = state.enemies.get(data.enemyId);
      if (!enemy || enemy.state === "dead") return;

      enemy.hp = Math.max(0, enemy.hp - Math.max(1, data.damage));

      if (enemy.hp <= 0) {
        enemy.state = "dead";
        this.broadcast("enemy_killed", {
          enemyId: data.enemyId,
          killerId: client.sessionId,
          xp: CRAB_XP,
          type: enemy.enemyType,
        });

        // Mark combat step complete
        if (!this.isStepComplete("fight_crab")) {
          this.completeStep("fight_crab");
        }

        // Remove after death animation
        setTimeout(() => {
          state.enemies.delete(data.enemyId);
        }, 3000);
      }
    });

    // Harvest
    this.onMessage("harvest", (client, data: { nodeId: string }) => {
      const node = state.harvestNodes.get(data.nodeId);
      if (!node || node.depleted) return;

      node.depleted = true;
      node.respawnAt = Date.now() + 60_000; // respawn in 60s

      if (node.resourceType === "forest") {
        this.gatherCounts.wood++;
        this.broadcast("harvest_complete", {
          nodeId: data.nodeId, resource: "driftwood", quantity: 1,
        });
        if (this.gatherCounts.wood >= 3 && !this.isStepComplete("gather_wood")) {
          this.completeStep("gather_wood");
        }
      } else if (node.resourceType === "mining") {
        this.gatherCounts.stone++;
        this.broadcast("harvest_complete", {
          nodeId: data.nodeId, resource: "stone", quantity: 1,
        });
        if (this.gatherCounts.stone >= 2 && !this.isStepComplete("gather_stone")) {
          this.completeStep("gather_stone");
        }
      }
    });

    // Craft
    this.onMessage("craft", (client, data: { recipeId: string }) => {
      if (data.recipeId === "stone_axe" && !this.isStepComplete("craft_axe")) {
        if (this.gatherCounts.wood >= 1 && this.gatherCounts.stone >= 1) {
          this.gatherCounts.wood--;
          this.gatherCounts.stone--;
          this.completeStep("craft_axe");
          client.send("craft_complete", { itemId: "stone_axe", name: "Stone Axe" });
        }
      }
    });

    // Build raft
    this.onMessage("build_raft", (client) => {
      if (this.isStepComplete("craft_axe") && this.gatherCounts.wood >= 2) {
        this.gatherCounts.wood -= 2;
        state.raftBuilt = true;
        this.completeStep("build_raft");
        state.completed = true;
        client.send("tutorial_complete", {
          message: "Your raft is ready! Set sail to your Home Island.",
          nextRoom: "home_island",
        });
      }
    });

    // Intro cinematic played
    this.onMessage("intro_complete", () => {
      state.introPlayed = true;
    });

    console.log(`[ShipwreckRoom] Created for ${state.characterName}`);
  }

  onJoin(client: Client, options: ShipwreckJoinOptions) {
    const player = new SectorPlayer();
    player.id = client.sessionId;
    player.accountId = options.accountId || "";
    player.characterId = options.characterId || "";
    player.characterName = options.characterName || "Shipwrecked";
    player.heroClass = options.heroClass || "warrior";
    player.heroRace = options.heroRace || "human";
    player.faction = options.faction || "";
    player.level = options.level || 1;
    player.hp = 100;
    player.maxHp = 100;
    player.mana = 30;
    player.maxMana = 30;
    player.baseModelId = options.baseModelId || options.heroRace || "human";
    player.equippedWeaponType = options.equippedWeaponType || "unarmed";

    // Spawn on the beach near the wreck
    player.x = 0;
    player.y = 2;
    player.z = 40;

    this.state.players.set(client.sessionId, player);
    console.log(`[ShipwreckRoom] ${player.characterName} washed ashore`);
  }

  onLeave(client: Client) {
    this.state.players.delete(client.sessionId);
    console.log(`[ShipwreckRoom] Player left`);
  }

  onDispose() {
    if (this.crabSpawnTimer) clearTimeout(this.crabSpawnTimer);
    console.log(`[ShipwreckRoom] Disposed`);
  }

  // ── Helpers ────────────────────────────────────────────────────

  private isStepComplete(stepId: string): boolean {
    return this.state.steps.get(stepId)?.completed ?? false;
  }

  private completeStep(stepId: string): void {
    const step = this.state.steps.get(stepId);
    if (step && !step.completed) {
      step.completed = true;
      this.broadcast("step_complete", { stepId, title: step.title });
      console.log(`[ShipwreckRoom] Step complete: ${step.title}`);
    }
  }

  private spawnCrab(): void {
    const crab = new SectorEnemy();
    crab.id = `crab_${Date.now()}`;
    crab.enemyType = "shore_crab";
    crab.x = (Math.random() - 0.5) * 30;
    crab.z = (Math.random() - 0.5) * 30;
    crab.hp = CRAB_HP;
    crab.maxHp = CRAB_HP;
    crab.level = 1;
    crab.state = "idle";
    this.state.enemies.set(crab.id, crab);
    this.broadcast("enemy_spawned", { enemyId: crab.id, type: "shore_crab" });
  }

  private updateEnemyAI(_delta: number): void {
    // Simple crab AI: chase nearest player within 15m
    this.state.enemies.forEach((enemy) => {
      if (enemy.state === "dead") return;

      let nearest: SectorPlayer | null = null;
      let nearestDist = Infinity;

      this.state.players.forEach((player) => {
        const dx = player.x - enemy.x;
        const dz = player.z - enemy.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearest = player;
        }
      });

      if (nearest && nearestDist < 15) {
        enemy.state = "chase";
        enemy.targetId = nearest.id;
        // Move toward player
        const dx = nearest.x - enemy.x;
        const dz = nearest.z - enemy.z;
        const len = Math.sqrt(dx * dx + dz * dz);
        if (len > 2) {
          enemy.x += (dx / len) * 2 * (1 / TICK_RATE);
          enemy.z += (dz / len) * 2 * (1 / TICK_RATE);
        } else {
          enemy.state = "attacking";
          // Deal damage every second
          if (this.state.tick % TICK_RATE === 0) {
            nearest.hp = Math.max(0, nearest.hp - CRAB_DAMAGE);
            this.broadcast("player_damaged", {
              targetId: nearest.id,
              damage: CRAB_DAMAGE,
              hp: nearest.hp,
              attackerId: enemy.id,
            });
          }
        }
      } else {
        enemy.state = "idle";
        enemy.targetId = "";
      }
    });
  }
}
