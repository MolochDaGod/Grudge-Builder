/**
 * Stub for three/webgpu and three/tsl.
 *
 * three@0.160 doesn't have these modules. Transitive dependencies
 * (three-render-objects via react-force-graph) import WebGPURenderer
 * from 'three/webgpu' but never actually USE it at runtime — they
 * feature-detect and fall back to WebGLRenderer.
 *
 * This stub satisfies the import at build time so Rollup doesn't crash.
 */
export class WebGPURenderer {
  constructor() {
    throw new Error('WebGPURenderer stub — three/webgpu not available in three@0.160');
  }
}

// Re-export everything from three so other named imports still work
export * from 'three';
