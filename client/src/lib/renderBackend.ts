/**
 * Grudge render backend SSOT — WebGL / WebGL2 / WebGPU capability + factory.
 *
 * Fleet pin: three ^0.185 (includes three/webgpu + three/tsl).
 * Default play path: WebGLRenderer (uses WebGL2 when the browser provides it).
 * Optional WebGPU: ?webgpu=1 or opts.preferWebGPU (feature-detected; falls back).
 *
 * Static pages: also load /js/grudge-render-capabilities.js (CDN mirror).
 */
import * as THREE from "three";
import { assertUsableWebGL2 } from "./webglPreflight";

export type RenderApiKind = "webgpu" | "webgl2" | "webgl" | "none";

export interface RenderCapabilities {
  webgl: boolean;
  webgl2: boolean;
  webgpu: boolean;
  /** Best available for production play */
  preferred: RenderApiKind;
  maxTextureSize: number;
  rendererVendor: string;
  rendererRenderer: string;
  threeVersion: string;
}

export interface CreateRendererOpts {
  canvas?: HTMLCanvasElement;
  antialias?: boolean;
  alpha?: boolean;
  powerPreference?: WebGLPowerPreference;
  /** Prefer WebGPU when available (default: URL ?webgpu=1 only) */
  preferWebGPU?: boolean;
  /** Cap devicePixelRatio (default 1.5) */
  maxPixelRatio?: number;
  failIfMajorPerformanceCaveat?: boolean;
}

export interface PlayRendererHandle {
  /** Always present for current fleet play path */
  renderer: THREE.WebGLRenderer;
  /** Non-null when WebGPU path succeeded */
  webgpuRenderer: unknown | null;
  api: RenderApiKind;
  capabilities: RenderCapabilities;
  setSize: (w: number, h: number) => void;
  dispose: () => void;
}

let cachedCaps: RenderCapabilities | null = null;

function probeWebGL(): {
  webgl: boolean;
  webgl2: boolean;
  maxTextureSize: number;
  vendor: string;
  renderer: string;
} {
  const out = {
    webgl: false,
    webgl2: false,
    maxTextureSize: 0,
    vendor: "",
    renderer: "",
  };
  if (typeof document === "undefined") return out;
  try {
    const c = document.createElement("canvas");
    const gl2 = c.getContext("webgl2", { failIfMajorPerformanceCaveat: false });
    if (gl2) {
      out.webgl2 = true;
      out.webgl = true;
      out.maxTextureSize = gl2.getParameter(gl2.MAX_TEXTURE_SIZE) || 0;
      const dbg = gl2.getExtension("WEBGL_debug_renderer_info");
      if (dbg) {
        out.vendor = String(gl2.getParameter(dbg.UNMASKED_VENDOR_WEBGL) || "");
        out.renderer = String(gl2.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || "");
      }
      const lose = gl2.getExtension("WEBGL_lose_context");
      lose?.loseContext();
      return out;
    }
    const gl =
      c.getContext("webgl", { failIfMajorPerformanceCaveat: false }) ||
      (c.getContext("experimental-webgl") as WebGLRenderingContext | null);
    if (gl) {
      out.webgl = true;
      out.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 0;
      const dbg = gl.getExtension("WEBGL_debug_renderer_info");
      if (dbg) {
        out.vendor = String(gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) || "");
        out.renderer = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || "");
      }
      const lose = gl.getExtension("WEBGL_lose_context");
      lose?.loseContext();
    }
  } catch {
    /* private / blocked */
  }
  return out;
}

async function probeWebGPU(): Promise<boolean> {
  if (typeof navigator === "undefined") return false;
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter?: () => Promise<unknown> } })
    .gpu;
  if (!gpu?.requestAdapter) return false;
  try {
    const adapter = await gpu.requestAdapter();
    return !!adapter;
  } catch {
    return false;
  }
}

/** Sync snapshot (WebGPU may still be unknown until detectRenderCapabilities async). */
export function getRenderCapabilitiesSync(): RenderCapabilities {
  if (cachedCaps) return cachedCaps;
  const g = probeWebGL();
  const preferred: RenderApiKind = g.webgl2 ? "webgl2" : "none";
  cachedCaps = {
    webgl: g.webgl,
    webgl2: g.webgl2,
    webgpu: false,
    preferred,
    maxTextureSize: g.maxTextureSize,
    rendererVendor: g.vendor,
    rendererRenderer: g.renderer,
    threeVersion: THREE.REVISION || "?",
  };
  return cachedCaps;
}

/** Full detect including WebGPU adapter. */
export async function detectRenderCapabilities(): Promise<RenderCapabilities> {
  const base = getRenderCapabilitiesSync();
  const webgpu = await probeWebGPU();
  cachedCaps = {
    ...base,
    webgpu,
    preferred: webgpu ? "webgpu" : base.preferred,
  };
  if (typeof window !== "undefined") {
    (window as unknown as { __GRUDGE_RENDER_CAPS__?: RenderCapabilities }).__GRUDGE_RENDER_CAPS__ =
      cachedCaps;
  }
  return cachedCaps;
}

