/**
 * WarMatchRules — Conqueror's Blade siege round rules.
 *
 * - Round length: 10 minutes
 * - Win: capture all 3 zones, or most zones when timer ends
 * - Tie-break: wall breaches + field units remaining
 */
import type { CaptureOwner } from './WarCaptureZone';
import { countZoneOwners, type WarCaptureZone } from './WarCaptureZone';

export const ROUND_DURATION_SEC = 10 * 60; // 10 minutes

export type MatchOutcome =
  | { kind: 'ongoing' }
  | { kind: 'victory'; winner: 'crimson' | 'azure' | 'gold' | 'draw'; reason: string };

export interface MatchHud {
  timeLeft: number;
  timeTotal: number;
  zoneOwners: Record<string, number>;
  zones: Array<{
    id: string;
    label: string;
    owner: CaptureOwner;
    progress: number;
    capturer: CaptureOwner | null;
  }>;
  catapults: number;
  wallsIntact: number;
  wallsDestroyed: number;
}

/** Seconds after siege start before wipe / zone-sweep can end the match */
export const MATCH_GRACE_SEC = 60;

export function evaluateMatchEnd(opts: {
  timeLeft: number;
  zones: WarCaptureZone[];
  crimsonAlive: number;
  azureAlive: number;
  wallsDestroyed: number;
  /** Elapsed seconds in siege phase */
  siegeAge?: number;
  /** Peak living counts (prevents "never spawned" false wipe) */
  crimsonPeak?: number;
  azurePeak?: number;
}): MatchOutcome {
  const age = opts.siegeAge ?? 999;
  const inGrace = age < MATCH_GRACE_SEC;
  const counts = countZoneOwners(opts.zones);
  const total = opts.zones.length;

  // Sweep victory — only after grace (zones start owned by azure)
  if (!inGrace) {
    for (const side of ['crimson', 'azure', 'gold'] as const) {
      if ((counts[side] ?? 0) >= total && total > 0) {
        return {
          kind: 'victory',
          winner: side,
          reason: `${side} captured all ${total} zones`,
        };
      }
    }
  }

  // Wipe — only if both sides actually fielded units and grace elapsed
  const crimsonPeak = opts.crimsonPeak ?? opts.crimsonAlive;
  const azurePeak = opts.azurePeak ?? opts.azureAlive;
  const bothFielded = crimsonPeak > 0 && azurePeak > 0;
  if (!inGrace && bothFielded) {
    if (opts.crimsonAlive <= 0 && opts.azureAlive > 0) {
      return { kind: 'victory', winner: 'azure', reason: 'Crimson army destroyed' };
    }
    if (opts.azureAlive <= 0 && opts.crimsonAlive > 0) {
      return { kind: 'victory', winner: 'crimson', reason: 'Azure army destroyed' };
    }
  }

  // Timer
  if (opts.timeLeft <= 0) {
    const c = counts.crimson ?? 0;
    const a = counts.azure ?? 0;
    const g = counts.gold ?? 0;
    if (c > a && c > g) {
      return { kind: 'victory', winner: 'crimson', reason: `Time up — zones ${c}-${a}` };
    }
    if (a > c && a > g) {
      return { kind: 'victory', winner: 'azure', reason: `Time up — zones ${a}-${c}` };
    }
    if (g > c && g > a) {
      return { kind: 'victory', winner: 'gold', reason: `Time up — zones held` };
    }
    // Tie-break walls / field
    if (opts.crimsonAlive !== opts.azureAlive) {
      return {
        kind: 'victory',
        winner: opts.crimsonAlive > opts.azureAlive ? 'crimson' : 'azure',
        reason: 'Time up — more units remain',
      };
    }
    return { kind: 'victory', winner: 'draw', reason: 'Time up — stalemate' };
  }

  return { kind: 'ongoing' };
}

export function formatClock(sec: number): string {
  const s = Math.max(0, Math.ceil(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}
