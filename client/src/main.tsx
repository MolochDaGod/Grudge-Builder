// Expose THREE as a browser global BEFORE any Phaser/enable3d imports run.
// @enable3d/phaser-extension and stage-js expect window.THREE to exist.
import * as THREE from "three";
(window as any).THREE = THREE;

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
