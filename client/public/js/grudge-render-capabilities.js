/**
 * grudge-render-capabilities.js — static-page / CDN probe for WebGL · WebGL2 · WebGPU
 *
 * Deploy:
 *   client/public/js/grudge-render-capabilities.js
 *   public/js/grudge-render-capabilities.js
 *   CDN: https://assets.grudge-studio.com/js/grudge-render-capabilities.js
 *
 * Usage:
 *   <script src="https://assets.grudge-studio.com/js/grudge-render-capabilities.js"></script>
 *   <script>
 *     GrudgeRender.detect().then(c => console.log(c));
 *   </script>
 *
 * Does NOT load three.js — pure browser API probe for gates / marketing / Puter shells.
 */
(function (global) {
  "use strict";

  function probeWebGL() {
    var out = {
      webgl: false,
      webgl2: false,
      maxTextureSize: 0,
      vendor: "",
      renderer: "",
    };
    try {
      var c = document.createElement("canvas");
      var gl2 = c.getContext("webgl2", { failIfMajorPerformanceCaveat: false });
      if (gl2) {
        out.webgl2 = true;
        out.webgl = true;
        out.maxTextureSize = gl2.getParameter(gl2.MAX_TEXTURE_SIZE) || 0;
        var dbg2 = gl2.getExtension("WEBGL_debug_renderer_info");
        if (dbg2) {
          out.vendor = String(gl2.getParameter(dbg2.UNMASKED_VENDOR_WEBGL) || "");
          out.renderer = String(gl2.getParameter(dbg2.UNMASKED_RENDERER_WEBGL) || "");
        }
        var lose2 = gl2.getExtension("WEBGL_lose_context");
        if (lose2) lose2.loseContext();
        return out;
      }
      var gl =
        c.getContext("webgl", { failIfMajorPerformanceCaveat: false }) ||
        c.getContext("experimental-webgl");
      if (gl) {
        out.webgl = true;
        out.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 0;
        var dbg = gl.getExtension("WEBGL_debug_renderer_info");
        if (dbg) {
          out.vendor = String(gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) || "");
          out.renderer = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || "");
        }
        var lose = gl.getExtension("WEBGL_lose_context");
        if (lose) lose.loseContext();
      }
    } catch (e) {
      /* blocked */
    }
    return out;
  }

  function probeWebGPU() {
    if (!navigator.gpu || typeof navigator.gpu.requestAdapter !== "function") {
      return Promise.resolve(false);
    }
    return navigator.gpu
      .requestAdapter()
      .then(function (a) {
        return !!a;
      })
      .catch(function () {
        return false;
      });
  }

  var cached = null;

  function detectSync() {
    var g = probeWebGL();
    return {
      webgl: g.webgl,
      webgl2: g.webgl2,
      webgpu: false,
      preferred: g.webgl2 ? "webgl2" : g.webgl ? "webgl" : "none",
      maxTextureSize: g.maxTextureSize,
      rendererVendor: g.vendor,
      rendererRenderer: g.renderer,
      threeVersion: null,
      threeCdn: {
        module: "https://assets.grudge-studio.com/js/vendor/three/0.185.1/three.module.min.js",
        webgpu: "https://assets.grudge-studio.com/js/vendor/three/0.185.1/three.webgpu.min.js",
        addons: "https://assets.grudge-studio.com/js/vendor/three/0.185.1/examples/",
        npm: "three@^0.185.1",
      },
    };
  }

  function detect() {
    if (cached) return Promise.resolve(cached);
    var base = detectSync();
    return probeWebGPU().then(function (webgpu) {
      cached = Object.assign({}, base, {
        webgpu: webgpu,
        preferred: webgpu ? "webgpu" : base.preferred,
      });
      global.__GRUDGE_RENDER_CAPS__ = cached;
      try {
        global.dispatchEvent(
          new CustomEvent("grudge:render:capabilities", { detail: cached }),
        );
      } catch (e) {
        /* IE */
      }
      return cached;
    });
  }

  /** Fail closed for 3D games: require at least WebGL */
  function canPlay3D(caps) {
    var c = caps || cached;
    if (!c) return false;
    return !!(c.webgl2 || c.webgl);
  }

  function formatLine(caps) {
    var c = caps || cached || detectSync();
    return (
      (c.webgl2 ? "WebGL2" : c.webgl ? "WebGL1" : "no-WebGL") +
      " · " +
      (c.webgpu ? "WebGPU" : "no-WebGPU")
    );
  }

  global.GrudgeRender = {
    detect: detect,
    detectSync: detectSync,
    canPlay3D: canPlay3D,
    formatLine: formatLine,
    VERSION: "1.0.0",
  };

  // Auto-probe on load (non-blocking)
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () {
        detect();
      });
    } else {
      detect();
    }
  }
})(typeof window !== "undefined" ? window : globalThis);
