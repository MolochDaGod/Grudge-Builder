import { describe, expect, it } from "vitest";
import {
  ALL_ISLANDS,
  EVENT_TIMING,
  eventClock,
  islandPhase,
  liveShips,
  matchesMapFilter,
  worldDistanceM,
} from "./warlordsWorldMap";

describe("warlordsWorldMap", () => {
  it("gives each faction four event islands plus stable capitals", () => {
    const events = ALL_ISLANDS.filter((i) => i.kind === "event");
    expect(events.filter((i) => i.faction === "fabled")).toHaveLength(4);
    expect(events.filter((i) => i.faction === "crusade")).toHaveLength(4);
    expect(events.filter((i) => i.faction === "legion")).toHaveLength(4);
    expect(ALL_ISLANDS.some((i) => i.kind === "main")).toBe(true);
  });

  it("cycles one live event slot per faction", () => {
    const now = EVENT_TIMING.riseMs + 1_000;
    expect(eventClock(now, 0).phase).toBe("live");
    const fabled = ALL_ISLANDS.filter((i) => i.kind === "event" && i.faction === "fabled");
    expect(fabled.filter((i) => islandPhase(i, now) === "live")).toHaveLength(1);
    expect(fabled.filter((i) => islandPhase(i, now) === "void")).toHaveLength(3);
  });

  it("hides sunk event islands from All", () => {
    const now = EVENT_TIMING.riseMs + 1_000;
    const shown = ALL_ISLANDS.filter((i) => matchesMapFilter(i, "all", now));
    expect(ALL_ISLANDS.filter((i) => i.kind === "event" && !shown.some((s) => s.id === i.id)).length).toBeGreaterThanOrEqual(3);
  });

  it("moves ships", () => {
    const a = liveShips(0);
    const b = liveShips(12_000);
    expect(Math.hypot(a[0].x - b[0].x, a[0].y - b[0].y)).toBeGreaterThan(0.001);
  });

  it("reports chart meters", () => {
    expect(Math.round(worldDistanceM({ x: 0.5, y: 0.5 }, { x: 0.56, y: 0.5 }))).toBe(1800);
  });

  it("uses minute-scale live windows on this host", () => {
    expect(EVENT_TIMING.liveMs).toBeGreaterThanOrEqual(60_000);
  });
});
