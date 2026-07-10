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
  dispose: () => void;
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
  const waterR = opts?.waterRadius ?? 140;
  const waterY = opts?.waterY ?? -0.6;

  // Atmosphere — coastal siege day
  scene.background = new THREE.Color(0x6a8eab);
  scene.fog = new THREE.FogExp2(0x7a9bb8, 0.0065);

  // Material pass: terrain softer, walls slightly sharper
  envRoot.traverse((obj) => {
    if (!(obj as THREE.Mesh).isMesh) return;
    const mesh = obj as THREE.Mesh;
    const layer =
      /Erba|Zolla|Bordo|Roccia/i.test(obj.name)
        ? 'terrain'
        : /Mura|TileMura|Passerella/i.test(obj.name)
          ? 'wall'
          : 'other';
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      if (!m) continue;
      const std = m as THREE.MeshStandardMaterial;
      if (std.map) {
        std.map.colorSpace = THREE.SRGBColorSpace;
        std.map.anisotropy = 8;
        std.map.needsUpdate = true;
      }
      if (std.normalMap) {
        std.normalScale?.set(0.85, 0.85);
      }
      if (layer === 'terrain') {
        std.roughness = Math.min(1, (std.roughness ?? 0.8) * 1.05 + 0.08);
        std.metalness = Math.min(0.15, std.metalness ?? 0);
        // Slight green-brown island lift if no texture
        if (!std.map && std.color) {
          std.color.offsetHSL(0.02, 0.05, -0.02);
        }
      }
      if (layer === 'wall') {
        std.roughness = Math.max(0.55, std.roughness ?? 0.75);
        std.metalness = Math.min(0.2, std.metalness ?? 0.05);
      }
      std.needsUpdate = true;
    }
    mesh.receiveShadow = true;
    if (layer === 'wall' || layer === 'other') mesh.castShadow = true;
  });

  const root = new THREE.Group();
  root.name = 'island_decor';

  // Deep water disc (island silhouette)
  const waterGeo = new THREE.CircleGeometry(waterR, 96);
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x1a4a6e,
    roughness: 0.22,
    metalness: 0.35,
    transparent: true,
    opacity: 0.92,
    envMapIntensity: 0.6,
  });
  // procedural subtle wave via vertex colors / emissive pulse in tick if needed
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.y = waterY;
  water.receiveShadow = true;
  water.name = 'island_water';
  root.add(water);

  // Shore foam ring
  const foam = new THREE.Mesh(
    new THREE.RingGeometry(waterR * 0.42, waterR * 0.48, 64),
    new THREE.MeshBasicMaterial({
      color: 0xb8d4e8,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  foam.rotation.x = -Math.PI / 2;
  foam.position.y = waterY + 0.08;
  root.add(foam);

  // Shadow-catching ground under fort (helps units read on terrain gaps)
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(waterR * 0.55, 64),
    new THREE.ShadowMaterial({ opacity: 0.35 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0.02;
  ground.receiveShadow = true;
  ground.name = 'island_shadow_ground';
  root.add(ground);

  // Distant horizon haze planes (cheap sky cards)
  const hazeMat = new THREE.MeshBasicMaterial({
    color: 0x8eafc8,
    transparent: true,
    opacity: 0.35,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2;
    const card = new THREE.Mesh(new THREE.PlaneGeometry(80, 18), hazeMat.clone());
    card.position.set(Math.cos(ang) * (waterR * 0.85), 6, Math.sin(ang) * (waterR * 0.85));
    card.lookAt(0, 8, 0);
    root.add(card);
  }

  scene.add(root);

  return {
    root,
    water,
    ground,
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
