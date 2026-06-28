/**
 * HarvestZoneBuilder — builds visual harvest zones + interactive nodes.
 */
import * as THREE from 'three';
import {
  getHarvestZoneColor,
  type HarvestZoneDef,
  type HarvestZoneNodeSlot,
} from './HarvestZonePlacer';
import { InstancedForestZone } from './InstancedForestZone';
import { createHarvestableTree, type HarvestableTree } from '../objects/HarvestableTree';
import {
  createHarvestableRock,
  mountHarvestableRockModel,
  type HarvestableRock,
} from '../objects/HarvestableRock';
import {
  createCrystalCluster,
  createHempPlant,
  createFlowerPatch,
  createScrapPile,
  type HarvestableCrystal,
  type HarvestableHemp,
  type HarvestableFlower,
  type HarvestableScrap,
} from '../objects/HomeIslandNodes';

export interface HarvestZoneVisual {
  id: string;
  outline: THREE.Group;
  forest: InstancedForestZone | null;
}

export interface HarvestZonesResult {
  zones: HarvestZoneVisual[];
  forests: InstancedForestZone[];
  trees: HarvestableTree[];
  rocks: HarvestableRock[];
  crystals: HarvestableCrystal[];
  hemps: HarvestableHemp[];
  flowers: HarvestableFlower[];
  scraps: HarvestableScrap[];
  update: (dt: number, cameraPos: THREE.Vector3) => void;
  dispose: () => void;
}

function createZoneOutline(zone: HarvestZoneDef): THREE.Group {
  const g = new THREE.Group();
  g.position.copy(zone.center);
  g.name = `harvest_zone_${zone.id}`;

  const color = getHarvestZoneColor(zone.type);

  const outer = new THREE.Mesh(
    new THREE.RingGeometry(zone.radius * 0.92, zone.radius, 48),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  outer.rotation.x = -Math.PI / 2;
  outer.position.y = 0.12;
  g.add(outer);

  const inner = new THREE.Mesh(
    new THREE.RingGeometry(zone.clearRadius * 0.85, zone.clearRadius, 32),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  inner.rotation.x = -Math.PI / 2;
  inner.position.y = 0.14;
  g.add(inner);

  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.25, 1.2, 6),
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.35,
      roughness: 0.6,
    }),
  );
  beacon.position.y = 0.6;
  beacon.castShadow = true;
  g.add(beacon);

  const labelSprite = makeZoneLabel(zone.type);
  labelSprite.position.y = 2.2;
  g.add(labelSprite);

  return g;
}

function makeZoneLabel(type: HarvestZoneDef['type']): THREE.Sprite {
  const labels: Record<HarvestZoneDef['type'], string> = {
    forest: 'Wood',
    rock_field: 'Stone',
    gem_vein: 'Gems',
    hemp_patch: 'Hemp',
    flower_meadow: 'Herbs',
    scrap_yard: 'Scrap',
    mixed: 'Resources',
  };

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.roundRect(8, 8, 240, 48, 8);
  ctx.fill();
  ctx.fillStyle = '#f0fdf4';
  ctx.font = 'bold 28px system-ui,sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(labels[type], 128, 32);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(8, 2, 1);
  return sprite;
}

function resolveGroundY(
  zone: HarvestZoneDef,
  slot: HarvestZoneNodeSlot,
  sampleHeight?: (x: number, z: number) => number | null,
): number {
  const wx = zone.center.x + slot.offsetX;
  const wz = zone.center.z + slot.offsetZ;
  if (sampleHeight) {
    return sampleHeight(wx, wz) ?? zone.center.y;
  }
  return zone.center.y;
}

function spawnHarvestNode(
  zone: HarvestZoneDef,
  slot: HarvestZoneNodeSlot,
  slotIndex: number,
  sampleHeight: ((x: number, z: number) => number | null) | undefined,
  hideTreeMesh: boolean,
): {
  tree?: HarvestableTree;
  rock?: HarvestableRock;
  crystal?: HarvestableCrystal;
  hemp?: HarvestableHemp;
  flower?: HarvestableFlower;
  scrap?: HarvestableScrap;
} {
  const wx = zone.center.x + slot.offsetX;
  const wz = zone.center.z + slot.offsetZ;
  const y = resolveGroundY(zone, slot, sampleHeight);
  const pos = new THREE.Vector3(wx, y, wz);

  const nodeId = `${zone.id}_${slot.type}_${slotIndex}`;

  switch (slot.type) {
    case 'tree': {
      const tree = createHarvestableTree(pos, slot.scale);
      tree.nodeId = nodeId;
      if (hideTreeMesh) tree.group.visible = false;
      return { tree };
    }
    case 'rock': {
      const rock = createHarvestableRock(pos, slot.scale);
      rock.nodeId = nodeId;
      if (zone.type === 'rock_field' || zone.type === 'gem_vein') {
        rock.oreVariant = slotIndex % 3 === 0;
        if (rock.oreVariant) void mountHarvestableRockModel(rock, slot.scale);
      }
      return { rock };
    }
    case 'crystal':
      return { crystal: createCrystalCluster(pos, slot.scale) };
    case 'hemp':
      return { hemp: createHempPlant(pos, slot.scale) };
    case 'flower':
      return { flower: createFlowerPatch(pos, slot.scale) };
    case 'scrap':
      return { scrap: createScrapPile(pos, slot.scale) };
    default:
      return {};
  }
}

