import { setAssetBase, setSameOriginPrefixes } from "@workspace/character-kit";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { getToken } from "@/lib/grudgeBackend";
import { AI_GATEWAY, ASSETS_CDN } from "@/lib/grudgeConfig";

declare const __GRUDGE_ASSET_BASE_DEFAULT__: string;

let boot: Promise<void> | null = null;

/**
 * One-time grudge-game client bootstrap (asset CDN, auth bridge, AI base).
 * Called before the lazy WorldPage chunk executes.
 */
export function initGrudgeGameRuntime(): Promise<void> {
  if (!boot) {
    boot = (async () => {
      const assetBase =
        import.meta.env.VITE_ASSET_BASE ??
        (import.meta.env.DEV ? "" : ASSETS_CDN) ??
        __GRUDGE_ASSET_BASE_DEFAULT__;
      setAssetBase(assetBase);
      setSameOriginPrefixes(["/assets/grudges/weapons"]);
      setAuthTokenGetter(async () => getToken());
      const { setAiBase } = await import("@grudge-game/pages/world/aiClient");
      const aiBase = import.meta.env.VITE_AI_BASE ?? AI_GATEWAY;
      if (aiBase) setAiBase(aiBase);
    })();
  }
  return boot;
}