// ── Island 3D Module Exports ──────────────────────────────────────────

// Terrain
export { generateIslandTerrain, getTerrainHeightAt, getTerrainNormalAt } from './terrain/IslandTerrainGenerator';
export type { IslandTerrainConfig, IslandTerrainResult, BiomeType } from './terrain/IslandTerrainGenerator';
export { createTerrainMaterial } from './terrain/TerrainMaterial';
export { loadTerrainTextures, loadTerrainTexturesAsync } from './terrain/ProceduralTextures';
export {
  GROUND_PBR_MATERIALS,
  SECTOR_GROUND_MATERIALS,
  createPBRGroundMaterial,
  getSectorGroundMaterialId,
} from './terrain/GroundPBRTextures';
export type { TerrainTextures } from './terrain/ProceduralTextures';
export { placeResourceNodes } from './terrain/NodePlacer';
export type { PlacedNode3D, NodePlacementType } from './terrain/NodePlacer';

// Objects
export { createHarvestableTree } from './objects/HarvestableTree';
export type { HarvestableTree } from './objects/HarvestableTree';
export { createHarvestableRock } from './objects/HarvestableRock';
export type { HarvestableRock } from './objects/HarvestableRock';
export { createScatterDecorations } from './objects/ScatterDecorations';

// Regenerative harvest (forestoutline trees + rocks/crystals/flowers/scrap)
export {
  markDepleted,
  beginGrowth,
  tickGrowth,
  isHarvestable,
  isDryLand,
  isWaterPlacement,
  findValidPlacement,
  validateHarvestPlacement,
} from './harvest/RegenerativeHarvest';
export type { HarvestKind, GrowthPhase } from './harvest/RegenerativeHarvest';

// Engine
export { Island3DEngine } from './engine/Island3DEngine';
export type { Island3DEngineConfig, Island3DMode } from './engine/Island3DEngine';

// RTS triple-mode UI (combat / harvest / build)
export { ModePlayHUD } from './render/ModePlayHUD';
export type { ModePlayHUDProps } from './render/ModePlayHUD';

// Faction NPC camps
export { NpcCampSystem, spawnZoneCamps } from './camps/NpcCampSystem';
export type { RuntimeCamp, NpcCampSystemOpts } from './camps/NpcCampSystem';

// Lobby maps
export { loadLobbyMap, getLobbyMap, LOBBY_MAPS } from './engine/LobbyIslandLoader';
export type { LobbyMapDef, LobbyLoadResult } from './engine/LobbyIslandLoader';
export {
  loadLobbyMapRuntime,
  saveLobbyMapRuntime,
  getDefaultPublicLobbyMapId,
  DEFAULT_PUBLIC_LOBBY_MAP_ID,
} from './engine/lobbyMapRuntime';
export {
  resolveLobbyGltfUrl,
  resolveLobbyGltfUrls,
  lobbyGltfCdnUrl,
  lobbyGltfWorldUrl,
  worldServerHttpBase,
} from './engine/lobbyMapRuntime';
export type { LobbyMapRuntimeConfig } from './engine/lobbyMapRuntime';
export { LobbyNavMesh, collectLobbyTerrainMeshes, detectCoastWaterLevel, isLobbyFlatDecorMesh } from './navigation/LobbyNavMesh';
export { parseLobbyMeshName, classifyLobbyMesh, collectLobbyGroundMeshes } from './navigation/LobbyMeshClassifier';
export {
  buildLobbyMapGraph,
  createMapGraphDebugMesh,
  LobbyZoneCode,
} from './navigation/LobbyMapGraph';
export type { LobbyMapGraphData, LobbyMapPoi, LobbyMapGraphStats } from './navigation/LobbyMapGraph';
export { LobbySkyClouds } from './environment/LobbySkyClouds';
export { LobbyDistanceCuller } from './environment/LobbyDistanceCuller';
export { applyLobbyAtmosphere } from './environment/applyLobbyAtmosphere';
export {
  WARLORDS_LOBBY_SPEC,
  LOBBY_CHARACTER_HEIGHT_M,
  LOBBY_RENDER_NEAR_M,
  LOBBY_RENDER_FAR_M,
  getLobbyWorldSpec,
} from './engine/lobbyWorldSpec';
export { loadBakedLobbyMap } from './navigation/loadBakedLobbyMap';
export { buildLobbyBakedMap, harvestNodesFromGraph, graphFromBaked } from './navigation/LobbyBakedMap';
export { LobbyHarvestables } from './lobby/LobbyHarvestables';
export { createLobbyZoneMesh } from './lobby/LobbyZoneMesh';
export type { LobbyBakedMapData, LobbyHarvestNode } from '@shared/definitions/lobbyBakedMap';
export {
  captureOrthographicPng,
  renderHeightMapPng,
  renderClassifiedMapPng,
  downloadDataUrl,
} from './render/LobbyMapCapture';
export { LobbyHeightMap } from './navigation/LobbyHeightMap';
export type { LobbyHeightMapData } from './navigation/LobbyHeightMap';

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

