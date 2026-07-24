/**
 * ShipwreckRoom — SOLO starting adventure (private tutorial instance).
 *
 * Canonical room:  joinOrCreate("tutorial",  { characterId, … })
 * Alias:           joinOrCreate("shipwreck", { characterId, … })
 *
 * filterBy(characterId) · maxClients 1 · autoDispose
 *
 * NOT multiplayer lobby. After tutorial_complete → home-island create/cNFT,
 * then real multiplayer (home_island, lobby, sector, world map 9 sectors).
 *
 * Narrative (pirate island with wreck):
 *   intro video → sticks + stones → quick-craft campfire → boar combat
 *   → skin + cook meat → UI/UX tour → craft/deploy raft → E board raft
 *   → end cutscene → home-island video/creation
 */

import { Room, Client } from "colyseus";
import {
  ShipwreckState,
  TutorialStep,
  SectorPlayer,
  SectorEnemy,
  HarvestNode,
} from "../schemas/SectorState";
import { TUTORIAL_STEPS } from "../../../shared/definitions/tutorialFlow";
import {
  TUTORIAL_T0_TOOLS,
  TUTORIAL_REVIEW_BOOKS,
  buildShipwreckWakeHarvestNodes,
} from "../../../shared/definitions/tutorialShipwreckScene";

interface TutorialJoinOptions {
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

const TICK_RATE = 10;
const BOAR_SPAWN_DELAY_MS = 4_000;
const BOAR_HP = 45;
const BOAR_DAMAGE = 8;
const BOAR_XP = 25;

export class ShipwreckRoom extends Room<ShipwreckState> {
  maxClients = 1;
  autoDispose = true;

  private boarSpawnTimer: ReturnType<typeof setTimeout> | null = null;
  private gatherCounts = { sticks: 0, stones: 0, fiber: 0, rawMeat: 0, cookedMeat: 0 };
  private craftedTools = new Set<string>();
  private campfirePlaced = false;
  private raftDeployed = false;

