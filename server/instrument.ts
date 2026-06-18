// Sentry server instrumentation — MUST be the first import in server/index.ts.
// Loads env, then initializes Sentry. No-ops safely when SENTRY_DSN is unset.
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();
import * as Sentry from "@sentry/node";

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "production",
    release: process.env.npm_package_version,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
  });
  console.log("[sentry] server error tracking enabled");
} else {
  console.log("[sentry] SENTRY_DSN not set — server error tracking disabled");
}
