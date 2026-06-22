/**
 * OpeningScene — the Grudge Studio Forge's default 3D viewport.
 *
 * A production-quality "opening scene" that doubles as a universal model
 * inspector. Out of the box it shows a lit hero on an infinite grid; drop (or
 * pick) a GLB/glTF/FBX/OBJ/STL/PLY/DAE/3MF file and it loads through the
 * `modelLoader` pipeline, auto-frames it, and reports live mesh stats.
 *
 * Dev-tool integrations:
 *   - ACES tone mapping + soft shadows + key/fill/rim/hemisphere lighting rig
 *   - Infinite reference grid, viewport gizmo, optional fps/draw Stats panel
 *   - Orbit controls with damping + optional auto-rotate
 *   - Auto-framing via drei <Bounds>, manual "Re-frame" button
 *   - Wireframe toggle, grid toggle
 *   - Drag-and-drop / file-picker import for every supported format
 *   - Live model stats (triangles, meshes, materials, textures, size, clips)
 */

import { Suspense, useCallback, useEffect, useRef, useState, type ReactNode, type DragEvent } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Bounds,
  ContactShadows,
  GizmoHelper,
  GizmoViewport,
  Grid,
  OrbitControls,
  Stats,
} from "@react-three/drei";
import * as THREE from "three";
import {
  Box, Grid3x3, Loader2, Maximize, Rotate3d, Upload, Activity, AlertTriangle,
} from "lucide-react";
import {
  loadModel,
  loadModelFromFile,
  normalizeModel,
  getModelStats,
  disposeObject,
  configureRenderer,
  FILE_ACCEPT,
  SUPPORTED_EXTENSIONS,
  type LoadedAsset,
  type ModelStats,
} from "@/lib/modelLoader";

// ── Renderer best-practice setup (tone mapping + KTX2 support) ────────────────

function RendererConfig() {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.0;
    configureRenderer(gl);
  }, [gl]);
  return null;
}

// ── Lighting rig: hemisphere ambient + key (shadow) + fill + rim ──────────────

function Lighting() {
  return (
    <>
      <hemisphereLight args={[0xbcd2ff, 0x2b2620, 0.55]} />
      <directionalLight
        position={[6, 9, 5]}
        intensity={2.4}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0001}
        shadow-normalBias={0.02}
      >
        <orthographicCamera attach="shadow-camera" args={[-7, 7, 7, -7, 0.1, 40]} />
      </directionalLight>
      <directionalLight position={[-7, 4, -3]} intensity={0.5} color={0x88aaff} />
      <directionalLight position={[0, 3, -7]} intensity={0.8} color={0xffcf9c} />
    </>
  );
}

// ── Default hero (shown until a model is loaded) ──────────────────────────────

function DefaultHero() {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.3;
  });
  return (
    <group ref={ref}>
      <mesh castShadow position={[0, 1.15, 0]}>
        <torusKnotGeometry args={[0.58, 0.2, 200, 32]} />
        <meshStandardMaterial
          color={0xd97706}
          metalness={0.45}
          roughness={0.25}
          emissive={0x582b06}
          emissiveIntensity={0.45}
        />
      </mesh>
      <mesh receiveShadow position={[0, 0.1, 0]}>
        <cylinderGeometry args={[1.05, 1.2, 0.2, 64]} />
        <meshStandardMaterial color={0x1c1917} metalness={0.2} roughness={0.85} />
      </mesh>
    </group>
  );
}

// ── Loaded model + animation playback + wireframe toggle ──────────────────────

function ModelView({ asset, wireframe }: { asset: LoadedAsset; wireframe: boolean }) {
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);

  useEffect(() => {
    if (asset.animations.length > 0) {
      const mixer = new THREE.AnimationMixer(asset.object);
      mixer.clipAction(asset.animations[0]).play();
      mixerRef.current = mixer;
    }
    return () => {
      mixerRef.current?.stopAllAction();
      mixerRef.current = null;
    };
  }, [asset]);

  useEffect(() => {
    asset.object.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const mat of mats) {
        if (mat && "wireframe" in mat) (mat as THREE.MeshStandardMaterial).wireframe = wireframe;
      }
    });
  }, [asset, wireframe]);

  useFrame((_, dt) => mixerRef.current?.update(dt));

  return <primitive object={asset.object} />;
}

