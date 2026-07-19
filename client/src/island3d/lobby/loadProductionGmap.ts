/**
 * Hot-load production .gmap into Island3DEngine (not only TS SSOT).
 *
 * Fetch order:
 *   1. /api/production/map/gmap  (publish API)
 *   2. /production/grudge-open-world.gmap.json
 *   3. /maps/grudge-open-world/grudge-open-world.gmap.json
 *   4. null → caller keeps TypeScript SSOT
 */
import * as THREE from 'three';
import type { ProductionHudSchema, ProductionMapPackage } from '@shared/definitions/productionMapPackage';
import { defaultProductionHud } from '@shared/definitions/productionMapPackage';

export type LoadedGmap = ProductionMapPackage & {
  /** Raw for unknown future fields */
  _raw?: Record<string, unknown>;
};

const GMAP_URLS = [
  '/api/production/map/gmap',
  '/production/grudge-open-world.gmap.json',
  '/maps/grudge-open-world/grudge-open-world.gmap.json',
];

export async function fetchProductionGmap(): Promise<LoadedGmap | null> {
  for (const url of GMAP_URLS) {
    try {
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok) continue;
      const data = (await res.json()) as LoadedGmap;
      if (!data || (!data.entities && !data.id)) continue;
      data._raw = data as unknown as Record<string, unknown>;
      if (!data.hud) data.hud = defaultProductionHud();
      console.info(`[gmap] loaded ${url} entities=${data.entities?.length ?? 0}`);
      return data;
    } catch {
      /* try next */
    }
  }
  console.info('[gmap] no published package — using TypeScript SSOT only');
  return null;
}

export function resolveHudFromGmap(gmap: LoadedGmap | null): ProductionHudSchema {
  return gmap?.hud ?? defaultProductionHud();
}

/**
 * Place lightweight markers for gmap entities that aren't already in the scene
 * (capture flags, waypoints, extra boats). Faction islands stay on generator.
 */
export function applyGmapEntityOverlays(
  scene: THREE.Scene,
  gmap: LoadedGmap,
  lobbyCenter: { x: number; z: number },
  lobbySize: { x: number; z: number },
): THREE.Group {
  const root = new THREE.Group();
  root.name = 'GmapEntityOverlays';
  scene.add(root);

  const entities = gmap.entities ?? [];
  for (const e of entities) {
    // Skip dense faction layout (generator owns those meshes)
    if (e.tags?.includes('faction') && e.kind === 'prefab') continue;
    if (e.kind === 'npc' && e.tags?.includes('faction_npc')) continue;

    const ox = e.transform?.offsetFrac?.ox;
    const oz = e.transform?.offsetFrac?.oz;
    let x = e.transform?.position?.[0] ?? 0;
    let y = e.transform?.position?.[1] ?? 0.5;
    let z = e.transform?.position?.[2] ?? 0;
    if (ox != null && oz != null) {
      x = lobbyCenter.x + ox * lobbySize.x + (e.transform?.position?.[0] ?? 0);
      z = lobbyCenter.z + oz * lobbySize.z + (e.transform?.position?.[2] ?? 0);
    }

    const color =
      e.kind === 'capture_flag'
        ? 0x22c55e
        : e.kind === 'boat'
          ? 0x5c3d2e
          : e.kind === 'ai_brain'
            ? 0xa855f7
            : e.kind === 'network_service'
              ? 0x38bdf8
              : 0xfbbf24;

    const g = new THREE.Group();
    g.name = e.id;
    g.position.set(x, y, z);
    g.rotation.y = e.transform?.rotationY ?? 0;
    g.userData.gmapEntity = e;

    if (e.kind === 'capture_flag') {
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.1, 3.2, 6),
        new THREE.MeshStandardMaterial({ color: 0x78716c }),
      );
      pole.position.y = 1.6;
      g.add(pole);
      const flag = new THREE.Mesh(
        new THREE.PlaneGeometry(1.2, 0.7),
        new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide }),
      );
      flag.position.set(0.55, 2.8, 0);
      g.add(flag);
    } else if (e.kind === 'boat') {
      const hull = new THREE.Mesh(
        new THREE.BoxGeometry(3, 0.8, 7),
        new THREE.MeshStandardMaterial({ color }),
      );
      hull.position.y = 0.4;
      g.add(hull);
    } else if (e.kind === 'ai_brain' || e.kind === 'network_service') {
      // Invisible markers for agent tooling / debug
      g.visible = false;
      g.userData.debugOnly = true;
    } else {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 8, 8),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.2 }),
      );
      m.position.y = 0.4;
      g.add(m);
    }

    root.add(g);
  }

  console.info(`[gmap] overlays placed=${root.children.length}`);
  return root;
}
