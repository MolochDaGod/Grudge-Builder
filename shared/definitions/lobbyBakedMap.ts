export interface LobbyHarvestNode {
  id: string;
  x: number;
  y: number;
  z: number;
  kind?: string;
}

export interface LobbyBakedMapData {
  version: number;
  nodes: Array<{ id: string; x: number; y: number; z: number }>;
  edges: Array<{ a: string; b: string }>;
  harvest: LobbyHarvestNode[];
  waterLevel: number;
}