  onCreate(options: TutorialJoinOptions) {
    const characterId = String(options.characterId || "").trim();
    const state = new ShipwreckState();
    state.accountId = options.accountId || "";
    state.characterId = characterId;
    state.characterName = options.characterName || "Shipwrecked";
    this.setState(state);

    this.setMetadata({
      kind: "solo_tutorial",
      map: "pirate_shipwreck_island",
      characterId,
      source: "grudge-api",
      multiplayer: false,
    });

    for (const step of TUTORIAL_STEPS) {
      const ts = new TutorialStep();
      ts.id = step.id;
      ts.title = step.title;
      ts.completed = false;
      state.steps.set(step.id, ts);
    }

    // Wake pocket sticks/stones (between wreck, boats, rocks) + a few outer nodes
    const nodes = [
      ...buildShipwreckWakeHarvestNodes(),
      { id: "stick_outer_1", type: "forest" as const, x: 18, z: 22 },
      { id: "stick_outer_2", type: "forest" as const, x: -12, z: 28 },
      { id: "stone_outer_1", type: "mining" as const, x: 12, z: -28 },
      { id: "stone_outer_2", type: "mining" as const, x: -18, z: -32 },
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

    this.setSimulationInterval((delta) => {
      state.tick++;
      this.updateEnemyAI(delta);
    }, 1000 / TICK_RATE);

    // ── Messages ─────────────────────────────────────────────────

    this.onMessage(
      "move",
      (
        client,
        data: { x: number; y: number; z: number; facing: number; state: string },
      ) => {
        const player = state.players.get(client.sessionId);
        if (!player) return;
        player.x = data.x;
        player.y = data.y;
        player.z = data.z;
        player.facing = data.facing;
        player.state = data.state;
      },
    );

    /** Client finished intro cinematic */
    this.onMessage("intro_complete", (client) => {
      state.introPlayed = true;
      this.completeStep("intro_video");
      this.completeStep("meet_traveler");
      client.send("ally_assist", {
        message:
          "Dock Traveler: Easy there, shipwrecked. I am the Dock Traveler — every race hears the same first lesson. Harvest sticks and stones by the wreck, craft T0 tools, then we build a raft to your faction island.",
      });
    });

    this.onMessage("harvest", (client, data: { nodeId: string }) => {
      const node = state.harvestNodes.get(data.nodeId);
      if (!node || node.depleted) return;

      node.depleted = true;
      node.respawnAt = Date.now() + 90_000;

      if (node.resourceType === "forest") {
        this.gatherCounts.sticks++;
        this.broadcast("harvest_complete", {
          nodeId: data.nodeId,
          resource: "stick",
          quantity: 1,
        });
        if (this.gatherCounts.sticks >= 3) this.completeStep("gather_sticks");
      } else if (node.resourceType === "mining") {
        this.gatherCounts.stones++;
        this.broadcast("harvest_complete", {
          nodeId: data.nodeId,
          resource: "stone",
          quantity: 1,
        });
        if (this.gatherCounts.stones >= 2) this.completeStep("gather_stones");
      }
    });

    /** Quick-craft from main panel / T0 wake tools */
    this.onMessage("craft", (client, data: { recipeId: string }) => {
      const recipe = String(data?.recipeId || "");

      // T0 harvest tools from sticks + stones (+ fiber for pole/bucket)
      const t0 = TUTORIAL_T0_TOOLS.find(
        (t) => t.id === recipe || t.itemId === recipe,
      );
      if (t0) {
        if (this.craftedTools.has(t0.itemId)) {
          client.send("craft_fail", { reason: "already_owned", itemId: t0.itemId });
          return;
        }
        const needFiber = t0.cost.fiber ?? 0;
        if (
          this.gatherCounts.sticks < t0.cost.stick
          || this.gatherCounts.stones < t0.cost.stone
          || this.gatherCounts.fiber < needFiber
        ) {
          client.send("craft_fail", {
            reason: "materials",
            need: t0.cost,
            have: { ...this.gatherCounts },
          });
          return;
        }
        this.gatherCounts.sticks -= t0.cost.stick;
        this.gatherCounts.stones -= t0.cost.stone;
        this.gatherCounts.fiber -= needFiber;
        this.craftedTools.add(t0.itemId);
        client.send("craft_complete", {
          itemId: t0.itemId,
          name: t0.name,
          toolType: t0.harvestToolType,
          results: t0.results,
        });
        // Unlock step after first tool + minimum materials spent learning
        if (this.craftedTools.size >= 1) {
          this.completeStep("craft_t0_tools");
        }
        client.send("ally_assist", {
          message: `${t0.name} crafted. Equip it in harvest mode — ${t0.results[0]}`,
        });
        return;
      }

      const book = TUTORIAL_REVIEW_BOOKS.find((b) => b.id === recipe);
      if (book) {
        if (
          this.gatherCounts.sticks >= book.cost.stick
          && this.gatherCounts.stones >= book.cost.stone
          && !this.craftedTools.has(book.id)
        ) {
          this.gatherCounts.sticks -= book.cost.stick;
          this.gatherCounts.stones -= book.cost.stone;
          this.craftedTools.add(book.id);
          client.send("craft_complete", {
            itemId: book.id,
            name: book.name,
            summary: book.summary,
            kind: "book",
          });
          client.send("ally_assist", {
            message: `📖 ${book.name}: ${book.summary}`,
          });
        }
        return;
      }

      if (recipe === "campfire") {
        if (
          this.gatherCounts.sticks >= 2 &&
          this.gatherCounts.stones >= 1 &&
          !this.isStepComplete("craft_campfire")
        ) {
          this.gatherCounts.sticks -= 2;
          this.gatherCounts.stones -= 1;
          this.campfirePlaced = true;
          this.completeStep("craft_campfire");
          client.send("craft_complete", {
            itemId: "campfire",
            name: "Campfire",
          });
          client.send("ally_assist", {
            message: "Campfire lit. A wild boar is nearby — defeat it!",
          });
          this.boarSpawnTimer = setTimeout(
            () => this.spawnBoar(),
            BOAR_SPAWN_DELAY_MS,
          );
        }
        return;
      }

      if (recipe === "raft" || recipe === "craft_raft") {
        if (
          this.gatherCounts.sticks >= 3 &&
          this.isStepComplete("ui_ux_tour") &&
          !this.isStepComplete("craft_raft")
        ) {
          this.gatherCounts.sticks -= 3;
          this.completeStep("craft_raft");
          client.send("craft_complete", { itemId: "raft", name: "Raft" });
          client.send("ally_assist", {
            message:
              "Deploy the raft in the water, then press E to board and leave the island.",
          });
        }
        return;
      }

      if (recipe === "cook_meat" || recipe === "cooked_meat") {
        if (
          this.campfirePlaced &&
          this.gatherCounts.rawMeat >= 1 &&
          !this.isStepComplete("cook_meat")
        ) {
          this.gatherCounts.rawMeat -= 1;
          this.gatherCounts.cookedMeat += 1;
          this.completeStep("cook_meat");
          client.send("craft_complete", {
            itemId: "cooked_meat",
            name: "Cooked Meat",
          });
          client.send("ally_assist", {
            message:
              "Well fed. Next: learn the UI panels and basic gameplay controls.",
          });
        }
      }
    });

    this.onMessage(
      "pve_attack",
      (client, data: { enemyId: string; damage: number }) => {
        const enemy = state.enemies.get(data.enemyId);
        if (!enemy || enemy.state === "dead") return;

        enemy.hp = Math.max(0, enemy.hp - Math.max(1, data.damage));
        if (enemy.hp > 0) return;

        enemy.state = "dead";
        this.gatherCounts.rawMeat += 1;
        this.broadcast("enemy_killed", {
          enemyId: data.enemyId,
          killerId: client.sessionId,
          xp: BOAR_XP,
          type: enemy.enemyType,
          loot: { rawMeat: 1 },
        });
        this.completeStep("fight_boar");
        client.send("ally_assist", {
          message: "Boar skinned. Cook the meat at your campfire.",
        });
        setTimeout(() => state.enemies.delete(data.enemyId), 3000);
      },
    );

    /** Client finished UI/UX walkthrough panels */
    this.onMessage("ui_tour_complete", (client) => {
      if (!this.isStepComplete("cook_meat")) return;
      this.completeStep("ui_ux_tour");
      client.send("ally_assist", {
        message:
          "Dock Traveler: Last craft of the shore — a raft. Build it true, board with E, then sail to your race faction island on the outer ring.",
      });
    });

    /** Client placed raft mesh in water */
    this.onMessage("deploy_raft", (client) => {
      if (!this.isStepComplete("craft_raft")) return;
      this.raftDeployed = true;
      client.send("raft_deployed", { ready: true });
    });

    /** Client pressed E near raft — boards → sail to race faction island (outer ring) */
    this.onMessage("board_raft", (client) => {
      if (!this.isStepComplete("craft_raft")) return;
      if (!this.raftDeployed) {
        // Allow board if they crafted (client may deploy+board in one action)
        this.raftDeployed = true;
      }
      this.completeStep("board_raft");
      this.completeStep("sail_faction_island");
      state.raftBuilt = true;
      state.completed = true;
      const race = (state.players.get(client.sessionId)?.heroRace || "human").toLowerCase();
      client.send("tutorial_complete", {
        message:
          "The Dock Traveler waves you off. Sail the raft to your race faction island on the outer lobby ring — report to the commander.",
        next: "faction_island_report",
        nextPath: `/island-3d?mode=lobby&map=pirate-islands&from=tutorial&race=${encodeURIComponent(race)}&focus=faction`,
        nextRoom: "lobby",
        raceId: race,
      });
      client.send("ally_assist", {
        message:
          "Traveler: Same road for every bloodline — only the shore changes. Your faction island waits on the outer ring. Dock and report to the commander.",
      });
    });

    console.log(
      `[Tutorial] Solo adventure created characterId=${characterId || "(empty)"} name=${state.characterName}`,
    );
  }

  onJoin(client: Client, options: TutorialJoinOptions) {
    const characterId = String(
      options.characterId || this.state.characterId || "",
    ).trim();
    if (!characterId) {
      throw new Error(
        "characterId is required for solo tutorial (private instance)",
      );
    }

    const player = new SectorPlayer();
    player.id = client.sessionId;
    player.accountId = options.accountId || "";
    player.characterId = characterId;
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
    // Beach near wreck
    player.x = 0;
    player.y = 2;
    player.z = 40;

    this.state.players.set(client.sessionId, player);
    console.log(`[Tutorial] ${player.characterName} washed ashore (solo)`);
  }

  async onLeave(client: Client, consented?: boolean) {
    const { leaveWithReconnect, RECONNECT_SECONDS } = await import("../reconnect");
    await leaveWithReconnect(
      this,
      client,
      consented,
      () => {
        this.state.players.delete(client.sessionId);
        console.log("[Tutorial] Player left solo adventure");
      },
      () => console.log("[Tutorial] Player reconnected"),
      RECONNECT_SECONDS,
    );
  }

  onDispose() {
    if (this.boarSpawnTimer) clearTimeout(this.boarSpawnTimer);
    console.log("[Tutorial] Instance disposed");
  }

  private isStepComplete(stepId: string): boolean {
    return this.state.steps.get(stepId)?.completed ?? false;
  }

  private completeStep(stepId: string): void {
    const step = this.state.steps.get(stepId);
    if (step && !step.completed) {
      step.completed = true;
      this.broadcast("step_complete", { stepId, title: step.title });
      console.log(`[Tutorial] Step complete: ${step.title}`);
    }
  }

  private spawnBoar(): void {
    const boar = new SectorEnemy();
    boar.id = `boar_${Date.now()}`;
    boar.enemyType = "boar";
    boar.x = (Math.random() - 0.5) * 40;
    boar.z = (Math.random() - 0.5) * 40;
    boar.hp = BOAR_HP;
    boar.maxHp = BOAR_HP;
    boar.level = 1;
    boar.state = "idle";
    this.state.enemies.set(boar.id, boar);
    this.broadcast("enemy_spawned", { enemyId: boar.id, type: "boar" });
  }

  private updateEnemyAI(_delta: number): void {
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

      if (!nearest || nearestDist > 20) {
        enemy.state = "idle";
        return;
      }

      if (nearestDist < 2.2) {
        enemy.state = "attacking";
        const p = nearest as SectorPlayer;
        // Light tick damage
        if (this.state.tick % 10 === 0) {
          p.hp = Math.max(0, p.hp - BOAR_DAMAGE);
          this.clients.forEach((c) => {
            if (this.state.players.get(c.sessionId) === p) {
              c.send("player_damaged", { hp: p.hp, maxHp: p.maxHp });
            }
          });
        }
        return;
      }

      enemy.state = "chase";
      const p = nearest as SectorPlayer;
      const dx = p.x - enemy.x;
      const dz = p.z - enemy.z;
      const len = Math.sqrt(dx * dx + dz * dz) || 1;
      const speed = 0.08;
      enemy.x += (dx / len) * speed;
      enemy.z += (dz / len) * speed;
    });
  }
}
