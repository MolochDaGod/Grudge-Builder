/**
 * ThreeScene — Reusable React wrapper for a Three.js scene
 *
 * Provides: WebGL renderer, PBR lighting, shadow-casting directional light,
 * ground plane, resize handling, and animation loop.
 *
 * Camera modes:
 *   - "orbit"  → auto-rotates around center (character-builder preview)
 *   - "follow" → follows a target position (gameplay over-shoulder)
 */

import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import * as THREE from "three";

export type CameraMode = "orbit" | "follow";

export interface ThreeSceneHandle {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  /** Add an object to the scene */
  add: (obj: THREE.Object3D) => void;
  /** Remove an object from the scene */
  remove: (obj: THREE.Object3D) => void;
  /** Register a per-frame update callback; returns unsubscribe function */
  onUpdate: (cb: (dt: number) => void) => () => void;
  /** Move camera to look at a target position */
  lookAt: (target: THREE.Vector3) => void;
}

interface ThreeSceneProps {
  width?: number;
  height?: number;
  className?: string;
  cameraMode?: CameraMode;
  /** Background color (CSS hex) */
  bgColor?: string;
  /** Show ground plane */
  showGround?: boolean;
  /** Orbit speed (degrees per second, orbit mode only) */
  orbitSpeed?: number;
  /** Camera distance from center */
  cameraDistance?: number;
  /** Camera height */
  cameraHeight?: number;
}

const ThreeScene = forwardRef<ThreeSceneHandle, ThreeSceneProps>(function ThreeScene(
  {
    width,
    height,
    className = "",
    cameraMode = "orbit",
    bgColor = "#111827",
    showGround = true,
    orbitSpeed = 20,
    cameraDistance = 5,
    cameraHeight = 3,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const clockRef = useRef(new THREE.Clock());
  const rafRef = useRef<number>(0);
  const updatesRef = useRef<Set<(dt: number) => void>>(new Set());
  const orbitAngleRef = useRef(0);

  // ── Initialize Three.js ─────────────────────────────────────────────────

  const init = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const w = width ?? container.clientWidth;
    const h = height ?? container.clientHeight;
    if (w === 0 || h === 0) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(bgColor);
    scene.fog = new THREE.Fog(bgColor, 20, 60);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    camera.position.set(0, cameraHeight, cameraDistance);
    camera.lookAt(0, 1, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // ── Lighting ──────────────────────────────────────────────────────────

    // Ambient fill
    const ambient = new THREE.AmbientLight(0xb0c4de, 0.6);
    scene.add(ambient);

    // Hemisphere sky/ground light
    const hemi = new THREE.HemisphereLight(0x87ceeb, 0x362d1e, 0.4);
    scene.add(hemi);

    // Main directional (sun) with shadows
    const dirLight = new THREE.DirectionalLight(0xfff5e1, 1.2);
    dirLight.position.set(5, 10, 7);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(1024, 1024);
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 30;
    dirLight.shadow.camera.left = -8;
    dirLight.shadow.camera.right = 8;
    dirLight.shadow.camera.top = 8;
    dirLight.shadow.camera.bottom = -8;
    dirLight.shadow.bias = -0.001;
    scene.add(dirLight);

    // Rim/back light for character edge highlighting
    const rimLight = new THREE.DirectionalLight(0x8888ff, 0.3);
    rimLight.position.set(-3, 5, -5);
    scene.add(rimLight);

    // ── Ground plane ──────────────────────────────────────────────────────

    if (showGround) {
      const groundGeo = new THREE.CircleGeometry(12, 48);
      const groundMat = new THREE.MeshStandardMaterial({
        color: 0x2d3748,
        roughness: 0.9,
        metalness: 0.0,
      });
      const ground = new THREE.Mesh(groundGeo, groundMat);
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      scene.add(ground);

      // Subtle grid ring for visual reference
      const ringGeo = new THREE.RingGeometry(2.8, 3.0, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x4a5568,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.01;
      scene.add(ring);
    }

    clockRef.current.start();
  }, [bgColor, cameraDistance, cameraHeight, showGround, width, height]);

  // ── Animation loop ────────────────────────────────────────────────────

  const animate = useCallback(() => {
    const dt = clockRef.current.getDelta();
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const renderer = rendererRef.current;
    if (!scene || !camera || !renderer) return;

    // Call all registered update callbacks
    for (const cb of updatesRef.current) {
      cb(dt);
    }

    // Orbit camera mode
    if (cameraMode === "orbit") {
      orbitAngleRef.current += orbitSpeed * dt * (Math.PI / 180);
      camera.position.x = Math.sin(orbitAngleRef.current) * cameraDistance;
      camera.position.z = Math.cos(orbitAngleRef.current) * cameraDistance;
      camera.position.y = cameraHeight;
      camera.lookAt(0, 1, 0);
    }

    renderer.render(scene, camera);
    rafRef.current = requestAnimationFrame(animate);
  }, [cameraMode, orbitSpeed, cameraDistance, cameraHeight]);

  // ── Mount / unmount + deferred init when layout size is ready ───────

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let mounted = true;

    const ensureScene = () => {
      if (!mounted) return;
      const w = width ?? container.clientWidth;
      const h = height ?? container.clientHeight;
      if (w <= 0 || h <= 0) return;

      if (!sceneRef.current) {
        init();
        if (sceneRef.current) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = requestAnimationFrame(animate);
        }
        return;
      }

      const camera = cameraRef.current;
      const renderer = rendererRef.current;
      if (camera && renderer) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    };

    ensureScene();
    const observer = new ResizeObserver(() => ensureScene());
    observer.observe(container);

    return () => {
      mounted = false;
      observer.disconnect();
      cancelAnimationFrame(rafRef.current);
      const renderer = rendererRef.current;
      if (renderer) {
        renderer.dispose();
        renderer.domElement.remove();
      }
      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
    };
  }, [init, animate, width, height]);

  // ── Imperative handle ─────────────────────────────────────────────────

  useImperativeHandle(
    ref,
    () => ({
      get scene() { return sceneRef.current!; },
      get camera() { return cameraRef.current!; },
      get renderer() { return rendererRef.current!; },
      add: (obj: THREE.Object3D) => sceneRef.current?.add(obj),
      remove: (obj: THREE.Object3D) => sceneRef.current?.remove(obj),
      onUpdate: (cb: (dt: number) => void) => {
        updatesRef.current.add(cb);
        return () => { updatesRef.current.delete(cb); };
      },
      lookAt: (target: THREE.Vector3) => {
        cameraRef.current?.lookAt(target);
      },
    }),
    [],
  );

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: width ?? "100%",
        height: height ?? "100%",
        minHeight: 200,
        position: "relative",
        overflow: "hidden",
        borderRadius: "0.5rem",
      }}
      data-testid="three-scene"
    />
  );
});

export default ThreeScene;