/**
 * Build all harvest zones into the scene.
 */
export async function buildHarvestZones(
  scene: THREE.Scene,
  zoneDefs: HarvestZoneDef[],
  sampleHeight?: (x: number, z: number) => number | null,
): Promise<HarvestZonesResult> {
  const zoneVisuals: HarvestZoneVisual[] = [];
  const forests: InstancedForestZone[] = [];
  const trees: HarvestableTree[] = [];
  const rocks: HarvestableRock[] = [];
  const crystals: HarvestableCrystal[] = [];
  const hemps: HarvestableHemp[] = [];
  const flowers: HarvestableFlower[] = [];
  const scraps: HarvestableScrap[] = [];

  for (const zone of zoneDefs) {
    const outline = createZoneOutline(zone);
    scene.add(outline);

    let forest: InstancedForestZone | null = null;
    const wantsForest = zone.type === 'forest' || zone.type === 'mixed';

    if (wantsForest && zone.forestTreeCount > 0) {
      forest = new InstancedForestZone();
      const groundY = sampleHeight
        ? (sampleHeight(zone.center.x, zone.center.z) ?? zone.center.y)
        : zone.center.y;

      const result = forest.generate(zone.seed, zone.center.x, zone.center.z, groundY, {
        treeCount: zone.forestTreeCount,
        forestRadius: zone.radius * 0.88,
        clearRadius: zone.clearRadius,
      });

      scene.add(forest.group);
      forests.push(forest);

      // Ensure harvest trees align with forest scatter when zone is pure forest
      if (zone.type === 'forest' && zone.nodes.every((n) => n.type === 'tree')) {
        for (let i = 0; i < Math.min(zone.nodes.length, result.treePositions.length); i++) {
          zone.nodes[i].offsetX = result.treePositions[i].x - zone.center.x;
          zone.nodes[i].offsetZ = result.treePositions[i].z - zone.center.z;
        }
      }
    }

    const hideTreeMesh = forest !== null;

    for (let slotIndex = 0; slotIndex < zone.nodes.length; slotIndex++) {
      const slot = zone.nodes[slotIndex];
      const spawned = spawnHarvestNode(zone, slot, slotIndex, sampleHeight, hideTreeMesh);
      if (spawned.tree) {
        scene.add(spawned.tree.group);
        trees.push(spawned.tree);
      }
      if (spawned.rock) {
        scene.add(spawned.rock.group);
        rocks.push(spawned.rock);
      }
      if (spawned.crystal) {
        scene.add(spawned.crystal.group);
        crystals.push(spawned.crystal);
      }
      if (spawned.hemp) {
        scene.add(spawned.hemp.group);
        hemps.push(spawned.hemp);
      }
      if (spawned.flower) {
        scene.add(spawned.flower.group);
        flowers.push(spawned.flower);
      }
      if (spawned.scrap) {
        scene.add(spawned.scrap.group);
        scraps.push(spawned.scrap);
      }
    }

    zoneVisuals.push({ id: zone.id, outline, forest });
  }

  return {
    zones: zoneVisuals,
    forests,
    trees,
    rocks,
    crystals,
    hemps,
    flowers,
    scraps,
    update(dt, cameraPos) {
      for (const f of forests) f.update(dt, cameraPos);
    },
    dispose() {
      for (const z of zoneVisuals) {
        scene.remove(z.outline);
        z.outline.traverse((obj) => {
          if (obj instanceof THREE.Mesh || obj instanceof THREE.Sprite) {
            obj.geometry?.dispose();
            const mat = obj.material;
            if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
            else mat?.dispose();
          }
        });
        z.forest?.dispose();
      }
      for (const t of trees) scene.remove(t.group);
      for (const r of rocks) scene.remove(r.group);
      for (const c of crystals) scene.remove(c.group);
      for (const h of hemps) scene.remove(h.group);
      for (const f of flowers) scene.remove(f.group);
      for (const s of scraps) scene.remove(s.group);
    },
  };
}