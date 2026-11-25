import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { Server, Room as ServerRoom, ServerError } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { Client, getStateCallbacks } from '@colyseus/sdk';
import { Schema, MapSchema, defineTypes } from '@colyseus/schema';
import { createWarCouncilRoom } from '../server/colyseus/rooms/WarCouncilRoom.ts';
import { assertUsableWebGL2 } from '../client/src/lib/webglPreflight.ts';

function message(room, type, action, predicate = () => true) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { off(); reject(new Error(`Timed out waiting for ${type}`)); }, 6000);
    const off = room.onMessage(type, data => {
      if (!predicate(data)) return;
      clearTimeout(timer); off(); resolve(data);
    });
    action?.();
  });
}

test('actual SDK0.17 / core0.17: auth, isolated rooms, chat, host permissions, ready and shared launch', async () => {
  const server = new Server({ transport: new WebSocketTransport({ server: createServer() }), greet: false });
  const Council = createWarCouncilRoom(async (token, options) => {
    if (!['test-one','test-two','test-three'].includes(token)) throw new ServerError(401, 'Authentication required');
    if (options.characterId !== `hero-${token}`) throw new ServerError(403, 'Character ownership rejected');
    return { accountId: token, characterId: options.characterId, name: token };
  });
  server.define('custom_lobby', Council, { custom: true });
  await server.listen(0, '127.0.0.1');
  const endpoint = `http://127.0.0.1:${server.transport.server.address().port}`;
  const clients = ['test-one','test-two','test-three'].map(token => { const c = new Client(endpoint); c.auth.token = token; return c; });
  const joined = [];
  try {
    await assert.rejects(new Client(endpoint).create('custom_lobby', { title: 'Denied', sectorId: 'haven_shore' }));
    await assert.rejects(clients[0].create('custom_lobby', { title: 'Foreign hero', sectorId: 'haven_shore', characterId: 'hero-test-two' }));
    const host = await clients[0].create('custom_lobby', { title: 'Acceptance expedition', sectorId: 'haven_shore', characterId: 'hero-test-one', capacity: 4 });
    joined.push(host);
    const guest = await clients[1].joinById(host.roomId, { characterId: 'hero-test-two' });
    joined.push(guest);
    const other = await clients[2].create('custom_lobby', { title: 'Other room', sectorId: 'ember_depths', characterId: 'hero-test-three' });
    joined.push(other);
    const snapshot = await message(host, 'lobby', () => host.send('sync'), state => state.members.length === 2);
    assert.equal(snapshot.host, host.sessionId);
    assert.equal(snapshot.sectorId, 'haven_shore');
    const chat = await message(guest, 'chat', () => host.send('chat', 'Ready at the docks'));
    assert.equal(chat.text, 'Ready at the docks');
    const otherHistory = await message(other, 'history', () => other.send('sync'));
    assert.equal(otherHistory.length, 0);
    const denied = await message(guest, 'notice', () => guest.send('start'));
    assert.match(denied, /host/);
    const unready = await message(host, 'notice', () => host.send('start'));
    assert.match(unready, /ready/);
    await message(host, 'lobby', () => { host.send('ready', true); guest.send('ready', true); }, state => state.members.every(m => m.ready));
    const guestLaunch = message(guest, 'launch');
    const hostPath = await message(host, 'launch', () => host.send('start'));
    const guestPath = await guestLaunch;
    assert.equal(new URL(hostPath, endpoint).searchParams.get('worldSeed'), new URL(guestPath, endpoint).searchParams.get('worldSeed'));
    assert.equal(new URL(guestPath, endpoint).searchParams.get('characterId'), 'hero-test-two');
    assert.notEqual(new URL(hostPath, endpoint).searchParams.get('worldSeed'), 'grudge-world-1');
  } finally {
    await Promise.allSettled(joined.map(room => room.leave()));
    await server.gracefullyShutdown(false);
  }
});

test('schema4 callbacks observe initial players and subsequent updates', async () => {
  class Player extends Schema { constructor() { super(); this.name = 'survivor'; } }
  defineTypes(Player, { name: 'string' });
  class State extends Schema { constructor() { super(); this.players = new MapSchema(); } }
  defineTypes(State, { players: { map: Player } });
  class SyncRoom extends ServerRoom {
    onCreate() { this.setState(new State()); this.onMessage('rename', () => { this.state.players.get('one').name = 'captain'; }); }
    onJoin() { this.state.players.set('one', new Player()); }
  }
  const server = new Server({ transport: new WebSocketTransport({ server: createServer() }), greet: false });
  server.define('sync_test', SyncRoom);
  await server.listen(0, '127.0.0.1');
  let room;
  try {
    room = await new Client(`http://127.0.0.1:${server.transport.server.address().port}`).joinOrCreate('sync_test');
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('schema callback timeout')), 6000);
      const $ = getStateCallbacks(room);
      $(room.state).players.onAdd(player => {
        assert.equal(player.name, 'survivor');
        $(player).onChange(() => { if (player.name === 'captain') { clearTimeout(timer); resolve(); } });
        room.send('rename');
      });
    });
  } finally { await room?.leave(); await server.gracefullyShutdown(false); }
});

test('graphics preflight rejects null/lost contexts and nullable shader precision', () => {
  assert.throws(() => assertUsableWebGL2(null), /missing or lost/);
  assert.throws(() => assertUsableWebGL2({ isContextLost: () => true }), /lost/);
  const gl = { isContextLost: () => false, VERTEX_SHADER: 1, FRAGMENT_SHADER: 2, HIGH_FLOAT: 3, MEDIUM_FLOAT: 4, getShaderPrecisionFormat: () => null };
  assert.throws(() => assertUsableWebGL2(gl), /precision/);
  gl.getShaderPrecisionFormat = () => ({ precision: 23 });
  assert.doesNotThrow(() => assertUsableWebGL2(gl));
});
