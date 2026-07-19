/**
 * Grudge Game Clock + Tide SSOT
 *
 * Real wall-clock time drives events/schedules.
 * In-game time (skybox, weather, tides, minimap, sector lore) derives from wall clock.
 *
 *   1 game day  = 6 real hours
 *   1 game week = 8 game days = 48 real hours = 2 real days
 *   Tides       = 2 high/low cycles per game day (semi-diurnal)
 *
 * Tide amplitude is gentle (±22 cm). Mean sits ~0.85 m below Y=0 so high tide
 * is no longer ~1 m above docks, and low tide does not drain the map.
 */

// ── Game calendar ────────────────────────────────────────────────────────────

export const GAME_CLOCK = {
  /** Real milliseconds for one full in-game day (midnight→midnight) */
  realMsPerGameDay: 6 * 60 * 60 * 1000,
  /** Real seconds for one in-game day (DayNightCycle) */
  realSecondsPerGameDay: 6 * 60 * 60,
  /** Game days in one game week */
  gameDaysPerWeek: 8,
  /** Real ms for one game week (= 2 real days) */
  realMsPerGameWeek: 8 * 6 * 60 * 60 * 1000,
  /** Epoch anchor (UTC) for day-of-week alignment — stable across restarts */
  epochMs: Date.UTC(2026, 0, 1, 0, 0, 0),
  /**
   * 8 day names — Gods’ Days (Black Tome SSOT).
   * Oathday · Gravesday · Forge Day · Tide Day · Balance Day · Ashday · Skywatch · Night’s End
   */
  dayNames: [
    'Oathday',
    'Gravesday',
    'Forge Day',
    'Tide Day',
    'Balance Day',
    'Ashday',
    'Skywatch',
    "Night's End",
  ] as const,
  /** Six bells per game day (each = 1 real hour) */
  bells: ['Dawn', 'Rise', 'Heat', 'Ash', 'Dusk', 'Night'] as const,
  /** Four seasons × 96 game days = 384-day year */
  daysPerSeason: 96,
  daysPerYear: 384,
  weeksPerSeason: 12,
  seasons: [
    'Dawnfall Spring',
    'Iron Sun Summer',
    'Hollow Harvest Autumn',
    'Black Frost Winter',
  ] as const,
} as const;

export type GameDayName = (typeof GAME_CLOCK.dayNames)[number];
export type GameBellName = (typeof GAME_CLOCK.bells)[number];
export type GameSeasonName = (typeof GAME_CLOCK.seasons)[number];

// ── Tide (ocean height) ──────────────────────────────────────────────────────

export const TIDE_CONFIG = {
  /**
   * Mean water surface Y (world metres).
   * Previous: base 0 ± 2 m → high +2 (≈1 m too high vs docks), low −2 (far too low).
   * Now: gentle band around docks (deck ~0.2–0.35), high never floods piers hard.
   */
  baseHeight: -0.85,
  /** Half-range metres (peak-to-peak = 2 × amplitude ≈ 0.44 m) */
  amplitude: 0.22,
  /** High tides per game day (2 = semi-diurnal, real-world-like) */
  cyclesPerGameDay: 2,
} as const;

/** Full high→high period in real ms (game day / 2 when cyclesPerGameDay=2) */
export function tideCycleMs(): number {
  return GAME_CLOCK.realMsPerGameDay / TIDE_CONFIG.cyclesPerGameDay;
}

/**
 * Ocean surface Y at wall-clock time.
 * Two sine cycles per game day → high tide twice per day.
 */
export function getTideHeight(serverTimeMs: number = Date.now()): number {
  const dayPhase = getGameTimeOfDay(serverTimeMs); // 0..1
  const phase = dayPhase * Math.PI * 2 * TIDE_CONFIG.cyclesPerGameDay;
  return TIDE_CONFIG.baseHeight + Math.sin(phase) * TIDE_CONFIG.amplitude;
}

