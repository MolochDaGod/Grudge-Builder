import { Room, Client } from "colyseus";
import { Schema, MapSchema, type } from "@colyseus/schema";

class DungeonPlayer extends Schema {
  @type("string") id: string = "";
  @type("string") characterId: string = "";
  @type("string") characterName: string = "";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("string") action: string = "idle";
  @type("number") health: number = 100;
  @type("number") maxHealth: number = 100;
  @type("boolean") isReady: boolean = false;
}

class Monster extends Schema {
  @type("string") id: string = "";
  @type("string") type: string = "";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") health: number = 50;
  @type("number") maxHealth: number = 50;
  @type("string") action: string = "idle";
}

class DungeonState extends Schema {
  @type({ map: DungeonPlayer }) players = new MapSchema<DungeonPlayer>();
  @type({ map: Monster }) monsters = new MapSchema<Monster>();
  @type({ map: "boolean" }) discoveredTiles = new MapSchema<boolean>();
  @type("number") tick: number = 0;
  @type("string") dungeonId: string = "";
  @type("number") floor: number = 1;
  @type("boolean") inCombat: boolean = false;
}

interface JoinOptions {
  characterId?: string;
  characterName?: string;
  dungeonId?: string;
}

export class DungeonRoom extends Room<DungeonState> {
  maxClients = 4;

  onCreate(options: any) {
    this.setState(new DungeonState());
    this.state.dungeonId = options.dungeonId || "default";

    this.setSimulationInterval((deltaTime) => {
      this.state.tick++;
      this.updateMonsters(deltaTime);
    }, 1000 / 20);

    this.onMessage("move", (client, data: { x: number; y: number }) => {
      const player = this.state.players.get(client.sessionId);
      if (player && !this.state.inCombat) {
        player.x = data.x;
        player.y = data.y;
        this.discoverTile(data.x, data.y);
      }
    });

    this.onMessage("attack", (client, data: { targetId: string; skillId: string }) => {
      this.handleAttack(client, data);
    });

    this.onMessage("ready", (client) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.isReady = true;
        this.checkAllReady();
      }
    });

    console.log(`DungeonRoom created: ${this.state.dungeonId}`);
  }

  private discoverTile(x: number, y: number) {
    const tileKey = `${Math.floor(x)},${Math.floor(y)}`;
    if (!this.state.discoveredTiles.get(tileKey)) {
      this.state.discoveredTiles.set(tileKey, true);
    }
  }

  private updateMonsters(deltaTime: number) {
    this.state.monsters.forEach((monster, id) => {
      if (monster.action === "idle" && Math.random() < 0.01) {
        monster.x += Math.floor(Math.random() * 3) - 1;
        monster.y += Math.floor(Math.random() * 3) - 1;
      }
    });
  }

  private handleAttack(client: Client, data: { targetId: string; skillId: string }) {
    const player = this.state.players.get(client.sessionId);
    const monster = this.state.monsters.get(data.targetId);
    
    if (player && monster) {
      const damage = 10 + Math.floor(Math.random() * 10);
      monster.health -= damage;
      
      this.broadcast("combat_result", {
        attackerId: client.sessionId,
        targetId: data.targetId,
        damage,
        skillId: data.skillId
      });

      if (monster.health <= 0) {
        this.state.monsters.delete(data.targetId);
        this.broadcast("loot_drop", {
          monsterId: data.targetId,
          items: []
        });
      }
    }
  }

  private checkAllReady() {
    let allReady = true;
    this.state.players.forEach((player) => {
      if (!player.isReady) allReady = false;
    });
    
    if (allReady && this.state.players.size > 0) {
      this.startDungeon();
    }
  }

  private startDungeon() {
    for (let i = 0; i < 3; i++) {
      const monster = new Monster();
      monster.id = `monster_${i}`;
      monster.type = ["goblin", "skeleton", "orc"][Math.floor(Math.random() * 3)];
      monster.x = 50 + Math.floor(Math.random() * 50);
      monster.y = 50 + Math.floor(Math.random() * 50);
      monster.health = 50;
      monster.maxHealth = 50;
      this.state.monsters.set(monster.id, monster);
    }
    this.broadcast("dungeon_started", { floor: this.state.floor });
  }

  onJoin(client: Client, options: JoinOptions) {
    const player = new DungeonPlayer();
    player.id = client.sessionId;
    player.characterId = options.characterId || "";
    player.characterName = options.characterName || "Hero";
    player.x = 10;
    player.y = 10;
    
    this.state.players.set(client.sessionId, player);
    console.log(`Player ${player.characterName} joined dungeon`);
  }

  onLeave(client: Client, consented: boolean) {
    this.state.players.delete(client.sessionId);
    console.log(`Player left dungeon: ${client.sessionId}`);
  }

  onDispose() {
    console.log("DungeonRoom disposed");
  }
}
