import * as THREE from "three";

export type LobbyMeshClass =
  | "terrain"
  | "water"
  | "building"
  | "decor"
  | "collider"
  | "unknown";

export function parseLobbyMeshName(name: string): { class: LobbyMeshClass; tags: string[] } {
  const n = (name || "").toLowerCase();
  if (/water|ocean|sea|river/.test(n)) return { class: "water", tags: ["water"] };
  if (/terrain|ground|island|floor|land/.test(n)) return { class: "terrain", tags: ["terrain"] };
  if (/build|house|wall|tower|dock/.test(n)) return { class: "building", tags: ["building"] };
  if (/tree|rock|prop|decor|bush/.test(n)) return { class: "decor", tags: ["decor"] };
  return { class: "unknown", tags: [] };
}

export function classifyLobbyMesh(mesh: THREE.Object3D): LobbyMeshClass {
  return parseLobbyMeshName(mesh.name).class;
}

export function collectLobbyGroundMeshes(root: THREE.Object3D): THREE.Mesh[] {
  const out: THREE.Mesh[] = [];
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh && classifyLobbyMesh(o) === "terrain") {
      out.push(o as THREE.Mesh);
    }
  });
  return out;
}
