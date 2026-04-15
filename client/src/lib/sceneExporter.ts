/**
 * Scene Exporter — shared GLB export utility for all Grudge editors.
 *
 * Uses Three.js GLTFExporter with:
 *   - Binary GLB output (compact, single-file)
 *   - Grudge metadata extension (version, generator, seed, timestamp)
 *   - Upload to Grudge R2 CDN via /api/assets/upload
 *   - Local file download fallback
 *
 * Usage:
 *   import { exportSceneToFile, exportSceneToServer } from '@/lib/sceneExporter';
 *   await exportSceneToFile(scene, 'my-island.glb');
 *   await exportSceneToServer(scene, 'islands/island-abc123.glb');
 */

import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

// ── Grudge Metadata Extension ────────────────────────────────────────────────

interface GrudgeExportMetadata {
  /** Island seed or scene identifier */
  seed?: string;
  /** Character/player who exported */
  exportedBy?: string;
  /** Custom key-value pairs */
  extra?: Record<string, unknown>;
}

class GrudgeMetadataPlugin {
  private writer: any;
  private meta: GrudgeExportMetadata;

  constructor(writer: any, meta: GrudgeExportMetadata) {
    this.writer = writer;
    this.meta = meta;
  }

  afterParse() {
    this.writer.json.extras = {
      grudgeVersion: '3.1.0',
      generator: 'grudge-studio-editor',
      seed: this.meta.seed || null,
      exportedBy: this.meta.exportedBy || null,
      exportedAt: new Date().toISOString(),
      ...this.meta.extra,
    };
  }
}

// ── Export Options ────────────────────────────────────────────────────────────

export interface SceneExportOptions {
  /** Export as binary GLB (default: true) */
  binary?: boolean;
  /** Include these animation clips in the export */
  animations?: THREE.AnimationClip[];
  /** Only export visible objects (default: true) */
  onlyVisible?: boolean;
  /** Max texture resolution (default: 2048) */
  maxTextureSize?: number;
  /** Grudge metadata to embed in the GLB */
  metadata?: GrudgeExportMetadata;
}

const DEFAULT_OPTIONS: Required<Omit<SceneExportOptions, 'animations' | 'metadata'>> = {
  binary: true,
  onlyVisible: true,
  maxTextureSize: 2048,
};

// ── Core Export ──────────────────────────────────────────────────────────────

/**
 * Export a Three.js scene to GLB ArrayBuffer.
 * Embeds Grudge metadata if provided.
 */
export async function exportScene(
  scene: THREE.Scene | THREE.Object3D,
  options: SceneExportOptions = {},
): Promise<ArrayBuffer> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const exporter = new GLTFExporter();

  // Register Grudge metadata plugin
  if (opts.metadata) {
    const meta = opts.metadata;
    exporter.register((writer: any) => new GrudgeMetadataPlugin(writer, meta));
  }

  const result = await exporter.parseAsync(scene, {
    binary: opts.binary,
    onlyVisible: opts.onlyVisible,
    maxTextureSize: opts.maxTextureSize,
    animations: options.animations || [],
  });

  if (result instanceof ArrayBuffer) {
    return result;
  }

  // JSON mode fallback — convert to string
  const json = JSON.stringify(result, null, 2);
  return new TextEncoder().encode(json).buffer as ArrayBuffer;
}

// ── File Download ────────────────────────────────────────────────────────────

/**
 * Export a scene and trigger a browser download.
 */
export async function exportSceneToFile(
  scene: THREE.Scene | THREE.Object3D,
  filename: string = 'scene.glb',
  options: SceneExportOptions = {},
): Promise<void> {
  const buffer = await exportScene(scene, { ...options, binary: true });

  const blob = new Blob([buffer], { type: 'application/octet-stream' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

// ── Server Upload ────────────────────────────────────────────────────────────

/**
 * Export a scene and upload to Grudge backend (/api/assets/upload).
 * Returns the CDN URL of the uploaded asset.
 */
export async function exportSceneToServer(
  scene: THREE.Scene | THREE.Object3D,
  remotePath: string,
  options: SceneExportOptions = {},
): Promise<string> {
  const buffer = await exportScene(scene, { ...options, binary: true });

  const formData = new FormData();
  formData.append(
    'file',
    new Blob([buffer], { type: 'model/gltf-binary' }),
    remotePath.split('/').pop() || 'scene.glb',
  );
  formData.append('path', remotePath);

  const { authHeaders } = await import('@/lib/grudgeBackend');
  const res = await fetch('/api/assets/upload', {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`Asset upload failed: ${res.status} ${res.statusText}`);
  }

  const result = await res.json();
  return result.url || `https://assets.grudge-studio.com/${remotePath}`;
}

// ── Scene Info ───────────────────────────────────────────────────────────────

/**
 * Get stats about a scene before exporting (mesh count, triangle count, etc.)
 */
export function getSceneStats(scene: THREE.Object3D): {
  meshCount: number;
  triangleCount: number;
  materialCount: number;
  textureCount: number;
  animationClipCount: number;
} {
  let meshCount = 0;
  let triangleCount = 0;
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();

  scene.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      meshCount++;
      const geo = obj.geometry;
      if (geo.index) {
        triangleCount += geo.index.count / 3;
      } else if (geo.attributes.position) {
        triangleCount += geo.attributes.position.count / 3;
      }

      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((mat) => {
        if (mat) materials.add(mat);
        // Count textures
        if (mat && 'map' in mat && (mat as any).map) textures.add((mat as any).map);
        if (mat && 'normalMap' in mat && (mat as any).normalMap) textures.add((mat as any).normalMap);
      });
    }
  });

  return {
    meshCount,
    triangleCount: Math.floor(triangleCount),
    materialCount: materials.size,
    textureCount: textures.size,
    animationClipCount: 0, // caller should check mixer/clips separately
  };
}
