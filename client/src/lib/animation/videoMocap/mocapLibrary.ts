/**
 * Local library of saved video mocap clips — save / list / load / export.
 * Storage: localStorage + optional download of bake JSON.
 */
import type { ReconstructedMotion, MotionDeployManifest } from "@shared/animation/mocap";
import { motionToTrackDump } from "@shared/animation/mocap";

const STORAGE_KEY = "grudge_video_mocap_library_v1";

export type SavedMocapClip = {
  id: string;
  name: string;
  createdAt: string;
  durationSec: number;
  sampleFps?: number;
  sourceFileName?: string;
  mirror?: boolean;
  motion: ReconstructedMotion;
  manifest?: MotionDeployManifest;
  tags?: string[];
};

function readAll(): SavedMocapClip[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeAll(clips: SavedMocapClip[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clips));
}

export function listSavedMocap(): SavedMocapClip[] {
  return readAll().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function getSavedMocap(id: string): SavedMocapClip | null {
  return readAll().find((c) => c.id === id) || null;
}

export function saveMocapClip(
  motion: ReconstructedMotion,
  opts?: {
    name?: string;
    sourceFileName?: string;
    sampleFps?: number;
    mirror?: boolean;
    manifest?: MotionDeployManifest;
    tags?: string[];
  },
): SavedMocapClip {
  const clips = readAll();
  const entry: SavedMocapClip = {
    id: motion.id,
    name: opts?.name || motion.name || motion.id,
    createdAt: new Date().toISOString(),
    durationSec: motion.durationSec,
    sampleFps: opts?.sampleFps,
    sourceFileName: opts?.sourceFileName,
    mirror: opts?.mirror,
    motion,
    manifest: opts?.manifest,
    tags: opts?.tags || ["video-mocap"],
  };
  const idx = clips.findIndex((c) => c.id === entry.id);
  if (idx >= 0) clips[idx] = entry;
  else clips.unshift(entry);
  // cap library size
  writeAll(clips.slice(0, 40));
  // Cross-app handoff for island/warlords consumers
  try {
    // dynamic import avoided — write handoff key directly
    localStorage.setItem(
      "grudge_mocap_handoff_v1",
      JSON.stringify({
        v: 1,
        at: entry.createdAt,
        motion,
        sourceHost: typeof location !== "undefined" ? location.host : undefined,
        intent: "library",
      }),
    );
  } catch {
    /* */
  }
  return entry;
}

export function deleteSavedMocap(id: string): void {
  writeAll(readAll().filter((c) => c.id !== id));
}

export function exportMocapBakeJson(motion: ReconstructedMotion): string {
  const dump = motionToTrackDump(motion);
  return JSON.stringify(
    {
      name: motion.id,
      duration: dump.duration,
      skeleton: motion.skeleton,
      rootMotion: motion.rootMotion,
      tracks: dump.tracks.map((t) => ({
        type: "quaternion",
        name: t.name,
        times: t.times,
        values: t.values,
      })),
      meta: {
        source: motion.source,
        confidence: motion.confidence,
        pipeline: "video-mocap-v1",
        validation: motion.validation,
      },
    },
    null,
    2,
  );
}

export function downloadMocapJson(motion: ReconstructedMotion, fileName?: string) {
  const json = exportMocapBakeJson(motion);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName || `${motion.id}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Full library export (all clips) */
export function downloadMocapLibrary() {
  const blob = new Blob([JSON.stringify(listSavedMocap(), null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `grudge-mocap-library-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
