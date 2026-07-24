/**
 * Colyseus reconnection helper — industry default for combat/sector rooms.
 *
 * On non-consented leave (network drop), hold the seat for RECONNECT_SECONDS
 * so the client can call client.reconnect(reconnectionToken).
 * On consented leave (user quit), drop immediately.
 *
 * Docs: docs/INDUSTRY_BEST_PRACTICES_MP_PERF.md
 */
import type { Client, Room } from "colyseus";

/** Combat / zone rejoin window (seconds) */
export const RECONNECT_SECONDS = 60;

/** Lobby / social rooms — shorter seat hold */
export const RECONNECT_SECONDS_LOBBY = 30;

/**
 * @param room - Colyseus room instance (`this` in onLeave)
 * @param client - leaving client
 * @param consented - true when user intentionally left
 * @param onDrop - remove player from state / cleanup (called once, after fail or consent)
 * @param onRejoined - optional: mark player connected again after successful rejoin
 */
export async function leaveWithReconnect(
  room: Room,
  client: Client,
  consented: boolean | undefined,
  onDrop: () => void,
  onRejoined?: () => void,
  seconds: number = RECONNECT_SECONDS,
): Promise<void> {
  if (consented) {
    onDrop();
    return;
  }
  try {
    await room.allowReconnection(client, seconds);
    onRejoined?.();
  } catch {
    onDrop();
  }
}
