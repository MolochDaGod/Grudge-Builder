import * as THREE from "three";

export function applyLobbyAtmosphere(
  scene: THREE.Scene,
  opts?: { fogNear?: number; fogFar?: number; fogColor?: number },
): void {
  const color = opts?.fogColor ?? 0x87b5d4;
  scene.fog = new THREE.Fog(color, opts?.fogNear ?? 80, opts?.fogFar ?? 1200);
  if (!scene.background) scene.background = new THREE.Color(color);
}
