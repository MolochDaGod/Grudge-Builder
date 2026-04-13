/**
 * IslandStateSync — bridges 2D and 3D island state.
 *
 * Both modes share the same seed → same topology → same resource node positions.
 * This module serializes/deserializes state between the two views so switching
 * is seamless and no progress is lost.
 */

export interface SharedNodeState {
  id: string;
  depleted: boolean;
  qty: number;
  respawnAt: number; // ms timestamp, 0 = available
}

export interface SharedIslandState {
  seed: string;
  nodes: SharedNodeState[];
  playerPosition: { x: number; y: number; z: number };
  timestamp: number;
}

/**
 * Capture current 3D state into a shared format that the 2D engine can consume.
 */
export function capture3DState(
  seed: string,
  trees: Array<{ group: { visible: boolean; position: { x: number; y: number; z: number } }; health: number; maxHealth: number }>,
  rocks: Array<{ group: { visible: boolean; position: { x: number; y: number; z: number } }; health: number; maxHealth: number }>,
  playerPos: { x: number; y: number; z: number },
): SharedIslandState {
  const nodes: SharedNodeState[] = [];

  trees.forEach((tree, i) => {
    nodes.push({
      id: `tree_${i}`,
      depleted: !tree.group.visible || tree.health <= 0,
      qty: tree.health,
      respawnAt: tree.health <= 0 ? Date.now() + 60000 : 0, // 60s respawn
    });
  });

  rocks.forEach((rock, i) => {
    nodes.push({
      id: `rock_${i}`,
      depleted: !rock.group.visible || rock.health <= 0,
      qty: rock.health,
      respawnAt: rock.health <= 0 ? Date.now() + 90000 : 0, // 90s respawn
    });
  });

  return {
    seed,
    nodes,
    playerPosition: { x: playerPos.x, y: playerPos.y, z: playerPos.z },
    timestamp: Date.now(),
  };
}

/**
 * Apply shared state to 3D objects when switching from 2D → 3D.
 */
export function apply3DState(
  state: SharedIslandState,
  trees: Array<{ group: { visible: boolean }; health: number; maxHealth: number }>,
  rocks: Array<{ group: { visible: boolean; scale: { setScalar: (s: number) => void } }; health: number; maxHealth: number; baseScale: number }>,
): void {
  const now = Date.now();

  for (const nodeState of state.nodes) {
    if (nodeState.id.startsWith('tree_')) {
      const idx = parseInt(nodeState.id.split('_')[1]);
      const tree = trees[idx];
      if (!tree) continue;

      if (nodeState.depleted && nodeState.respawnAt > now) {
        tree.group.visible = false;
        tree.health = 0;
      } else if (nodeState.depleted && nodeState.respawnAt <= now) {
        // Respawned
        tree.group.visible = true;
        tree.health = tree.maxHealth;
      } else {
        tree.health = nodeState.qty;
        tree.group.visible = true;
      }
    }

    if (nodeState.id.startsWith('rock_')) {
      const idx = parseInt(nodeState.id.split('_')[1]);
      const rock = rocks[idx];
      if (!rock) continue;

      if (nodeState.depleted && nodeState.respawnAt > now) {
        rock.group.visible = false;
        rock.health = 0;
      } else if (nodeState.depleted && nodeState.respawnAt <= now) {
        rock.group.visible = true;
        rock.health = rock.maxHealth;
        rock.group.scale.setScalar(rock.baseScale);
      } else {
        rock.health = nodeState.qty;
        rock.group.visible = true;
        const scale = Math.max(0.3, rock.health / rock.maxHealth);
        rock.group.scale.setScalar(rock.baseScale * scale);
      }
    }
  }
}

/**
 * Convert 3D state to a format compatible with the 2D island system's ResourceNodeActor.
 */
export function to2DNodeStates(state: SharedIslandState): Array<{
  id: string;
  qty: number;
  depleted: boolean;
  respawnAt: number;
}> {
  return state.nodes.map(n => ({
    id: n.id,
    qty: n.qty,
    depleted: n.depleted,
    respawnAt: n.respawnAt,
  }));
}
