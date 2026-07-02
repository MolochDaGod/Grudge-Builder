import { Component, Suspense, useMemo, useRef, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, Center } from "@react-three/drei";
import type { Group } from "three";
import { ASSETS_CDN } from "@/lib/grudgeConfig";
import { assetUrl } from "@/lib/assetConfig";

const HELMET_FALLBACK_IMG = assetUrl("/sprites/gbux-token.png");
const MODEL_URL = `${ASSETS_CDN}/models/grudge-token-helmet.glb`;

function HelmetFallback({ className = "w-full h-full" }: { className?: string }) {
  return (
    <div className={`${className} flex items-center justify-center`}>
      <img src={HELMET_FALLBACK_IMG} alt="" className="w-10 h-10 rounded-full" />
    </div>
  );
}

class HelmetErrorBoundary extends Component<
  { children: ReactNode; className?: string },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return <HelmetFallback className={this.props.className} />;
    }
    return this.props.children;
  }
}

function HelmetModel() {
  const group = useRef<Group>(null);
  const { scene } = useGLTF(MODEL_URL);
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

export function GrudgeTokenHelmet({ className = "w-full h-full" }: { className?: string }) {
  return (
    <HelmetErrorBoundary className={className}>
      <Canvas
        className={className}
        dpr={[1, 1.5]}
        gl={{ alpha: true, antialias: true }}
        camera={{ position: [0, 0.05, 1.65], fov: 42 }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={1.1} />
        <directionalLight position={[2, 3, 2]} intensity={1.4} />
        <pointLight position={[-1, 1, 1]} intensity={0.6} color="#fbbf24" />
        <Suspense fallback={<HelmetFallback className={className} />}>
          <HelmetModel />
        </Suspense>
      </Canvas>
    </HelmetErrorBoundary>
  );
}