function wantWebGPU(opts?: CreateRendererOpts): boolean {
  if (opts?.preferWebGPU) return true;
  if (typeof window === "undefined") return false;
  try {
    const q = new URLSearchParams(window.location.search);
    return q.get("webgpu") === "1" || q.get("webgpu") === "true";
  } catch {
    return false;
  }
}

/**
 * Create production WebGL renderer (WebGL2 when browser supports it).
 * Three.js WebGLRenderer automatically selects WebGL2 context when available.
 */
export function createWebGLPlayRenderer(
  opts: CreateRendererOpts = {},
): THREE.WebGLRenderer {
  const common = {
    canvas: opts.canvas,
    antialias: opts.antialias !== false,
    alpha: !!opts.alpha,
    powerPreference: opts.powerPreference ?? ("high-performance" as const),
    stencil: false,
    preserveDrawingBuffer: false,
    failIfMajorPerformanceCaveat: opts.failIfMajorPerformanceCaveat ?? false,
  };
  const canvas = opts.canvas ?? document.createElement("canvas");
  let gl: WebGL2RenderingContext | null = null;
  try {
    gl = canvas.getContext("webgl2", common) as WebGL2RenderingContext | null;
    if (!gl) gl = canvas.getContext("webgl2", { ...common, antialias: false, powerPreference: "default" }) as WebGL2RenderingContext | null;
    assertUsableWebGL2(gl);
  } catch (error) {
    throw new Error("WebGL2 is unavailable on this canvas. Enable hardware acceleration and retry.");
  }
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ ...common, canvas, context: gl! });
  } catch (error) {
    throw new Error("The graphics context failed during initialization. Retry with a fresh canvas.");
  }
  const maxPr = opts.maxPixelRatio ?? 1.5;
  if (typeof window !== "undefined") {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxPr));
  }
  // Avoid 0×0 buffers (EffectComposer / SMAA precision crash)
  const w = Math.max(1, opts.canvas?.clientWidth || 1);
  const h = Math.max(1, opts.canvas?.clientHeight || 1);
  if (w > 1 && h > 1) {
    renderer.setSize(w, h, false);
  }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  return renderer;
}

/**
 * Optional WebGPU renderer (three/webgpu). Returns null if unavailable.
 * Callers must keep a WebGL fallback for postprocessing / Rapier debug paths.
 */
export async function tryCreateWebGPURenderer(
  opts: CreateRendererOpts = {},
): Promise<unknown | null> {
  const caps = await detectRenderCapabilities();
  if (!caps.webgpu) return null;
  try {
    const { WebGPURenderer } = await import("three/webgpu");
    if (!WebGPURenderer) return null;
    const r = new WebGPURenderer({
      canvas: opts.canvas,
      antialias: opts.antialias !== false,
      alpha: !!opts.alpha,
      powerPreference: opts.powerPreference ?? "high-performance",
    });
    await r.init();
    return r;
  } catch (e) {
    console.warn("[renderBackend] WebGPU init failed — using WebGL2/WebGL", e);
    return null;
  }
}

/**
 * Fleet default: always returns a WebGLRenderer (WebGL2 when possible).
 * Optionally attaches webgpuRenderer when ?webgpu=1 and adapter exists.
 */
export async function createPlayRenderer(
  opts: CreateRendererOpts = {},
): Promise<PlayRendererHandle> {
  const caps = await detectRenderCapabilities();
  const gl = createWebGLPlayRenderer(opts);
  let webgpuRenderer: unknown | null = null;
  let api: RenderApiKind = caps.webgl2 ? "webgl2" : caps.webgl ? "webgl" : "none";

  if (wantWebGPU(opts) && caps.webgpu && !opts.canvas) {
    // A canvas cannot own both WebGL and WebGPU contexts.
    webgpuRenderer = await tryCreateWebGPURenderer({ ...opts, canvas: document.createElement('canvas') });
    if (webgpuRenderer) api = "webgpu";
  }

  return {
    renderer: gl,
    webgpuRenderer,
    api,
    capabilities: caps,
    setSize(w, h) {
      gl.setSize(w, h, false);
      const wg = webgpuRenderer as { setSize?: (a: number, b: number) => void } | null;
      wg?.setSize?.(w, h);
    },
    dispose() {
      gl.dispose();
      const wg = webgpuRenderer as { dispose?: () => void } | null;
      wg?.dispose?.();
    },
  };
}

/** Attach capability badge for debug HUD */
export function formatRenderCapsLine(caps?: RenderCapabilities | null): string {
  const c = caps || getRenderCapabilitiesSync();
  const parts = [
    c.webgl2 ? "WebGL2" : c.webgl ? "WebGL1" : "no-WebGL",
    c.webgpu ? "WebGPU" : "no-WebGPU",
    `three r${c.threeVersion}`,
  ];
  return parts.join(" · ");
}