/** Tide phase 0..1 within one high→high cycle */
export function getTidePhase(serverTimeMs: number = Date.now()): number {
  const cycle = tideCycleMs();
  return ((serverTimeMs - GAME_CLOCK.epochMs) % cycle) / cycle;
}

// ── In-game time of day / calendar ───────────────────────────────────────────

/**
 * Normalized in-game time of day 0..1 (0 = midnight, 0.5 = noon).
 * Uses wall clock so all clients stay aligned without server tick.
 */
export function getGameTimeOfDay(serverTimeMs: number = Date.now()): number {
  const elapsed = serverTimeMs - GAME_CLOCK.epochMs;
  const mod = ((elapsed % GAME_CLOCK.realMsPerGameDay) + GAME_CLOCK.realMsPerGameDay) % GAME_CLOCK.realMsPerGameDay;
  return mod / GAME_CLOCK.realMsPerGameDay;
}

/** Absolute game day index since epoch (0, 1, 2, …) */
export function getGameDayIndex(serverTimeMs: number = Date.now()): number {
  return Math.floor((serverTimeMs - GAME_CLOCK.epochMs) / GAME_CLOCK.realMsPerGameDay);
}

/** Day of week 0..7 (8-day week) */
export function getGameDayOfWeek(serverTimeMs: number = Date.now()): number {
  const d = getGameDayIndex(serverTimeMs);
  return ((d % GAME_CLOCK.gameDaysPerWeek) + GAME_CLOCK.gameDaysPerWeek) % GAME_CLOCK.gameDaysPerWeek;
}

export function getGameDayName(serverTimeMs: number = Date.now()): GameDayName {
  return GAME_CLOCK.dayNames[getGameDayOfWeek(serverTimeMs)];
}

/** Week index since epoch */
export function getGameWeekIndex(serverTimeMs: number = Date.now()): number {
  return Math.floor(getGameDayIndex(serverTimeMs) / GAME_CLOCK.gameDaysPerWeek);
}

/** Snapshot for UI, minimap, weather, forge HUD, Black Tome */
export interface GameClockSnapshot {
  /** Wall clock ms used */
  wallMs: number;
  /** 0..1 in-game day */
  timeOfDay: number;
  /** 0..6 legacy 24h-scale hour (timeOfDay * 24) */
  hourOfDay: number;
  dayOfWeek: number;
  dayName: GameDayName;
  weekIndex: number;
  dayIndex: number;
  /** Bell index 0–5 (Dawn…Night); each bell = 1 real hour */
  bellIndex: number;
  bellName: GameBellName;
  /** Absolute game year (year 1 starts at epoch) */
  year: number;
  /** Day of year 0..383 */
  dayOfYear: number;
  /** Season index 0..3 */
  seasonIndex: number;
  seasonName: GameSeasonName;
  /** Day within season 1..96 */
  dayInSeason: number;
  /** Week within season 1..12 */
  weekInSeason: number;
  tideHeight: number;
  tidePhase: number;
  /** true when tide is rising */
  tideRising: boolean;
  /** Real ms remaining until next midnight (game) */
  msToNextMidnight: number;
  /** Long lore form e.g. Year 1, Iron Sun Summer day 3, Week 1, Oathday, Bell of Heat */
  longForm: string;
  /** Short form Y1 / S2 / W1 / D1 / H2 */
  shortForm: string;
}

export function getBellIndex(serverTimeMs: number = Date.now()): number {
  const t = getGameTimeOfDay(serverTimeMs);
  return Math.min(5, Math.floor(t * 6));
}

export function getBellName(serverTimeMs: number = Date.now()): GameBellName {
  return GAME_CLOCK.bells[getBellIndex(serverTimeMs)];
}

export function getDayOfYear(serverTimeMs: number = Date.now()): number {
  const d = getGameDayIndex(serverTimeMs);
  return ((d % GAME_CLOCK.daysPerYear) + GAME_CLOCK.daysPerYear) % GAME_CLOCK.daysPerYear;
}

