import type { LobbyBakedMapData, LobbyHarvestNode } from "@shared/definitions/lobbyBakedMap";
import type { LobbyMapGraphData } from "./LobbyMapGraph";
import { buildLobbyMapGraph } from "./LobbyMapGraph";

export function buildLobbyBakedMap(_root?: unknown): LobbyBakedMapData {
  return {
    version: 1,
    nodes: [],
    edges: [],
    harvest: [],
    waterLevel: 0,
  } as LobbyBakedMapData;
}

export function harvestNodesFromGraph(_graph: LobbyMapGraphData): LobbyHarvestNode[] {
  return [];
}

export function graphFromBaked(_baked: LobbyBakedMapData): LobbyMapGraphData {
  return buildLobbyMapGraph();
}
