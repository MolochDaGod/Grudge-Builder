import * as THREE from "three";

export class LobbySkyClouds {
  readonly root = new THREE.Group();
  constructor(_scene?: THREE.Scene) {
    this.root.name = "lobby_sky_clouds_stub";
  }
  update(_dt: number) {}
  dispose() {
    this.root.clear();
  }
}
