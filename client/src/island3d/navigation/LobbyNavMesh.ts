import * as THREE from "three";

export class LobbyNavMesh {
  readonly root = new THREE.Group();
  constructor(_scene?: THREE.Scene) {
    this.root.name = "lobby_nav_mesh_stub";
  }
  dispose() {
    this.root.clear();
  }
}

export function collectLobbyTerrainMeshes(root: THREE.Object3D): THREE.Mesh[] {
  const out: THREE.Mesh[] = [];
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) out.push(o as THREE.Mesh);
  });
  return out;
}

export function detectCoastWaterLevel(_meshes: THREE.Mesh[], fallback = 0): number {
  return fallback;
}

export function isLobbyFlatDecorMesh(mesh: THREE.Object3D): boolean {
  const n = (mesh.name || "").toLowerCase();
  return /decor|prop|rock|bush|tree/.test(n);
}
