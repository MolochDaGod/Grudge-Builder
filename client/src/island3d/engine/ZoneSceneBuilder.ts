/**
 * ZoneSceneBuilder — assembles a full Three.js scene for a 10–14 km ocean sector.
 *
 * Takes a WorldSector definition + ZonePopulation and builds:
 *   1. Ocean water plane (sector-tinted)
 *   2. Per-island terrain meshes (generated from IslandTerrainGenerator per IslandNode)
 *   3. Biome-specific sky, fog, lighting
 *   4. Visual markers for all zone nodes (harvest glows, NPC camps, hazard FX, docks)
 *   5. Sailing-relevant objects (buoys, currents, wreck models)
 *
 * The builder is stateless — call `buildZoneScene()` once per sector entry,
 * then add the returned group to your main Three.js scene.
 */
import * as THREE from 'three';
import type { WorldSector } from '@shared/definitions/worldMapSectors';
import type {
  ZonePopulation, AnyZoneNode, IslandNode, HarvestNode,
  NPCCampNode, DockNode, ShipwreckNode, OceanHazardNode,
  SeaCreatureNode, OceanCurrentNode, POINode, BossArenaNode,
  SpawnPointNode, AIPatrolNode,
} from '@shared/definitions/zoneServerNodes';
import { getNodesByCategory } from '@shared/definitions/zoneServerNodes';
import {
  generateIslandTerrain,
  type IslandTerrainConfig,
} from '../terrain/IslandTerrainGenerator';
import { createSectorTerrainMaterial } from '../terrain/TerrainMaterial';
import {
  createOceanMesh,
  updateOceanMaterial,
  flattenTerrainBelowWater,
  removeDuplicateWaterMeshes,
} from '../terrain/WaterMaterial';

// ── Result ───────────────────────────────────────────────────────────────────

export interface ZoneSceneResult {
  /** Root group — add this to your scene */
  root: THREE.Group;
  /** Ocean water mesh (animated) */
  ocean: THREE.Mesh;
  /** Per-island terrain meshes keyed by island node ID */
  islandMeshes: Map<string, THREE.Mesh>;
  /** Visual marker meshes for zone nodes (harvest glow, NPC camp flag, etc.) */
  markers: Map<string, THREE.Object3D>;
  /** Directional sun light (for day/night cycle) */
  sunLight: THREE.DirectionalLight;
  /** Hemisphere ambient light */
  hemiLight: THREE.HemisphereLight;
  /** Call every frame with delta time for ocean animation + marker pulses */
  update: (dt: number, elapsedTime: number) => void;
  /** Dispose all GPU resources */
  dispose: () => void;
}

// ── Marker Colors ────────────────────────────────────────────────────────────

const MARKER_COLORS: Record<string, number> = {
  harvest_mining:     0xaaaaaa,
  harvest_herbalism:  0x22c55e,
  harvest_woodcutting:0x8b6914,
  harvest_skinning:   0xdc2626,
  harvest_fishing:    0x3b82f6,
  npc_camp:           0xfbbf24,
  dock:               0x8b7355,
  shipwreck:          0x64748b,
  ocean_hazard:       0xef4444,
  sea_creature:       0x06b6d4,
  poi:                0xc084fc,
  boss_arena:         0xff0000,
  spawn_point:        0x22d3ee,
  ai_patrol:          0xf97316,
  current:            0x38bdf8,
};

// ── Hex Color Parser ─────────────────────────────────────────────────────────

function hexToColor(hex: string): THREE.Color {
  return new THREE.Color(hex);
}

// ── Builder ──────────────────────────────────────────────────────────────────

