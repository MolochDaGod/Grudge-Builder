/**
 * @deprecated Social multi-player lobby is retired.
 *
 * Canonical "lobby" room name is now the private **shipwreck tutorial**
 * (ShipwreckRoom, filterBy characterId, maxClients 1). See:
 *   server/colyseus/rooms/ShipwreckRoom.ts
 *   server/colyseus/index.ts  → define("lobby", ShipwreckRoom)
 *
 * Social hub for many players: use room name **"world"** (WorldRoom).
 *
 * This file re-exports ShipwreckRoom so any leftover `import { LobbyRoom }`
 * still resolves to the tutorial instance class.
 */
export { ShipwreckRoom as LobbyRoom } from "./ShipwreckRoom";
