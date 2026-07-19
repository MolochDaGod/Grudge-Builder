/**
 * ScatterDecorations — lightweight instanced decorations scattered on terrain.
 *
 * Uses InstancedMesh for performance — hundreds of grass tufts, small rocks,
 * and flowers rendered in minimal draw calls.
 */
import * as THREE from 'three';
import { getTerrainHeightAt, type BiomeType } from '../terrain/IslandTerrainGenerator';

const GRASS_GEO = new THREE.ConeGeometry(0.3, 1.5, 4);
const FLOWER_GEO = new THREE.SphereGeometry(0.25, 4, 4);
const PEBBLE_GEO = new THREE.DodecahedronGeometry(0.3, 0);

const GRASS_MAT = new THREE.MeshLambertMaterial({ color: 0x4a8c3a });
const FLOWER_MAT = new THREE.MeshLambertMaterial({ color: 0xd4a017 });
const PEBBLE_MAT = new THREE.MeshLambertMaterial({ color: 0x999990 });

/**
 * Create instanced decorations placed on the terrain surface.
 */
export function createScatterDecorations(
  terrainMesh: THREE.Mesh,
  biomeMap: BiomeType[][],
  gridW: number,
  gridH: number,
): THREE.Group {
  const group = new THREE.Group();
  const xSize = 512, ySize = 512;

  // Collect valid positions per decoration type
  const grassPositions: THREE.Matrix4[] = [];
  const flowerPositions: THREE.Matrix4[] = [];
  const pebblePositions: THREE.Matrix4[] = [];
  const dummy = new THREE.Object3D();

  // Sample biome map at intervals
  for (let gy = 6; gy < gridH - 6; gy += 2) {
    for (let gx = 6; gx < gridW - 6; gx += 2) {
      const biome = biomeMap[gy]?.[gx];
      if (!biome || biome === 'water') continue;

      // Probabilistic placement
      const r = Math.random();

      const worldX = (gx / (gridW - 1) - 0.5) * xSize + (Math.random() - 0.5) * 4;
      const worldZ = (gy / (gridH - 1) - 0.5) * ySize + (Math.random() - 0.5) * 4;
      const height = getTerrainHeightAt(terrainMesh, worldX, worldZ);
      if (height === null || height < -3) continue;

      dummy.position.set(worldX, height, worldZ);
      dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);

      if (biome === 'grass' || biome === 'forest') {
        // Grass tufts — 15% chance
        if (r < 0.15) {
          dummy.scale.setScalar(0.5 + Math.random() * 0.8);
          dummy.updateMatrix();
          grassPositions.push(dummy.matrix.clone());
        }
        // Flowers — 3% chance on grass only
        if (biome === 'grass' && r > 0.95) {
          dummy.scale.setScalar(0.4 + Math.random() * 0.4);
          dummy.updateMatrix();
          flowerPositions.push(dummy.matrix.clone());
        }
      }

      // Pebbles — 5% chance on rock, beach, grass
      if ((biome === 'rock' || biome === 'beach' || biome === 'grass') && r > 0.92 && r < 0.97) {
        dummy.scale.setScalar(0.3 + Math.random() * 0.5);
        dummy.updateMatrix();
        pebblePositions.push(dummy.matrix.clone());
      }
    }
  }

  // Create InstancedMesh for each type — one draw call per decoration class
  if (grassPositions.length > 0) {
    const grassMesh = new THREE.InstancedMesh(GRASS_GEO, GRASS_MAT, grassPositions.length);
    grassPositions.forEach((mat, i) => grassMesh.setMatrixAt(i, mat));
    grassMesh.instanceMatrix.needsUpdate = true;
    grassMesh.castShadow = false; // decor never casts — big CPU win
    grassMesh.receiveShadow = true;
    grassMesh.frustumCulled = true;
    grassMesh.name = 'instanced_scatter_grass';
    group.add(grassMesh);
  }

  if (flowerPositions.length > 0) {
    const flowerMesh = new THREE.InstancedMesh(FLOWER_GEO, FLOWER_MAT, flowerPositions.length);
    flowerPositions.forEach((mat, i) => flowerMesh.setMatrixAt(i, mat));
    flowerMesh.instanceMatrix.needsUpdate = true;
    flowerMesh.castShadow = false;
    flowerMesh.frustumCulled = true;
    flowerMesh.name = 'instanced_scatter_flower';
    group.add(flowerMesh);
  }

  if (pebblePositions.length > 0) {
    const pebbleMesh = new THREE.InstancedMesh(PEBBLE_GEO, PEBBLE_MAT, pebblePositions.length);
    pebblePositions.forEach((mat, i) => pebbleMesh.setMatrixAt(i, mat));
    pebbleMesh.instanceMatrix.needsUpdate = true;
    pebbleMesh.castShadow = false;
    pebbleMesh.receiveShadow = true;
    pebbleMesh.frustumCulled = true;
    pebbleMesh.name = 'instanced_scatter_pebble';
    group.add(pebbleMesh);
  }

  return group;
}
