import * as THREE from "three";

export enum LobbyZoneCode {
  Hub = "hub",
  Dock = "dock",
  Wilds = "wilds",
  Arena = "arena",
}

export interface LobbyMapPoi {
  id: string;
  label: string;
  position: THREE.Vector3;
  zone: LobbyZoneCode;
}

export interface LobbyMapGraphStats {
  nodeCount: number;
  edgeCount: number;
  poiCount: number;
}

export interface LobbyMapGraphData {
  nodes: Array<{ id: string; x: number; y: number; z: number }>;
  edges: Array<{ a: string; b: string }>;
  pois: LobbyMapPoi[];
  stats: LobbyMapGraphStats;
}

export function buildLobbyMapGraph(_root?: THREE.Object3D): LobbyMapGraphData {
  return {
    nodes: [],
    edges: [],
    pois: [],
    stats: { nodeCount: 0, edgeCount: 0, poiCount: 0 },
  };
}

export function createMapGraphDebugMesh(_graph: LobbyMapGraphData): THREE.Group {
  const g = new THREE.Group();
  g.name = "lobby_map_graph_debug";
  return g;
}