export function buildZoneScene(
  sector: WorldSector,
  population: ZonePopulation,
): ZoneSceneResult {
  const cfg = sector.terrain3d;
  const half = cfg.sizeMeters / 2;
  const root = new THREE.Group();
  root.name = `zone_${sector.id}`;

  const islandMeshes = new Map<string, THREE.Mesh>();
  const markers = new Map<string, THREE.Object3D>();
  const animatedObjects: { obj: THREE.Object3D; type: string }[] = [];

  // ── 1. Sky + Fog ───────────────────────────────────────────

  // Fog is set on the parent scene by the caller, but we store the config
  // so the caller can apply it: scene.fog = new FogExp2(cfg.fog.color, cfg.fog.density)

  // ── 2. Lighting ────────────────────────────────────────────

  const hemiLight = new THREE.HemisphereLight(
    cfg.skyColor,
    hexToColor(sector.colors.deep).getHex(),
    cfg.ambientIntensity,
  );
  root.add(hemiLight);

  const sunLight = new THREE.DirectionalLight(0xfff4e0, cfg.sunIntensity);
  sunLight.position.set(
    cfg.sunDirection[0] * 500,
    cfg.sunDirection[1] * 500,
    cfg.sunDirection[2] * 500,
  );
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  const shadowExtent = Math.max(800, half * 0.85);
  sunLight.shadow.camera.left = -shadowExtent;
  sunLight.shadow.camera.right = shadowExtent;
  sunLight.shadow.camera.top = shadowExtent;
  sunLight.shadow.camera.bottom = -shadowExtent;
  sunLight.shadow.camera.near = 1;
  sunLight.shadow.camera.far = Math.max(2000, cfg.sizeMeters * 0.25);
  sunLight.shadow.bias = -0.0005;
  root.add(sunLight);

  // Sector accent fill light (tints the scene with the biome's accent color)
  const accentLight = new THREE.PointLight(
    hexToColor(sector.colors.accent).getHex(),
    0.3,
    cfg.sizeMeters,
  );
  accentLight.position.set(0, 200, 0);
  root.add(accentLight);

  // ── 3. Ocean Water Plane (single strengthened shader — ONE water surface) ─

  const oceanStrength =
    sector.biome === 'tropical' || sector.id === 'haven_shore' ? 1.25 :
    sector.biome === 'frozen' ? 0.95 :
    sector.biome === 'volcanic' ? 1.1 : 1.15;

  const ocean = createOceanMesh({
    size: cfg.sizeMeters * 1.25,
    waterLevel: cfg.waterLevel,
    segments: 72,
    strength: oceanStrength,
    shallowColor: hexToColor(sector.colors.mid),
    deepColor: hexToColor(sector.colors.deep),
  });
  ocean.receiveShadow = true;
  ocean.name = 'ocean';
  ocean.userData.grudgeKeepOcean = true;
  root.add(ocean);

  // ── 4. Islands (terrain meshes) ────────────────────────────
  // Terrain below water is collapsed to seafloor so the ocean plane is the
  // only visible water (no second "layer" of submerged terrain looking wet).

  const islands = getNodesByCategory<IslandNode>(population, 'island');
  const seafloorY = cfg.waterLevel - Math.max(16, Math.abs(cfg.minHeight) * 0.45);

  for (const island of islands) {
    // Map island size to terrain config
    // Home islands need to be large enough for base building, farming, and exploration.
    // A 4 km sector means a home island at 1500-2000m feels substantial.
    // Production land mass — larger footprints matching zoneServerNodes sizeRadii ~1.6×
    const sizeToConfig: Record<string, Partial<IslandTerrainConfig>> = {
      atoll:    { xSegments: 39, ySegments: 39, xSize: 240, ySize: 240, maxHeight: 18 },
      small:    { xSegments: 55, ySegments: 55, xSize: 520, ySize: 520, maxHeight: 55 },
      medium:   { xSegments: 79, ySegments: 79, xSize: 900, ySize: 900, maxHeight: 95 },
      large:    { xSegments: 111, ySegments: 111, xSize: 1500, ySize: 1500, maxHeight: 130 },
      fortress: { xSegments: 159, ySegments: 159, xSize: 2800, ySize: 2800, maxHeight: 200 },
    };
    const sizeConfig = sizeToConfig[island.size] ?? sizeToConfig.medium;

    // minHeight sits just under waterline so beaches meet the ocean cleanly
    const landMin = Math.min(cfg.waterLevel - 2, cfg.minHeight * 0.15);

    const terrainResult = generateIslandTerrain({
      seed: island.islandSeed,
      ...sizeConfig,
      minHeight: landMin,
      maxHeight: sizeConfig.maxHeight ?? cfg.maxHeight * 0.6,
    } as IslandTerrainConfig);

    // Sector islands use their biome's height+slope blend. Player home islands
    // load through the separate home-island scene, not an IslandSize value.
    const material = createSectorTerrainMaterial(sector, {
          waterLevel: cfg.waterLevel,
          minHeight: landMin,
          maxHeight: sizeConfig.maxHeight ?? cfg.maxHeight * 0.6,
        });
    terrainResult.terrainMesh.material = material;

    // Collapse submerged verts → single water surface (ocean mesh only)
    flattenTerrainBelowWater(terrainResult.terrainMesh, cfg.waterLevel, seafloorY);

    // Position island in the zone (Y=0 local; water is world Y = cfg.waterLevel)
    terrainResult.terrainScene.position.set(
      island.position[0],
      0,
      island.position[2],
    );
    terrainResult.terrainScene.name = `island_${island.id}`;

    root.add(terrainResult.terrainScene);
    islandMeshes.set(island.id, terrainResult.terrainMesh);
  }

  // Strip any accidental water meshes from island packs / materials
  removeDuplicateWaterMeshes(root, ocean);

  // ── 5. Node Markers ────────────────────────────────────────

  // Harvest nodes — glowing orb at node position
  const harvestNodes = getNodesByCategory<HarvestNode>(population, 'harvest');
  for (const node of harvestNodes) {
    const color = MARKER_COLORS[`harvest_${node.profession}`] ?? 0x22c55e;
    const marker = createGlowMarker(color, 1.5 + node.tier * 0.3);
    marker.position.set(node.position[0], node.position[1] + 2, node.position[2]);
    marker.name = `marker_${node.id}`;
    root.add(marker);
    markers.set(node.id, marker);
    animatedObjects.push({ obj: marker, type: 'pulse' });
  }

  // NPC Camps — flag pole marker
  const camps = getNodesByCategory<NPCCampNode>(population, 'npc_camp');
  for (const camp of camps) {
    const marker = createFlagMarker(MARKER_COLORS.npc_camp, camp.hasPirateFlag);
    marker.position.set(camp.position[0], camp.position[1] + 3, camp.position[2]);
    marker.name = `marker_${camp.id}`;
    root.add(marker);
    markers.set(camp.id, marker);
  }

  // Docks — wooden platform marker
  const docks = getNodesByCategory<DockNode>(population, 'dock');
  for (const dock of docks) {
    const marker = createDockMarker();
    marker.position.set(dock.position[0], cfg.waterLevel + 0.5, dock.position[2]);
    marker.name = `marker_${dock.id}`;
    root.add(marker);
    markers.set(dock.id, marker);
  }

  // Shipwrecks
  const wrecks = getNodesByCategory<ShipwreckNode>(population, 'shipwreck');
  for (const wreck of wrecks) {
    const marker = createWreckMarker(wreck.isSubmerged, cfg.waterLevel);
    marker.position.set(wreck.position[0], wreck.isSubmerged ? cfg.waterLevel - 3 : cfg.waterLevel + 1, wreck.position[2]);
    marker.name = `marker_${wreck.id}`;
    root.add(marker);
    markers.set(wreck.id, marker);
  }

  // Ocean hazards — danger zone rings
  const hazards = getNodesByCategory<OceanHazardNode>(population, 'ocean_hazard');
  for (const hazard of hazards) {
    const marker = createHazardRing(hazard.radiusM, hazard.hazardType);
    marker.position.set(hazard.position[0], cfg.waterLevel + 0.2, hazard.position[2]);
    marker.name = `marker_${hazard.id}`;
    root.add(marker);
    markers.set(hazard.id, marker);
    animatedObjects.push({ obj: marker, type: 'rotate' });
  }

  // POIs — tall beacon light
  const pois = getNodesByCategory<POINode>(population, 'poi');
  for (const poi of pois) {
    const marker = createGlowMarker(MARKER_COLORS.poi, 2.5);
    marker.position.set(poi.position[0], poi.position[1] + 5, poi.position[2]);
    marker.name = `marker_${poi.id}`;
    root.add(marker);
    markers.set(poi.id, marker);
    animatedObjects.push({ obj: marker, type: 'pulse' });
  }

  // Boss arenas — large red pulsing ring
  const bosses = getNodesByCategory<BossArenaNode>(population, 'boss_arena');
  for (const boss of bosses) {
    const marker = createHazardRing(boss.arenaRadiusM, 'boss');
    marker.position.set(boss.position[0], 1, boss.position[2]);
    marker.name = `marker_${boss.id}`;
    root.add(marker);
    markers.set(boss.id, marker);
    animatedObjects.push({ obj: marker, type: 'pulse' });
  }

  // Ocean currents — visible trail
  const currents = getNodesByCategory<OceanCurrentNode>(population, 'current');
  for (const current of currents) {
    if (!current.isVisible) continue;
    const marker = createCurrentTrail(current.pathStart, current.pathEnd, current.widthM, cfg.waterLevel);
    marker.name = `marker_${current.id}`;
    root.add(marker);
    markers.set(current.id, marker);
    animatedObjects.push({ obj: marker, type: 'flow' });
  }

  // Spawn points — subtle cyan ring (debug visibility)
  const spawns = getNodesByCategory<SpawnPointNode>(population, 'spawn_point');
  for (const sp of spawns) {
    const marker = createSpawnMarker(sp.safeRadius, sp.spawnType);
    marker.position.set(sp.position[0], cfg.waterLevel + 0.1, sp.position[2]);
    marker.name = `marker_${sp.id}`;
    root.add(marker);
    markers.set(sp.id, marker);
  }

  // Enemy / faction ship patrols — hull markers on the water (minimap + world)
  // Hostile / pirate / legion boats get continuous fire+smoke for combat readability.
  const patrols = getNodesByCategory<AIPatrolNode>(population, 'ai_patrol');
  for (const patrol of patrols) {
    if (!patrol.isShipPatrol) continue;
    const ship = createEnemyBoatMarker(patrol.faction);
    ship.position.set(patrol.position[0], cfg.waterLevel + 1.2, patrol.position[2]);
    ship.name = `marker_${patrol.id}`;
    ship.userData.patrol = patrol;
    ship.userData.waypoints = patrol.waypoints;
    ship.userData.wpIndex = 0;
    const hostile =
      patrol.faction === 'hostile' ||
      patrol.faction === 'legion' ||
      patrol.difficulty >= 6;
    ship.userData.burning = hostile;
    root.add(ship);
    markers.set(patrol.id, ship);
    animatedObjects.push({ obj: ship, type: 'ship_patrol' });
  }

  // Sea creature fins
  const seaCreatures = getNodesByCategory<SeaCreatureNode>(population, 'sea_creature');
  for (const sc of seaCreatures) {
    if (!sc.surfaces) continue;
    const fin = createGlowMarker(MARKER_COLORS.sea_creature, 2.2);
    fin.position.set(sc.position[0], cfg.waterLevel + 0.8, sc.position[2]);
    fin.name = `marker_${sc.id}`;
    root.add(fin);
    markers.set(sc.id, fin);
    animatedObjects.push({ obj: fin, type: 'pulse' });
  }

  // ── 6. Update Function ─────────────────────────────────────

  function update(dt: number, elapsed: number): void {
    // Waves are displaced by the shader, matching the gameplay height sampler.
    updateOceanMaterial(ocean.material, elapsed);

    // Animate markers
    for (const { obj, type } of animatedObjects) {
      switch (type) {
        case 'pulse': {
          const scale = 1 + Math.sin(elapsed * 2) * 0.15;
          obj.scale.setScalar(scale);
          break;
        }
        case 'rotate':
          obj.rotation.y += dt * 0.5;
          break;
        case 'flow':
          // UV scroll on current trail material
          if ((obj as THREE.Mesh).material instanceof THREE.MeshStandardMaterial) {
            const mat = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial;
            if (mat.map) mat.map.offset.x += dt * 0.3;
          }
          break;
        case 'ship_patrol': {
          // Cruise between waypoints for live minimap + world presence
          const wps = obj.userData.waypoints as [number, number, number][] | undefined;
          if (!wps || wps.length < 2) break;
          let idx = (obj.userData.wpIndex as number) ?? 0;
          const target = wps[idx % wps.length];
          const dx = target[0] - obj.position.x;
          const dz = target[2] - obj.position.z;
          const dist = Math.hypot(dx, dz);
          const speed = 18;
          if (dist < 12) {
            obj.userData.wpIndex = (idx + 1) % wps.length;
          } else {
            obj.position.x += (dx / dist) * speed * dt;
            obj.position.z += (dz / dist) * speed * dt;
            obj.rotation.y = Math.atan2(dx, dz);
          }
          break;
        }
      }
    }
  }

  // ── 7. Dispose ─────────────────────────────────────────────

  function dispose(): void {
    root.traverse(child => {
      if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
      if ((child as THREE.Mesh).material) {
        const mats = Array.isArray((child as THREE.Mesh).material)
          ? (child as THREE.Mesh).material as THREE.Material[]
          : [(child as THREE.Mesh).material as THREE.Material];
        mats.forEach(m => m.dispose());
      }
    });
  }

  return {
    root,
    ocean,
    islandMeshes,
    markers,
    sunLight,
    hemiLight,
    update,
    dispose,
  };
}

