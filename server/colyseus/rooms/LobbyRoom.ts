import { Room, Client } from "colyseus";
import { RoomState, Player } from "../schemas/PlayerState";

interface JoinOptions {
  characterId?: string;
  characterName?: string;
  className?: string;
  level?: number;
}

export class LobbyRoom extends Room<RoomState> {
  maxClients = 50;

  onCreate(options: any) {
    this.setState(new RoomState());
    this.state.roomName = "Lobby";

    this.setSimulationInterval((deltaTime) => {
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
          message: message.slice(0, 200)
        });
      }
    });

    console.log("LobbyRoom created");
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
    console.log(`Player ${player.characterName} joined lobby`);
  }

  onLeave(client: Client, consented: boolean) {
    const player = this.state.players.get(client.sessionId);
    if (player) {
      console.log(`Player ${player.characterName} left lobby`);
    }
    this.state.players.delete(client.sessionId);
  }

  onDispose() {
    console.log("LobbyRoom disposed");
  }
}
