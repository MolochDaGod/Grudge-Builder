/**
 * Fleet Rapier SSOT presets for grudgewarlords.com / Island3D.
 *
 * Official Rapier JS 3D API: https://rapier.rs/docs/api/javascript/JavaScript3D
 * Guides: https://rapier.rs/docs/user_guides/javascript/getting_started_js
 *
 * Mine-Loader mirror: artifacts/voxelcraft/src/lib/physics/*
 * Skill: ~/.agents/skills/grudge-rapier
 */

export {
  RIGID_BODY_PRESETS,
  RIGID_BODY_USE,
  RIGID_BODY_RULES,
  type FleetRigidBodyRole,
  type RigidBodyPreset,
} from "./rigidBodyPresets";

export {
  COLLIDER_PRESETS,
  COLLIDER_USE,
  COLLIDER_RULES,
  COLLISION_MEMBER,
  FILTER_ALL_FLEET,
  FILTER_SOLIDS,
  packCollisionGroups,
  unpackCollisionGroups,
  collisionGroupsInteract,
  applyColliderMaterial,
  type FleetColliderRole,
} from "./colliderPresets";

export {
  JOINT_PRESETS,
  JOINT_USE,
  JOINT_RULES,
  JOINT_APPROACH,
  selectJointApproach,
  planLoopClosingChain,
  buildJointData,
  applyJointMotor,
  AXIS_X,
  AXIS_Y,
  AXIS_Z,
  type FleetJointRole,
} from "./jointPresets";

export {
  SCENE_QUERY_PRESETS,
  SCENE_QUERY_USE,
  SCENE_QUERY_RULES,
  QUERY_FILTER_FLAGS,
  sceneQueryFromRole,
  expandQueryFilter,
  type FleetSceneQueryRole,
} from "./sceneQueryPresets";

export {
  ACTIVE_EVENTS,
  ACTIVE_HOOKS,
  SOLVER_FLAGS,
  COLLISION_EVENT_PRESETS,
  ADVANCED_COLLISION_RULES,
  createBodyPairSkipContactHooks,
  type FleetCollisionEventRole,
} from "./advancedCollisionPresets";

export {
  SNAPSHOT_PRESETS,
  SERIALIZATION_RULES,
  SnapshotRingBuffer,
  packFleetSnapshot,
  fleetSnapshotToJson,
  fleetSnapshotFromJson,
  type FleetPhysicsSnapshotV1,
} from "./serializationPresets";

export {
  HUMAN_CCT,
  VOXEL_CCT,
  PHYSICS_FIXED_DT,
  PHYSICS_GRAVITY_Y,
  CCT_OFFSET_M,
  RAPIER_CCT_CHECKLIST,
  applyCharacterControllerTuning,
  capsuleCenterFromFeet,
  feetFromCapsuleCenter,
  desiredMovementForStep,
  type CharacterControllerTuning,
} from "./characterControllerConfig";

/** Package gate for grudgewarlords.com / Island3D deploys */
export const RAPIER_FLEET = {
  package: "@dimforge/rapier3d-compat",
  recommended: "^0.19.3",
  apiDocs: "https://rapier.rs/docs/api/javascript/JavaScript3D",
  surfaces: ["grudgewarlords.com", "client.grudge-studio.com", "Island3D", "Mine-Loader"],
  fixedDt: 1 / 60,
  gravityY: -30,
  humanHeightM: 1.8,
} as const;
