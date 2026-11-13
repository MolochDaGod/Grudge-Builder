import jwt from "jsonwebtoken";
import { getJwtSecret } from "./requiredSecrets";

/**
 * Verify an island/world JWT with the same secret the API uses to sign
 * (getJwtSecret: first non-blank of SESSION_SECRET, JWT_SECRET, GRUDGE_JWT_SECRET).
 */
export function verifyIslandToken(token: string): string | jwt.JwtPayload {
  return jwt.verify(token, getJwtSecret(), { algorithms: ["HS256"] });
}
