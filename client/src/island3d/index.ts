// ── Island 3D Module Exports ──────────────────────────────────────────

// Terrain
export { generateIslandTerrain, getTerrainHeightAt, getTerrainNormalAt } from './terrain/IslandTerrainGenerator';
export type { IslandTerrainConfig, IslandTerrainResult, BiomeType } from './terrain/IslandTerrainGenerator';
export { createTerrainMaterial, createSectorTerrainMaterial } from './terrain/TerrainMaterial';

// Map-as-our-creation: chunkable assets (house/rock/dock/water/living/…)
export {
  classifySceneChunks,
  formatClassifySummary,
  classifiedToAssets,
} from './map/MapChunkClassifier';
export type { ClassifiedChunk, ClassifyResult } from './map/MapChunkClassifier';
export { loadMapComposition, getWaterHeights } from './map/MapCompositionLoader';
export type { CompositionLoadResult } from './map/MapCompositionLoader';
export { loadTerrainTextures, loadTerrainTexturesAsync } from './terrain/ProceduralTextures';
export {
  GROUND_PBR_MATERIALS,
  SECTOR_GROUND_MATERIALS,
  SECTOR_LAYER_STACKS,
  createPBRGroundMaterial,
  getSectorGroundMaterialId,
  getSectorLayerStack,
  getSectorLayerMaterials,
} from './terrain/GroundPBRTextures';
export {
  sculptTerrainAt,
  sculptTerrainFromRay,
  SHOVEL_BRUSH,
  GROUND_TOOL_BRUSH,
} from './terrain/ShovelTerrainSculptor';
export type { ShovelSculptMode, ShovelSculptOptions, ShovelSculptResult } from './terrain/ShovelTerrainSculptor';
export { FarmPlotSystem } from './farming/FarmPlotSystem';
export type { FarmPlot, FarmPlantCell, FarmHarvestEvent } from './farming/FarmPlotSystem';
export { GroundToolBrush, GROUND_TOOL_DIAMETER_M, GROUND_TOOL_RADIUS_M, FARM_PLOT_SIZE_M, FARM_PLOT_CELLS } from './farming/GroundToolBrush';
export { preloadCropPack, loadCropPack, cloneCropStage, isCropPackReady } from './farming/CropPackLoader';
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

// Production barrel (preferred shared entry for play surfaces)
export * from './production';

// Engine
export { Island3DEngine } from './engine/Island3DEngine';
export type { CameraMode } from './player/CameraMode';
export { createSurfaceFlyby, buildSurfaceWaypoints } from './cinematic/SurfaceFlyby';
export { createZoneFlyby, downloadFlybyResult } from './cinematic/ZoneFlyby';
export {
  GameTrailerSession,
  getGameTrailerSession,
  openSurfaceForTrailer,
} from './cinematic/GameTrailer';
export {
  playCinematicPath,
  captureCanvasPng,
  startCanvasRecorder,
} from './cinematic/CinematicCamera';
export { ZoneFlybyHUD, TrailerHUD } from './render/ZoneFlybyHUD';
export type { Island3DEngineConfig, Island3DMode } from './engine/Island3DEngine';
export { CaveInteriorSystem, bakeCaveNavmesh } from './dungeon/CaveInteriorSystem';
export type { CaveInteriorSession, CaveNavCell } from './dungeon/CaveInteriorSystem';
// caveDungeonContract is @shared/definitions/caveDungeonContract

// Haven Shore PVE trade foundation (Fruzer)
export { loadHavenShoreFoundation } from './zone/HavenShoreFoundationLoader';
export type { HavenFoundationResult } from './zone/HavenShoreFoundationLoader';

// Fabled core (fabledzone.glb) + cave portals → dwarf castle
export { loadFabledZoneFoundation } from './zone/FabledZoneFoundationLoader';
export type { FabledFoundationResult, FabledInteriorSession } from './zone/FabledZoneFoundationLoader';

// Build Hammer (0.8× survival kit hammer in hand)
export {
  equipBuildHammer,
  unequipBuildHammer,
  createBuildHammerMesh,
} from './building/BuildHammerAttachment';
export type { BuildHammerHandle } from './building/BuildHammerAttachment';

// RTS triple-mode UI (combat / harvest / build)
export { ModePlayHUD } from './render/ModePlayHUD';
export type { ModePlayHUDProps } from './render/ModePlayHUD';
export { SoftLockFrame } from './render/SoftLockFrame';
export { GrudgeStudioPlayChrome } from './render/GrudgeStudioPlayChrome';
export { SoftLockSystem, SOFT_LOCK_CONFIG } from './player/SoftLockSystem';
export type { SoftLockTarget, SoftLockScreenFrame } from './player/SoftLockSystem';

// Faction NPC camps
export { NpcCampSystem, spawnZoneCamps } from './camps/NpcCampSystem';
export type { RuntimeCamp, NpcCampSystemOpts } from './camps/NpcCampSystem';
export { CampUnitSystem, campOrderHotkeyList } from './camps/CampUnitSystem';
export type { CampUnitRecord, CampUnitSystemOpts } from './camps/CampUnitSystem';
export { CampCommandBar } from './render/CampCommandBar';
export type { CampCommandBarProps } from './render/CampCommandBar';

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
export {
  createFactionLobbyIslands,
  type FactionIslandRuntime,
  type CreateFactionIslandsOpts,
} from './lobby/FactionIslandGenerator';
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
export {
  sampleHarvestScatterSlots,
  scheduleScatterRespawn,
  tryCreateThreeScatterGroup,
} from './harvest/ThreeScatterHarvest';
export { scatterFillHarvestOnIslands } from './harvest/ZoneHarvestSpawner';
export type { HarvestRadialToolId, HarvestToolType, GroundToolId } from '@/game/harvest/HarvestToolActions';
export {
  HARVEST_RADIAL_TOOLS,
  DEFAULT_HARVEST_RADIAL_TOOL,
} from '@/game/harvest/HarvestToolActions';
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

// Fire / smoke particles (boats, campfires, attacks, teleports, dash feet)
export {
  createParticleEmitter,
  FX_PRESETS,
} from './vfx/FireSmokeParticles';
export type { FxPresetId, ParticleEmitter, ParticleEmitterOpts } from './vfx/FireSmokeParticles';
// CodePen KwaNNap smoke / barrel / trail / steam
export {
  createCodepenEmitter,
  createCodepenPresetEmitter,
  spawnTrailRibbon,
  CODEPEN_FX_PRESETS,
  CODEPEN_SOURCE,
} from './vfx/CodepenParticleFx';
export type {
  CodepenPresetId,
  CodepenEmitterHandle,
  CodepenEmitterConfig,
  CodepenTextureId,
} from './vfx/CodepenParticleFx';
export { WorldFxBus, getWorldFxBus, setWorldFxBus, SUPERNOVA_VARIANTS } from './vfx/WorldFxBus';
export type { SupernovaImpactVariant } from './vfx/WorldFxBus';
export {
  SupernovaImpactSystem,
  getSupernovaImpactSystem,
  setSupernovaImpactSystem,
  spawnSupernovaImpact,
} from './vfx/SupernovaImpactSystem';
export type { SupernovaImpactSpawnOpts } from './vfx/SupernovaImpactSystem';

// Foot IK (dash landing pulse)
export { CharacterIK, solveTwoBoneIK } from './player/CharacterIK';

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
