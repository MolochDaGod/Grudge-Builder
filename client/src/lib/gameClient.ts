import { Client } from '@colyseus/sdk';
import { getToken } from './grudgeBackend';
import { getColyseusEndpoint } from './colyseusEndpoint';

/** One SDK and one canonical session for every multiplayer entry point. */
export function createGameClient(endpoint = getColyseusEndpoint()): Client {
  const client = new Client(endpoint);
  client.auth.token = getToken() ?? '';
  return client;
}