// ── Scene graph ───────────────────────────────────────────────────────────────

interface SceneRootProps {
  asset: LoadedAsset | null;
  wireframe: boolean;
  showGrid: boolean;
  autoRotate: boolean;
  fitKey: number;
}

function SceneRoot({ asset, wireframe, showGrid, autoRotate, fitKey }: SceneRootProps) {
  return (
    <>
      <RendererConfig />
      <Lighting />

      {showGrid && (
        <Grid
          args={[24, 24]}
          cellSize={0.5}
          cellThickness={0.6}
          cellColor="#33333d"
          sectionSize={2.5}
          sectionThickness={1}
          sectionColor="#d97706"
          fadeDistance={30}
          fadeStrength={1}
          infiniteGrid
          followCamera={false}
        />
      )}

      <ContactShadows position={[0, 0.01, 0]} opacity={0.5} scale={14} blur={2.6} far={6} />

      {asset ? (
        <Bounds key={fitKey} fit clip observe margin={1.2}>
          <ModelView asset={asset} wireframe={wireframe} />
        </Bounds>
      ) : (
        <DefaultHero />
      )}

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        autoRotate={autoRotate}
        autoRotateSpeed={1.2}
        minDistance={1}
        maxDistance={60}
      />

      <GizmoHelper alignment="bottom-right" margin={[72, 72]}>
        <GizmoViewport axisColors={["#f87171", "#4ade80", "#60a5fa"]} labelColor="white" />
      </GizmoHelper>
    </>
  );
}

// ── Overlay controls ──────────────────────────────────────────────────────────

