/**
 * Express middleware snippet helper — serves huge_medieval_battle_scene.glb from D:
 * Wired in server via /api/local-war-scene when file exists.
 */
export const LOCAL_WAR_SCENE_PATH =
  process.env.WAR_SCENE_GLB ||
  "D:/Games/grudge-game-engine/huge_medieval_battle_scene.glb";
