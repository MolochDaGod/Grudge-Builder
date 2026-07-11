/**
 * LobbyRoom — multiplayer social / matchmaking hub (AFTER tutorial).
 *
 * Solo shipwreck tutorial is NOT this room.
 * Tutorial: joinOrCreate("tutorial", { characterId }) → ShipwreckRoom.
 *
 * Lobby is used once the player has a home island and is in the real game:
 * party up, chat, queue for zones/instances, return from world map, etc.
 */
import { Room, Client } from "colyseus";
import { RoomState, Player } from "../schemas/PlayerState";

interface JoinOptions {
  characterId?: string;
  characterName?: string;
  className?: string;
  level?: number;
  accountId?: string;
  sourceGame?: string;
}

export class LobbyRoom extends Room<RoomState> {
  maxClients = 50;
  /** Keep lobby alive so joinOrCreate reuses one room */
  autoDispose = false;

  onCreate(_options: unknown) {
    this.setState(new RoomState());
    this.state.roomName = "Lobby";
    this.setMetadata({ kind: "lobby", source: "grudge-api", multiplayer: true });

    this.setSimulationInterval(() => {
      this.state.tick++;
    }, 1000 / 10);

    this.onMessage("move", (client, data: { x: number; y: number }) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.x = data.x;
        player.y = data.y;
      }
    });

    this.onMessage("action", (client, data: { action: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.action = data.action;
      }
    });

    this.onMessage("chat", (client, message: string) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        this.broadcast("chat", {
          playerId: client.sessionId,
          playerName: player.characterName || "Anonymous",
          message: String(message || "").slice(0, 200),
        });
      }
    });

    console.log("[LobbyRoom] Multiplayer lobby created");
  }

  onJoin(client: Client, options: JoinOptions) {
    const player = new Player();
    player.id = client.sessionId;
    player.characterId = options.characterId || "";
    player.characterName = options.characterName || "Hero";
    player.className = options.className || "Warrior";
    player.level = options.level || 1;
    player.x = Math.floor(Math.random() * 100);
    player.y = Math.floor(Math.random() * 100);
    this.state.players.set(client.sessionId, player);
    console.log(`[LobbyRoom] ${player.characterName} joined multiplayer lobby`);
  }

  onLeave(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (player) console.log(`[LobbyRoom] ${player.characterName} left lobby`);
    this.state.players.delete(client.sessionId);
  }

  onDispose() {
    console.log("[LobbyRoom] Disposed");
  }
}
