/**
 * WarIslandDecor — island battlefield presentation (Conqueror's Blade / siege map).
 *
 * Best practices for terrain + materials on a fortress-on-island scene:
 *  - sRGB color space on albedo maps (set at load)
 *  - Hemisphere + single hard sun (shadow cascade lite via tight ortho)
 *  - Soft water ring so the fort reads as an island, not a floating mesh pile
 *  - Gentle terrain material uplift (roughness, AO-like multiply) without re-authoring GLB
 *  - Fog matched to horizon color; sky gradient via background color
 *  - Contact ground plane under island for unit shadows
 */
import * as THREE from 'three';

export interface IslandDecorResult {
  root: THREE.Group;
  water: THREE.Mesh;
  ground: THREE.Mesh;
  /** Measured levels after env centering */
  levels: BattlefieldLevels;
  dispose: () => void;
}

export interface BattlefieldLevels {
  /** Lowest mesh Y in centered env */
  mapBottomY: number;
  /** Highest mesh Y */
  mapTopY: number;
  /** Original Water_* surface Y (top of water volume if thick) */
  originalWaterSurfaceY: number;
  /** Original Water_* bottom Y */
  originalWaterBottomY: number;
  /** Where we place our ocean disc (below original water) */
  ourWaterY: number;
  /** Typical terrain floor (Terreno / Erba min median) */
  terrainFloorY: number;
}

/**
 * Read map bottom, beach/terrain floor, and original Water_* after centering.
 *
 * The fortress is a floating plate: AABB center ≠ beach. After center, terrain
 * floor sits near y≈-9 while plate bottom is ≈-18. Ocean must meet the **beach
 * rim** (terrain floor), not cut through the fort mid-height.
 */
export function measureBattlefieldLevels(envRoot: THREE.Object3D): BattlefieldLevels {
  envRoot.updateMatrixWorld(true);
  const full = new THREE.Box3().setFromObject(envRoot);
  const mapBottomY = full.min.y;
  const mapTopY = full.max.y;

  let waterMin = Infinity;
  let waterMax = -Infinity;
  let waterFound = false;
  const terrainMins: number[] = [];
  const beachEdgeYs: number[] = []; // Bordo / shore skirts

  envRoot.traverse((obj) => {
    if (!(obj as THREE.Mesh).isMesh) return;
    const n = obj.name || '';
    const b = new THREE.Box3().setFromObject(obj);
    if (b.isEmpty()) return;
    if (/Water/i.test(n)) {
      waterFound = true;
      waterMin = Math.min(waterMin, b.min.y);
      waterMax = Math.max(waterMax, b.max.y);
    }
    if (/Terreno|Erba|Zolla/i.test(n)) {
      terrainMins.push(b.min.y);
    }
    // Shore / bank skirts — where land meets ocean on the asset
    if (/Bordo|Water/i.test(n) && !/Mura/i.test(n)) {
      beachEdgeYs.push(b.min.y);
    }
  });

  terrainMins.sort((a, b) => a - b);
  beachEdgeYs.sort((a, b) => a - b);

  const terrainFloorY =
    terrainMins.length > 0
      ? terrainMins[Math.floor(terrainMins.length * 0.2)]!
      : mapBottomY + (mapTopY - mapBottomY) * 0.12;

  // Beach edge = lowest shore band (where map connects to ocean floor)
  const beachEdgeY =
    beachEdgeYs.length > 0
      ? beachEdgeYs[Math.floor(beachEdgeYs.length * 0.15)]!
      : terrainFloorY;

  let originalWaterBottomY = waterFound ? waterMin : beachEdgeY - 0.5;
  let originalWaterSurfaceY = waterFound ? waterMin + 0.1 : beachEdgeY - 0.2;
  if (waterFound && waterMax - waterMin < 0.5) {
    originalWaterSurfaceY = (waterMin + waterMax) * 0.5;
    originalWaterBottomY = originalWaterSurfaceY;
  } else if (waterFound) {
    // Thick Water_Mat slab: use bottom band as ocean (aligned with Terreno ~ -9)
    originalWaterSurfaceY = Math.min(waterMin + 0.2, beachEdgeY + 0.05);
    originalWaterBottomY = waterMin;
  }

  // Ocean disc: just under beach edge (never mid-fort)
  const ourWaterY = Math.min(originalWaterSurfaceY, beachEdgeY, terrainFloorY) - 0.15;

  return {
    mapBottomY,
    mapTopY,
    originalWaterSurfaceY,
    originalWaterBottomY,
    ourWaterY,
    terrainFloorY,
  };
}

