import { createWarCouncilRoom } from './rooms/WarCouncilRoom';
import { authenticateGameJoin } from './gameAuth';
/**
 * Colyseus game server setup (v0.17).
 *
 * Shares the Express HTTP server used by Railway for REST APIs.
 * CRITICAL (0.17): when NOT calling gameServer.listen() (because Express already
 * owns httpServer.listen), we must:
 *   1. await matchMaker.accept()  — marks process READY for room creation
 *   2. Mount HTTP POST /matchmake/* used by colyseus.js Client.joinOrCreate()
 *
 * DO NOT use createNodeMatchmakingMiddleware() after express.json():
 * that helper re-reads the raw body stream (readBody), which Express already
 * consumed — the handler hangs forever and lobbies appear "failed".
 * Use the Express-aware routes below that read req.body instead.
 */
import {
  Server,
  matchMaker,
  getBearerToken,
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
import { MULTIPLAYER_SHIPWRECK } from "../../shared/definitions/multiplayerTutorial";
import type { Server as HttpServer } from "http";
import type { Express, Request, Response, NextFunction } from "express";

let gameServer: Server | null = null;

/**
 * Room name SSOT.
 * - tutorial / shipwreck = shared multiplayer Shipwreck Cove starting shard
 * - lobby = multiplayer pirate/faction hub after the tutorial raft handoff
 * - home_island / sector / town / world / dungeon = persistent multiplayer game
 */
const ROOM_NAMES = [
  "game_lobby",
  "custom_lobby",
  "tutorial",
  "shipwreck",
  "lobby",
  "dungeon",
  "sector",
  "world",
  "town",
  "home_island",
] as const;

/**
 * Express-compatible matchmake handler.
 * Mirrors @colyseus/core default_routes.postMatchmakeMethod but uses
 * already-parsed req.body (express.json) instead of hanging on raw stream read.
 */
function mountExpressMatchmake(app: Express) {
  app.options("/matchmake/:method/:roomName", (_req: Request, res: Response) => {
    res.set(matchMaker.controller.DEFAULT_CORS_HEADERS);
    const origin = _req.headers.origin;
    if (origin) res.setHeader("Access-Control-Allow-Origin", origin);
    res.sendStatus(204);
  });

  app.post(
    "/matchmake/:method/:roomName",
    async (req: Request, res: Response, _next: NextFunction) => {
      if (matchMaker.state === matchMaker.MatchMakerState.SHUTTING_DOWN) {
        res.status(503).json({ code: 503, error: "server is shutting down" });
        return;
      }

      const method = String(req.params.method || "");
      const roomName = decodeURIComponent(String(req.params.roomName || ""));

      let clientOptions: Record<string, unknown> = {};
      if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
        clientOptions = req.body as Record<string, unknown>;
      } else if (typeof (req as any).rawBody === "string" && (req as any).rawBody) {
        try {
          clientOptions = JSON.parse((req as any).rawBody);
        } catch {
          res.status(400).json({ code: 400, error: "invalid JSON body" });
          return;
        }
      } else if (Buffer.isBuffer((req as any).rawBody) && (req as any).rawBody.length) {
        try {
          clientOptions = JSON.parse((req as any).rawBody.toString("utf8"));
        } catch {
          res.status(400).json({ code: 400, error: "invalid JSON body" });
          return;
        }
      }

      try {
        const headers = new Headers();
        for (const [key, value] of Object.entries(req.headers)) {
          if (value == null) continue;
          headers.set(key, Array.isArray(value) ? value.join(", ") : value);
        }

        const forwarded =
          (req.headers["x-forwarded-for"] as string | undefined) ??
          (req.headers["x-client-ip"] as string | undefined) ??
          (req.headers["x-real-ip"] as string | undefined) ??
          req.ip;

        const response = await matchMaker.controller.invokeMethod(
          method,
          roomName,
          clientOptions,
          {
            token: getBearerToken(req.headers.authorization || ""),
            headers,
            ip: forwarded,
            req: req as any,
          },
        );

        res.setHeader("Content-Type", "application/json");
        res.status(200).json(response);
      } catch (e: any) {
        const code = typeof e?.code === "number" ? e.code : 500;
        const httpStatus = code >= 400 && code < 600 ? code : code > 0 ? 400 : 500;
        console.error(
          `[colyseus] matchmake ${method}/${roomName} failed:`,
          e?.message || e,
        );
        res.status(httpStatus).json({
          code,
          error: e?.message || "matchmake failed",
        });
      }
    },
  );
}