// ── Marker Factory Functions ─────────────────────────────────────────────────

function createGlowMarker(color: number, size: number): THREE.Mesh {
  const geo = new THREE.SphereGeometry(size, 8, 8);
  const mat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.6,
    transparent: true,
    opacity: 0.7,
    roughness: 0.3,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = false;
  return mesh;
}

function createFlagMarker(color: number, isPirateFlag: boolean): THREE.Group {
  const group = new THREE.Group();
  // Pole
  const poleGeo = new THREE.CylinderGeometry(0.1, 0.1, 6, 4);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x8b6914, roughness: 0.8 });
  const pole = new THREE.Mesh(poleGeo, poleMat);
  pole.position.y = 3;
  group.add(pole);
  // Flag
  const flagGeo = new THREE.PlaneGeometry(2, 1.2);
  const flagMat = new THREE.MeshStandardMaterial({
    color: isPirateFlag ? 0x1a1a1a : color,
    side: THREE.DoubleSide,
    roughness: 0.9,
  });
  const flag = new THREE.Mesh(flagGeo, flagMat);
  flag.position.set(1, 5.5, 0);
  group.add(flag);
  return group;
}

function createDockMarker(): THREE.Group {
  const group = new THREE.Group();
  // Platform
  const platGeo = new THREE.BoxGeometry(8, 0.5, 4);
  const platMat = new THREE.MeshStandardMaterial({ color: 0x8b6914, roughness: 0.9 });
  const plat = new THREE.Mesh(platGeo, platMat);
  plat.receiveShadow = true;
  group.add(plat);
  // Posts
  for (const dx of [-3.5, 3.5]) {
    for (const dz of [-1.5, 1.5]) {
      const postGeo = new THREE.CylinderGeometry(0.15, 0.15, 3, 4);
      const post = new THREE.Mesh(postGeo, platMat);
      post.position.set(dx, -1.2, dz);
      group.add(post);
    }
  }
  return group;
}

