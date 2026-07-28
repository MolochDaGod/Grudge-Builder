import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  fitObjectToHeightM,
  fitObjectToPropBand,
  objectHeightM,
  plantOnSolids,
  shuffleCoords,
} from "./DeployedAssetPatterns";

describe("DeployedAssetPatterns", () => {
  it("fits object height to target metres (castle size param)", () => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(10, 100, 10));
    // raw height 100 units → target 50 m
    const s = fitObjectToHeightM(mesh, 50);
    expect(s).toBeCloseTo(0.5, 5);
    expect(objectHeightM(mesh)).toBeCloseTo(50, 1);
  });

  it("fits fortress band default (not human 1.8)", () => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(20, 200, 20));
    fitObjectToPropBand(mesh, "fortress", "default");
    const h = objectHeightM(mesh);
    // fortress default band is 45 m
    expect(h).toBeGreaterThan(30);
    expect(h).toBeLessThan(60);
    expect(h).not.toBeCloseTo(1.8, 0);
  });

  it("plants object on a ground plane", () => {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.MeshBasicMaterial(),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.updateMatrixWorld(true);

    const box = new THREE.Mesh(new THREE.BoxGeometry(2, 4, 2));
    box.position.set(0, 50, 0);
    plantOnSolids(box, ground, 0);
    box.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(box);
    expect(b.min.y).toBeCloseTo(0, 1);
  });

  it("shuffleCoords leaves empty center", () => {
    const coords = shuffleCoords({
      mapSize: 40,
      fieldSize: 10,
      emptyCenter: 10,
    });
    expect(coords.length).toBeGreaterThan(0);
    for (const c of coords) {
      const inCenter = Math.abs(c.x) < 10 && Math.abs(c.z) < 10;
      expect(inCenter).toBe(false);
    }
  });
});
