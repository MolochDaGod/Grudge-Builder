import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, Center } from "@react-three/drei";
import type { Group } from "three";

const MODEL_URL = "/models/grudge-token-helmet.glb";

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

useGLTF.preload(MODEL_URL);

export function GrudgeTokenHelmet({ className = "w-full h-full" }: { className?: string }) {
  return (
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
      <Suspense fallback={null}>
        <HelmetModel />
      </Suspense>
    </Canvas>
  );
}