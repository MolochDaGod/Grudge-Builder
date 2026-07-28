import { describe, it, expect } from "vitest";
import * as THREE from "three";
import {
  buildOceanClimbMeshes,
  trySnapOntoDeck,
  CRAFT_CLIMB_PROFILE,
  OCEAN_CLIMB_RULES,
} from "./OceanBoatClimbRig";

describe("OceanBoatClimbRig", () => {
  it("builds climbable gunwale and lip meshes", () => {
    const parent = new THREE.Group();
    const meshes = buildOceanClimbMeshes(
      parent,
      { halfWidth: 2, halfLength: 4, deckY: 1.5 },
      "sloop",
    );
    expect(meshes.length).toBeGreaterThanOrEqual(4);
    expect(meshes.every((m) => m.userData.climbable === true)).toBe(true);
    expect(meshes.some((m) => /gunwale/i.test(m.name))).toBe(true);
  });

  it("snaps near-edge positions onto deck", () => {
    const bounds = { halfWidth: 2, halfLength: 4, deckY: 1.2 };
    const snap = trySnapOntoDeck(
      new THREE.Vector3(2.5, 0.5, 0),
      bounds,
      "rowboat",
    );
    expect(snap).not.toBeNull();
    expect(snap!.y).toBeCloseTo(1.25, 1);
    expect(Math.abs(snap!.x)).toBeLessThanOrEqual(2);
  });

  it("has freeboard profile for raft", () => {
    expect(CRAFT_CLIMB_PROFILE.raft.freeboard).toBeLessThan(
      CRAFT_CLIMB_PROFILE.galleon.freeboard,
    );
    expect(OCEAN_CLIMB_RULES.length).toBeGreaterThan(3);
  });
});
