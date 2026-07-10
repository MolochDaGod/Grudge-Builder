/**
 * Grudge6Character3D — Race GLB + child-mesh equipment from model3d / panel slots.
 *
 * Loads the canonical grudge6 race model from CDN, toggles equipment child meshes,
 * and plays weapon-appropriate Mixamo animations.
 */
import { useEffect, useRef, useCallback, useMemo } from "react";
import * as THREE from "three";
import type { ThreeSceneHandle } from "@/components/ThreeScene";
import {
  getAnimationSet,
  type AnimState3D,
  type AnimationDef,
  type WeaponType,
} from "@/lib/modelManifest";
import {
  loadCharacterModel,
  AnimationController,
  preloadAnimations,
  type LoadedModel,
} from "@/lib/modelLoader";
import {
  RACE_GRUDGE6,
  resolveRaceCdnUrl,
  panelEquipmentToModel3d,
  weaponTypeFromModel3d,
  normalizeRaceId,
  type Model3DField,
  type PanelEquipment,
} from "@shared/fleet";
import { setupGrudge6Equipment } from "@/lib/grudge6Equipment";
import { applyGrudge6RaceTextures } from "@/lib/grudge6Textures";
import { applyHeroPortraitStyle } from "@/lib/grudge6PortraitStyle";
import { applyCharacterColorTints, ensureCharacterTextureColorSpace } from "@/lib/characterAppearance";

interface Grudge6Character3DProps {
  sceneRef: React.RefObject<ThreeSceneHandle | null>;
  raceId: string;
  classId: string;
  /** Hero codex id (e.g. human_warrior) — enables portrait-guided texture tinting */
  heroId?: string;
  /** Pre-computed model3d — takes priority over equipment */
  model3d?: Partial<Model3DField>;
  /** Main-panel equipment slots — used when model3d is absent */
  equipment?: PanelEquipment;
  animation?: AnimState3D;
  scale?: number;
  facing?: number;
  onAnimationComplete?: () => void;
  position?: { x: number; y: number; z: number };
}

async function applyCharacterAppearance(
  root: THREE.Object3D,
  model3d: Model3DField,
  heroId?: string,
): Promise<void> {
  ensureCharacterTextureColorSpace(root);
  applyCharacterColorTints(root, model3d.skinColor, model3d.armorColor);
  if (heroId) {
    await applyHeroPortraitStyle(root, heroId, model3d);
  }
}

