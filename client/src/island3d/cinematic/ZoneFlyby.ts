/**
 * ZoneFlyby — thin re-export over SurfaceFlyby for sector proof packages.
 * Prefer SurfaceFlyby / GameTrailer for multi-surface trailer assembly.
 */
import type { Island3DEngine } from '../engine/Island3DEngine';
import {
  createSurfaceFlyby,
  type SurfaceFlybyResult,
  type SurfaceFlybyHandle,
  buildSurfaceWaypoints,
} from './SurfaceFlyby';
import { SECTOR_PROOF_CHECKLIST } from '@shared/definitions/sectorRewritePipeline';
import { getTrailerSurface } from '@shared/definitions/trailerShotCatalog';

export type { SurfaceFlybyResult as ZoneFlybyResult };
export type ZoneFlybyHandle = SurfaceFlybyHandle;

/** @deprecated use buildSurfaceWaypoints */
export function buildWaypoints(engine: Island3DEngine) {
  const surface =
    getTrailerSurface(engine.zoneSector?.id ?? 'haven_shore')
    ?? getTrailerSurface('haven_shore')!;
  return buildSurfaceWaypoints(engine, surface);
}

export function createZoneFlyby(engine: Island3DEngine): ZoneFlybyHandle {
  const inner = createSurfaceFlyby(engine);
  return {
    get playing() {
      return inner.playing;
    },
    async start(opts = {}) {
      const r = await inner.start({
        record: opts.record,
        snapshotEachWp: opts.snapshotEachWp,
        surfaceId: engine.zoneSector?.id,
      });
      // Adapt to legacy checklist shape for ZoneFlybyHUD
      return {
        ...r,
        checklist: SECTOR_PROOF_CHECKLIST.map((c) => ({
          id: c.id,
          label: c.label,
          seen: r.snapshots.some(
            (s) =>
              s.id.includes(c.id)
              || s.label.toLowerCase().includes(c.id.replace(/_/g, ' ')),
          ) || (c.id === 'islands' && r.waypointsHit > 2),
        })),
        videoBlob: r.videoBlob,
        snapshots: r.snapshots,
      } as SurfaceFlybyResult & {
        checklist: Array<{ id: string; label: string; seen: boolean }>;
      };
    },
    stop: () => inner.stop(),
    dispose: () => inner.dispose(),
  };
}

export function downloadFlybyResult(
  sectorId: string,
  result: SurfaceFlybyResult & { checklist?: unknown },
): void {
  if (result.videoBlob) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(result.videoBlob);
    a.download = `${sectorId}-flyby.webm`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  result.snapshots.forEach((s, i) => {
    if (!s.dataUrl) return;
    const a = document.createElement('a');
    a.href = s.dataUrl;
    a.download = `${sectorId}-snap-${String(i).padStart(2, '0')}-${s.id}.png`;
    a.click();
  });
}
