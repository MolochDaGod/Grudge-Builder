/**
 * Fail-closed session and JWT secret helpers.
 *
 * Never returns a built-in default secret. Placeholder values in .env.example
 * are for local env files only and are not compiled into this module.
 */
import dotenv from "dotenv";

// Load local files first so module-level readers see them. Does not override
// variables already present in the process environment.
dotenv.config({ path: ".env.local" });
dotenv.config();

/** Trimmed env value; missing or whitespace-only becomes "". Never logs the value. */
export function readEnvSecret(name: string): string {
  const raw = process.env[name];
  return typeof raw === "string" ? raw.trim() : "";
}

/**
 * In every environment, exit if SESSION_SECRET or JWT_SECRET is missing or
 * whitespace-only after trim. Both must be set. Names the missing variable(s);
 * never prints secret values.
 */
export function requireSessionAndJwtSecrets(): void {
  const missing: string[] = [];
  if (!readEnvSecret("SESSION_SECRET")) missing.push("SESSION_SECRET");
  if (!readEnvSecret("JWT_SECRET")) missing.push("JWT_SECRET");
  if (missing.length === 0) return;
  const named = missing.join(" and ");
  const verb = missing.length === 1 ? "is" : "are";
  console.error(
    `[boot] Refusing to start: ${named} ${verb} missing or whitespace-only. Set ${named} in the environment (see .env.example). There is no default secret.`,
  );
  process.exit(1);
}

/**
 * Signing secret: first non-empty trimmed candidate among SESSION_SECRET,
 * JWT_SECRET, and GRUDGE_JWT_SECRET. Throws if none are set — no fallback.
 */
export function getJwtSecret(): string {
  const secret =
    readEnvSecret("SESSION_SECRET") ||
    readEnvSecret("JWT_SECRET") ||
    readEnvSecret("GRUDGE_JWT_SECRET");
  if (!secret) {
    throw new Error(
      "SESSION_SECRET or JWT_SECRET is missing or whitespace-only. Refusing to use a default secret.",
    );
  }
  return secret;
}
