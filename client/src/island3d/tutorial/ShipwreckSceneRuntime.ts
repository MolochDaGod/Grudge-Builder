/**
 * ShipwreckSceneRuntime — complete usable shipwreck map:
 * zones · harvest nodes · NPC behaviors · prefab deployments · pathfinder · gizmo.
 */
import * as THREE from 'three';
import {
  SHIPWRECK_SCENE,
  SHIPWRECK_PREFAB_CATALOG,
  setEntityXyz,
  type ShipwreckSceneDef,
  type ShipwreckPrefabKind,
  type ShipwreckNpcDef,
  type ShipwreckNodeDef,
  type ShipwreckPrefabDef,
  type Xyz,
} from '@shared/definitions/shipwreckScene';
import { createShipwreckPathfinder, type ShipwreckPathfinder } from './ShipwreckPathfinder';
import { createShipwreckGizmo, type ShipwreckGizmoHandle, type GizmoMode } from './ShipwreckGizmo';

export interface RuntimeEntity {
  id: string;
  kind: 'zone' | 'node' | 'npc' | 'prefab' | 'path' | 'spawn';
  object: THREE.Object3D;
  label: string;
}

export interface ShipwreckSceneRuntime {
  sceneDef: ShipwreckSceneDef;
  root: THREE.Group;
  pathfinder: ShipwreckPathfinder;
  gizmo: ShipwreckGizmoHandle | null;
  entities: Map<string, RuntimeEntity>;
  selectedId: string | null;
  editorMode: boolean;
  select: (id: string | null) => void;
  setXyz: (id: string, xyz: Xyz) => void;
  setGizmoMode: (mode: GizmoMode) => void;
  setEditorMode: (on: boolean) => void;
  deployPrefab: (kind: ShipwreckPrefabKind, at: Xyz) => string;
  deployNode: (kind: ShipwreckNodeDef['kind'], at: Xyz) => string;
  getSelectedXyz: () => Xyz | null;
  pathTo: (from: Xyz, to: Xyz) => THREE.Vector3[];
  showNavDebug: (on: boolean) => void;
  showZones: (on: boolean) => void;
  showPaths: (on: boolean) => void;
  update: (dt: number, playerPos?: THREE.Vector3) => void;
  harvestNearest: (playerPos: THREE.Vector3, radius?: number) => ShipwreckNodeDef | null;
  getNodeStates: () => Array<{ id: string; kind: string; depleted: boolean; x: number; z: number }>;
  exportSceneJson: () => string;
  dispose: () => void;
}

interface NpcRuntime {
  def: ShipwreckNpcDef;
  mesh: THREE.Group;
  path: THREE.Vector3[];
  pathIndex: number;
  wait: number;
  wanderT: number;
  hp: number;
}

interface NodeRuntime {
  def: ShipwreckNodeDef;
  mesh: THREE.Object3D;
  depleted: boolean;
  respawnAt: number;
}

function woodMat(c = 0x5c4033) {
  return new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 });
}
function rockMat(c = 0x6b7280) {
  return new THREE.MeshStandardMaterial({ color: c, roughness: 0.95 });
}

function applyTransform(obj: THREE.Object3D, t: { position: Xyz; rotationY?: number; scale?: number | [number, number, number] }) {
  obj.position.set(t.position.x, t.position.y, t.position.z);
  if (t.rotationY != null) obj.rotation.y = t.rotationY;
  if (t.scale != null) {
    if (typeof t.scale === 'number') obj.scale.setScalar(t.scale);
    else obj.scale.set(t.scale[0], t.scale[1], t.scale[2]);
  }
}

