// Expose THREE as a browser global BEFORE any Phaser/enable3d imports run.
// @enable3d/phaser-extension and stage-js expect window.THREE to exist.
// ES module namespace objects are non-extensible — three-stdlib / legacy code that
// does `THREE.ColladaLoader = …` throws "object is not extensible". Clone onto a
// plain mutable object for the global only (app imports stay on the real module).
import * as THREE_NS from "three";
const THREE_GLOBAL: Record<string, unknown> = Object.create(null);
for (const key of Object.keys(THREE_NS)) {
  THREE_GLOBAL[key] = (THREE_NS as Record<string, unknown>)[key];
}
(window as any).THREE = THREE_GLOBAL;

import * as Sentry from "@sentry/react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { hydratePortalUniverse } from "./lib/portalUniverse";

// Sentry — activates only when VITE_SENTRY_DSN is set (Vercel/Pages env).
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.1,
  });
}

// Hydrate portal universe (characters / islands / play settings) from Engine
hydratePortalUniverse().catch((err) => {
  console.warn("[portal-universe] hydrate skipped:", err);
});

createRoot(document.getElementById("root")!).render(
  <Sentry.ErrorBoundary fallback={<div style={{ padding: 24, fontFamily: "system-ui" }}>Something went wrong — the error was reported.</div>}>
    <App />
  </Sentry.ErrorBoundary>,
);
