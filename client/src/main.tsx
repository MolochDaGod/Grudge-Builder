import { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

// App (and its island3d/Rapier manualChunks) must not be a static dep of the
// entry. Vite was still emitting `import "./rapier-vendor"` from index.js.
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

const sentryDsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;

function Boot() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: "100vh", background: "#0b0d12" }} />
      }
    >
      <App />
    </Suspense>
  );
}

const root = document.getElementById("root")!;

if (sentryDsn) {
  void import("@sentry/react").then((Sentry) => {
    Sentry.init({
      dsn: sentryDsn,
      environment: import.meta.env.MODE,
      integrations: [Sentry.browserTracingIntegration()],
      tracesSampleRate: 0.1,
    });
    createRoot(root).render(
      <Sentry.ErrorBoundary
        fallback={
          <div style={{ padding: 24, fontFamily: "system-ui" }}>
            Something went wrong — the error was reported.
          </div>
        }
      >
        <Boot />
      </Sentry.ErrorBoundary>,
    );
  });
} else {
  createRoot(root).render(<Boot />);
}
