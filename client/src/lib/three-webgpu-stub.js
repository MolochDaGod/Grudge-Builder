/**
 * Legacy path — three@0.185+ ships real three/webgpu.
 * Keep this file as a thin re-export so any stale import still resolves.
 * Prefer: import { WebGPURenderer } from 'three/webgpu'
 */
export * from 'three/webgpu';
