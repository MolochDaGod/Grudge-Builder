// ── Island 3D Module Exports ──────────────────────────────────────────

// Terrain
export { generateIslandTerrain, getTerrainHeightAt, getTerrainNormalAt } from './terrain/IslandTerrainGenerator';
export type { IslandTerrainConfig, IslandTerrainResult, BiomeType } from './terrain/IslandTerrainGenerator';
export { createTerrainMaterial } from './terrain/TerrainMaterial';
export { loadTerrainTextures } from './terrain/ProceduralTextures';
export type { TerrainTextures } from './terrain/ProceduralTextures';
export { placeResourceNodes } from './terrain/NodePlacer';
export type { PlacedNode3D, NodePlacementType } from './terrain/NodePlacer';

// Objects
export { createHarvestableTree } from './objects/HarvestableTree';
export type { HarvestableTree } from './objects/HarvestableTree';
export { createHarvestableRock } from './objects/HarvestableRock';
export type { HarvestableRock } from './objects/HarvestableRock';
export { createScatterDecorations } from './objects/ScatterDecorations';

// Engine
export { Island3DEngine } from './engine/Island3DEngine';
export type { Island3DEngineConfig, Island3DMode } from './engine/Island3DEngine';

// Lobby maps
export { loadLobbyMap, getLobbyMap, LOBBY_MAPS } from './engine/LobbyIslandLoader';
export type { LobbyMapDef, LobbyLoadResult } from './engine/LobbyIslandLoader';

// Renderer
export { Island3DRenderer } from './render/Island3DRenderer';

// Player
export { CharacterController3D } from './player/CharacterController3D';
export type { CharacterController3DConfig, ControlMode } from './player/CharacterController3D';
export { AnimationManager } from './player/AnimationManager';
export type { AnimState } from './player/AnimationManager';

// Navigation
export { TerrainNavMesh } from './navigation/TerrainNavMesh';
export type { NavCell, NavPath } from './navigation/TerrainNavMesh';

// Sync
export { capture3DState, apply3DState, to2DNodeStates } from './sync/IslandStateSync';
export type { SharedIslandState, SharedNodeState } from './sync/IslandStateSync';

// Multiplayer
export { MultiplayerSync } from './sync/MultiplayerSync';
export type { MultiplayerConfig, RemotePlayer, PveEnemy } from './sync/MultiplayerSync';
