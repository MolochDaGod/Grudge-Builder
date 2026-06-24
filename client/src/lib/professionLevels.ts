import type { ProfessionLevel } from '@/lib/characterManager';

const GATHERING_KEY: Record<string, string> = {
  Mining: 'mining',
  Logging: 'logging',
  Skinning: 'skinning',
  Fishing: 'fishing',
  Herbalism: 'herbalism',
  Scavenging: 'scavenging',
};

const CRAFTING_KEY: Record<string, string> = {
  Miner: 'miner',
  Forester: 'forester',
  Mystic: 'mystic',
  Chef: 'chef',
  Engineer: 'engineer',
};

function lookup(
  levels: Record<string, ProfessionLevel> | undefined,
  key: string,
): ProfessionLevel | undefined {
  if (!levels) return undefined;
  if (levels[key]) return levels[key];
  const lower = key.toLowerCase();
  if (levels[lower]) return levels[lower];
  const title = key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
  if (levels[title]) return levels[title];
  return undefined;
}

/** Resolve profession XP/level from character data (handles legacy + DB key variants). */
export function resolveProfessionLevel(
  levels: Record<string, ProfessionLevel> | undefined,
  displayName: string,
  kind: 'gathering' | 'crafting' = 'crafting',
): ProfessionLevel {
  const canonical = kind === 'gathering'
    ? (GATHERING_KEY[displayName] || displayName.toLowerCase())
    : (CRAFTING_KEY[displayName] || displayName.toLowerCase());

  return (
    lookup(levels, displayName)
    || lookup(levels, canonical)
    || { level: 1, xp: 0 }
  );
}