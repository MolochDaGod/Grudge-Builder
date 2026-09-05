import { describe, expect, it } from "vitest";
import {
  BUILDING_HEIGHT_M,
  CHARACTER_HEIGHT_M,
  WARLORDS_MMO_CATALOGS,
  WARLORDS_MMO_HOST,
  WARLORDS_MMO_KEYS,
  WARLORDS_MMO_MAP_FAMILIES,
  WARLORDS_MMO_NOT_HOST,
  WARLORDS_MMO_ROUTES,
  isWarlordsMmoPlayPath,
} from "./warlordsMmoDeploy";

describe("warlordsMmoDeploy", () => {
  it("keeps play on grudgewarlords.com", () => {
    expect(WARLORDS_MMO_HOST).toBe("https://grudgewarlords.com");
    expect(WARLORDS_MMO_ROUTES.ocean.startsWith("/ocean")).toBe(true);
    expect(WARLORDS_MMO_ROUTES.mainPanel.startsWith("/main-panel")).toBe(true);
  });

  it("uses 2 m character / 4 m camp SI", () => {
    expect(CHARACTER_HEIGHT_M).toBe(2);
    expect(BUILDING_HEIGHT_M).toBe(4);
  });

  it("sails tactical ocean in-client", () => {
    expect(WARLORDS_MMO_MAP_FAMILIES.tactical_ocean_view.entry).toBe(
      "/ocean?worldSeed=grudge-world-1",
    );
    expect(WARLORDS_MMO_NOT_HOST).toContain("https://water.grudge-studio.com");
  });

  it("points defs at info.*", () => {
    expect(WARLORDS_MMO_CATALOGS.islandBuildings).toContain("info.grudge-studio.com");
    expect(WARLORDS_MMO_CATALOGS.weaponSkills).toContain("master-weaponSkills.json");
  });

  it("recognizes host play paths", () => {
    expect(isWarlordsMmoPlayPath("/home-island")).toBe(true);
    expect(isWarlordsMmoPlayPath("/forge")).toBe(false);
  });

  it("opens the schematic chart with M", () => {
    expect(WARLORDS_MMO_KEYS.worldMap).toBe("m");
    expect(WARLORDS_MMO_ROUTES.worldMap).toBe("/world-map");
  });
});