/**
 * How much to lift the centered fortress so beach/terrain floor sits just
 * above a world ocean plane at `oceanWorldY` (default 0).
 */
export function computeMapLiftToWaterline(
  levels: BattlefieldLevels,
  oceanWorldY = 0,
  beachClearance = 0.35,
): number {
  // Bring terrain floor up to ocean + clearance (map rises, water stays)
  return oceanWorldY + beachClearance - levels.terrainFloorY;
}

/**
 * Enhance loaded env root materials + add island water / shadow ground.
 * Call after GLB is parented and centered.
 */
export function enhanceIslandBattlefield(
  scene: THREE.Scene,
  envRoot: THREE.Object3D,
  opts?: {
    waterRadius?: number;
    /** World Y of ocean surface (map should already be lifted to this waterline) */
    waterY?: number;
    /** Horizontal span from map bounds */
    mapSpanXZ?: number;
  },
): IslandDecorResult {
  const levels = measureBattlefieldLevels(envRoot);
  // Prefer footprint of the map plate for ocean disc size
  const box = new THREE.Box3().setFromObject(envRoot);
  const size = box.getSize(new THREE.Vector3());
  const span = opts?.mapSpanXZ ?? Math.max(size.x, size.z, 80);
  const waterR = opts?.waterRadius ?? Math.max(120, span * 1.35);
  // Ocean world Y — default 0 after map lift; disc sits at beach edge
  const waterY = opts?.waterY ?? 0;

  // Hide baked Water_* (we own the waterline now)
  envRoot.traverse((obj) => {
    if (!(obj as THREE.Mesh).isMesh) return;
    if (!/Water/i.test(obj.name || '')) return;
    obj.visible = false;
    obj.userData.originalMapWater = true;
  });

  // Base atmosphere (WarAtmosphere overwrites with weather preset)
  scene.background = new THREE.Color(0x5a6a7c);
  scene.fog = new THREE.FogExp2(0x5a6a7c, 0.004);

  // Material pass: restore color/texture after Draco+WebP bake
  envRoot.traverse((obj) => {
    if (!(obj as THREE.Mesh).isMesh) return;
    const mesh = obj as THREE.Mesh;
    const n = obj.name || '';
    const layer =
      /Erba|Zolla|Bordo|Roccia/i.test(n)
        ? 'terrain'
        : /Mura|TileMura|Passerella|Tegola/i.test(n)
          ? 'wall'
          : /Stendardi/i.test(n)
            ? 'banner'
            : /Fire_/i.test(n)
              ? 'fire'
              : 'other';
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (let i = 0; i < mats.length; i++) {
      const m = mats[i];
      if (!m) continue;
      // Promote MeshBasic → Standard so lights + sRGB maps work
      let std = m as THREE.MeshStandardMaterial;
      if ((m as THREE.MeshBasicMaterial).isMeshBasicMaterial) {
        const basic = m as THREE.MeshBasicMaterial;
        std = new THREE.MeshStandardMaterial({
          map: basic.map,
          color: basic.color?.clone() ?? new THREE.Color(0xcccccc),
          transparent: basic.transparent,
          opacity: basic.opacity,
          side: basic.side,
          roughness: 0.85,
          metalness: 0.05,
        });
        if (Array.isArray(mesh.material)) mesh.material[i] = std;
        else mesh.material = std;
      }
      if (std.map) {
        std.map.colorSpace = THREE.SRGBColorSpace;
        std.map.anisotropy = 8;
        std.map.needsUpdate = true;
        // Ensure base color multiplies map correctly
        if (!std.color || std.color.getHex() === 0x000000) {
          std.color = new THREE.Color(0xffffff);
        }
      } else if (std.color) {
        // Name-based palette when maps missing
        if (layer === 'terrain') std.color.setHex(0x5a7a48);
        else if (layer === 'wall') std.color.setHex(0x9a8f82);
        else if (layer === 'banner') std.color.setHex(0xb83232);
      }
      if (std.normalMap) std.normalScale?.set(0.9, 0.9);
      if (layer === 'terrain') {
        std.roughness = 0.92;
        std.metalness = 0.02;
      } else if (layer === 'wall') {
        std.roughness = 0.72;
        std.metalness = 0.08;
      } else if (layer === 'fire' && std.emissive) {
        std.emissive.setHex(0xff5500);
        std.emissiveIntensity = 1.4;
      }
      std.needsUpdate = true;
    }
    mesh.receiveShadow = true;
    if (layer === 'wall' || layer === 'other' || layer === 'banner') mesh.castShadow = true;
  });

  const root = new THREE.Group();
  root.name = 'island_decor';

  // Ocean disc at measured waterline (below original Water_* / terrain floor)
  const waterGeo = new THREE.CircleGeometry(waterR, 96);
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x1a4a6e,
    roughness: 0.22,
    metalness: 0.35,
    transparent: true,
    opacity: 0.88,
    envMapIntensity: 0.6,
  });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.y = waterY;
  water.receiveShadow = true;
  water.name = 'island_water';
  water.renderOrder = -2;
  root.add(water);

  // Shore foam just above our water
  const foam = new THREE.Mesh(
    new THREE.RingGeometry(waterR * 0.38, waterR * 0.44, 64),
    new THREE.MeshBasicMaterial({
      color: 0xb8d4e8,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  foam.rotation.x = -Math.PI / 2;
  foam.position.y = waterY + 0.06;
  foam.renderOrder = -1;
  root.add(foam);

  // Shadow catcher just above waterline / beach (after map lift terrain ≈ waterY+clearance)
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(Math.min(waterR * 0.55, Math.max(60, span * 0.55)), 64),
    new THREE.ShadowMaterial({ opacity: 0.28 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = waterY + 0.08;
  ground.receiveShadow = true;
  ground.name = 'island_shadow_ground';
  root.add(ground);

  // Horizon haze at waterline + modest height
  const hazeMat = new THREE.MeshBasicMaterial({
    color: 0x8eafc8,
    transparent: true,
    opacity: 0.28,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2;
    const card = new THREE.Mesh(new THREE.PlaneGeometry(90, 22), hazeMat.clone());
    card.position.set(
      Math.cos(ang) * (waterR * 0.88),
      waterY + 10,
      Math.sin(ang) * (waterR * 0.88),
    );
    card.lookAt(0, waterY + 8, 0);
    root.add(card);
  }

  scene.add(root);

  return {
    root,
    water,
    ground,
    levels,
    dispose: () => {
      scene.remove(root);
      root.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        if (m.material) {
          if (Array.isArray(m.material)) m.material.forEach((x) => x.dispose());
          else m.material.dispose();
        }
      });
    },
  };
}

/** Optional gentle water shimmer each frame */
export function tickIslandWater(water: THREE.Mesh, t: number): void {
  const mat = water.material as THREE.MeshStandardMaterial;
  if (mat.emissive) {
    const pulse = 0.02 + Math.sin(t * 0.4) * 0.015;
    mat.emissive.setRGB(0.02, 0.05, 0.08);
    mat.emissiveIntensity = pulse * 8;
  }
  water.rotation.z = Math.sin(t * 0.05) * 0.01;
}
