/**
 * Prove a Spawn account by calling Spawn with the caller's own token.
 * The token is never stored and never written to logs.
 */
export type SpawnAccount = {
  userId: string;
  username: string;
  handle: string;
  name: string;
};

export class SpawnTokenError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const SPAWN_USER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SPAWN_USERNAME = /^[A-Za-z0-9_]{2,32}$/;

export async function verifySpawnToken(token: string): Promise<SpawnAccount> {
  const bearer = String(token || "").trim();
  if (bearer.length < 20 || bearer.length > 500 || /[\r\n]/.test(bearer)) {
    throw new SpawnTokenError(401, "Spawn token was rejected");
  }

  let response: Response;
  try {
    response = await fetch("https://www.spawn.co/api/agent/v1/me", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${bearer}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(12000),
    });
  } catch {
    throw new SpawnTokenError(502, "Spawn did not answer");
  }

  if (response.status === 401 || response.status === 403) {
    throw new SpawnTokenError(401, "Spawn token was rejected");
  }
  if (!response.ok) {
    throw new SpawnTokenError(502, "Spawn did not answer");
  }

  let body: Record<string, unknown>;
  try {
    body = (await response.json()) as Record<string, unknown>;
  } catch {
    throw new SpawnTokenError(502, "Spawn did not answer");
  }

  const userId = String(body.userId || "").trim();
  const username = String(body.username || "").trim();
  const name = String(body.name || username).trim();
  const handle = String(body.handle || (username ? `@@${username}` : "")).trim();
  if (!SPAWN_USER_ID.test(userId) || !SPAWN_USERNAME.test(username)) {
    throw new SpawnTokenError(401, "Spawn account was not a player account");
  }

  return { userId, username, handle, name };
}
