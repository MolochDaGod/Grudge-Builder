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
 * Read original map bottom + Water_Mat Y after the fortress is centered.
 * Maya water lives near terrain floor (~-9 after center), NOT near y=0.
 */
export function measureBattlefieldLevels(envRoot: THREE.Object3D): BattlefieldLevels {
  envRoot.updateMatrixWorld(true);
  const full = new THREE.Box3().setFromObject(envRoot);
  let mapBottomY = full.min.y;
  let mapTopY = full.max.y;

  let waterMin = Infinity;
  let waterMax = -Infinity;
  let waterFound = false;
  const terrainMins: number[] = [];

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
    if (/Terreno|Erba|Zolla|Bordo/i.test(n)) {
      terrainMins.push(b.min.y);
    }
  });

  terrainMins.sort((a, b) => a - b);
  const terrainFloorY =
    terrainMins.length > 0
      ? terrainMins[Math.floor(terrainMins.length * 0.25)]! // lower quartile = floor
      : mapBottomY + (mapTopY - mapBottomY) * 0.15;

  // Original water: prefer the lower band (ocean plane), not the thick slab top
  let originalWaterBottomY = waterFound ? waterMin : terrainFloorY - 0.5;
  let originalWaterSurfaceY = waterFound
    ? // If water is a thick volume, surface is closer to terrain floor + small rise
      Math.min(waterMax, terrainFloorY + 0.35)
    : terrainFloorY - 0.25;
  // Flat water meshes (min≈max) use that Y as surface
  if (waterFound && waterMax - waterMin < 0.5) {
    originalWaterSurfaceY = (waterMin + waterMax) * 0.5;
    originalWaterBottomY = originalWaterSurfaceY;
  } else if (waterFound) {
    // Thick water mesh: ocean sits at its bottom (matches Terreno ~ -9.2)
    originalWaterSurfaceY = waterMin + 0.15;
    originalWaterBottomY = waterMin;
  }

  // Our decorative disc: slightly BELOW original water so it never covers land
  const ourWaterY = Math.min(originalWaterSurfaceY, terrainFloorY) - 0.45;

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
 * Enhance loaded env root materials + add island water / shadow ground.
 * Call after GLB is parented and centered.
 */
export function enhanceIslandBattlefield(
  scene: THREE.Scene,
  envRoot: THREE.Object3D,
  opts?: { waterRadius?: number; waterY?: number },
): IslandDecorResult {
  const levels = measureBattlefieldLevels(envRoot);
  const waterR = opts?.waterRadius ?? 160;
  // Explicit override, else measured level below original Water_* / terrain floor
  const waterY = opts?.waterY ?? levels.ourWaterY;

  // Soften / hide original Water meshes so they don't flood the fort
  envRoot.traverse((obj) => {
    if (!(obj as THREE.Mesh).isMesh) return;
    if (!/Water/i.test(obj.name || '')) return;
    // Keep asset for reference but sink slightly and make subtler if still visible
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

  // Shadow catcher on terrain floor (not at y=0 mid-air)
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(Math.min(waterR * 0.5, 90), 64),
    new THREE.ShadowMaterial({ opacity: 0.28 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = levels.terrainFloorY + 0.05;
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
