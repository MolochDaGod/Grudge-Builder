import jwt from 'jsonwebtoken';
import { ServerError } from '@colyseus/core';
import { storage } from '../storage';

/** Matchmaking identity always comes from the verified session and owned roster. */
export async function authenticateGameJoin(token: string | undefined, options: Record<string, any>, characterRequired = true) {
  const secrets = [process.env.SESSION_SECRET, process.env.JWT_SECRET, process.env.GRUDGE_JWT_SECRET].map(s => s?.trim()).filter(Boolean) as string[];
  let claims: jwt.JwtPayload | undefined;
  for (const secret of secrets) {
    try { const value = jwt.verify(token || '', secret, { algorithms: ['HS256'] }); if (typeof value !== 'string') { claims = value; break; } } catch { /* try configured session key */ }
  }
  const userId = claims?.userId || claims?.sub || claims?.id || claims?.grudgeId;
  if (!userId) throw new ServerError(401, 'Sign in with Grudge ID to join multiplayer.');
  const account = await storage.getAccountByUserId(String(userId)) || (claims?.grudgeId ? await storage.getAccountByGrudgeId(claims.grudgeId) : undefined);
  if (!account) throw new ServerError(403, 'Open your account before joining multiplayer.');
  const roster = await storage.getCharactersForAuth(String(userId), 'warlords', claims?.grudgeId);
  const character = roster.find(c => c.id === options.characterId);
  if ((characterRequired || options.characterId) && !character) throw new ServerError(403, 'Select a Warlords character belonging to your account.');
  const join = character ? {
    characterId: character.id, characterName: character.name,
    heroRace: character.raceId, heroClass: character.classId, className: character.classId,
    level: character.level || 1, accountId: account.id,
  } : { accountId: account.id, characterName: account.displayName || claims?.username || 'Warlord' };
  return { accountId: account.id, characterId: character?.id || null, name: join.characterName, join };
}