function ToggleButton({
  active, onClick, title, children,
}: {
  active: boolean; onClick: () => void; title: string; children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition-colors ${
        active
          ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
          : "bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

// ── Public component ──────────────────────────────────────────────────────────

export interface OpeningSceneProps {
  /** Optional model URL to load on mount (any supported format). */
  modelUrl?: string;
  /** Container className (caller controls sizing). */
  className?: string;
}

export default function OpeningScene({ modelUrl, className = "" }: OpeningSceneProps) {
  const [asset, setAsset] = useState<LoadedAsset | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ModelStats | null>(null);

  const [showGrid, setShowGrid] = useState(true);
  const [wireframe, setWireframe] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [fitKey, setFitKey] = useState(0);

  const assetRef = useRef<LoadedAsset | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dispose the previous model's GPU resources whenever it changes / unmounts.
  const swapAsset = useCallback((next: LoadedAsset | null) => {
    if (assetRef.current && assetRef.current !== next) {
      disposeObject(assetRef.current.object);
    }
    assetRef.current = next;
    setAsset(next);
  }, []);

  const ingest = useCallback(
    async (loader: () => Promise<LoadedAsset>, label: string) => {
      setLoading(true);
      setError(null);
      setProgress(0);
      try {
        const next = await loader();
        normalizeModel(next.object);
        swapAsset(next);
        setStats(getModelStats(next.object, next.animations));
        setFitKey((k) => k + 1);
      } catch (e) {
        setError(e instanceof Error ? e.message : `Failed to load ${label}`);
      } finally {
        setLoading(false);
      }
    },
    [swapAsset],
  );

  const loadFromUrl = useCallback(
    (url: string) => ingest(() => loadModel(url, { onProgress: setProgress }), url),
    [ingest],
  );
  const loadFromFile = useCallback(
    (file: File) => ingest(() => loadModelFromFile(file, { onProgress: setProgress }), file.name),
    [ingest],
  );

  // Load initial model + clean up on unmount.
  useEffect(() => {
    if (modelUrl) loadFromUrl(modelUrl);
    return () => {
      if (assetRef.current) disposeObject(assetRef.current.object);
      assetRef.current = null;
    };
  }, [modelUrl, loadFromUrl]);

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) loadFromFile(file);
    },
    [loadFromFile],
  );

  return (
    <div
      className={`relative w-full overflow-hidden rounded-xl border border-slate-700 bg-[#0a0a12] ${className}`}
      onDrop={onDrop}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
    >
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [4.5, 3, 6], fov: 45, near: 0.1, far: 200 }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={["#0a0a12"]} />
        <fog attach="fog" args={["#0a0a12", 20, 44]} />
        <Suspense fallback={null}>
          <SceneRoot
            asset={asset}
            wireframe={wireframe}
            showGrid={showGrid}
            autoRotate={autoRotate}
            fitKey={fitKey}
          />
        </Suspense>
        {showStats && <Stats />}
      </Canvas>

      {/* Top bar — title + toolbar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3">
        <div className="pointer-events-auto">
          <div className="flex items-center gap-2 rounded-lg bg-slate-900/70 px-3 py-1.5 backdrop-blur-sm">
            <Box className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-semibold text-white">Opening Scene</span>
            {asset && (
              <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-mono uppercase text-amber-400">
                {asset.format}
              </span>
            )}
          </div>
        </div>

        <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-1.5">
          <ToggleButton active={showGrid} onClick={() => setShowGrid((v) => !v)} title="Toggle grid">
            <Grid3x3 className="h-3.5 w-3.5" /> Grid
          </ToggleButton>
          <ToggleButton active={wireframe} onClick={() => setWireframe((v) => !v)} title="Toggle wireframe">
            <Box className="h-3.5 w-3.5" /> Wire
          </ToggleButton>
          <ToggleButton active={autoRotate} onClick={() => setAutoRotate((v) => !v)} title="Auto-rotate">
            <Rotate3d className="h-3.5 w-3.5" /> Rotate
          </ToggleButton>
          <ToggleButton active={showStats} onClick={() => setShowStats((v) => !v)} title="FPS / draw stats">
            <Activity className="h-3.5 w-3.5" /> Stats
          </ToggleButton>
          <ToggleButton active={false} onClick={() => setFitKey((k) => k + 1)} title="Re-frame model">
            <Maximize className="h-3.5 w-3.5" /> Fit
          </ToggleButton>
          <button
            onClick={() => fileInputRef.current?.click()}
            title={`Import a model (${SUPPORTED_EXTENSIONS.join(", ")})`}
            className="flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/20 px-2.5 py-1.5 text-xs text-amber-300 hover:bg-amber-500/30"
          >
            <Upload className="h-3.5 w-3.5" /> Import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={FILE_ACCEPT}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) loadFromFile(file);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {/* Bottom-left — model stats */}
      {stats && (
        <div className="absolute bottom-3 left-3 rounded-lg bg-slate-900/70 px-3 py-2 font-mono text-[11px] text-slate-300 backdrop-blur-sm">
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
            <span className="text-slate-500">triangles</span>
            <span className="text-right text-amber-300">{stats.triangles.toLocaleString()}</span>
            <span className="text-slate-500">meshes</span>
            <span className="text-right">{stats.meshes}</span>
            <span className="text-slate-500">materials</span>
            <span className="text-right">{stats.materials}</span>
            <span className="text-slate-500">textures</span>
            <span className="text-right">{stats.textures}</span>
            <span className="text-slate-500">clips</span>
            <span className="text-right">{stats.animations}</span>
            <span className="text-slate-500">size</span>
            <span className="text-right">
              {stats.size.x.toFixed(1)}×{stats.size.y.toFixed(1)}×{stats.size.z.toFixed(1)}
            </span>
          </div>
        </div>
      )}

      {/* Drag overlay */}
      {dragging && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center border-2 border-dashed border-amber-500/60 bg-amber-500/10">
          <div className="rounded-lg bg-slate-900/80 px-4 py-3 text-sm text-amber-300">
            Drop to import — {SUPPORTED_EXTENSIONS.join(", ")}
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/40">
          <div className="flex items-center gap-2 rounded-lg bg-slate-900/90 px-4 py-3 text-sm text-white">
            <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
            Loading model… {progress > 0 ? `${Math.round(progress * 100)}%` : ""}
          </div>
        </div>
      )}

      {/* Error toast */}
      {error && (
        <div className="absolute bottom-3 right-3 flex max-w-sm items-start gap-2 rounded-lg border border-red-500/40 bg-red-950/80 px-3 py-2 text-xs text-red-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
