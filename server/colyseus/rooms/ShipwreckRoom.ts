/**
 * ShipwreckRoom — shared multiplayer starting adventure.
 *
 * Canonical room: joinOrCreate("tutorial", { characterId, ... })
 * Alias:          joinOrCreate("shipwreck", { characterId, ... })
 *
 * The world is shared (pirate-islands / Shipwreck Cove), while tutorial
 * progression and economy are authoritative per character. Players can see
 * and help one another without stealing resources or completing each other's
 * onboarding state.
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
import { MULTIPLAYER_SHIPWRECK } from "../../../shared/definitions/multiplayerTutorial";

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
  equippedMeshes?: Record<string, unknown>;
  weaponSlots?: Record<string, unknown>;
  skinColor?: string;
  armorColor?: string;
  shardId?: string;
  mapId?: string;
  islandId?: string;
  locationId?: string;
  gameEra?: string;
}

interface TutorialProgress {
  characterId: string;
  completedSteps: Set<string>;
  gatherCounts: {
    sticks: number;
    stones: number;
    fiber: number;
    rawMeat: number;
    cookedMeat: number;
  };
  craftedTools: Set<string>;
  campfirePlaced: boolean;
  raftDeployed: boolean;
}

const TICK_RATE = MULTIPLAYER_SHIPWRECK.movementHz;
const BOAR_SPAWN_DELAY_MS = 4_000;
const BOAR_HP = 45;
const BOAR_DAMAGE = 8;
const BOAR_XP = 25;
const TUTORIAL_LOCKED_HP = 5;
const HARVEST_COOLDOWN_MS = 450;

function emptyProgress(characterId: string): TutorialProgress {
  return {
    characterId,
    completedSteps: new Set<string>(),
    gatherCounts: {
      sticks: 0,
      stones: 0,
      fiber: 0,
      rawMeat: 0,
      cookedMeat: 0,
    },
    craftedTools: new Set<string>(),
    campfirePlaced: false,
    raftDeployed: false,
  };
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value ?? {});
  } catch {
    return "{}";
  }
}

function resourceTypeFromNodeId(nodeId: string): "forest" | "mining" | "fiber" | null {
  const id = nodeId.toLowerCase();
  if (id.includes("stone") || id.includes("rock") || id.includes("ore")) return "mining";
  if (id.includes("fiber") || id.includes("hemp") || id.includes("grass")) return "fiber";
  if (id.includes("stick") || id.includes("wood") || id.includes("tree") || id.includes("log")) return "forest";
  return null;
}

export class ShipwreckRoom extends Room<ShipwreckState> {
  maxClients = MULTIPLAYER_SHIPWRECK.maxPlayers;
  autoDispose = true;

  /** Progress is keyed by character, not room, so every player advances independently. */
  private progressByCharacter = new Map<string, TutorialProgress>();
  private sessionCharacter = new Map<string, string>();
  private boarSpawnTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private boarOwnerCharacter = new Map<string, string>();
  private harvestCooldowns = new Map<string, number>();

  onCreate(_options: TutorialJoinOptions) {
    const state = new ShipwreckState();
    // These legacy room-level identity fields intentionally remain blank in a
    // multiplayer shard. Identity lives on SectorPlayer rows.
    state.accountId = "";
    state.characterId = "";
    state.characterName = "Shipwreck Cove";
    this.setState(state);

    this.setMetadata({
      kind: "multiplayer_tutorial",
      shardId: MULTIPLAYER_SHIPWRECK.shardId,
      map: MULTIPLAYER_SHIPWRECK.mapId,
      island: MULTIPLAYER_SHIPWRECK.islandId,
      location: MULTIPLAYER_SHIPWRECK.locationId,
      gameEra: MULTIPLAYER_SHIPWRECK.gameEra,
      source: "grudge-api",
      multiplayer: true,
      maxPlayers: MULTIPLAYER_SHIPWRECK.maxPlayers,
    });

    // Shared schema exposes canonical tutorial titles only. Completion is sent
    // privately per character through tutorial_snapshot / step_complete.
    for (const step of TUTORIAL_STEPS) {
      const ts = new TutorialStep();
      ts.id = step.id;
      ts.title = step.title;
      ts.completed = false;
      state.steps.set(step.id, ts);
    }

    // Logical harvest anchors. Tutorial resources are non-competitive: requests
    // are validated/rate-limited per player and do not globally deplete nodes.
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
      node.respawnAt = 0;
      state.harvestNodes.set(n.id, node);
    }

    this.setSimulationInterval((delta) => {
      state.tick++;
      this.updateEnemyAI(delta);
    }, 1000 / TICK_RATE);

    // ── Movement / social ───────────────────────────────────────

    this.onMessage(
      "move",
      (
        client,
        data: { x: number; y: number; z: number; facing: number; state: string },
      ) => {
        const player = state.players.get(client.sessionId);
        if (!player) return;
        if (![data.x, data.y, data.z, data.facing].every(Number.isFinite)) return;
        player.x = data.x;
        player.y = data.y;
        player.z = data.z;
        player.facing = data.facing;
        player.state = String(data.state || "idle").slice(0, 24);
      },
    );

    this.onMessage("chat", (client, data: { text?: string }) => {
      const player = state.players.get(client.sessionId);
      if (!player) return;
      const text = String(data?.text || "").trim().slice(0, 240);
      if (!text) return;
      this.broadcast("chat", {
        senderId: client.sessionId,
        senderName: player.characterName,
        text,
        timestamp: Date.now(),
      });
    });

    /** Client finished wake-up cinematic. */
    this.onMessage("intro_complete", (client) => {
      this.completeStep(client, "intro_video");
      this.completeStep(client, "meet_traveler");
      client.send("ally_assist", {
        message:
          "Dock Traveler: Easy there, shipwrecked. Other survivors are washing ashore too. Harvest sticks and stones, craft T0 tools, then earn your raft to the faction islands.",
      });
    });

    // ── Per-player harvest / craft progression ──────────────────

    this.onMessage("harvest", (client, data: { nodeId: string }) => {
      const progress = this.progressForClient(client);
      if (!progress) return;

      const nodeId = String(data?.nodeId || "").trim();
      if (!nodeId) return;

      const cooldownKey = `${progress.characterId}:${nodeId}`;
      const now = Date.now();
      const availableAt = this.harvestCooldowns.get(cooldownKey) || 0;
      if (availableAt > now) return;
      this.harvestCooldowns.set(cooldownKey, now + HARVEST_COOLDOWN_MS);

      const node = state.harvestNodes.get(nodeId);
      const resourceType =
        (node?.resourceType as "forest" | "mining" | "fiber" | undefined)
        || resourceTypeFromNodeId(nodeId);
      if (!resourceType) return;

      if (resourceType === "forest") {
        progress.gatherCounts.sticks++;
        client.send("harvest_complete", {
          nodeId,
          resource: "stick",
          quantity: 1,
        });
        if (progress.gatherCounts.sticks >= 3) this.completeStep(client, "gather_sticks");
      } else if (resourceType === "mining") {
        progress.gatherCounts.stones++;
        client.send("harvest_complete", {
          nodeId,
          resource: "stone",
          quantity: 1,
        });
        if (progress.gatherCounts.stones >= 2) this.completeStep(client, "gather_stones");
      } else {
        progress.gatherCounts.fiber++;
        client.send("harvest_complete", {
          nodeId,
          resource: "fiber",
          quantity: 1,
        });
      }
    });

    /** Quick-craft from main panel / T0 wake tools. */
    this.onMessage("craft", (client, data: { recipeId: string }) => {
      this.handleCraft(client, String(data?.recipeId || ""));
    });

    /** Existing TutorialShell sends build_raft directly. */
    this.onMessage("build_raft", (client) => {
      this.handleCraft(client, "raft");
    });

    this.onMessage(
      "pve_attack",
      (client, data: { enemyId: string; damage: number }) => {
        const enemy = state.enemies.get(String(data?.enemyId || ""));
        if (!enemy || enemy.state === "dead") return;

        const damage = Math.max(1, Math.min(50, Number(data?.damage) || 1));
        enemy.hp = Math.max(0, enemy.hp - damage);
        if (enemy.hp > 0) return;

        enemy.state = "dead";
        const killerProgress = this.progressForClient(client);
        if (killerProgress) {
          killerProgress.gatherCounts.rawMeat += 1;
          this.completeStep(client, "fight_boar");
          client.send("enemy_killed", {
            enemyId: enemy.id,
            killerId: client.sessionId,
            xp: BOAR_XP,
            type: enemy.enemyType,
            loot: { rawMeat: 1 },
          });
          client.send("ally_assist", {
            message: "Boar skinned. Cook the meat at your campfire.",
          });
        }

        // Cooperative protection: if another survivor lands the final blow on
        // your spawned boar, your tutorial cannot deadlock. Both get credit.
        const ownerCharacterId = this.boarOwnerCharacter.get(enemy.id);
        if (ownerCharacterId && ownerCharacterId !== killerProgress?.characterId) {
          const ownerClient = this.clientForCharacter(ownerCharacterId);
          const ownerProgress = this.progressByCharacter.get(ownerCharacterId);
          if (ownerClient && ownerProgress) {
            ownerProgress.gatherCounts.rawMeat += 1;
            this.completeStep(ownerClient, "fight_boar");
            ownerClient.send("enemy_killed", {
              enemyId: enemy.id,
              killerId: client.sessionId,
              xp: BOAR_XP,
              type: enemy.enemyType,
              loot: { rawMeat: 1 },
              assisted: true,
            });
            ownerClient.send("ally_assist", {
              message: "Another survivor helped finish your boar. Skinning credit is yours — cook the meat at your campfire.",
            });
          }
        }

        this.broadcast("enemy_defeated_public", {
          enemyId: enemy.id,
          killerId: client.sessionId,
          killerName: state.players.get(client.sessionId)?.characterName || "Survivor",
        });

        setTimeout(() => {
          state.enemies.delete(enemy.id);
          this.boarOwnerCharacter.delete(enemy.id);
        }, 3000);
      },
    );

    /** Client finished UI/UX walkthrough panels. */
    this.onMessage("ui_tour_complete", (client) => {
      if (!this.isStepComplete(client, "cook_meat")) return;
      this.completeStep(client, "ui_ux_tour");
      client.send("ally_assist", {
        message:
          "Dock Traveler: Last craft of the shore — a raft. Build it true, board with E, then sail to your race faction island on the outer ring.",
      });
    });

    /** Client placed raft mesh in water. */
    this.onMessage("deploy_raft", (client) => {
      const progress = this.progressForClient(client);
      if (!progress || !this.isStepComplete(client, "craft_raft")) return;
      progress.raftDeployed = true;
      client.send("raft_deployed", { ready: true });
    });

    /** Client pressed E near raft — boards → multiplayer faction lobby. */
    this.onMessage("board_raft", (client) => {
      const progress = this.progressForClient(client);
      if (!progress || !this.isStepComplete(client, "craft_raft")) return;
      if (!progress.raftDeployed) progress.raftDeployed = true;

      this.completeStep(client, "board_raft");
      this.completeStep(client, "sail_faction_island");

      const race = (state.players.get(client.sessionId)?.heroRace || "human").toLowerCase();
      client.send("tutorial_complete", {
        message:
          "The Dock Traveler waves you off. Sail to your race faction island on the outer multiplayer lobby ring and report to the commander.",
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

    /** Mission bridge may explicitly report a canonical tutorial step. */
    this.onMessage("step_complete", (client, data: { stepId?: string }) => {
      const id = String(data?.stepId || "");
      if (id && state.steps.has(id)) this.completeStep(client, id);
    });

    console.log(
      `[Tutorial] Multiplayer shard created room=${this.roomId} map=${MULTIPLAYER_SHIPWRECK.mapId}/${MULTIPLAYER_SHIPWRECK.locationId} cap=${this.maxClients}`,
    );
  }

  onJoin(client: Client, options: TutorialJoinOptions) {
    const characterId = String(options.characterId || "").trim();
    if (!characterId) {
      throw new Error("characterId is required for multiplayer shipwreck tutorial");
    }

    // One live socket per character in a tutorial shard.
    let duplicate = false;
    this.state.players.forEach((p) => {
      if (p.characterId === characterId) duplicate = true;
    });
    if (duplicate) {
      throw new Error("character is already connected to Shipwreck Cove");
    }

    const player = new SectorPlayer();
    player.id = client.sessionId;
    player.accountId = String(options.accountId || "");
    player.characterId = characterId;
    player.characterName = String(options.characterName || "Shipwrecked").slice(0, 48);
    player.heroClass = String(options.heroClass || "warrior");
    player.heroRace = String(options.heroRace || "human");
    player.faction = String(options.faction || "");
    player.level = Math.max(1, Number(options.level) || 1);
    player.hp = TUTORIAL_LOCKED_HP;
    player.maxHp = TUTORIAL_LOCKED_HP;
    player.mana = 30;
    player.maxMana = 30;
    player.baseModelId = String(options.baseModelId || options.heroRace || "human");
    player.equippedMeshJson = safeJson(options.equippedMeshes);
    player.weaponSlotsJson = safeJson(options.weaponSlots);
    player.skinColor = String(options.skinColor || "#ffffff");
    player.armorColor = String(options.armorColor || "#ffffff");
    player.equippedWeaponType = String(options.equippedWeaponType || "unarmed");

    // Spread initial schema positions slightly; clients snap to real cove ground and
    // begin authoritative move updates as soon as Island3DEngine is ready.
    const slot = this.state.players.size;
    const angle = (slot % 12) * (Math.PI * 2 / 12);
    const radius = 2 + Math.floor(slot / 12) * 2;
    player.x = Math.cos(angle) * radius;
    player.y = 2;
    player.z = 40 + Math.sin(angle) * radius;

    this.state.players.set(client.sessionId, player);
    this.sessionCharacter.set(client.sessionId, characterId);
    if (!this.progressByCharacter.has(characterId)) {
      this.progressByCharacter.set(characterId, emptyProgress(characterId));
    }

    this.sendTutorialSnapshot(client);
    this.broadcastPopulation();
    this.broadcast(
      "player_joined",
      {
        sessionId: client.sessionId,
        characterId,
        characterName: player.characterName,
        heroRace: player.heroRace,
        heroClass: player.heroClass,
      },
      { except: client },
    );

    client.send("ally_assist", {
      message:
        this.clients.length > 1
          ? `Dock Traveler: ${this.clients.length} survivors are active in this Shipwreck Cove shard.`
          : "Dock Traveler: You're first on this shore. More survivors may wash in at any time.",
    });

    console.log(
      `[Tutorial] ${player.characterName} washed ashore multiplayer room=${this.roomId} players=${this.clients.length}/${this.maxClients}`,
    );
  }

  async onLeave(client: Client, consented?: boolean) {
    const { leaveWithReconnect, RECONNECT_SECONDS } = await import("../reconnect");
    await leaveWithReconnect(
      this,
      client,
      consented,
      () => {
        const characterId = this.sessionCharacter.get(client.sessionId);
        const name = this.state.players.get(client.sessionId)?.characterName || "Survivor";
        this.state.players.delete(client.sessionId);
        this.sessionCharacter.delete(client.sessionId);
        this.broadcast("player_left", {
          sessionId: client.sessionId,
          characterId,
          characterName: name,
        });
        this.broadcastPopulation();
        console.log(`[Tutorial] ${name} left multiplayer Shipwreck Cove`);
      },
      () => {
        this.sendTutorialSnapshot(client);
        this.broadcastPopulation();
        console.log("[Tutorial] Player reconnected to multiplayer Shipwreck Cove");
      },
      RECONNECT_SECONDS,
    );
  }

  onDispose() {
    for (const timer of this.boarSpawnTimers.values()) clearTimeout(timer);
    this.boarSpawnTimers.clear();
    this.boarOwnerCharacter.clear();
    this.harvestCooldowns.clear();
    console.log(`[Tutorial] Multiplayer shard disposed room=${this.roomId}`);
  }

  private handleCraft(client: Client, recipeRaw: string): void {
    const progress = this.progressForClient(client);
    if (!progress) return;
    const recipe = String(recipeRaw || "").trim();

    const t0 = TUTORIAL_T0_TOOLS.find((t) => t.id === recipe || t.itemId === recipe);
    if (t0) {
      if (progress.craftedTools.has(t0.itemId)) {
        client.send("craft_fail", { reason: "already_owned", itemId: t0.itemId });
        return;
      }
      const needFiber = t0.cost.fiber ?? 0;
      if (
        progress.gatherCounts.sticks < t0.cost.stick
        || progress.gatherCounts.stones < t0.cost.stone
        || progress.gatherCounts.fiber < needFiber
      ) {
        client.send("craft_fail", {
          reason: "materials",
          need: t0.cost,
          have: { ...progress.gatherCounts },
        });
        return;
      }
      progress.gatherCounts.sticks -= t0.cost.stick;
      progress.gatherCounts.stones -= t0.cost.stone;
      progress.gatherCounts.fiber -= needFiber;
      progress.craftedTools.add(t0.itemId);
      client.send("craft_complete", {
        itemId: t0.itemId,
        name: t0.name,
        toolType: t0.harvestToolType,
        results: t0.results,
      });
      this.completeStep(client, "craft_t0_tools");
      client.send("ally_assist", {
        message: `${t0.name} crafted. Equip it in harvest mode — ${t0.results[0]}`,
      });
      return;
    }

    const book = TUTORIAL_REVIEW_BOOKS.find((b) => b.id === recipe);
    if (book) {
      if (
        progress.gatherCounts.sticks >= book.cost.stick
        && progress.gatherCounts.stones >= book.cost.stone
        && !progress.craftedTools.has(book.id)
      ) {
        progress.gatherCounts.sticks -= book.cost.stick;
        progress.gatherCounts.stones -= book.cost.stone;
        progress.craftedTools.add(book.id);
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
        progress.gatherCounts.sticks >= 2
        && progress.gatherCounts.stones >= 1
        && !this.isStepComplete(client, "craft_campfire")
      ) {
        progress.gatherCounts.sticks -= 2;
        progress.gatherCounts.stones -= 1;
        progress.campfirePlaced = true;
        this.completeStep(client, "craft_campfire");
        client.send("craft_complete", { itemId: "campfire", name: "Campfire" });
        client.send("ally_assist", {
          message: "Campfire lit. A wild boar is nearby — defeat it! Other survivors can assist.",
        });
        this.scheduleBoar(client);
      }
      return;
    }

    if (recipe === "raft" || recipe === "craft_raft") {
      if (
        progress.gatherCounts.sticks >= 3
        && this.isStepComplete(client, "ui_ux_tour")
        && !this.isStepComplete(client, "craft_raft")
      ) {
        progress.gatherCounts.sticks -= 3;
        this.completeStep(client, "craft_raft");
        client.send("craft_complete", { itemId: "raft", name: "Raft" });
        client.send("ally_assist", {
          message: "Deploy the raft in the water, then press E to board and leave Shipwreck Cove.",
        });
      } else if (!this.isStepComplete(client, "ui_ux_tour")) {
        client.send("craft_fail", { reason: "finish_ui_tour" });
      } else {
        client.send("craft_fail", {
          reason: "materials",
          need: { stick: 3 },
          have: { ...progress.gatherCounts },
        });
      }
      return;
    }

    if (recipe === "cook_meat" || recipe === "cooked_meat") {
      if (
        progress.campfirePlaced
        && progress.gatherCounts.rawMeat >= 1
        && !this.isStepComplete(client, "cook_meat")
      ) {
        progress.gatherCounts.rawMeat -= 1;
        progress.gatherCounts.cookedMeat += 1;
        this.completeStep(client, "cook_meat");
        client.send("craft_complete", { itemId: "cooked_meat", name: "Cooked Meat" });
        client.send("ally_assist", {
          message: "Well fed. Next: learn the UI panels and basic gameplay controls.",
        });
      }
    }
  }

  private progressForClient(client: Client): TutorialProgress | null {
    const characterId = this.sessionCharacter.get(client.sessionId)
      || this.state.players.get(client.sessionId)?.characterId;
    if (!characterId) return null;
    let progress = this.progressByCharacter.get(characterId);
    if (!progress) {
      progress = emptyProgress(characterId);
      this.progressByCharacter.set(characterId, progress);
    }
    return progress;
  }

  private isStepComplete(client: Client, stepId: string): boolean {
    return this.progressForClient(client)?.completedSteps.has(stepId) ?? false;
  }

  private completeStep(client: Client, stepId: string): void {
    const progress = this.progressForClient(client);
    const step = this.state.steps.get(stepId);
    if (!progress || !step || progress.completedSteps.has(stepId)) return;

    progress.completedSteps.add(stepId);
    client.send("step_complete", { stepId, title: step.title });
    this.broadcast(
      "tutorial_progress_public",
      {
        sessionId: client.sessionId,
        characterName: this.state.players.get(client.sessionId)?.characterName || "Survivor",
        stepId,
      },
      { except: client },
    );
    console.log(
      `[Tutorial] character=${progress.characterId} step=${stepId} room=${this.roomId}`,
    );
  }

  private sendTutorialSnapshot(client: Client): void {
    const progress = this.progressForClient(client);
    if (!progress) return;
    client.send("tutorial_snapshot", {
      shardId: MULTIPLAYER_SHIPWRECK.shardId,
      roomId: this.roomId,
      playerCount: this.clients.length,
      maxPlayers: this.maxClients,
      steps: TUTORIAL_STEPS.map((step) => ({
        id: step.id,
        title: step.title,
        completed: progress.completedSteps.has(step.id),
      })),
      resources: { ...progress.gatherCounts },
      craftedTools: [...progress.craftedTools],
      raftDeployed: progress.raftDeployed,
    });
  }

  private broadcastPopulation(): void {
    this.broadcast("population", {
      players: this.clients.length,
      maxPlayers: this.maxClients,
      roomId: this.roomId,
      shardId: MULTIPLAYER_SHIPWRECK.shardId,
    });
  }

  private clientForCharacter(characterId: string): Client | null {
    for (const client of this.clients) {
      if (this.sessionCharacter.get(client.sessionId) === characterId) return client;
    }
    return null;
  }

  private scheduleBoar(client: Client): void {
    const progress = this.progressForClient(client);
    if (!progress) return;
    const existing = this.boarSpawnTimers.get(progress.characterId);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      this.boarSpawnTimers.delete(progress.characterId);
      this.spawnBoarFor(client, progress.characterId);
    }, BOAR_SPAWN_DELAY_MS);
    this.boarSpawnTimers.set(progress.characterId, timer);
  }

  private spawnBoarFor(client: Client, ownerCharacterId: string): void {
    const owner = this.state.players.get(client.sessionId);
    if (!owner) return;

    const boar = new SectorEnemy();
    boar.id = `boar_${ownerCharacterId.replace(/[^a-zA-Z0-9_-]/g, "").slice(-18)}_${Date.now()}`;
    boar.enemyType = "boar";
    const angle = Math.random() * Math.PI * 2;
    const radius = 8 + Math.random() * 7;
    boar.x = owner.x + Math.cos(angle) * radius;
    boar.y = owner.y;
    boar.z = owner.z + Math.sin(angle) * radius;
    boar.hp = BOAR_HP;
    boar.maxHp = BOAR_HP;
    boar.level = 1;
    boar.state = "idle";
    boar.targetId = client.sessionId;
    this.state.enemies.set(boar.id, boar);
    this.boarOwnerCharacter.set(boar.id, ownerCharacterId);
    this.broadcast("enemy_spawned", {
      enemyId: boar.id,
      type: "boar",
      ownerCharacterId,
      x: boar.x,
      y: boar.y,
      z: boar.z,
    });
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

      if (!nearest || nearestDist > 24) {
        enemy.state = "idle";
        return;
      }

      const p = nearest as SectorPlayer;
      enemy.targetId = p.id;

      if (nearestDist < 2.2) {
        enemy.state = "attacking";
        if (this.state.tick % TICK_RATE === 0) {
          // Shipwreck opener remains non-lethal. The client and server both
          // enforce the canonical injured 5-HP tutorial presentation.
          p.hp = TUTORIAL_LOCKED_HP;
          const targetClient = this.clients.find((c) => c.sessionId === p.id);
          targetClient?.send("player_damaged", {
            hp: TUTORIAL_LOCKED_HP,
            maxHp: TUTORIAL_LOCKED_HP,
            damage: BOAR_DAMAGE,
            tutorialInvincible: true,
          });
        }
        return;
      }

      enemy.state = "chase";
      const dx = p.x - enemy.x;
      const dz = p.z - enemy.z;
      const len = Math.sqrt(dx * dx + dz * dz) || 1;
      const speed = 0.08;
      enemy.x += (dx / len) * speed;
      enemy.z += (dz / len) * speed;
    });
  }
}
