/**
 * React hook for gmap-driven HUD layout (Island3D production maps).
 */
import { useEffect, useState } from 'react';
import type { Island3DEngine } from '@/island3d/engine/Island3DEngine';
import {
  defaultProductionHud,
  type ProductionHudSchema,
  type ProductionHudPanel,
} from '@shared/definitions/productionMapPackage';

export function useProductionHud(engine: Island3DEngine | null): {
  hud: ProductionHudSchema;
  isPanelEnabled: (surface: ProductionHudPanel['surface']) => boolean;
  flags: ProductionHudSchema['flags'];
} {
  const [hud, setHud] = useState<ProductionHudSchema>(
    () => engine?.productionHud ?? defaultProductionHud(),
  );

  useEffect(() => {
    if (engine?.productionHud) setHud(engine.productionHud);
    const onGmap = (ev: Event) => {
      const detail = (ev as CustomEvent).detail as { hud?: ProductionHudSchema };
      if (detail?.hud) setHud(detail.hud);
    };
    window.addEventListener('grudge:production-gmap', onGmap);
    return () => window.removeEventListener('grudge:production-gmap', onGmap);
  }, [engine]);

  return {
    hud,
    flags: hud.flags,
    isPanelEnabled: (surface) => {
      if (!hud.showChrome) return false;
      const p = hud.panels.find((x) => x.surface === surface);
      return p?.enabled !== false;
    },
  };
}
