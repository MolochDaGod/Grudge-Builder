/**
 * Grudge token FAB visual — 2D sprite by default; optional 3D only after a
 * verified glTF binary (magic "glTF").
 *
 * Production R2 once served HTML under models/grudge-token-helmet.glb with
 * Content-Type: model/gltf-binary — HEAD alone is not trustworthy. Never mount
 * useGLTF until magic bytes pass, so pages stay free of "Unexpected token '<'".
 */
import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, Center } from "@react-three/drei";
import type { Group } from "three";
import { assetUrl } from "@/lib/assetConfig";

const HELMET_FALLBACK_IMG = assetUrl("/sprites/gbux-token.png");
/** Same-origin proxy → R2 (when a real GLB is uploaded). */
const MODEL_URL = assetUrl("/models/grudge-token-helmet.glb");

/**
 * Force 2D until R2 has a real GLB. Set VITE_GRUDGE_TOKEN_3D=1 after upload.
 * Default off avoids console spam when the key is HTML/404 SPA.
 */
function allowHelmet3dAttempt(): boolean {
  try {
    const env = (import.meta as { env?: Record<string, string | undefined> }).env;
    return env?.VITE_GRUDGE_TOKEN_3D === "1" || env?.VITE_GRUDGE_TOKEN_3D === "true";
  } catch {
    return false;
  }
}

/** HTML fallback — only safe OUTSIDE Canvas (R3F treats <img> as THREE.Img). */
function HelmetHtmlFallback({ className = "w-full h-full" }: { className?: string }) {
  return (
    <div className={`${className} flex items-center justify-center`}>
      <img
        src={HELMET_FALLBACK_IMG}
        alt=""
        className="w-10 h-10 rounded-full"
        draggable={false}
      />
    </div>
  );
}

/** Empty 3D placeholder while GLB loads — never put DOM nodes inside Canvas. */
function HelmetCanvasFallback() {
  return null;
}

class HelmetErrorBoundary extends Component<
  { children: ReactNode; className?: string; onFail?: () => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onFail?.();
  }

  render() {
    if (this.state.failed) {
      return <HelmetHtmlFallback className={this.props.className} />;
    }
    return this.props.children;
  }
}

function HelmetModel({ url }: { url: string }) {
  const group = useRef<Group>(null);
  const { scene } = useGLTF(url);
  const model = useMemo(() => scene.clone(), [scene]);

  useFrame((_state, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.85;
  });

  return (
    <group ref={group}>
      <Center>
        <primitive object={model} scale={1.35} />
      </Center>
    </group>
  );
}

/** True only if body starts with glTF binary magic — never trust Content-Type alone. */
async function probeHelmetModel(url: string): Promise<boolean> {
  try {
    const get = await fetch(url, {
      method: "GET",
      mode: "cors",
      credentials: "omit",
      headers: { Range: "bytes=0-15" },
      cache: "no-store",
    });
    // 200 or 206 Partial Content
    if (!get.ok && get.status !== 206) return false;

    const ct = (get.headers.get("content-type") || "").toLowerCase();
    if (ct.includes("html") || ct.includes("text/")) return false;

    const buf = await get.arrayBuffer();
    if (buf.byteLength < 4) return false;
    const bytes = new Uint8Array(buf);

    // HTML / DOCTYPE / BOM
    if (bytes[0] === 0x3c /* < */) return false;
    if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return false;

    // glTF binary magic "glTF" (0x67 0x6c 0x54 0x46)
    return (
      bytes[0] === 0x67 &&
      bytes[1] === 0x6c &&
      bytes[2] === 0x54 &&
      bytes[3] === 0x46
    );
  } catch {
    return false;
  }
}

export function GrudgeTokenHelmet({ className = "w-full h-full" }: { className?: string }) {
  // Default 2d — never flash a broken useGLTF load
  const [mode, setMode] = useState<"2d" | "3d">("2d");

  useEffect(() => {
    if (!allowHelmet3dAttempt()) {
      setMode("2d");
      return;
    }
    let cancelled = false;
    void probeHelmetModel(MODEL_URL).then((ok) => {
      if (!cancelled && ok) setMode("3d");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (mode === "2d") {
    return <HelmetHtmlFallback className={className} />;
  }

  return (
    <HelmetErrorBoundary className={className} onFail={() => setMode("2d")}>
      <Canvas
        className={className}
        dpr={[1, 1.5]}
        gl={{ alpha: true, antialias: true }}
        camera={{ position: [0, 0.05, 1.65], fov: 42 }}
        style={{ background: "transparent" }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener("webglcontextlost", (e) => e.preventDefault(), false);
        }}
      >
        <ambientLight intensity={1.1} />
        <directionalLight position={[2, 3, 2]} intensity={1.4} />
        <pointLight position={[-1, 1, 1]} intensity={0.6} color="#fbbf24" />
        <Suspense fallback={<HelmetCanvasFallback />}>
          <HelmetModel url={MODEL_URL} />
        </Suspense>
      </Canvas>
    </HelmetErrorBoundary>
  );
}
