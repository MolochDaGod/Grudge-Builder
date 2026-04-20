/**
 * Island Socket.IO server — port 4321
 *
 * Implements the full event protocol expected by MultiplayerSync.ts:
 *   island:join, island:leave, island:update (volatile)
 *   harvest:start, pve:attack, pvp:attack, island:chat
 *
 * Broadcasts: island:player_joined/left/moved, harvest:complete,
 *             pve:spawn/damage/kill, pvp:damage/kill, island:chat
 */
import { createServer } from "http";
import { Server, type Socket } from "socket.io";
import cors from "cors";
import express from "express";

// ─── Types ────────────────────────────────────────────────────────────────────

interface IslandPlayer {
  id: string;           // socket.id
  name: string;
  heroId?: string;
  heroClass?: string;
  heroRace?: string;
  accountId?: string;
  islandId: string;
  x: number;
  y: number;
  z: number;
  facing: number;
  state: string;
  hp: number;
  maxHp: number;
}

interface IslandEnemy {
  id: string;
  type: string;
  x: number;
  y: number;
  z: number;
  hp: number;
  maxHp: number;
  level: number;
}

interface HarvestNode {
  id: string;
  islandId: string;
  depleted: boolean;
  respawnAt: number; // ms timestamp
}

// ─── State ────────────────────────────────────────────────────────────────────

/** islandId → Map<socketId, IslandPlayer> */
const islandPlayers = new Map<string, Map<string, IslandPlayer>>();

/** islandId → Map<enemyId, IslandEnemy> */
const islandEnemies = new Map<string, Map<string, IslandEnemy>>();

/** islandId → Map<nodeId, HarvestNode> */
const islandNodes = new Map<string, Map<string, HarvestNode>>();

const ENEMY_TYPES = ["goblin", "skeleton", "orc", "troll", "bandit"];
const ENEMY_SPAWN_INTERVAL = 15_000; // ms between enemy spawns per island
const MAX_ENEMIES_PER_ISLAND = 8;
const NODE_RESPAWN_MS = 60_000;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getOrCreateIsland<T>(
  map: Map<string, Map<string, T>>,
  id: string,
): Map<string, T> {
  if (!map.has(id)) map.set(id, new Map());
  return map.get(id)!;
}

