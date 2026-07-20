/**
 * GameTrailer — multi-surface trailer package for Grudge Warlords.
 *
 * Workflow:
 *  1. Visit each surface with ?flyby=1 (or run TrailerHUD "Record segment")
 *  2. Segments accumulate in sessionStorage + memory
 *  3. Download full package: cut list JSON + all WebMs + PNGs
 *  4. Import into CapCut / Premiere / Resolve → game trailer
 *
 * Full cut order: tutorial → world map → haven → home → lobby → remaining 8 sectors
 * (see trailerShotCatalog.allTrailerSurfaces).
 */
import {
  allTrailerSurfaces,
  buildTrailerCutList,
  getTrailerSurface,
  TRAILER_CATALOG_VERSION,
  type TrailerCutListEntry,
} from '@shared/definitions/trailerShotCatalog';
import type { SurfaceFlybyResult } from './SurfaceFlyby';
import type { Island3DEngine } from '../engine/Island3DEngine';
import { createSurfaceFlyby } from './SurfaceFlyby';

const STORAGE_KEY = 'grudge_trailer_segments_v1';

export interface TrailerSegmentRecord {
  surfaceId: string;
  title: string;
  recordedAt: string;
  durationSec: number;
  waypointsHit: number;
  snapshotCount: number;
  /** data URLs — may be large; optional strip on save */
  snapshots: SurfaceFlybyResult['snapshots'];
  /** base64 webm if small enough, else omitted (download at record time) */
  hasVideo: boolean;
}

export interface TrailerPackageManifest {
  version: string;
  createdAt: string;
  catalogVersion: string;
  cutList: TrailerCutListEntry[];
  segments: Array<{
    surfaceId: string;
    title: string;
    recordedAt: string;
    durationSec: number;
    waypointsHit: number;
    snapshotCount: number;
    hasVideo: boolean;
    videoFile: string;
  }>;
  missing: string[];
  notes: string[];
}

function loadStored(): TrailerSegmentRecord[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as TrailerSegmentRecord[];
  } catch {
    return [];
  }
}

function saveStored(segments: TrailerSegmentRecord[]): void {
  try {
    // Strip huge dataUrls for sessionStorage — keep metadata only if over ~2MB
    const slim = segments.map((s) => ({
      ...s,
      snapshots: s.snapshots.map((snap) => ({
        id: snap.id,
        label: snap.label,
        dataUrl: snap.dataUrl.length > 200_000 ? '' : snap.dataUrl,
        titleCard: snap.titleCard,
      })),
    }));
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
  } catch {
    /* quota */
  }
}

export class GameTrailerSession {
  private segments: TrailerSegmentRecord[] = loadStored();
  /** Full results with blobs kept in memory for this page session */
  private live = new Map<string, SurfaceFlybyResult>();

  listSegments(): TrailerSegmentRecord[] {
    return [...this.segments];
  }

  getLive(surfaceId: string): SurfaceFlybyResult | undefined {
    return this.live.get(surfaceId);
  }