function createWreckMarker(isSubmerged: boolean, waterLevel: number): THREE.Group {
  const group = new THREE.Group();
  const hullGeo = new THREE.BoxGeometry(6, 2, 2.5);
  const hullMat = new THREE.MeshStandardMaterial({
    color: 0x4a3728,
    roughness: 0.95,
    transparent: isSubmerged,
    opacity: isSubmerged ? 0.5 : 1,
  });
  const hull = new THREE.Mesh(hullGeo, hullMat);
  hull.rotation.z = 0.3; // tilted wreck
  hull.rotation.y = Math.random() * Math.PI;
  group.add(hull);
  // Broken mast
  const mastGeo = new THREE.CylinderGeometry(0.12, 0.08, 4, 4);
  const mast = new THREE.Mesh(mastGeo, hullMat);
  mast.position.set(0, 1.5, 0);
  mast.rotation.x = 0.5;
  group.add(mast);
  return group;
}

function createHazardRing(radius: number, hazardType: string): THREE.Mesh {
  const color = hazardType === 'boss' ? 0xff0000
    : hazardType === 'luminous_vortex' ? 0xbf40ff
    : hazardType === 'whirlpool' ? 0x4a90d9
    : 0xef4444;
  const geo = new THREE.RingGeometry(radius - 2, radius, 32);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.4,
    transparent: true,
    opacity: 0.35,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  return new THREE.Mesh(geo, mat);
}