function spawnEnemy(io: Server, islandId: string): IslandEnemy | null {
  const enemies = getOrCreateIsland(islandEnemies, islandId);
  if (enemies.size >= MAX_ENEMIES_PER_ISLAND) return null;

  const type = ENEMY_TYPES[Math.floor(Math.random() * ENEMY_TYPES.length)];
  const level = Math.ceil(Math.random() * 5);
  const maxHp = 40 + level * 20;
  const enemy: IslandEnemy = {
    id: `enemy_${islandId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type,
    x: (Math.random() - 0.5) * 180,
    y: 0,
    z: (Math.random() - 0.5) * 180,
    hp: maxHp,
    maxHp,
    level,
  };
  enemies.set(enemy.id, enemy);
  io.to(islandId).emit("pve:spawn", enemy);
  return enemy;
}

function startEnemySpawner(io: Server, islandId: string): NodeJS.Timeout {
  return setInterval(() => {
    const players = islandPlayers.get(islandId);
    if (!players || players.size === 0) return; // nobody online, skip
    spawnEnemy(io, islandId);
  }, ENEMY_SPAWN_INTERVAL);
}

const islandSpawners = new Map<string, NodeJS.Timeout>();

// ─── App & HTTP server ────────────────────────────────────────────────────────

const app = express();
app.get("/health", (_req, res) => res.json({ status: "ok", service: "island-server" }));

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: [
      "http://localhost:5000",
      "http://localhost:4321",
      "http://localhost:3000",
      "https://grudgewarlords.com",
      "https://client.grudge-studio.com",
      /\.vercel\.app$/,
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
  pingInterval: 5_000,
  pingTimeout: 10_000,
});

// ─── Connection handler ───────────────────────────────────────────────────────

io.on("connection", (socket: Socket) => {
  console.log(`[island] client connected: ${socket.id}`);

  let currentIslandId: string | null = null;

  // ── island:join ─────────────────────────────────────────────────────────
  socket.on(
    "island:join",
    (
      data: {
        islandId: string;
        playerName: string;
        heroId?: string;
        heroClass?: string;
        heroRace?: string;
        accountId?: string;
      },
      callback: (response: any) => void,
    ) => {
      const { islandId, playerName, heroId, heroClass, heroRace, accountId } = data;
      if (!islandId || !playerName) {
        callback({ error: "islandId and playerName are required" });
        return;
      }

      // Leave previous island if needed
      if (currentIslandId && currentIslandId !== islandId) {
        leaveIsland(socket, currentIslandId, io);
      }

      currentIslandId = islandId;
      socket.join(islandId);

      const players = getOrCreateIsland(islandPlayers, islandId);
      const enemies = getOrCreateIsland(islandEnemies, islandId);

      const player: IslandPlayer = {
        id: socket.id,
        name: playerName,
        heroId,
        heroClass,
        heroRace,
        accountId,
        islandId,
        x: (Math.random() - 0.5) * 20,
        y: 0,
        z: (Math.random() - 0.5) * 20,
        facing: 0,
        state: "idle",
        hp: 200,
        maxHp: 200,
      };
      players.set(socket.id, player);

      // Start spawner for this island if first player
      if (!islandSpawners.has(islandId)) {
        islandSpawners.set(islandId, startEnemySpawner(io, islandId));
        // Seed initial enemies
        for (let i = 0; i < 3; i++) spawnEnemy(io, islandId);
      }

      // Notify existing players
      socket.to(islandId).emit("island:player_joined", {
        id: socket.id,
        name: playerName,
        heroId,
        heroClass,
        heroRace,
        x: player.x,
        y: player.y,
        z: player.z,
        facing: 0,
        state: "idle",
        hp: player.hp,
        maxHp: player.maxHp,
      });

      // Respond to joining player with current state
      callback({
        playerId: socket.id,
        players: [...players.values()].filter((p) => p.id !== socket.id),
        enemies: [...enemies.values()],
      });

      console.log(
        `[island] ${playerName} (${socket.id}) joined island "${islandId}" — ${players.size} player(s) online`,
      );
    },
  );

  // ── island:leave ─────────────────────────────────────────────────────────
  socket.on("island:leave", () => {
    if (currentIslandId) {
      leaveIsland(socket, currentIslandId, io);
      currentIslandId = null;
    }
  });

  // ── island:update (volatile position) ───────────────────────────────────
  socket.on(
    "island:update",
    (data: { x: number; y: number; z: number; facing: number; state: string }) => {
      if (!currentIslandId) return;
      const players = islandPlayers.get(currentIslandId);
      const player = players?.get(socket.id);
      if (!player) return;

      player.x = data.x;
      player.y = data.y;
      player.z = data.z;
      player.facing = data.facing;
      player.state = data.state;

      // Broadcast to everyone else in the island (volatile OK)
      socket.volatile.to(currentIslandId).emit("island:player_moved", {
        id: socket.id,
        x: data.x,
        y: data.y,
        z: data.z,
        facing: data.facing,
        state: data.state,
        hp: player.hp,
      });
    },
  );

  // ── harvest:start ────────────────────────────────────────────────────────
  socket.on(
    "harvest:start",
    (
      data: { nodeId: string; professionId: string },
      callback: (response: any) => void,
    ) => {
      if (!currentIslandId) {
        callback({ error: "Not in an island" });
        return;
      }

      const nodes = getOrCreateIsland(islandNodes, currentIslandId);
      let node = nodes.get(data.nodeId);

      if (node) {
        if (node.depleted) {
          const remaining = node.respawnAt - Date.now();
          if (remaining > 0) {
            callback({ error: "Node is depleted", respawnAt: node.respawnAt });
            return;
          }
          // Respawned
          node.depleted = false;
          node.respawnAt = 0;
        }
      } else {
        // First interaction — create node state
        node = {
          id: data.nodeId,
          islandId: currentIslandId,
          depleted: false,
          respawnAt: 0,
        };
        nodes.set(data.nodeId, node);
      }

      // Deplete node
      const respawnAt = Date.now() + NODE_RESPAWN_MS;
      node.depleted = true;
      node.respawnAt = respawnAt;

      const players = islandPlayers.get(currentIslandId);
      const playerName = players?.get(socket.id)?.name ?? "Unknown";

      io.to(currentIslandId).emit("harvest:complete", {
        nodeId: data.nodeId,
        playerId: socket.id,
        playerName,
        professionId: data.professionId,
        respawnAt,
      });

      callback({ success: true, respawnAt });
    },
  );

  // ── pve:attack ───────────────────────────────────────────────────────────
  socket.on(
    "pve:attack",
    (
      data: { enemyId: string; damage: number },
      callback: (response: any) => void,
    ) => {
      if (!currentIslandId) {
        callback({ error: "Not in an island" });
        return;
      }

      const enemies = islandEnemies.get(currentIslandId);
      const enemy = enemies?.get(data.enemyId);
      if (!enemy) {
        callback({ error: "Enemy not found" });
        return;
      }

      const damage = Math.max(1, Math.round(data.damage));
      enemy.hp = Math.max(0, enemy.hp - damage);

      io.to(currentIslandId).emit("pve:damage", {
        enemyId: data.enemyId,
        damage,
        hp: enemy.hp,
        attackerId: socket.id,
      });

      if (enemy.hp <= 0) {
        enemies?.delete(data.enemyId);
        const xp = 10 + enemy.level * 5;
        const gold = 5 + enemy.level * 2;

        io.to(currentIslandId).emit("pve:kill", {
          enemyId: data.enemyId,
          killerId: socket.id,
          xp,
          gold,
          type: enemy.type,
        });

        callback({ killed: true, hp: 0, xp, gold });
      } else {
        callback({ killed: false, hp: enemy.hp });
      }
    },
  );

  // ── pvp:attack ───────────────────────────────────────────────────────────
  socket.on(
    "pvp:attack",
    (data: { targetPlayerId: string; damage: number }) => {
      if (!currentIslandId) return;

      const players = islandPlayers.get(currentIslandId);
      const attacker = players?.get(socket.id);
      const target = players?.get(data.targetPlayerId);
      if (!attacker || !target) return;

      const damage = Math.max(1, Math.round(data.damage));
      target.hp = Math.max(0, target.hp - damage);

      io.to(currentIslandId).emit("pvp:damage", {
        attackerId: socket.id,
        targetId: data.targetPlayerId,
        damage,
        targetHp: target.hp,
      });

      if (target.hp <= 0) {
        io.to(currentIslandId).emit("pvp:kill", {
          killerId: socket.id,
          killerName: attacker.name,
          victimId: data.targetPlayerId,
          victimName: target.name,
        });
        // Reset victim HP so they can play on
        target.hp = target.maxHp;
      }
    },
  );

  // ── island:chat ──────────────────────────────────────────────────────────
  socket.on("island:chat", (data: { text: string }) => {
    if (!currentIslandId) return;
    const players = islandPlayers.get(currentIslandId);
    const player = players?.get(socket.id);
    if (!player) return;

    const safeText = String(data.text ?? "").slice(0, 200);
    io.to(currentIslandId).emit("island:chat", {
      id: socket.id,
      name: player.name,
      text: safeText,
    });
  });

  // ── disconnect ───────────────────────────────────────────────────────────
  socket.on("disconnect", (reason) => {
    console.log(`[island] client disconnected: ${socket.id} (${reason})`);
    if (currentIslandId) {
      leaveIsland(socket, currentIslandId, io);
    }
  });
});

// ─── Leave helper ─────────────────────────────────────────────────────────────

function leaveIsland(socket: Socket, islandId: string, io: Server): void {
  const players = islandPlayers.get(islandId);
  const player = players?.get(socket.id);

  if (player) {
    players!.delete(socket.id);
    socket.to(islandId).emit("island:player_left", {
      id: socket.id,
      name: player.name,
    });
    console.log(
      `[island] ${player.name} left island "${islandId}" — ${players!.size} remaining`,
    );

    // Clean up spawner if island is now empty
    if (players!.size === 0) {
      const spawner = islandSpawners.get(islandId);
      if (spawner) {
        clearInterval(spawner);
        islandSpawners.delete(islandId);
      }
      // Clean up island state to free memory
      islandPlayers.delete(islandId);
      islandEnemies.delete(islandId);
      islandNodes.delete(islandId);
    }
  }

  socket.leave(islandId);
}

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.ISLAND_PORT ?? "4321", 10);
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`\n[island] Socket.IO island server running on port ${PORT}`);
  console.log(`[island] Health check: http://localhost:${PORT}/health`);
  console.log("[island] Waiting for connections...\n");
});

export { io };