function makePrefabMesh(kind: ShipwreckPrefabKind): THREE.Group {
  const g = new THREE.Group();
  g.userData.prefabKind = kind;
  if (kind === 'wreck_hull') {
    const hull = new THREE.Mesh(new THREE.BoxGeometry(14, 3.5, 5), woodMat(0x4a3224));
    hull.position.y = 1.2;
    hull.rotation.z = 0.35;
    hull.castShadow = true;
    g.add(hull);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.35, 9, 6), woodMat(0x3a2a1a));
    mast.position.set(-2, 3.5, 0.5);
    mast.rotation.z = 0.9;
    g.add(mast);
  } else if (kind === 'boat') {
    const hull = new THREE.Mesh(new THREE.BoxGeometry(5, 1.2, 2.2), woodMat(0x5c3d2e));
    hull.position.y = 0.5;
    g.add(hull);
  } else if (kind === 'rock') {
    const r = new THREE.Mesh(new THREE.DodecahedronGeometry(1.2, 0), rockMat());
    r.castShadow = true;
    g.add(r);
  } else if (kind === 'stick_prop') {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.9, 5), woodMat(0x8b6914));
    s.rotation.z = Math.PI / 2;
    g.add(s);
  } else if (kind === 'stone_prop') {
    g.add(new THREE.Mesh(new THREE.DodecahedronGeometry(0.25, 0), rockMat(0x9ca3af)));
  } else if (kind === 'chest') {
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 0.6), woodMat(0x92400e));
    c.position.y = 0.28;
    g.add(c);
  } else if (kind === 'barrel') {
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.9, 10), woodMat(0x6b4423)));
  } else if (kind === 'crate') {
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), woodMat(0x78716c)));
  } else if (kind === 'tent') {
    const t = new THREE.Mesh(new THREE.ConeGeometry(1.6, 2.2, 4), new THREE.MeshStandardMaterial({ color: 0xa16207 }));
    t.position.y = 1.1;
    g.add(t);
  } else if (kind === 'campfire') {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.12, 6, 12), rockMat(0x44403c));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.1;
    g.add(ring);
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.25, 0.7, 5),
      new THREE.MeshBasicMaterial({ color: 0xf97316 }),
    );
    flame.position.y = 0.5;
    g.add(flame);
  } else if (kind === 'dock_plank') {
    const p = new THREE.Mesh(new THREE.BoxGeometry(3, 0.2, 8), woodMat(0x57534e));
    p.position.y = 0.15;
    g.add(p);
  } else {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24 }),
    );
    g.add(m);
  }
  g.userData.grudgeChunk = { kind, chunkable: true, name: kind };
  g.userData.prefab = { id: '', kind, role: 'structure' };
  return g;
}

function makeNodeMesh(kind: ShipwreckNodeDef['kind']): THREE.Object3D {
  if (kind === 'stick') {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.85, 5), woodMat(0x8b6914));
    m.rotation.z = Math.PI / 2 + 0.2;
    m.userData.harvestHint = 'stick';
    return m;
  }
  if (kind === 'stone') {
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22, 0), rockMat(0x9ca3af));
    m.userData.harvestHint = 'stone';
    return m;
  }
  if (kind === 'chest') return makePrefabMesh('chest');
  if (kind === 'campfire_site') {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.8, 1.1, 24),
      new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.35, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    return ring;
  }
  if (kind === 'raft_site') {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.2, 1.6, 24),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.4, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    return ring;
  }
  if (kind === 'water_fill') {
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(1.5, 24),
      new THREE.MeshBasicMaterial({ color: 0x0ea5e9, transparent: true, opacity: 0.35, side: THREE.DoubleSide }),
    );
    disc.rotation.x = -Math.PI / 2;
    return disc;
  }
  return new THREE.Mesh(new THREE.SphereGeometry(0.3), new THREE.MeshBasicMaterial({ color: 0x22c55e }));
}

function makeNpcMesh(def: ShipwreckNpcDef): THREE.Group {
  const g = new THREE.Group();
  const color =
    def.faction === 'enemy' ? 0xef4444
    : def.faction === 'ally' ? 0x22c55e
    : 0xa78bfa;
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.35, 1.1, 4, 8),
    new THREE.MeshStandardMaterial({ color }),
  );
  body.position.y = 1.0;
  body.castShadow = true;
  g.add(body);
  // Name pip
  const pip = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 6, 6),
    new THREE.MeshBasicMaterial({ color }),
  );
  pip.position.y = 2.1;
  g.add(pip);
  g.userData.npcId = def.id;
  g.userData.behavior = def.behavior;
  return g;
}