function createCurrentTrail(
  start: [number, number, number],
  end: [number, number, number],
  width: number,
  waterLevel: number,
): THREE.Mesh {
  const dx = end[0] - start[0];
  const dz = end[2] - start[2];
  const length = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dz, dx);

  const geo = new THREE.PlaneGeometry(length, width, 16, 1);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.3,
    transparent: true,
    opacity: 0.25,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(
    (start[0] + end[0]) / 2,
    waterLevel + 0.3,
    (start[2] + end[2]) / 2,
  );
  mesh.rotation.y = -angle;
  return mesh;
}

function createSpawnMarker(radius: number, type: string): THREE.Mesh {
  const color = type === 'ship' ? 0x38bdf8 : 0x22d3ee;
  const geo = new THREE.RingGeometry(radius - 1, radius, 24);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({
    color,
    transparent: true,
    opacity: 0.15,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  return new THREE.Mesh(geo, mat);
}

/** Enemy / faction warship marker (hull + mast) for zone ocean + minimap. */
function createEnemyBoatMarker(faction: string): THREE.Group {
  const g = new THREE.Group();
  g.name = 'enemy_boat';
  const hullColor =
    faction === 'crusade' ? 0xc9a227
    : faction === 'fabled' ? 0x4a9eff
    : faction === 'legion' ? 0xe53935
    : faction === 'pirate' || faction === 'hostile' ? 0x7f1d1d
    : 0x78716c;
  const hull = new THREE.Mesh(
    new THREE.BoxGeometry(14, 3.2, 5.5),
    new THREE.MeshStandardMaterial({ color: hullColor, roughness: 0.75, metalness: 0.15 }),
  );
  hull.position.y = 0.4;
  hull.castShadow = true;
  g.add(hull);
  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.25, 9, 6),
    new THREE.MeshStandardMaterial({ color: 0x4a3728 }),
  );
  mast.position.y = 5.5;
  g.add(mast);
  const sail = new THREE.Mesh(
    new THREE.PlaneGeometry(5, 6),
    new THREE.MeshStandardMaterial({
      color: hullColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    }),
  );
  sail.position.set(0, 6.5, 0);
  g.add(sail);
  return g;
}
