import * as THREE from "three";

export class LobbyHarvestables {
  readonly root = new THREE.Group();
  constructor(_scene?: THREE.Scene) {
    this.root.name = "lobby_harvestables_stub";
  }
  update(_dt: number) {}
  dispose() {
    this.root.clear();
  }
}