function makeZoneRing(radiusX: number, radiusZ: number, color: string): THREE.Mesh {
  const maxR = Math.max(radiusX, radiusZ);
  const mesh = new THREE.Mesh(
    new THREE.RingGeometry(maxR * 0.92, maxR, 48),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
    }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.scale.set(radiusX / maxR, 1, radiusZ / maxR);
  return mesh;
}

export interface CreateShipwreckSceneOpts {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  domElement: HTMLElement;
  /** Deep-clone default scene or pass custom */
  def?: ShipwreckSceneDef;
  editorMode?: boolean;
  /**
   * World-space origin for the shipwreck layout (default 0,0,0).
   * Tutorial on pirate-islands sets this to shipwreck_cove beach.
   */
  worldOrigin?: { x: number; y: number; z: number };
}

export function createShipwreckSceneRuntime(opts: CreateShipwreckSceneOpts): ShipwreckSceneRuntime {
  const sceneDef: ShipwreckSceneDef = JSON.parse(
    JSON.stringify(opts.def ?? SHIPWRECK_SCENE),
  );
  const root = new THREE.Group();
  root.name = 'ShipwreckSceneRoot';
  if (opts.worldOrigin) {
    root.position.set(opts.worldOrigin.x, opts.worldOrigin.y, opts.worldOrigin.z);
  }
  opts.scene.add(root);

  const zonesGroup = new THREE.Group();
  zonesGroup.name = 'Zones';
  const nodesGroup = new THREE.Group();
  nodesGroup.name = 'Nodes';
  const npcsGroup = new THREE.Group();
  npcsGroup.name = 'Npcs';
  const prefabsGroup = new THREE.Group();
  prefabsGroup.name = 'Prefabs';
  const pathsGroup = new THREE.Group();
  pathsGroup.name = 'Paths';
  root.add(zonesGroup, nodesGroup, npcsGroup, prefabsGroup, pathsGroup);

  const entities = new Map<string, RuntimeEntity>();
  const nodeRuntimes = new Map<string, NodeRuntime>();
  const npcRuntimes: NpcRuntime[] = [];
  let selectedId: string | null = null;
  let editorMode = opts.editorMode ?? false;
  let showZonesFlag = true;
  let showPathsFlag = true;

  const pathfinder = createShipwreckPathfinder(sceneDef);
  const gizmo = createShipwreckGizmo(opts.camera, opts.domElement, opts.scene);
  gizmo.setEnabled(editorMode);

  // Spawn marker
  {
    const spawn = new THREE.Mesh(
      new THREE.ConeGeometry(0.4, 1.2, 6),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24 }),
    );
    spawn.position.set(sceneDef.playerSpawn.x, sceneDef.playerSpawn.y + 0.6, sceneDef.playerSpawn.z);
    spawn.name = 'player_spawn';
    root.add(spawn);
    entities.set('player_spawn', {
      id: 'player_spawn',
      kind: 'spawn',
      object: spawn,
      label: 'Player Spawn',
    });
  }

  // Zones
  for (const z of sceneDef.zones) {
    const ring = makeZoneRing(z.radiusX, z.radiusZ, z.color);
    ring.position.set(z.center.x, z.center.y, z.center.z);
    ring.name = z.id;
    ring.userData.zoneId = z.id;
    zonesGroup.add(ring);
    entities.set(z.id, { id: z.id, kind: 'zone', object: ring, label: z.name });
  }

  // Prefabs
  for (const pf of sceneDef.prefabs) {
    const mesh = makePrefabMesh(pf.kind);
    applyTransform(mesh, pf.transform);
    mesh.name = pf.id;
    mesh.userData.prefabId = pf.id;
    mesh.userData.prefab = { id: pf.id, kind: pf.kind };
    prefabsGroup.add(mesh);
    entities.set(pf.id, { id: pf.id, kind: 'prefab', object: mesh, label: pf.name });
  }

  // Nodes
  for (const n of sceneDef.nodes) {
    const mesh = makeNodeMesh(n.kind);
    applyTransform(mesh as THREE.Object3D, n.transform);
    mesh.name = n.id;
    mesh.userData.nodeId = n.id;
    nodesGroup.add(mesh);
    nodeRuntimes.set(n.id, { def: n, mesh, depleted: false, respawnAt: 0 });
    entities.set(n.id, { id: n.id, kind: 'node', object: mesh, label: n.name });
  }

  // NPCs
  for (const n of sceneDef.npcs) {
    const mesh = makeNpcMesh(n);
    applyTransform(mesh, n.transform);
    mesh.name = n.id;
    npcsGroup.add(mesh);
    const pathPts: THREE.Vector3[] = [];
    if (n.pathId) {
      const path = sceneDef.paths.find((p) => p.id === n.pathId);
      if (path) {
        for (const p of path.points) pathPts.push(new THREE.Vector3(p.x, p.y, p.z));
      }
    }
    npcRuntimes.push({
      def: n,
      mesh,
      path: pathPts,
      pathIndex: 0,
      wait: 0,
      wanderT: 2 + Math.random() * 4,
      hp: n.faction === 'enemy' ? 40 : 100,
    });
    entities.set(n.id, { id: n.id, kind: 'npc', object: mesh, label: n.name });
  }

  // Paths (visual lines)
  function rebuildPathVisuals() {
    while (pathsGroup.children.length) {
      const c = pathsGroup.children[0];
      pathsGroup.remove(c);
      const m = c as THREE.Line;
      m.geometry?.dispose();
    }
    for (const path of sceneDef.paths) {
      const pts = path.points.map((p) => new THREE.Vector3(p.x, p.y + 0.3, p.z));
      if (path.loop && pts.length > 1) pts.push(pts[0].clone());
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(
        geo,
        new THREE.LineBasicMaterial({
          color: path.color ? new THREE.Color(path.color) : 0xfbbf24,
          linewidth: 2,
        }),
      );
      line.name = path.id;
      line.visible = showPathsFlag;
      pathsGroup.add(line);
      // waypoint spheres
      for (let i = 0; i < path.points.length; i++) {
        const s = new THREE.Mesh(
          new THREE.SphereGeometry(0.25, 8, 8),
          new THREE.MeshBasicMaterial({ color: path.color || '#fbbf24' }),
        );
        s.position.set(path.points[i].x, path.points[i].y + 0.3, path.points[i].z);
        s.name = `${path.id}_wp_${i}`;
        s.visible = showPathsFlag;
        pathsGroup.add(s);
        entities.set(s.name, {
          id: s.name,
          kind: 'path',
          object: s,
          label: `${path.name} WP${i}`,
        });
      }
      entities.set(path.id, { id: path.id, kind: 'path', object: line, label: path.name });
    }
  }
  rebuildPathVisuals();

  gizmo.onChange((xyz, object) => {
    const id = object.name || object.userData.prefabId || object.userData.nodeId || object.userData.npcId;
    if (id) setEntityXyz(sceneDef, id, xyz);
  });

  function select(id: string | null) {
    selectedId = id;
    if (!id || !editorMode) {
      gizmo.attach(null);
      return;
    }
    const ent = entities.get(id);
    if (ent) gizmo.attach(ent.object);
    else gizmo.attach(null);
  }

  function updateNpc(dt: number, playerPos?: THREE.Vector3) {
    for (const npc of npcRuntimes) {
      if (npc.hp <= 0) {
        npc.mesh.visible = false;
        continue;
      }
      const def = npc.def;
      const speed = def.speed ?? 2.5;

      // Hostile aggro: pathfind toward player
      if (
        def.faction === 'enemy'
        && playerPos
        && def.aggroRange
        && npc.mesh.position.distanceTo(playerPos) < def.aggroRange
        && (def.behavior === 'attack_on_sight' || def.behavior === 'patrol' || def.behavior === 'wander')
      ) {
        const path = pathfinder.findPath(npc.mesh.position, playerPos);
        if (path.found && path.waypoints.length > 0) {
          const next = path.waypoints[Math.min(1, path.waypoints.length - 1)];
          const dir = next.clone().sub(npc.mesh.position);
          dir.y = 0;
          if (dir.lengthSq() > 0.01) {
            dir.normalize();
            npc.mesh.position.x += dir.x * speed * 1.2 * dt;
            npc.mesh.position.z += dir.z * speed * 1.2 * dt;
            npc.mesh.rotation.y = Math.atan2(dir.x, dir.z);
          }
        }
        continue;
      }

      if (def.behavior === 'stationary' || def.behavior === 'guard') {
        if (playerPos && npc.mesh.position.distanceTo(playerPos) < 8) {
          const dx = playerPos.x - npc.mesh.position.x;
          const dz = playerPos.z - npc.mesh.position.z;
          npc.mesh.rotation.y = Math.atan2(dx, dz);
        }
        continue;
      }

      if (def.behavior === 'patrol' && npc.path.length > 0) {
        if (npc.wait > 0) {
          npc.wait -= dt;
          continue;
        }
        const target = npc.path[npc.pathIndex];
        const dir = target.clone().sub(npc.mesh.position);
        dir.y = 0;
        const dist = dir.length();
        if (dist < 0.4) {
          npc.pathIndex = (npc.pathIndex + 1) % npc.path.length;
          npc.wait = 1.5 + Math.random() * 2;
        } else {
          dir.normalize();
          npc.mesh.position.x += dir.x * speed * dt;
          npc.mesh.position.z += dir.z * speed * dt;
          npc.mesh.rotation.y = Math.atan2(dir.x, dir.z);
        }
        continue;
      }

      if (def.behavior === 'wander' || def.behavior === 'scavenge' || def.behavior === 'flee') {
        npc.wanderT -= dt;
        if (npc.wanderT <= 0) {
          const ox = def.transform.position.x + (Math.random() - 0.5) * 12;
          const oz = def.transform.position.z + (Math.random() - 0.5) * 12;
          const path = pathfinder.findPath(npc.mesh.position, { x: ox, y: 1.2, z: oz });
          if (path.found && path.waypoints.length > 1) {
            npc.path = path.waypoints;
            npc.pathIndex = 1;
          }
          npc.wanderT = 6 + Math.random() * 8;
        }
        if (npc.path.length > npc.pathIndex) {
          const target = npc.path[npc.pathIndex];
          const dir = target.clone().sub(npc.mesh.position);
          dir.y = 0;
          if (dir.length() < 0.5) npc.pathIndex++;
          else {
            dir.normalize();
            npc.mesh.position.x += dir.x * speed * dt;
            npc.mesh.position.z += dir.z * speed * dt;
            npc.mesh.rotation.y = Math.atan2(dir.x, dir.z);
          }
        }
      }
    }
  }

  const runtime: ShipwreckSceneRuntime = {
    sceneDef,
    root,
    pathfinder,
    gizmo,
    entities,
    get selectedId() {
      return selectedId;
    },
    get editorMode() {
      return editorMode;
    },
    select,
    setXyz(id, xyz) {
      setEntityXyz(sceneDef, id, xyz);
      const ent = entities.get(id);
      if (ent) ent.object.position.set(xyz.x, xyz.y, xyz.z);
      if (id === 'player_spawn') {
        sceneDef.playerSpawn = { ...xyz };
      }
    },
    setGizmoMode(mode) {
      gizmo.setMode(mode);
    },
    setEditorMode(on) {
      editorMode = on;
      gizmo.setEnabled(on);
      if (!on) gizmo.attach(null);
      zonesGroup.visible = showZonesFlag;
      pathsGroup.visible = showPathsFlag;
    },
    deployPrefab(kind, at) {
      const id = `pf_deploy_${kind}_${Date.now().toString(36)}`;
      const catalog = SHIPWRECK_PREFAB_CATALOG.find((c) => c.kind === kind);
      const def: ShipwreckPrefabDef = {
        id,
        kind,
        name: catalog?.name ?? kind,
        transform: { position: { ...at }, scale: 1 },
        zoneId: 'zone_wake',
        blocksNav: catalog?.blocksNav ?? false,
        chunkable: true,
      };
      sceneDef.prefabs.push(def);
      const mesh = makePrefabMesh(kind);
      applyTransform(mesh, def.transform);
      mesh.name = id;
      prefabsGroup.add(mesh);
      entities.set(id, { id, kind: 'prefab', object: mesh, label: def.name });
      pathfinder.rebuild(sceneDef);
      if (editorMode) select(id);
      return id;
    },
    deployNode(kind, at) {
      const id = `node_deploy_${kind}_${Date.now().toString(36)}`;
      const def: ShipwreckNodeDef = {
        id,
        kind,
        name: `${kind} (deployed)`,
        transform: { position: { ...at } },
        resource: kind === 'stick' ? 'stick' : kind === 'stone' ? 'stone' : undefined,
        quantity: 1,
        respawnSec: 90,
        zoneId: 'zone_wake',
        interact: kind === 'chest' ? 'open' : 'harvest',
      };
      sceneDef.nodes.push(def);
      const mesh = makeNodeMesh(kind);
      applyTransform(mesh as THREE.Object3D, def.transform);
      mesh.name = id;
      nodesGroup.add(mesh);
      nodeRuntimes.set(id, { def, mesh, depleted: false, respawnAt: 0 });
      entities.set(id, { id, kind: 'node', object: mesh, label: def.name });
      if (editorMode) select(id);
      return id;
    },
    getSelectedXyz() {
      return gizmo.getXyz();
    },
    pathTo(from, to) {
      const r = pathfinder.findPath(from, to);
      return r.found ? r.waypoints : [];
    },
    showNavDebug(on) {
      const dbg = pathfinder.getDebugMesh();
      if (on && !dbg.parent) root.add(dbg);
      if (!on && dbg.parent) root.remove(dbg);
      dbg.visible = on;
    },
    showZones(on) {
      showZonesFlag = on;
      zonesGroup.visible = on;
    },
    showPaths(on) {
      showPathsFlag = on;
      pathsGroup.visible = on;
    },
    update(dt, playerPos) {
      // Respawn nodes
      const now = performance.now();
      for (const nr of nodeRuntimes.values()) {
        if (nr.depleted && nr.respawnAt > 0 && now >= nr.respawnAt) {
          nr.depleted = false;
          nr.mesh.visible = true;
          nr.respawnAt = 0;
        }
      }
      updateNpc(dt, playerPos);
    },
    harvestNearest(playerPos, radius = 3.5) {
      let best: NodeRuntime | null = null;
      let bestD = radius;
      for (const nr of nodeRuntimes.values()) {
        if (nr.depleted) continue;
        if (nr.def.interact !== 'harvest') continue;
        const p = nr.def.transform.position;
        const d = Math.hypot(p.x - playerPos.x, p.z - playerPos.z);
        if (d < bestD) {
          bestD = d;
          best = nr;
        }
      }
      if (!best) return null;
      best.depleted = true;
      best.mesh.visible = false;
      best.respawnAt = performance.now() + (best.def.respawnSec ?? 90) * 1000;
      return best.def;
    },
    getNodeStates() {
      return [...nodeRuntimes.values()].map((nr) => ({
        id: nr.def.id,
        kind: nr.def.kind,
        depleted: nr.depleted,
        x: nr.def.transform.position.x,
        z: nr.def.transform.position.z,
      }));
    },
    exportSceneJson() {
      return JSON.stringify(sceneDef, null, 2);
    },
    dispose() {
      gizmo.dispose();
      pathfinder.dispose();
      opts.scene.remove(root);
      root.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.geometry?.dispose();
          const mats = Array.isArray(m.material) ? m.material : [m.material];
          mats.forEach((mat) => mat?.dispose?.());
        }
      });
      entities.clear();
      nodeRuntimes.clear();
    },
  };

  return runtime;
}