export function getSeasonIndex(serverTimeMs: number = Date.now()): number {
  return Math.floor(getDayOfYear(serverTimeMs) / GAME_CLOCK.daysPerSeason);
}

export function getGameClockSnapshot(serverTimeMs: number = Date.now()): GameClockSnapshot {
  const timeOfDay = getGameTimeOfDay(serverTimeMs);
  const tidePhase = getTidePhase(serverTimeMs);
  const tideHeight = getTideHeight(serverTimeMs);
  const dayPhase = timeOfDay;
  const rising =
    Math.cos(dayPhase * Math.PI * 2 * TIDE_CONFIG.cyclesPerGameDay) > 0;
  const msIntoDay =
    ((serverTimeMs - GAME_CLOCK.epochMs) % GAME_CLOCK.realMsPerGameDay +
      GAME_CLOCK.realMsPerGameDay) %
    GAME_CLOCK.realMsPerGameDay;

  const dayIndex = getGameDayIndex(serverTimeMs);
  const dayOfYear = getDayOfYear(serverTimeMs);
  const seasonIndex = getSeasonIndex(serverTimeMs);
  const dayInSeason = (dayOfYear % GAME_CLOCK.daysPerSeason) + 1;
  const weekInSeason = Math.floor((dayInSeason - 1) / GAME_CLOCK.gameDaysPerWeek) + 1;
  const year = Math.floor(dayIndex / GAME_CLOCK.daysPerYear) + 1;
  const dayOfWeek = getGameDayOfWeek(serverTimeMs);
  const dayName = getGameDayName(serverTimeMs);
  const bellIndex = getBellIndex(serverTimeMs);
  const bellName = GAME_CLOCK.bells[bellIndex];
  const seasonName = GAME_CLOCK.seasons[seasonIndex];

  return {
    wallMs: serverTimeMs,
    timeOfDay,
    hourOfDay: timeOfDay * 24,
    dayOfWeek,
    dayName,
    weekIndex: getGameWeekIndex(serverTimeMs),
    dayIndex,
    bellIndex,
    bellName,
    year,
    dayOfYear,
    seasonIndex,
    seasonName,
    dayInSeason,
    weekInSeason,
    tideHeight,
    tidePhase,
    tideRising: rising,
    msToNextMidnight: GAME_CLOCK.realMsPerGameDay - msIntoDay,
    longForm: `Year ${year}, ${seasonName} ${dayInSeason}, Week ${weekInSeason}, ${dayName}, Bell of ${bellName}`,
    shortForm: `Y${year} / S${seasonIndex + 1} / W${weekInSeason} / D${dayOfWeek + 1} / H${bellIndex}`,
  };
}

// ── Legacy OCEAN_CONFIG shape (lore / colyseus compat) ───────────────────────

/** @deprecated Prefer TIDE_CONFIG + getTideHeight; kept for imports */
export const OCEAN_CONFIG = {
  baseHeight: TIDE_CONFIG.baseHeight,
  tideAmplitude: TIDE_CONFIG.amplitude,
  /** Full high→high cycle (real ms) — derived from game day / 2 */
  tideCycleMs: tideCycleMs(),
  worldOcean: true as const,
  echoes: {
    enabled: true,
    ancestralVoiceChance: 0.05,
    description: 'Sailors hear ancestral voices that may guide or misguide explorers.',
  },
} as const;

/** DayNightCycle default: wall-synced 6 real-hour game day */
export const DAY_NIGHT_DEFAULTS = {
  dayDurationSeconds: GAME_CLOCK.realSecondsPerGameDay,
  /** Sync sky from wall clock (production) rather than free-run dt */
  useWallClock: true,
  startTime: 0.35,
  sunDistance: 300,
  moonIntensity: 0.15,
} as const;
