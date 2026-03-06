import { Server, matchMaker } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { playground } from "@colyseus/playground";
import { monitor } from "@colyseus/monitor";
import { LobbyRoom } from "./rooms/LobbyRoom";
import { DungeonRoom } from "./rooms/DungeonRoom";
import type { Server as HttpServer } from "http";
import type { Express } from "express";

let gameServer: Server | null = null;

export async function setupColyseus(httpServer: HttpServer, app: Express) {
  gameServer = new Server({
    transport: new WebSocketTransport({
      server: httpServer,
      pingInterval: 3000,
      pingMaxRetries: 2,
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

  gameServer.define("lobby", LobbyRoom);
  gameServer.define("dungeon", DungeonRoom);

  app.use("/colyseus-playground", playground);
  app.use("/colyseus", monitor());

  console.log("[colyseus] Game server initialized");
  console.log("[colyseus] Playground available at /colyseus-playground");
  console.log("[colyseus] Monitor available at /colyseus");

  return gameServer;
}

export function getGameServer(): Server | null {
  return gameServer;
}
