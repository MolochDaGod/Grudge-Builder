/**
 * islandLore — narrative copy for the Home Island reveal / generation flow.
 * Consumed by src/pages/island-reveal.tsx (HOME_ISLAND_LORE.*).
 */

export interface HomeIslandLore {
  title: string;
  subtitle: string;
  /** Flavor line shown beneath the subtitle (the waterfall portal motif). */
  waterfall: string;
  /** Bullet rules describing how the home island works. */
  islandRules: string[];
  /** Warning shown before the player commits/locks in their island. */
  commitWarning: string;
}

export const HOME_ISLAND_LORE: HomeIslandLore = {
  title: 'The Shard Beyond the Falls',
  subtitle:
    'Every warlord is bound to a single fragment of the shattered world — an island that answers only to your Grudge ID. Beyond the roaring falls, a shard has surfaced and keyed itself to you.',
  waterfall:
    'Step through the curtain of water and the Ocean of Echoes will carry your claim to its shore. What you build here persists, even while you sail.',
  islandRules: [
    'Your home island is permanent and tied to your account — claim it once, keep it forever.',
    'Resource nodes regenerate over time; your crew auto-harvests them while you are away.',
    'Raise a Pirate Claim flag and build structures to expand your camp.',
    'Surviving crews can be attacked or allied — defend your shores in Combat mode.',
    'Re-roll now if the layout displeases you; once committed, the seed is locked in.',
  ],
  commitWarning:
    'Committing writes this island to your account and mints its overhead map. You can keep building, but the seed and shoreline are permanent. Re-roll first if you want a different layout.',
};

export default HOME_ISLAND_LORE;