export default function Grudge6Character3D({
  sceneRef,
  raceId,
  classId,
  heroId,
  model3d: model3dProp,
  equipment,
  animation = "idle",
  scale: scaleOverride,
  facing = 0,
  onAnimationComplete,
  position = { x: 0, y: 0, z: 0 },
}: Grudge6Character3DProps) {
  const modelRef = useRef<LoadedModel | null>(null);
  const controllerRef = useRef<AnimationController | null>(null);
  const unsubUpdateRef = useRef<(() => void) | null>(null);
  const loadedKeyRef = useRef<string>("");

  const raceKey = useMemo(() => normalizeRaceId(raceId), [raceId]);

  const resolvedModel3d = useMemo(
    () => panelEquipmentToModel3d(raceKey, classId, equipment ?? {}, model3dProp),
    [raceKey, classId, equipment, model3dProp],
  );

  const weaponType = useMemo(
    () => weaponTypeFromModel3d(resolvedModel3d, classId) as WeaponType,
    [resolvedModel3d, classId],
  );

  const model3dKey = useMemo(
    () => JSON.stringify({ raceId: raceKey, classId, heroId, m: resolvedModel3d }),
    [raceKey, classId, heroId, resolvedModel3d],
  );

  const loadModel = useCallback(async () => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (model3dKey === loadedKeyRef.current && modelRef.current) return;

    if (modelRef.current) {
      scene.remove(modelRef.current.scene);
      controllerRef.current?.dispose();
      unsubUpdateRef.current?.();
    }

    const race = RACE_GRUDGE6[raceKey] ?? RACE_GRUDGE6.human;
    const modelPath = resolveRaceCdnUrl(raceKey);

    try {
      const loaded = await loadCharacterModel(modelPath);
      modelRef.current = loaded;
      loadedKeyRef.current = model3dKey;

      await applyGrudge6RaceTextures(loaded.scene, raceKey);
      setupGrudge6Equipment(race.prefix, loaded.scene, resolvedModel3d);
      await applyGrudge6RaceTextures(loaded.scene, raceKey);
      await applyCharacterAppearance(loaded.scene, resolvedModel3d, heroId);

      const { fitCharacterRootToHeightM, PLAYER_HEIGHT_M } = await import(
        "@/island3d/zoneWorldScale"
      );
      const raceMult = scaleOverride ?? resolvedModel3d.scale ?? race.scale ?? 1;
      fitCharacterRootToHeightM(loaded.scene, raceMult, PLAYER_HEIGHT_M);
      loaded.scene.position.set(position.x, position.y, position.z);
      scene.add(loaded.scene);

      const controller = new AnimationController(loaded.mixer, loaded.scene);
      controllerRef.current = controller;

      const animSet = getAnimationSet(weaponType);
      const animMap: Record<string, string> = {};
      for (const [state, def] of Object.entries(animSet)) {
        if (def) animMap[state] = (def as AnimationDef).file;
      }

      await preloadAnimations(controller, animMap);

      for (const [name, action] of loaded.actions) {
        if (!controller.actions.has(name)) {
          controller.actions.set(name, action);
        }
      }

      unsubUpdateRef.current = scene.onUpdate((dt) => {
        controller.update(dt);
      });

      const animDef = animSet[animation];
      controller.play(animation, {
        loop: animDef?.loop ?? true,
        speed: animDef?.speed ?? 1,
        onFinish: onAnimationComplete,
      });
    } catch (err) {
      console.error(`Failed to load Grudge6 model for ${raceKey}:`, err);
    }
  }, [
    raceKey,
    heroId,
    model3dKey,
    resolvedModel3d,
    weaponType,
    scaleOverride,
    position.x,
    position.y,
    position.z,
    animation,
    onAnimationComplete,
    sceneRef,
  ]);

  useEffect(() => {
    loadModel();
    return () => {
      const scene = sceneRef.current;
      if (scene && modelRef.current) scene.remove(modelRef.current.scene);
      controllerRef.current?.dispose();
      unsubUpdateRef.current?.();
      modelRef.current = null;
      controllerRef.current = null;
      loadedKeyRef.current = "";
    };
  }, [loadModel, sceneRef]);

  // Re-apply equipment when model3d changes without full reload (same race only)
  useEffect(() => {
    if (!modelRef.current) return;
    if (!loadedKeyRef.current.includes(`"raceId":"${raceKey}"`)) return;

    const race = RACE_GRUDGE6[raceKey] ?? RACE_GRUDGE6.human;
    void applyGrudge6RaceTextures(modelRef.current.scene, raceKey).then(async () => {
      setupGrudge6Equipment(race.prefix, modelRef.current!.scene, resolvedModel3d);
      await applyGrudge6RaceTextures(modelRef.current!.scene, raceKey);
      await applyCharacterAppearance(modelRef.current!.scene, resolvedModel3d, heroId);
    });
  }, [resolvedModel3d, raceKey, heroId]);

  useEffect(() => {
    const controller = controllerRef.current;
    if (!controller) return;
    const animSet = getAnimationSet(weaponType);
    const animDef = animSet[animation];
    controller.play(animation, {
      loop: animDef?.loop ?? true,
      speed: animDef?.speed ?? 1,
      onFinish: onAnimationComplete,
    });
  }, [animation, weaponType, onAnimationComplete]);

  useEffect(() => {
    if (modelRef.current) modelRef.current.scene.rotation.y = facing;
  }, [facing]);

  useEffect(() => {
    if (modelRef.current) {
      modelRef.current.scene.position.set(position.x, position.y, position.z);
    }
  }, [position.x, position.y, position.z]);

  useEffect(() => {
    if (modelRef.current && scaleOverride !== undefined) {
      modelRef.current.scene.scale.setScalar(scaleOverride);
    }
  }, [scaleOverride]);

  return null;
}