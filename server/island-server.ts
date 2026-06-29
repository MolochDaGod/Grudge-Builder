/**
 * Grudge World Server — production Socket.IO multiplayer server
 *
 * Implements the full event protocol expected by MultiplayerSync.ts:
 *   island:join, island:leave, island:update (volatile)
 *   harvest:start, pve:attack, pvp:attack, island:chat
 *
 * Broadcasts: island:player_joined/left/moved, harvest:complete,
 *             pve:spawn/damage/kill, pvp:damage/kill, island:chat
 *
 * Production features:
 *   - JWT authentication on socket connection
 *   - Per-socket rate limiting on chat/attack events
 *   - Graceful shutdown with SIGTERM/SIGINT handlers
 */
import { createServer } from "http";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { Server, type Socket } from "socket.io";
import cors from "cors";
import express from "express";
import jwt from "jsonwebtoken";
import { GRUDGE_SOCKETIO_CORS } from "./cors";

const NAVMESH_DIR = join(process.cwd(), "server", "data", "navmesh");
const LOBBY_MAP_DIR = join(process.cwd(), "public", "maps", "lobby");
const LOBBY_MODELS_DIR = join(process.cwd(), "public", "models", "lobby");

interface BakedHarvestNode {
  id: string;
  type: string;
  professionId: string;
  x: number;
  y: number;
  z: number;
}

interface BakedLobbyMap {
  version: number;
  mapId: string;
  waterLevel: number;
  harvestNodes: BakedHarvestNode[];
  spawnPoint: { x: number; y: number; z: number };
}

const bakedMapCache = new Map<string, BakedLobbyMap>();

function loadBakedLobbyMap(mapId: string): BakedLobbyMap | null {
  const safe = mapId.replace(/[^a-z0-9-]/gi, "");
  if (bakedMapCache.has(safe)) return bakedMapCache.get(safe)!;

  const candidates = [
    join(NAVMESH_DIR, `${safe}.json`),
    join(LOBBY_MAP_DIR, `${safe}.json`),
  ];

  for (const file of candidates) {
    if (!existsSync(file)) continue;
    try {
      const data = JSON.parse(readFileSync(file, "utf8")) as BakedLobbyMap;
      if (data.version === 1 && Array.isArray(data.harvestNodes)) {
        bakedMapCache.set(safe, data);
        return data;
      }
    } catch {
      // try next path
    }
  }
  return null;
}

function seedIslandHarvestNodes(islandId: string, mapId: string): void {
  const baked = loadBakedLobbyMap(mapId);
  if (!baked) return;

  const nodes = getOrCreateIsland(islandNodes, islandId);
  if (nodes.size > 0) return;

  for (const h of baked.harvestNodes) {
    nodes.set(h.id, {
      id: h.id,
      islandId,
      depleted: false,
      respawnAt: 0,
    });
  }
  console.log(`[island] Seeded ${baked.harvestNodes.length} harvest nodes for "${islandId}" (${mapId})`);
}

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

const JWT_SECRET = process.env.JWT_SECRET || "";
const REQUIRE_AUTH = !!JWT_SECRET;

// ─── Rate limiting ───────────────────────────────────────────────────────────

interface RateBucket {
  count: number;
  resetAt: number;
}

/** Per-socket rate limiter — returns true if the action is allowed */
const socketBuckets = new Map<string, Map<string, RateBucket>>();

function rateLimit(
  socketId: string,
  action: string,
  maxPerWindow: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  if (!socketBuckets.has(socketId)) socketBuckets.set(socketId, new Map());
  const buckets = socketBuckets.get(socketId)!;
  const bucket = buckets.get(action);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(action, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= maxPerWindow) return false;
  bucket.count++;
  return true;
}

function cleanupRateBuckets(socketId: string): void {
  socketBuckets.delete(socketId);
}

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

function buildServerStatus() {
  let totalPlayers = 0;
  let totalEnemies = 0;
  const islands = Array.from(islandPlayers.entries()).map(([islandId, players]) => {
    const enemyCount = islandEnemies.get(islandId)?.size ?? 0;
    totalPlayers += players.size;
    totalEnemies += enemyCount;
    return {
      islandId,
      players: players.size,
      enemies: enemyCount,
    };
  });

  return {
    online: true,
    service: "island-server",
    uptime: Math.floor(process.uptime()),
    totalPlayers,
    activeIslands: islands.length,
    totalEnemies,
    islands,
  };
}

// ─── App & HTTP server ────────────────────────────────────────────────────────

const app = express();

