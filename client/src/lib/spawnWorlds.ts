/**
 * Grudge Warlords desk → Spawn worlds.
 * Player saves stay on Railway. Spawn player.state.grudge is a mirror, written
 * by the account link, not by this page.
 * Spawn refuses to be framed (frame-ancestors 'self' https://inside.spawn.co),
 * so play opens in a named window and this origin stays in the desk tab.
 */

export type SpawnWorldId = 'warlords' | 'social';

export type SpawnWorld = {
  id: SpawnWorldId;
  title: string;
  detail: string;
  playUrl: string;
  /** Which existing ledger this world reads. Not a new store. */
  ledger: 'fleet_bag_gbux' | 'nemesis_gbux';
};

export const SPAWN_WORLDS: readonly SpawnWorld[] = [
  {
    id: 'warlords',
    title: 'Grudge Warlords',
    detail: '@racalvin/grudge-warlords',
    playUrl: 'https://www.spawn.co/@racalvin/grudge-warlords',
    ledger: 'fleet_bag_gbux',
  },
  {
    id: 'social',
    title: 'Grudge Social',
    detail: '@survival/grudge-links',
    playUrl: 'https://www.spawn.co/@survival/grudge-links/play',
    ledger: 'nemesis_gbux',
  },
];

/** Reused so switching worlds replaces the game window and leaves this tab on our domain. */
export const SPAWN_PLAY_WINDOW = 'grudgeSpawnPlay';

export function spawnWorldById(id: string | undefined): SpawnWorld | null {
  if (!id) return null;
  return SPAWN_WORLDS.find((world) => world.id === id) ?? null;
}
