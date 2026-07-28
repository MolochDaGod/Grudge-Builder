/**
 * Sectional damage + build-hammer repair (hide-chunk + optional three-pinata).
 */
export {
  SectionalDamageSystem,
  registerWatercraftSections,
  registerBuildingSections,
  registerVehicleSections,
  registerEnemySections,
  registerObjectSections,
} from "./SectionalDamageSystem";
export type {
  DamageAssetKind,
  SectionState,
  DamageSection,
  RegisterAssetOpts,
  ImpactResult,
  SectionalDamageHost,
} from "./SectionalDamageSystem";

export {
  BuildHammerRepair,
  REPAIR_WOOD_IDS,
  REPAIR_RULES,
} from "./BuildHammerRepair";
export type {
  WoodInventoryHost,
  BuildHammerRepairOpts,
  RepairSelectResult,
  RepairApplyResult,
} from "./BuildHammerRepair";

export {
  ensurePinataLoaded,
  fractureSection,
  createPinataDestroyHandler,
} from "./PinataFracture";
export type { PinataFractureOpts, PinataFractureResult } from "./PinataFracture";