// CORS for HTTP endpoints (health/status checks from game client)
app.use((_req, res, next) => {
  const origin = _req.headers.origin;
  if (!origin || origin.startsWith("http://localhost") ||
      /\.grudge-studio\.com$/.test(origin) ||
      /grudgewarlords\.com$/.test(origin) ||
      /\.vercel\.app$/.test(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  }
  if (_req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// Root route — JSON status for API consumers, HTML status page for browsers
app.get("/", (_req, res) => {
  const accept = _req.headers.accept || "";
  const status = buildServerStatus();

  if (accept.includes("text/html")) {
    res.type("html").send(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Grudge World Server</title>
<style>
  body { background: #0a0a0a; color: #e5e5e5; font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
  .card { background: #1a1a1a; border: 1px solid #333; border-radius: 12px; padding: 2rem 3rem; max-width: 480px; }
  h1 { color: #f59e0b; margin: 0 0 0.5rem; font-size: 1.5rem; }
  .badge { display: inline-block; background: #16a34a; color: white; padding: 2px 10px; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }
  .stat { display: flex; justify-content: space-between; padding: 0.4rem 0; border-bottom: 1px solid #222; }
  .stat:last-child { border: none; }
  .label { color: #888; } .val { color: #f59e0b; font-weight: 600; }
  a { color: #60a5fa; }
</style></head><body>
<div class="card">
  <h1>Grudge World Server <span class="badge">ONLINE</span></h1>
  <p style="color:#888;margin:0 0 1rem">Socket.IO multiplayer server for Grudge Warlords</p>
  <div class="stat"><span class="label">Players</span><span class="val">${status.totalPlayers}</span></div>
  <div class="stat"><span class="label">Active Islands</span><span class="val">${status.activeIslands}</span></div>
  <div class="stat"><span class="label">Enemies</span><span class="val">${status.totalEnemies}</span></div>
  <div class="stat"><span class="label">Uptime</span><span class="val">${Math.floor(status.uptime / 60)}m ${status.uptime % 60}s</span></div>
  <p style="margin:1rem 0 0;font-size:0.8rem;color:#666">
    <a href="/health">/health</a> &middot; <a href="/status">/status</a> &middot;
    Game: <a href="https://grudgewarlords.com">grudgewarlords.com</a>
  </p>
</div>
</body></html>`);
  } else {
    res.json({
      service: "grudge-world-server",
      ...status,
      game: "https://grudgewarlords.com",
      docs: { health: "/health", status: "/status" },
    });
  }
});

app.get("/health", (_req, res) => res.json({ status: "ok", ...buildServerStatus() }));
app.get("/status", (_req, res) => res.json(buildServerStatus()));

function readBakedMapFile(mapId: string): string | null {
  const safe = mapId.replace(/[^a-z0-9-]/gi, "");
  for (const dir of [NAVMESH_DIR, LOBBY_MAP_DIR]) {
    const file = join(dir, `${safe}.json`);
    if (existsSync(file)) return readFileSync(file, "utf8");
  }
  return null;
}

/** Large lobby GLB assets (CDN fallback — warlords-lobby is ~564 MiB) */
app.get("/models/lobby/:mapId/scene.glb", (req, res) => {
  const mapId = String(req.params.mapId || "").replace(/[^a-z0-9-]/gi, "");
  const file = join(LOBBY_MODELS_DIR, mapId, "scene.glb");
  if (!existsSync(file)) {
    return res.status(404).json({
      error: "lobby_model_not_found",
      mapId,
      hint: "Upload to R2 CDN or place under public/models/lobby/{mapId}/scene.glb",
    });
  }
  res.setHeader("Cache-Control", "public, max-age=86400, immutable");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.type("model/gltf-binary");
  res.sendFile(file);
});

/** Full baked lobby game map (zones, POIs, harvest nodes, nav grid) */
app.get("/map/:mapId", (req, res) => {
  const mapId = String(req.params.mapId || "").replace(/[^a-z0-9-]/gi, "");
  const raw = readBakedMapFile(mapId);
  if (!raw) {
    return res.status(404).json({
      error: "map_not_found",
      mapId,
      hint: "Run npm run bake:lobby or export from /admin-island-3d",
    });
  }
  res.setHeader("Cache-Control", "public, max-age=300");
  res.type("json").send(raw);
});

/** @deprecated Use GET /map/:mapId — kept for backward compatibility */
app.get("/navmesh/:mapId", (req, res) => {
  const mapId = String(req.params.mapId || "").replace(/[^a-z0-9-]/gi, "");
  const raw = readBakedMapFile(mapId);
  if (!raw) {
    return res.status(404).json({
      error: "navmesh_not_found",
      mapId,
      hint: "Run npm run bake:lobby or export from /admin-island-3d",
    });
  }
  res.setHeader("Cache-Control", "public, max-age=300");
  res.type("json").send(raw);
});

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: GRUDGE_SOCKETIO_CORS,
  transports: ["websocket", "polling"],
  pingInterval: 5_000,
  pingTimeout: 10_000,
});

// ─── JWT Auth middleware ──────────────────────────────────────────────────────

io.use((socket, next) => {
  if (!REQUIRE_AUTH) return next(); // Dev mode — skip auth

  const token =
    socket.handshake.auth?.token ||
    socket.handshake.headers?.authorization?.replace("Bearer ", "");

  if (!token) {
    return next(new Error("Authentication required"));
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    (socket as any).grudgeId = payload.grudge_id || payload.sub || payload.id;
    (socket as any).playerName = payload.username || payload.name || "Player";
    next();
  } catch (err) {
    next(new Error("Invalid or expired token"));
  }
});

// ─── Connection handler ───────────────────────────────────────────────────────

io.on("connection", (socket: Socket) => {
  console.log(`[world] client connected: ${socket.id}${REQUIRE_AUTH ? ` (grudge_id=${(socket as any).grudgeId})` : ""}`);

  let currentIslandId: string | null = null;

  // ── island:join ─────────────────────────────────────────────────────────
  socket.on(
    "island:join",
    (
      data: {
        islandId: string;
        mapId?: string;
        playerName: string;
        heroId?: string;
        heroClass?: string;
        heroRace?: string;
        accountId?: string;
      },
      callback: (response: any) => void,
    ) => {
      const { islandId, mapId, playerName, heroId, heroClass, heroRace, accountId } = data;
      if (!islandId || !playerName) {
        callback({ error: "islandId and playerName are required" });
        return;
      }

      if (mapId) {
        seedIslandHarvestNodes(islandId, mapId);
      }

      // Leave previous island if needed
      if (currentIslandId && currentIslandId !== islandId) {
        leaveIsland(socket, currentIslandId, io);
      }

      currentIslandId = islandId;
      socket.join(islandId);

      const players = getOrCreateIsland(islandPlayers, islandId);
      const enemies = getOrCreateIsland(islandEnemies, islandId);

      const bakedSpawn = mapId ? loadBakedLobbyMap(mapId)?.spawnPoint : null;
      const player: IslandPlayer = {
        id: socket.id,
        name: playerName,
        heroId,
        heroClass,
        heroRace,
        accountId,
        islandId,
        x: bakedSpawn?.x ?? (Math.random() - 0.5) * 20,
        y: bakedSpawn?.y ?? 2,
        z: bakedSpawn?.z ?? (Math.random() - 0.5) * 20,
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

  // ── pve:attack (rate-limited: 20 attacks per second) ─────────────────────
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
      if (!rateLimit(socket.id, "pve:attack", 20, 1_000)) {
        callback({ error: "Rate limited" });
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

  // ── pvp:attack (rate-limited: 10 attacks per second) ─────────────────────
  socket.on(
    "pvp:attack",
    (data: { targetPlayerId: string; damage: number }) => {
      if (!currentIslandId) return;
      if (!rateLimit(socket.id, "pvp:attack", 10, 1_000)) return;

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

  // ── island:chat (rate-limited: 10 messages per 10s) ──────────────────────
  socket.on("island:chat", (data: { text: string }) => {
    if (!currentIslandId) return;
    if (!rateLimit(socket.id, "chat", 10, 10_000)) return; // silently drop
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
    console.log(`[world] client disconnected: ${socket.id} (${reason})`);
    cleanupRateBuckets(socket.id);
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

// ─── Graceful shutdown ────────────────────────────────────────────────────────

function gracefulShutdown(signal: string): void {
  console.log(`\n[world] Received ${signal} — shutting down gracefully...`);

  // Stop spawners
  for (const [id, timer] of islandSpawners) {
    clearInterval(timer);
  }
  islandSpawners.clear();

  // Close socket connections
  io.close(() => {
    console.log("[world] All socket connections closed.");
    httpServer.close(() => {
      console.log("[world] HTTP server closed. Goodbye.");
      process.exit(0);
    });
  });

  // Force exit after 10s if graceful shutdown stalls
  setTimeout(() => {
    console.error("[world] Forced exit after timeout.");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.WORLD_PORT ?? process.env.ISLAND_PORT ?? "4321", 10);
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`\n[world] Grudge World Server running on port ${PORT}`);
  console.log(`[world] Health check: http://localhost:${PORT}/health`);
  console.log(`[world] Auth: ${REQUIRE_AUTH ? "JWT required" : "OPEN (no JWT_SECRET set)"}`);
  console.log("[world] Waiting for connections...\n");
});

export { io };
