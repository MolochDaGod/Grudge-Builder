# Render backend SSOT — WebGL · WebGL2 · WebGPU

**Fleet pin:** `three@^0.185.1` (includes `three/webgpu` + `three/tsl`).

## What every 3D game needs

| API | Role | Package / URL |
|-----|------|----------------|
| **WebGL2** | Default play path (Three `WebGLRenderer`) | `three` |
| **WebGL1** | Fallback if WebGL2 missing | same |
| **WebGPU** | Optional experimental (`?webgpu=1`) | `three/webgpu` |

Do **not** stub `three/webgpu` on three ≥ r167. Stubs from the 0.160 era are retired.

## Code

| Surface | Path |
|---------|------|
| TS factory + detect | `client/src/lib/renderBackend.ts` |
| Island3D | uses `createWebGLPlayRenderer()` |
| Static pages / Puter | `js/grudge-render-capabilities.js` |
| Vendor builds (static) | `js/vendor/three/0.185.1/*` |

## CDN (deployed)

```
https://assets.grudge-studio.com/js/grudge-render-capabilities.js
https://assets.grudge-studio.com/js/vendor/three/0.185.1/three.module.min.js
https://assets.grudge-studio.com/js/vendor/three/0.185.1/three.webgpu.min.js
https://assets.grudge-studio.com/js/vendor/three/0.185.1/three.core.min.js
```

Same-origin (Warlords / client): `/js/grudge-render-capabilities.js`

## Drop-in for any page

```html
<script src="https://assets.grudge-studio.com/js/grudge-render-capabilities.js"></script>
<script>
  GrudgeRender.detect().then((c) => {
    if (!GrudgeRender.canPlay3D(c)) {
      document.body.innerHTML = '<p>WebGL required for this game.</p>';
      return;
    }
    console.log(GrudgeRender.formatLine(c));
  });
</script>
```

## npm (imperative 3D game)

```json
{
  "dependencies": {
    "three": "^0.185.1",
    "@types/three": "^0.185.1",
    "@dimforge/rapier3d-compat": "^0.19.3"
  }
}
```

Vite: `optimizeDeps.include: ["three", "three/webgpu", "three/tsl"]` — no alias stub.

## Games / pages coverage

| Surface | Backend |
|---------|---------|
| Island3D / play / home-island | WebGL2 via `renderBackend` |
| WarScene, airship, tower-wars | WebGLRenderer (WebGL2 auto) |
| Puter crafting / static HTML | capabilities probe + optional CDN three |
| ui.grudge-studio.com | 2D main panel; probe optional |
| Forge / R3F satellites | own three ^0.185 + r3f |

## Verify

```js
// Console on any play page
await import('/src/lib/renderBackend.ts') // dev only
// or
GrudgeRender.detect().then(console.log)
```

Canvas `data-render-api` on Island3D: `webgl2` | `webgl` | `none`.