  clear(): void {
    this.segments = [];
    this.live.clear();
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* */
    }
  }

  /** Record current engine surface into the trailer package. */
  async recordSurface(
    engine: Island3DEngine,
    opts?: { surfaceId?: string; record?: boolean },
  ): Promise<SurfaceFlybyResult> {
    const flyby = createSurfaceFlyby(engine);
    const result = await flyby.start({
      record: opts?.record !== false,
      snapshotEachWp: true,
      surfaceId: opts?.surfaceId,
    });
    flyby.dispose();

    this.live.set(result.surfaceId, result);
    const rec: TrailerSegmentRecord = {
      surfaceId: result.surfaceId,
      title: result.title,
      recordedAt: new Date().toISOString(),
      durationSec: result.durationSec,
      waypointsHit: result.waypointsHit,
      snapshotCount: result.snapshots.length,
      snapshots: result.snapshots,
      hasVideo: !!result.videoBlob,
    };
    this.segments = [
      ...this.segments.filter((s) => s.surfaceId !== result.surfaceId),
      rec,
    ];
    saveStored(this.segments);

    // Auto-download this segment's video immediately (browsers can't keep huge blobs well)
    if (result.videoBlob) {
      downloadBlob(result.videoBlob, `${result.surfaceId}-flyby.webm`);
    }
    result.snapshots.forEach((s, i) => {
      if (!s.dataUrl) return;
      downloadDataUrl(
        s.dataUrl,
        `${result.surfaceId}-snap-${String(i).padStart(2, '0')}-${s.id}.png`,
      );
    });

    return result;
  }

  /** Surfaces in trailer order not yet recorded. */
  missingSurfaces(): string[] {
    const have = new Set(this.segments.map((s) => s.surfaceId));
    return allTrailerSurfaces()
      .map((s) => s.id)
      .filter((id) => !have.has(id));
  }

  buildManifest(): TrailerPackageManifest {
    const cutList = buildTrailerCutList();
    const have = new Set(this.segments.map((s) => s.surfaceId));
    return {
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      catalogVersion: TRAILER_CATALOG_VERSION,
      cutList,
      segments: this.segments
        .slice()
        .sort((a, b) => {
          const oa = getTrailerSurface(a.surfaceId)?.trailerOrder ?? 99;
          const ob = getTrailerSurface(b.surfaceId)?.trailerOrder ?? 99;
          return oa - ob;
        })
        .map((s) => ({
          surfaceId: s.surfaceId,
          title: s.title,
          recordedAt: s.recordedAt,
          durationSec: s.durationSec,
          waypointsHit: s.waypointsHit,
          snapshotCount: s.snapshotCount,
          hasVideo: s.hasVideo,
          videoFile: `${s.surfaceId}-flyby.webm`,
        })),
      missing: this.missingSurfaces(),
      notes: [
        'Import WebM segments in cutList order into your NLE.',
        'Title cards are burned into end/establish snaps when present.',
        'Play each surface with ?flyby=1 or use Trailer HUD Record segment.',
        'Canonical world seed: grudge-world-1',
      ],
    };
  }

  /** Download cut-list manifest JSON for the trailer editor. */
  downloadManifest(): void {
    const manifest = this.buildManifest();
    const blob = new Blob([JSON.stringify(manifest, null, 2)], {
      type: 'application/json',
    });
    downloadBlob(blob, `grudge-warlords-trailer-cutlist-${Date.now()}.json`);
  }

  /** Re-download all in-memory snaps + videos for a surface. */
  downloadSegment(surfaceId: string): void {
    const live = this.live.get(surfaceId);
    if (live) {
      if (live.videoBlob) downloadBlob(live.videoBlob, `${surfaceId}-flyby.webm`);
      live.snapshots.forEach((s, i) => {
        if (s.dataUrl) {
          downloadDataUrl(
            s.dataUrl,
            `${surfaceId}-snap-${String(i).padStart(2, '0')}-${s.id}.png`,
          );
        }
      });
      return;
    }
    const rec = this.segments.find((s) => s.surfaceId === surfaceId);
    if (!rec) return;
    rec.snapshots.forEach((s, i) => {
      if (s.dataUrl) {
        downloadDataUrl(
          s.dataUrl,
          `${surfaceId}-snap-${String(i).padStart(2, '0')}-${s.id}.png`,
        );
      }
    });
  }
}

// Singleton for HUD
let _session: GameTrailerSession | null = null;
export function getGameTrailerSession(): GameTrailerSession {
  if (!_session) _session = new GameTrailerSession();
  return _session;
}

function downloadBlob(blob: Blob, name: string): void {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

function downloadDataUrl(dataUrl: string, name: string): void {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = name;
  a.click();
}

/** Open play URL for a surface (same origin). */
export function openSurfaceForTrailer(surfaceId: string): void {
  const s = getTrailerSurface(surfaceId);
  if (!s) return;
  const q = s.playQuery;
  if (q.startsWith('path=')) {
    const path = q.replace('path=', '').split('&')[0];
    window.location.href = `${path}${path.includes('?') ? '&' : '?'}flyby=1`;
    return;
  }
  // Default zone play route
  const base = '/play';
  window.location.href = `${base}?${q}`;
}
