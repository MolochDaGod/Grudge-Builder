import { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";

const App = lazy(() => import("./App"));

void import("./lib/portalUniverse").then((m) => {
  m.hydratePortalUniverse().catch((err: unknown) => {
    console.warn("[portal-universe] hydrate skipped:", err);
  });
});

void import("three").then((THREE_NS) => {
  const THREE_GLOBAL: Record<string, unknown> = Object.create(null);
  for (const key of Object.keys(THREE_NS)) {
    THREE_GLOBAL[key] = (THREE_NS as Record<string, unknown>)[key];
  }
  (window as any).THREE = THREE_GLOBAL;
});

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.1,
  });
}

const root = document.getElementById("root")!;

createRoot(root).render(
  <Sentry.ErrorBoundary
    fallback={
      <div style={{ padding: 24, fontFamily: "system-ui" }}>
        Something went wrong — the error was reported.
      </div>
    }
  >
    <Suspense
      fallback={<div style={{ minHeight: "100vh", background: "#0b0d12" }} />}
    >
      <App />
    </Suspense>
  </Sentry.ErrorBoundary>,
);
