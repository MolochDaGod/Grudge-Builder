/**
 * Fail-closed session and JWT secret helpers.
 *
 * Never returns a built-in default secret. Placeholder values in .env.example
 * are for local env files only and are not compiled into this module.
 */
import dotenv from "dotenv";
import {
  readEnvSecret,
  getJwtSecret,
  JWT_SECRET_CANDIDATE_ENVS,
} from "./jwtSecret";

// Load local files first so module-level readers see them. Does not override
// variables already present in the process environment.
dotenv.config({ path: ".env.local" });
dotenv.config();

// Pure getters live in jwtSecret.ts (no dotenv, no process.exit) so
// request-time auth can import them without boot side effects. Re-export
// so existing callers (`import { getJwtSecret, readEnvSecret } from
// "./lib/requiredSecrets"`) keep the same behaviour after dotenv loads.
export { readEnvSecret, getJwtSecret, JWT_SECRET_CANDIDATE_ENVS };

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
