/**
 * Island3D casting mastery — Linear + CastingAbilities merge.
 *
 * Vendored GLSL / skillshot / path abilities under this folder.
 * Public API: CastingMaster + shared/casting masterCatalog.
 */
export { CastingMaster } from "./CastingMaster";
export type { CastRequest, CastingMasterOpts } from "./CastingMaster";

// Re-export shared catalog for island consumers
export {
  planMasterCast,
  PRODUCT_TO_LINEAR,
  LINEAR_SHOT_META,
  LINEAR_HOTKEYS,
  TERRAIN_LAYERS,
  getMasterContract,
  CASTING_MASTER_VERSION,
} from "@shared/casting/masterCatalog";
