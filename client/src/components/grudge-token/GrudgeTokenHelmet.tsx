/**
 * Grudge token FAB visual — prefers 2D sprite; optional 3D helmet when GLB is healthy.
 *
 * Never throw uncaught useGLTF errors into the console (missing/HTML responses used
 * to spam "Unexpected token '<'" on every page including /asset-showcase).
 */
import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, Center } from "@react-three/drei";
import type { Group } from "three";
import { assetUrl } from "@/lib/assetConfig";

const HELMET_FALLBACK_IMG = assetUrl("/sprites/gbux-token.png");
/** Same-origin proxy → R2 (avoids CORS / HTML error bodies). */
const MODEL_URL = assetUrl("/models/grudge-token-helmet.glb");

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

/** Probe model before mounting R3F — rejects HTML error pages and non-OK status. */
async function probeHelmetModel(url: string): Promise<boolean> {
  try {
    const head = await fetch(url, { method: "HEAD", mode: "cors", credentials: "omit" });
    if (head.ok) {
      const ct = (head.headers.get("content-type") || "").toLowerCase();
      if (ct.includes("html")) return false;
      if (ct.includes("gltf") || ct.includes("octet") || ct.includes("model") || ct === "") {
        return true;
      }
    }
    // Some edges block HEAD — try ranged GET
    const get = await fetch(url, {
      method: "GET",
      mode: "cors",
      credentials: "omit",
      headers: { Range: "bytes=0-3" },
    });
    if (!get.ok && get.status !== 206) return false;
    const buf = await get.arrayBuffer();
    if (buf.byteLength < 4) return false;
    const bytes = new Uint8Array(buf);
    // glTF binary magic "glTF"
    const magic =
      bytes[0] === 0x67 &&
      bytes[1] === 0x6c &&
      bytes[2] === 0x54 &&
      bytes[3] === 0x46;
    // Not HTML `<!DO` / `<htm`
    const looksHtml =
      bytes[0] === 0x3c /* < */ ||
      (bytes[0] === 0xef && bytes[1] === 0xbb); // BOM often precedes HTML
    return magic && !looksHtml;
  } catch {
    return false;
  }
}

export function GrudgeTokenHelmet({ className = "w-full h-full" }: { className?: string }) {
  const [mode, setMode] = useState<"pending" | "3d" | "2d">("pending");

  useEffect(() => {
    let cancelled = false;
    void probeHelmetModel(MODEL_URL).then((ok) => {
      if (!cancelled) setMode(ok ? "3d" : "2d");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (mode === "pending" || mode === "2d") {
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
