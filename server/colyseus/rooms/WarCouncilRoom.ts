import { Room, ServerError, CloseCode, type Client } from '@colyseus/core';
import { WARLORDS_ERA_SECTOR_IDS } from '../../../shared/definitions/mapRegistry';

export type CouncilIdentity = { accountId: string; characterId: string | null; name: string };
export type CouncilAuthenticator = (token: string | undefined, options: Record<string, any>) => Promise<CouncilIdentity>;
type Member = CouncilIdentity & { sessionId: string; ready: boolean; connected: boolean };

/** A social channel or a custom sector staging room; no client owns game authority. */
export function createWarCouncilRoom(authenticate: CouncilAuthenticator) {
  return class WarCouncilRoom extends Room {
    private members = new Map<string, Member>();
    private lastChat = new Map<string, number>();
    private history: Array<{ id: string; name: string; text: string; at: number }> = [];
    private host = '';
    private custom = false;
    private phase: 'waiting' | 'started' = 'waiting';
    private title = 'Warlords General';
    private sectorId = 'haven_shore';
    private launchPath = '';
    private publish() {
      this.broadcast('lobby', {
        roomId: this.roomId, title: this.title, custom: this.custom,
        sectorId: this.sectorId, host: this.host, phase: this.phase,
        maxClients: this.maxClients, members: [...this.members.values()],
      });
    }
    async onAuth(_client: Client, options: any, context: any) {
      const identity = await authenticate(context?.token, options);
      if (this.custom && !identity.characterId) throw new ServerError(403, 'Select a character to join a game.');
      if ([...this.members.values()].some(m => m.accountId === identity.accountId)) throw new ServerError(409, 'This account is already in the lobby.');
      return identity;
    }
    async onCreate(options: any) {
      this.custom = options.custom === true;
      if (this.custom) {
        if (!(WARLORDS_ERA_SECTOR_IDS as readonly string[]).includes(options.sectorId)) throw new ServerError(400, 'Choose a published Warlords sector.');
        this.sectorId = options.sectorId;
        this.title = String(options.title || '').trim().slice(0, 60);
        if (!this.title) throw new ServerError(400, 'Give your game a name.');
        this.maxClients = Math.max(2, Math.min(24, Math.floor(Number(options.capacity) || 8)));
      } else this.maxClients = 50;
      await this.setPrivate(options.private === true);
      await this.setMetadata({ kind: this.custom ? 'custom' : 'channel', title: this.title, sectorId: this.sectorId, phase: this.phase, revision: 'council-1' });
      this.onMessage('sync', client => {
        this.publish();
        client.send('history', this.history);
      });
      this.onMessage('chat', (client, value: unknown) => {
        const member = this.members.get(client.sessionId);
        const now = Date.now();
        if (!member || typeof value !== 'string' || now - (this.lastChat.get(client.sessionId) || 0) < 750) return;
        const text = value.trim().slice(0, 500);
        if (!text) return;
        this.lastChat.set(client.sessionId, now);
        const message = { id: `${client.sessionId}:${now}`, name: member.name, text, at: now };
        this.history.push(message);
        this.history = this.history.slice(-80);
        this.broadcast('chat', message);
      });
      this.onMessage('ready', (client, ready: unknown) => {
        const member = this.members.get(client.sessionId);
        if (!member || !this.custom || this.phase !== 'waiting' || typeof ready !== 'boolean') return;
        member.ready = ready;
        this.publish();
      });
      this.onMessage('start', async client => {
        if (client.sessionId !== this.host || !this.custom || this.phase !== 'waiting') return client.send('notice', 'Only the host can start this game.');
        if (![...this.members.values()].every(m => m.ready && m.connected)) return client.send('notice', 'Every player must be connected and ready.');
        this.phase = 'started';
        await this.lock();
        await this.setMetadata({ phase: this.phase });
        this.launchPath = `/play?sector=${encodeURIComponent(this.sectorId)}&mode=zone&worldSeed=${encodeURIComponent('custom-' + this.roomId)}`;
        for (const c of this.clients) {
          const member = this.members.get(c.sessionId);
          if (member) c.send('launch', `${this.launchPath}&characterId=${encodeURIComponent(member.characterId || '')}&from=lobby`);
        }
        this.publish();
      });
    }
    onJoin(client: Client) {
      const identity = client.auth as CouncilIdentity;
      this.members.set(client.sessionId, { ...identity, sessionId: client.sessionId, ready: false, connected: true });
      if (!this.host) this.host = client.sessionId;
      this.publish();
    }
    async onLeave(client: Client, code: number) {
      const member = this.members.get(client.sessionId);
      if (code !== CloseCode.CONSENTED && member) {
        member.connected = false;
        member.ready = false;
        this.publish();
        try {
          await this.allowReconnection(client, 30);
          member.connected = true;
          this.publish();
          if (this.launchPath) client.send('launch', `${this.launchPath}&characterId=${encodeURIComponent(member.characterId || '')}&from=lobby`);
          return;
        } catch { /* release expired seat */ }
      }
      this.members.delete(client.sessionId);
      this.lastChat.delete(client.sessionId);
      if (this.host === client.sessionId) this.host = this.members.keys().next().value || '';
      this.publish();
    }
  };
}