// Team animation system (catalog + orchestrator + effects API)
export {
  buildAnimLoadMap,
  getCatalogForWeapon,
  getEasyBlendClips,
  getUnusedEasyWins,
  getAttackComboChain,
} from '@/lib/animation/animationCatalog';
export { CharacterAnimOrchestrator } from '@/lib/animation/characterAnimOrchestrator';
export { listEffects, getEffect, EFFECTS_API_ENABLED } from '@/lib/effectsApi';

// Asset management (cached model/texture loading)
export { CharacterAssetManager } from './player/CharacterAssetManager';
export type { CachedModel, LoadProgress } from './player/CharacterAssetManager';

// Skill VFX (dissolve, rim glow, hit flash, frost)
export { createDissolveMaterial, createRimGlowMaterial, applyHitFlash, createFrostMaterial, SkillEffectController } from './player/SkillEffects';
export type { ActiveEffect } from './player/SkillEffects';

// Navigation
export { TerrainNavMesh } from './navigation/TerrainNavMesh';
export type { NavCell, NavPath, BakedNavSummary, TerrainNavMeshOptions } from './navigation/TerrainNavMesh';

// Sync
export { capture3DState, apply3DState, to2DNodeStates } from './sync/IslandStateSync';
export type { SharedIslandState, SharedNodeState } from './sync/IslandStateSync';

// Multiplayer
export { MultiplayerSync } from './sync/MultiplayerSync';
export type { MultiplayerConfig, RemotePlayer, PveEnemy } from './sync/MultiplayerSync';

// Water (Gerstner wave ocean)
export {
  createOceanMesh,
  createOceanMaterial,
  getWaveHeightAt,
  updateOceanMaterial,
  flattenTerrainBelowWater,
  removeDuplicateWaterMeshes,
} from './terrain/WaterMaterial';
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

// Zone terrain (4 km × 4 km sector heightmaps)
export { generateZoneTerrain, sampleHeightmap, getZoneHeightAt } from './terrain/ZoneTerrainGenerator';
export type { ZoneTerrainResult } from './terrain/ZoneTerrainGenerator';

// Zone scene builder (assembles full 3D sector)
export { buildZoneScene } from './engine/ZoneSceneBuilder';
export type { ZoneSceneResult } from './engine/ZoneSceneBuilder';

// Attack telegraphs (warning GLB decals)
export { AttackWarningSystem, pickWarningVariant, WARNING_MODEL_PATHS } from './combat/AttackWarningSystem';
export type { WarningVariant, AttackTelegraphState } from './combat/AttackWarningSystem';

// Orc boss
export { OrcBossController } from './ai/OrcBossController';
export { OrcBossAI } from './ai/OrcBossAI';
