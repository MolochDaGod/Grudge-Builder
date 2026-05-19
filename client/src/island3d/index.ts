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
export type { CharacterController3DConfig, ControlMode, MovementState, PhysicsConfig, PhysicsCallbacks } from './player/CharacterController3D';
export { AnimationManager } from './player/AnimationManager';
export type { AnimState } from './player/AnimationManager';

// Advanced animation (speed blending, additive layers, bone attachments)
export { AnimationBlendManager, Spring, Spring3, smoothDamp } from './player/AnimationBlendManager';
export type { LocomotionState, ActionState, AdditiveLayer, BoneAttachment } from './player/AnimationBlendManager';

// Asset management (cached model/texture loading)
export { CharacterAssetManager } from './player/CharacterAssetManager';
export type { CachedModel, LoadProgress } from './player/CharacterAssetManager';

// Skill VFX (dissolve, rim glow, hit flash, frost)
export { createDissolveMaterial, createRimGlowMaterial, applyHitFlash, createFrostMaterial, SkillEffectController } from './player/SkillEffects';
export type { ActiveEffect } from './player/SkillEffects';

// Navigation
export { TerrainNavMesh } from './navigation/TerrainNavMesh';
export type { NavCell, NavPath } from './navigation/TerrainNavMesh';

// Sync
export { capture3DState, apply3DState, to2DNodeStates } from './sync/IslandStateSync';
export type { SharedIslandState, SharedNodeState } from './sync/IslandStateSync';

// Multiplayer
export { MultiplayerSync } from './sync/MultiplayerSync';
export type { MultiplayerConfig, RemotePlayer, PveEnemy } from './sync/MultiplayerSync';

// Water (Gerstner wave ocean)
export { createOceanMesh, createOceanMaterial, getWaveHeightAt, updateOceanMaterial } from './terrain/WaterMaterial';
export type { OceanConfig, WaveSet } from './terrain/WaterMaterial';

// Post-processing
export { PostProcessing } from './render/PostProcessing';
export type { QualityPreset, PostProcessingConfig } from './render/PostProcessing';

// Day/Night cycle
export { DayNightCycle } from './environment/DayNightCycle';
export type { DayPhase, DayNightConfig } from './environment/DayNightCycle';

// Ally AI (Gouldstone system)
export { AllyController, AllyManager, MAX_ALLIES } from './ai/AllyController';
export type { AllyState, AllyStats, AllyConfig, CombatTarget } from './ai/AllyController';

// Building system
export { BuildingSystem, PIECE_DEFS } from './building/BuildingSystem';
export type { PieceType, SnapSocket, PieceDefinition, PlacedPiece } from './building/BuildingSystem';
