/**
 * Colyseus game server setup (v0.17).
 *
 * Shares the Express HTTP server used by Railway for REST APIs.
 * CRITICAL (0.17): when NOT calling gameServer.listen() (because Express already
 * owns httpServer.listen), we must:
 *   1. await matchMaker.accept()  — marks process READY for room creation
 *   2. app.use(createNodeMatchmakingMiddleware()) — HTTP POST /matchmake/*
 *      used by colyseus.js Client.joinOrCreate()
 *
 * Without both steps, clients get 404 on matchmake and lobbies appear "failed".
 */
import {
  Server,
  matchMaker,
  createNodeMatchmakingMiddleware,
} from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { playground } from "@colyseus/playground";
import { monitor } from "@colyseus/monitor";
import { LobbyRoom } from "./rooms/LobbyRoom";
import { DungeonRoom } from "./rooms/DungeonRoom";
import { SectorRoom } from "./rooms/SectorRoom";
import { WorldRoom } from "./rooms/WorldRoom";
import { TownRoom } from "./rooms/TownRoom";
import { ShipwreckRoom } from "./rooms/ShipwreckRoom";
import { HomeIslandRoom } from "./rooms/HomeIslandRoom";
import { setupMapRoutes } from "./routes/mapAdmin";
import type { Server as HttpServer } from "http";
import type { Express, Request, Response } from "express";

let gameServer: Server | null = null;

const ROOM_NAMES = [
  "lobby",
  "dungeon",
  "sector",
  "world",
  "town",
  "shipwreck",
  "home_island",
] as const;

export async function setupColyseus(httpServer: HttpServer, app: Express) {
  gameServer = new Server({
    // Don't greet twice / pollute Railway logs in prod
    greet: process.env.NODE_ENV !== "production",
    transport: new WebSocketTransport({
      server: httpServer,
      // Slightly more tolerant for Railway edge latency
      pingInterval: 5000,
      pingMaxRetries: 3,
      verifyClient: (info, callback) => {
        const protocol = info.req.headers["sec-websocket-protocol"];
        // Vite HMR also uses WS on the same host in dev — reject it from Colyseus
        if (protocol === "vite-hmr") {
          callback(false);
          return;
        }
        callback(true);
      },
    }),
  });

  // ── Room definitions ────────────────────────────────────────────────────
  gameServer.define("lobby", LobbyRoom);
  gameServer.define("dungeon", DungeonRoom);
  gameServer.define("sector", SectorRoom).filterBy(["sectorId", "worldSeed"]);
  gameServer.define("world", WorldRoom);
  gameServer.define("town", TownRoom);
  gameServer.define("shipwreck", ShipwreckRoom);
  gameServer.define("home_island", HomeIslandRoom);

  // ── Activate matchmaker (replaces gameServer.listen when HTTP is external) ─
  // Server constructor only runs matchMaker.setup(); accept() is required for
  // joinOrCreate / create / join to succeed.
  await matchMaker.accept();

  // ── HTTP matchmake routes (colyseus.js posts to /matchmake/:method/:room) ─
  // Must be registered before SPA/static catch-alls (caller order is fine).
  app.use(createNodeMatchmakingMiddleware());

  // Health / diagnostics for ops
  app.get("/api/colyseus/health", async (_req: Request, res: Response) => {
    try {
      const rooms = await matchMaker.query({});
      res.json({
        ok: true,
        matchMakerReady: true,
        definedRooms: [...ROOM_NAMES],
        activeRooms: rooms.map((r) => ({
          roomId: r.roomId,
          name: r.name,
          clients: r.clients,
          maxClients: r.maxClients,
        })),
        processId: matchMaker.processId,
      });
    } catch (e) {
      res.status(500).json({
        ok: false,
        error: (e as Error).message,
      });
    }
  });

  // Dev tools (monitor already exists in prod — useful for debugging lobbies)
  app.use("/colyseus-playground", playground());
  app.use("/colyseus", monitor());

  // Map data + admin API routes
  setupMapRoutes(app);

  console.log("[colyseus] Game server initialized (matchMaker READY)");
  console.log("[colyseus] Rooms:", ROOM_NAMES.join(", "));
  console.log("[colyseus] Matchmake: POST /matchmake/joinOrCreate/:roomName");
  console.log("[colyseus] Health: GET /api/colyseus/health");
  console.log("[colyseus] Monitor: /colyseus");

  return gameServer;
}

export function getGameServer(): Server | null {
  return gameServer;
}
