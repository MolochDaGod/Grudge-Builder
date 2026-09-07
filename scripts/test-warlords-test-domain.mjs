import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import {
  isStudioPlatformHost,
  isWarlordsPlayHost,
  warlordsPlayOrigin,
  warlordsAirshipUrl,
  warlordsDefaultReturnTo,
  warlordsZoneUrl,
} from '../shared/fleet/warlordsDomains.ts';

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
const originalOrigin = process.env.WARLORDS_PLAY_ORIGIN;
const originalViteOrigin = process.env.VITE_WARLORDS_PLAY_ORIGIN;
afterEach(() => {
  if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
  else delete globalThis.window;
  for (const [key, value] of [
    ['WARLORDS_PLAY_ORIGIN', originalOrigin],
    ['VITE_WARLORDS_PLAY_ORIGIN', originalViteOrigin],
  ]) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

function at(url) {
  Object.defineProperty(globalThis, 'window', {
    value: { location: new URL(url) }, configurable: true,
  });
  delete process.env.WARLORDS_PLAY_ORIGIN;
  delete process.env.VITE_WARLORDS_PLAY_ORIGIN;
}

test('stable test domain is a game host, not the studio portal', () => {
  assert.equal(isWarlordsPlayHost('TEST.GRUDGE-STUDIO.COM.'), true);
  assert.equal(isStudioPlatformHost('TEST.GRUDGE-STUDIO.COM.'), false);
  assert.equal(isWarlordsPlayHost('test.grudge-studio.com.attacker.example'), false);
  assert.equal(isStudioPlatformHost('forge.grudge-studio.com'), true);
  assert.equal(isWarlordsPlayHost('foundry.grudgewarlords.com'), false);
});

test('Foundry, airship, and zone absolute links stay on the test build', () => {
  at('https://test.grudge-studio.com/tutorial');
  process.env.WARLORDS_PLAY_ORIGIN = 'https://grudgewarlords.com';
  const character = '8d75b2ac-00da-49b0-a27b-2e88a0abcbb3';
  for (const url of [
    warlordsDefaultReturnTo(character),
    warlordsAirshipUrl(character),
    warlordsZoneUrl({ characterId: character, sector: 'haven_shore' }),
  ]) {
    assert.equal(new URL(url).origin, 'https://test.grudge-studio.com');
    assert.equal(new URL(url).searchParams.get('characterId'), character);
  }
});

test('production and unknown preview origins keep the canonical default', () => {
  for (const origin of [
    'https://grudgewarlords.com',
    'https://untrusted.vercel.app',
    'https://test.grudge-studio.com.attacker.example',
    'http://test.grudge-studio.com',
  ]) {
    at(origin);
    assert.equal(warlordsPlayOrigin(), 'https://grudgewarlords.com');
  }
});

test('server-side configured origin continues to work', () => {
  delete globalThis.window;
  process.env.WARLORDS_PLAY_ORIGIN = 'https://play.grudgewarlords.com/';
  assert.equal(warlordsPlayOrigin(), 'https://play.grudgewarlords.com');
});
