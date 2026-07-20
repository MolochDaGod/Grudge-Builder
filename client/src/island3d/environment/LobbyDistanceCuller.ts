import * as THREE from "three";

export class LobbyDistanceCuller {
  constructor(
    private camera?: THREE.Camera,
    private maxDist = 400,
  ) {}
  setCamera(c: THREE.Camera) {
    this.camera = c;
  }
  update(_objects: THREE.Object3D[]) {
    /* visibility culling stub */
  }
  dispose() {}
}
