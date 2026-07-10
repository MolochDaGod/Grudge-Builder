/**
 * ZoneCapitalSpawner — place a race capital (Unity world map city) in zone mode.
 *
 * Prefer FACTION_TOWNS compose when raceCities.factionTownKey is set;
 * otherwise a lightweight plaza + optional capital GLB.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { RaceCity } from '@shared/definitions/raceCities';
import { FACTION_TOWNS, type FactionTown } from '@shared/definitions/factionTowns';
import { composeTown, type ComposedTown } from '../town/TownComposer';
import { resolveModelUrl } from '@/lib/modelManifest';

export interface ZoneCapitalResult {
  root: THREE.Group;
  city: RaceCity;
  /** World spawn near plaza (feet) */
  spawn: THREE.Vector3;
  composed: ComposedTown | null;
  update: (dt: number, elapsed: number) => void;
  dispose: () => void;
}

const RACE_BANNER: Record<string, number> = {
  human: 0xc9a227,
  dwarf: 0x6b8cae,
  elf: 0x4a9b6e,
  orc: 0xb84a2a,
  undead: 0x6b5b8c,
  demon: 0x8b1a1a,
};

function sampleGroundY(
  mesh: THREE.Object3D | null | undefined,
  x: number,
  z: number,
  fallback = 2,
): number {
  if (!mesh) return fallback;
  const ray = new THREE.Raycaster(
    new THREE.Vector3(x, 900, z),
    new THREE.Vector3(0, -1, 0),
  );
  const hits = ray.intersectObject(mesh, true);
  return hits.length > 0 ? hits[0].point.y : fallback;
}

function buildPlazaMarker(city: RaceCity, y: number): THREE.Group {
  const g = new THREE.Group();
  g.name = `race_capital_plaza_${city.id}`;
  const color = RACE_BANNER[city.raceId] ?? 0xc9a227;

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(14, 16, 1.2, 16),
    new THREE.MeshStandardMaterial({ color: 0x3a3428, roughness: 0.9, metalness: 0.05 }),
  );
  base.position.y = 0.6;
  base.receiveShadow = true;
  g.add(base);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(12, 0.35, 8, 32),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.35 }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 1.2;
  g.add(ring);

  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const pillar = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 8, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x4a4538, roughness: 0.85 }),
    );
    pillar.position.set(Math.cos(ang) * 10, 4, Math.sin(ang) * 10);
    pillar.castShadow = true;
    g.add(pillar);
  }

  const banner = new THREE.Mesh(
    new THREE.PlaneGeometry(4, 6),
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.25,
      side: THREE.DoubleSide,
    }),
  );
  banner.position.set(0, 7, 0);
  g.add(banner);

  // World label
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 512, 128);
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(20, 20, 472, 88);
  ctx.font = 'bold 36px Cinzel, serif';
  ctx.fillStyle = '#f6c945';
  ctx.textAlign = 'center';
  ctx.fillText(city.name, 256, 58);
  ctx.font = '20px Inter, sans-serif';
  ctx.fillStyle = '#ccc';
  ctx.fillText(city.subtitle, 256, 90);
  const tex = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }),
  );
  sprite.position.set(0, 14, 0);
  sprite.scale.set(28, 7, 1);
  sprite.renderOrder = 20;
  g.add(sprite);

  g.position.y = y;
  return g;
}

async function loadCapitalGlb(
  city: RaceCity,
  parent: THREE.Group,
): Promise<THREE.Object3D | null> {
  try {
    const url = resolveModelUrl(city.modelPath);
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(url);
    const root = gltf.scene.clone(true);
    const scale = city.modelScale * 0.15; // zone-scale down from town calib
    root.scale.setScalar(scale);
    root.position.set(0, 0, 0);
    root.traverse((c) => {
      if ((c as THREE.Mesh).isMesh) {
        c.castShadow = true;
        c.receiveShadow = true;
      }
    });
    root.name = `race_capital_glb_${city.id}`;
    parent.add(root);
    return root;
  } catch (err) {
    console.warn(`[ZoneCapital] GLB load failed for ${city.id}:`, err);
    return null;
  }
}

/**
 * Place race capital at (cx, cz) on island terrain mesh.
 * When factionTownKey is set, also compose full faction town offset slightly.
 */
export async function spawnRaceCapitalInZone(
  scene: THREE.Scene,
  city: RaceCity,
  cx: number,
  cz: number,
  terrainMesh?: THREE.Object3D | null,
): Promise<ZoneCapitalResult> {
  const y = sampleGroundY(terrainMesh, cx, cz, 2);
  const root = new THREE.Group();
  root.name = `race_capital_${city.id}`;
  root.position.set(cx, 0, cz);

  const plaza = buildPlazaMarker(city, y);
  root.add(plaza);

  let composed: ComposedTown | null = null;

  if (city.factionTownKey && FACTION_TOWNS[city.factionTownKey]) {
    try {
      const town: FactionTown = FACTION_TOWNS[city.factionTownKey];
      composed = await composeTown(town);
      // Compact for open-world placement
      composed.root.scale.setScalar(0.12);
      composed.root.position.set(40, y, 0);
      root.add(composed.root);
      console.log(`[ZoneCapital] Composed faction town ${town.name} for ${city.name}`);
    } catch (err) {
      console.warn(`[ZoneCapital] composeTown failed for ${city.id}, using plaza only:`, err);
      await loadCapitalGlb(city, plaza);
    }
  } else {
    await loadCapitalGlb(city, plaza);
  }

  scene.add(root);

  const spawn = new THREE.Vector3(cx + 18, y + 0.1, cz + 18);

  return {
    root,
    city,
    spawn,
    composed,
    update: (dt, elapsed) => {
      composed?.update(dt, elapsed);
    },
    dispose: () => {
      composed?.dispose();
      scene.remove(root);
      root.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          m.geometry?.dispose();
          const mat = m.material;
          if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
          else (mat as THREE.Material | undefined)?.dispose?.();
        }
      });
    },
  };
}
