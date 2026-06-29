/**
 * Native /world — lazy-loads grudge-game WorldPage into the grudge-builder bundle.
 * Replaces the iframe bridge (world-embed.tsx) for same-origin auth, HUD, and routing.
 */
import { lazy, Suspense, useEffect } from "react";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { initGrudgeGameRuntime } from "@/lib/grudgeGameRuntime";

import "@grudge-game/index.css";
import "@grudge-game/styles/kit.css";

const WorldPage = lazy(async () => {
  await initGrudgeGameRuntime();
  const mod = await import("@grudge-game/pages/world/WorldPage");
  return { default: mod.default };
});

function WorldLoading() {
  return (
    <div className="fixed inset-0 z-[9999] grid place-items-center bg-[#05060c] text-sm text-white/50">
      Loading 3D world…
    </div>
  );
}

export default function WorldNativePage() {
  const authReady = useAuthGuard();

  useEffect(() => {
    void initGrudgeGameRuntime();
  }, []);

  if (!authReady) return null;

  return (
    <div className="dark fixed inset-0 z-[9999] overflow-hidden bg-[#05060c]">
      <Suspense fallback={<WorldLoading />}>
        <WorldPage />
      </Suspense>
    </div>
  );
}