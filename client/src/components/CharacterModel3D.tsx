/**
 * CharacterModel3D — Renders a 3D character inside a ThreeScene
 *
 * Loads a GLB model based on race×class, applies weapon-specific animations
 * with crossfade blending, and supports facing direction and one-shot playback.
 *
 * Usage:
 *   <CharacterModel3D
 *     sceneRef={threeSceneRef}
 *     raceId="human"
 *     classId="warrior"
 *     animation="idle"
 *     facing={0}
 *   />
 */

import { useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import type { ThreeSceneHandle } from "@/components/ThreeScene";
import {
  getModelForCharacter,
  getAnimationSet,
  type AnimState3D,
  type AnimationDef,
} from "@/lib/modelManifest";
import {
  loadCharacterModel,
  AnimationController,
  preloadAnimations,
  type LoadedModel,
} from "@/lib/modelLoader";

interface CharacterModel3DProps {
  /** Ref to the parent ThreeScene */
  sceneRef: React.RefObject<ThreeSceneHandle | null>;
  /** Character race ID */
  raceId: string;
  /** Character class ID */
  classId: string;
  /** Current animation state to play */
  animation?: AnimState3D;
  /** Scale override (default uses model manifest scale) */
  scale?: number;
  /** Facing angle in radians (0 = forward/away from camera) */
  facing?: number;
  /** Called when a one-shot animation finishes */
  onAnimationComplete?: () => void;
  /** Position offset */
  position?: { x: number; y: number; z: number };
}

export default function CharacterModel3D({
  sceneRef,
  raceId,
  classId,
  animation = "idle",
  scale: scaleOverride,
  facing = 0,
  onAnimationComplete,
  position = { x: 0, y: 0, z: 0 },
}: CharacterModel3DProps) {
  const modelRef = useRef<LoadedModel | null>(null);
  const controllerRef = useRef<AnimationController | null>(null);
  const unsubUpdateRef = useRef<(() => void) | null>(null);
  const loadedKeyRef = useRef<string>("");

  // ── Load model when race/class changes ────────────────────────────────

  const loadModel = useCallback(async () => {
    const scene = sceneRef.current;
    if (!scene) return;

    const modelUnit = getModelForCharacter(raceId, classId);
    const loadKey = `${modelUnit.id}:${modelUnit.weaponType}`;

    // Skip if already loaded with same config
    if (loadKey === loadedKeyRef.current && modelRef.current) return;

    // Cleanup previous model
    if (modelRef.current) {
      scene.remove(modelRef.current.scene);
      controllerRef.current?.dispose();
      unsubUpdateRef.current?.();
    }

    try {
      const loaded = await loadCharacterModel(modelUnit.modelPath);
      modelRef.current = loaded;
      loadedKeyRef.current = loadKey;

      // Fit to ~2m × race mult (avoid giant T-pose in UI)
      const { fitCharacterRootToHeightM, PLAYER_HEIGHT_M } = await import(
        '@/island3d/zoneWorldScale'
      );
      fitCharacterRootToHeightM(
        loaded.scene,
        scaleOverride ?? modelUnit.scale ?? 1,
        PLAYER_HEIGHT_M,
      );
      loaded.scene.position.x += position.x;
      loaded.scene.position.y += position.y;
      loaded.scene.position.z += position.z;

      // Add to scene
      scene.add(loaded.scene);

      // Create animation controller
      const controller = new AnimationController(loaded.mixer, loaded.scene);
      controllerRef.current = controller;

      // Preload weapon-type animations
      const animSet = getAnimationSet(modelUnit.weaponType);
      const animMap: Record<string, string> = {};
      for (const [state, def] of Object.entries(animSet)) {
        if (def) animMap[state] = (def as AnimationDef).file;
      }

      await preloadAnimations(controller, animMap);

      // Also register any embedded animations from the model itself
      for (const [name, action] of loaded.actions) {
        if (!controller.actions.has(name)) {
          controller.actions.set(name, action);
        }
      }

      // Register per-frame update
      unsubUpdateRef.current = scene.onUpdate((dt) => {
        controller.update(dt);
      });

      // Play initial animation
      const animDef = animSet[animation];
      controller.play(animation, {
        loop: animDef?.loop ?? true,
        speed: animDef?.speed ?? 1,
        onFinish: onAnimationComplete,
      });
    } catch (err) {
      console.error(`Failed to load 3D model for ${raceId}/${classId}:`, err);
    }
  }, [raceId, classId, scaleOverride, position.x, position.y, position.z, sceneRef]);

  useEffect(() => {
    loadModel();

    return () => {
      // Cleanup on unmount
      const scene = sceneRef.current;
      if (scene && modelRef.current) {
        scene.remove(modelRef.current.scene);
      }
      controllerRef.current?.dispose();
      unsubUpdateRef.current?.();
      modelRef.current = null;
      controllerRef.current = null;
      loadedKeyRef.current = "";
    };
  }, [loadModel, sceneRef]);

  // ── Switch animation when prop changes ────────────────────────────────

  useEffect(() => {
    const controller = controllerRef.current;
    if (!controller) return;

    const modelUnit = getModelForCharacter(raceId, classId);
    const animSet = getAnimationSet(modelUnit.weaponType);
    const animDef = animSet[animation];

    controller.play(animation, {
      loop: animDef?.loop ?? true,
      speed: animDef?.speed ?? 1,
      onFinish: onAnimationComplete,
    });
  }, [animation, raceId, classId, onAnimationComplete]);

  // ── Update facing rotation ────────────────────────────────────────────

  useEffect(() => {
    if (modelRef.current) {
      modelRef.current.scene.rotation.y = facing;
    }
  }, [facing]);

  // ── Update position ───────────────────────────────────────────────────

  useEffect(() => {
    if (modelRef.current) {
      modelRef.current.scene.position.set(position.x, position.y, position.z);
    }
  }, [position.x, position.y, position.z]);

  // ── Update scale ──────────────────────────────────────────────────────

  useEffect(() => {
    if (modelRef.current && scaleOverride !== undefined) {
      modelRef.current.scene.scale.setScalar(scaleOverride);
    }
  }, [scaleOverride]);

  // This component is imperative (adds to ThreeScene via ref), renders nothing
  return null;
}