export async function setupColyseus(httpServer: HttpServer, app: Express) {
  gameServer = new Server({
    greet: process.env.NODE_ENV !== "production",
    transport: new WebSocketTransport({
      server: httpServer,
      pingInterval: 5000,
      pingMaxRetries: 3,
      verifyClient: (info, callback) => {
        const protocol = info.req.headers["sec-websocket-protocol"];
        if (protocol === "vite-hmr") {
          callback(false);
          return;
        }
        callback(true);
      },
    }),
  });

  // ── Room definitions ────────────────────────────────────────────────────
  // Shared first-voyage shard. No characterId filter: joinOrCreate fills an
  // existing Shipwreck Cove room up to maxPlayers, then Colyseus creates the
  // next shard automatically. Per-character tutorial progress lives in room.
  gameServer.define(MULTIPLAYER_SHIPWRECK.roomName, ShipwreckRoom);
  gameServer.define(MULTIPLAYER_SHIPWRECK.legacyAlias, ShipwreckRoom);

  // Multiplayer social hub reached after raft completion.
  gameServer.define("lobby", LobbyRoom);
  const CouncilRoom = createWarCouncilRoom((token, options) => authenticateGameJoin(token, options, false));
  gameServer.define("game_lobby", CouncilRoom);
  gameServer.define("custom_lobby", CouncilRoom, { custom: true });

  gameServer.define("dungeon", DungeonRoom);
  gameServer.define("sector", SectorRoom).filterBy(["sectorId", "worldSeed"]);
  gameServer.define("world", WorldRoom);
  gameServer.define("town", TownRoom);
  // Owned home island — one room per owner accountId (filterBy).
  // Hosting: owner + 5 guests; harvest/build owner-only (HomeIslandRoom).
  gameServer.define("home_island", HomeIslandRoom).filterBy(["accountId"]);

  await matchMaker.accept();
  mountExpressMatchmake(app);

  app.get("/api/colyseus/health", async (_req: Request, res: Response) => {
    try {
      const rooms = await matchMaker.query({});
      res.json({
        ok: true,
        matchMakerReady: true,
        matchmake: "express-body",
        definedRooms: [...ROOM_NAMES],
        roomNotes: {
          tutorial:
            `MULTIPLAYER ${MULTIPLAYER_SHIPWRECK.mapId}/${MULTIPLAYER_SHIPWRECK.locationId} starting shard; ${MULTIPLAYER_SHIPWRECK.maxPlayers} players; per-character progression`,
          shipwreck: "legacy alias of the multiplayer tutorial room",
          lobby: "multiplayer pirate/faction hub after tutorial raft handoff",
          home_island:
            "owner + 5 guests (filterBy accountId); owner-only harvest/build; guests visit-only",
          sector: "9-sector open world zones",
          world: "overworld router / social",
        },
        activeRooms: rooms.filter(r => !r.private).map((r) => ({
          roomId: r.roomId,
          name: r.name,
          clients: r.clients,
          maxClients: r.maxClients,
          locked: r.locked,
          metadata: r.metadata,
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

  app.use("/colyseus-playground", playground());
  app.use("/colyseus", monitor());
  setupMapRoutes(app);

  console.log("[colyseus] Game server initialized (matchMaker READY)");
  console.log("[colyseus] Rooms:", ROOM_NAMES.join(", "));
  console.log(
    `[colyseus] Shipwreck tutorial: multiplayer ${MULTIPLAYER_SHIPWRECK.maxPlayers}-player shards`,
  );
  console.log("[colyseus] Matchmake: POST /matchmake/joinOrCreate/:roomName (express body)");
  console.log("[colyseus] Health: GET /api/colyseus/health");
  console.log("[colyseus] Monitor: /colyseus");

  return gameServer;
}

export function getGameServer(): Server | null {
  return gameServer;
}
