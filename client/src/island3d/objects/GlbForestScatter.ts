/**
 * GlbForestScatter — visible CDN tree clones at placed forest node positions.
 */
import * as THREE from 'three';
import type { PlacedNode3D } from '../terrain/NodePlacer';
import { cloneIslandResource, fitModelToHeight } from './IslandResourceLoader';

export async function scatterGlbTreesFromNodes(
  nodes: PlacedNode3D[],
  maxTrees = 80,
): Promise<THREE.Group> {
  const group = new THREE.Group();
  group.name = 'glb_forest_scatter';

  const treeNodes = nodes.filter((n) => n.type === 'tree').slice(0, maxTrees);
  for (const node of treeNodes) {
    try {
      const model = await cloneIslandResource('tree');
      fitModelToHeight(model, 7 * node.scale);
      model.position.copy(node.position);
      model.rotation.y = Math.random() * Math.PI * 2;
      group.add(model);
    } catch {
      break;
    }
  }

  return group;
}