import * as THREE from "three";

export function createLobbyZoneMesh(
  _opts?: { size?: number; color?: number },
): THREE.Mesh {
  const size = _opts?.size ?? 64;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshStandardMaterial({
      color: _opts?.color ?? 0x3d5c3a,
      side: THREE.DoubleSide,
    }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.name = "lobby_zone_mesh_stub";
  return mesh;
}
