/**
 * Resolve world-space wash-up point for tutorial on chicken-gun pirate-islands.
 *
 * Production gmap entity: shipwreck_cove (ox=0.28, oz=0.22 frac of lobby size).
 * Map: pirate-islands (PolygonPirates / Chicken Gun) via lobby mode.
 */
import * as THREE from 'three';
import type { Island3DEngine } from '../engine/Island3DEngine';

/** Fractional offset from production grudge-open-world.gmap.json shipwreck_cove */
export const SHIPWRECK_COVE_FRAC = { ox: 0.28, oz: 0.22 } as const;

export function resolveShipwreckCoveWorld(engine: Island3DEngine): THREE.Vector3 {
  // Prefer lobby bounds when pirate-islands is loaded
  const bounds = engine.getLobbyMapBounds?.() ?? null;
  if (bounds?.center && bounds?.size) {
    const x = bounds.center.x + SHIPWRECK_COVE_FRAC.ox * bounds.size.x;
    const z = bounds.center.z + SHIPWRECK_COVE_FRAC.oz * bounds.size.z;
    let y = 1.2;
    const h = engine.sampleLobbyGroundHeight?.(x, z);
    if (typeof h === 'number' && Number.isFinite(h)) y = h + 0.2;
    return new THREE.Vector3(x, y, z);
  }

  // Fallback: known-relative cove if lobby not ready
  return new THREE.Vector3(
    SHIPWRECK_COVE_FRAC.ox * 120,
    1.2,
    SHIPWRECK_COVE_FRAC.oz * 120,
  );
}
