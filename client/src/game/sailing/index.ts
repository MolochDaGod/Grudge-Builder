/**
 * Sailing module — ported from Tactical-Infinity.
 *
 * Provides open-water gameplay between zone islands:
 *   - Ocean shader (6-octave Gerstner waves, Beer-Lambert water, Schlick fresnel)
 *   - Ship physics (roll/pitch/heave, capsize, keel ballast, 6 ship types)
 *   - Ship deck physics (walk on moving deck, balance/stagger, grip system)
 *   - Ship prefabs (8 GLB models, procedural textures, cannon systems)
 *   - Boat boarding (board/leave ships, swimming, deck walking)
 *   - Fish manager (20 species, schooling AI, depth preferences, flee mechanics)
 *   - Ship audio (ambient sailing sounds)
 *
 * Integration with MMO zones:
 *   - Player boards ship at dock → enters open water sailing mode
 *   - Ocean shader replaces the zone terrain between islands
 *   - FishManager populates the ocean with catchable fish
 *   - Arriving at a destination dock triggers zone transition
 *
 * Usage:
 *   import { oceanVertexShader, oceanFragmentShader } from "@/game/sailing";
 *   import { ShipPhysics } from "@/game/sailing";
 *   import { FishManager } from "@/game/sailing";
 */

export { oceanVertexShader, oceanFragmentShader } from "./OceanShader";
export { ShipPhysics } from "./ShipPhysics";
export type { ShipPhysicsState, ShipPhysicsConfig } from "./ShipPhysics";
export { ShipDeckRig } from "./ShipDeckPhysics";
export type { DeckRiderInit, DeckStaggerEvent, ShipDeckRigOpts } from "./ShipDeckPhysics";
export { BoatBoardingSystem, DECK_Y_DEFAULT } from "./BoatBoardingSystem";
export type { BoardingMode, BoardingCallbacks } from "./BoatBoardingSystem";
export {
  SmallCraftRowSystem,
  CRAFT_TIERS,
} from "./SmallCraftRowSystem";
export type {
  CraftTier,
  CraftTierConfig,
  RowLessonStep,
  SmallCraftOpts,
} from "./SmallCraftRowSystem";
export { FishManager } from "./FishManager";
export { SHIP_MODEL_PATHS, SHIP_TEXTURE_PATHS, ENEMY_SHIP_DAMAGE_PATHS } from "./ShipPrefabs";
export {
  ENEMY_SHIP_MODEL_PATHS,
  ENEMY_SHIP_STATE_INDEX_PATHS,
  enemyShipStateFromHealth,
  enemyShipStateFromHealthRatio,
  loadEnemyShipMesh,
  createEnemyShipVisual,
  setEnemyShipDamageState,
  syncEnemyShipVisualToHealth,
} from "./EnemyShipModels";
export type { EnemyShipDamageState, EnemyShipStateIndex, EnemyShipVisual } from "./EnemyShipModels";

// Types
export type {
  WeatherConfig,
  ShipClass,
  ShipTypeDefinition,
  Skittishness,
  FishBehaviorConfig,
} from "./types";
export {
  DEFAULT_WEATHER,
  SHIP_TYPES,
  FISH_BEHAVIORS,
  SKITTISHNESS_CONFIG,
  getFleeParameters,
} from "./types";

// Sails + ocean climb (production SSOT)
export {
  createSailMaterial,
  applySailMaterialsToShip,
  createLiveClothSail,
  windFromWeather,
  SAIL_COLOR_HEX,
  SAIL_MATERIAL_RULES,
} from "./SailMaterialSystem";
export type { SailRigKind, SailMaterialOpts, LiveSailCloth } from "./SailMaterialSystem";
export {
  buildOceanClimbMeshes,
  trySnapOntoDeck,
  CRAFT_CLIMB_PROFILE,
  OCEAN_CLIMB_RULES,
} from "./OceanBoatClimbRig";
export type { ClimbEdgeSpec } from "./OceanBoatClimbRig";
export { ClothSimulation } from "./clothPhysics";
export type { WindForce } from "./clothPhysics";

// Open water production (waves + storm rain + weather + sail/oar)
export { DynamicOcean, createOceanMaterial, createOceanGeometry } from "./OceanShader";
export { StormRainSystem } from "./StormRainSystem";
export type { StormRainOpts } from "./StormRainSystem";
export {
  OpenWaterProduction,
  WEATHER_PRESETS,
  OCEAN_QUALITY_SEGMENTS,
  OPEN_WATER_RULES,
} from "./OpenWaterProduction";
export type { OceanQuality, OpenWaterProductionOpts } from "./OpenWaterProduction";
export {
  OpenWaterDriveController,
  defaultDriveMode,
  craftCanSail,
  sailWindThrust,
  oarThrust,
  DRIVE_MODE_RULES,
} from "./OpenWaterDriveMode";
export type {
  DriveMode,
  CraftDriveClass,
  DriveModeState,
} from "./OpenWaterDriveMode";

// Waveboard (tslda-inspired · Grudge6 back-slot · dock craft)
export {
  WaveboardController,
  loadWaveboardRig,
} from "./waveboard";
export type {
  WaveboardOpts,
  WaveboardState,
  WaveboardUpdateResult,
  WaveboardRigHandle,
} from "./waveboard";

export {
  WAVEBOARD_ITEM,
  WAVEBOARD_RECIPE,
  WAVEBOARD_GLB,
  WAVEBOARD_ITEM_ID,
  WAVEBOARD_MATERIALS,
} from "@shared/definitions/waveboard";
