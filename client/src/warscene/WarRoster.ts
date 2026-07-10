/**
 * WarRoster — ordered companies + siege options (Conqueror's Blade deploy list).
 */
import type { WarFactionId, WarRole } from '@shared/definitions/medievalBattleScene';

export type RosterKind = 'company' | 'siege' | 'hero';

export interface RosterEntry {
  id: string;
  kind: RosterKind;
  label: string;
  faction: WarFactionId;
  role: WarRole | 'siege' | 'hero';
  /** Deploy cost / order weight (lower = earlier) */
  order: number;
  /** How many of this entry to field at open */
  count: number;
  description: string;
  /** Siege only */
  siegeType?: 'catapult' | 'ram' | 'tower';
  selected: boolean;
}

/** Default ordered deploy list for a faction */
export function buildFactionRoster(faction: WarFactionId): RosterEntry[] {
  const isAttacker = faction === 'crimson';
  const entries: RosterEntry[] = [
    {
      id: `${faction}_infantry`,
      kind: 'company',
      label: 'Line Infantry',
      faction,
      role: 'infantry',
      order: 10,
      count: isAttacker ? 6 : 5,
      description: 'Melee front. Holds ground and pushes gates.',
      selected: true,
    },
    {
      id: `${faction}_archers`,
      kind: 'company',
      label: 'Archer Company',
      faction,
      role: 'archer',
      order: 20,
      count: isAttacker ? 3 : 4,
      description: 'Ranged fire from walls or beach.',
      selected: true,
    },
    {
      id: `${faction}_captain`,
      kind: 'company',
      label: 'Captain Guard',
      faction,
      role: 'captain',
      order: 5,
      count: 1,
      description: 'Elite leader. High HP and warcry.',
      selected: true,
    },
  ];

  if (isAttacker) {
    entries.push({
      id: `${faction}_catapult`,
      kind: 'siege',
      label: 'Field Catapult',
      faction,
      role: 'siege',
      order: 1,
      count: 1,
      description: 'Starts firing on round start. Damages walls until breached.',
      siegeType: 'catapult',
      selected: true,
    });
  } else {
    entries.push({
      id: `${faction}_support`,
      kind: 'company',
      label: 'Keep Guard',
      faction,
      role: 'support',
      order: 15,
      count: 2,
      description: 'Defenders of the inner keep.',
      selected: true,
    });
  }

  return entries.sort((a, b) => a.order - b.order);
}

export function sumSelected(entries: RosterEntry[]): number {
  return entries.filter((e) => e.selected && e.kind === 'company').reduce((n, e) => n + e.count, 0);
}

export function hasSelectedSiege(entries: RosterEntry[], type: string): boolean {
  return entries.some((e) => e.selected && e.kind === 'siege' && e.siegeType === type);
}
