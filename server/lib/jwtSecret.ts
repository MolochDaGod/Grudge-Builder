/**
 * Pure JWT / session secret readers.
 *
 * No dotenv and no process.exit — safe to import from request-time
 * middleware and unit tests. `server/lib/requiredSecrets.ts` re-exports
 * these helpers after it loads dotenv at boot, so existing boot callers
 * keep the same behaviour.
 *
 * Never returns a built-in default secret. Placeholder values in
 * .env.example are for local env files only and are not compiled here.
 */

/** Trimmed env value; missing or whitespace-only becomes "". Never logs the value. */
export function readEnvSecret(name: string): string {
  const raw = process.env[name];
  return typeof raw === "string" ? raw.trim() : "";
}

/**
 * Candidate env names, in getJwtSecret / verify order: SESSION_SECRET,
 * JWT_SECRET, then GRUDGE_JWT_SECRET.
 */
export const JWT_SECRET_CANDIDATE_ENVS = [
  "SESSION_SECRET",
  "JWT_SECRET",
  "GRUDGE_JWT_SECRET",
] as const;

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
