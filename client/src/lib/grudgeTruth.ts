/**
 * grudgeTruth.ts — ONE TRUTH health probes for the Grudge Warlords stack.
 * Used by GrudgeTruthBadge so you can SEE split-brain vs wired correctly.
 */

import { fleetApi } from './grudgeFleet';
import { apiUrl } from './assetConfig';
import { ASSETS_CDN, GAME_DATA_API, AUTH_GATEWAY, OBJECTSTORE } from './grudgeConfig';
import { CANONICAL_OBJECT_STORE_API, DEPRECATED_OBJECT_STORE_HOSTS } from './objectStoreUrl';

export interface TruthProbe {
  id: string;
  label: string;
  url: string;
  role: 'game-data' | 'identity' | 'assets' | 'objectstore' | 'icons';
  ok?: boolean;
  status?: number;
  detail?: string;
}

export const GRUDGE_TRUTH_LAYERS = {
  identity: { label: 'Grudge ID', url: AUTH_GATEWAY },
  gameData: { label: 'Game state (Railway)', url: GAME_DATA_API },
  assets: { label: 'Binary CDN', url: ASSETS_CDN },
  objectStore: { label: 'JSON data', url: CANONICAL_OBJECT_STORE_API.replace('/api/v1', '') },
  guide: { label: 'Warlords guide', url: 'https://info.grudge-studio.com/grudge-guide.html' },
} as const;

export function buildTruthProbes(): TruthProbe[] {
  const iconPack = `${ASSETS_CDN}/icons/pack/weapons/Sword_01.png`;
  const namedIcon = `${ASSETS_CDN}/icons/weapons/bloodfeud-blade.png`;
  return [
    { id: 'fleet-manifest', label: 'Fleet manifest', url: fleetApi('/api/fleet/manifest'), role: 'game-data' },
    { id: 'supabase-health', label: 'Supabase health', url: fleetApi('/api/supabase/health'), role: 'game-data' },
    { id: 'auth-verify', label: 'Grudge ID auth API', url: fleetApi('/api/auth/verify'), role: 'identity' },
    { id: 'game-characters', label: 'Characters API', url: fleetApi('/api/characters'), role: 'game-data' },
    { id: 'game-account', label: 'Account API', url: fleetApi('/api/account'), role: 'game-data' },
    { id: 'os-items', label: 'master-items.json', url: apiUrl('/master-items.json'), role: 'objectstore' },
    { id: 'os-recipes', label: 'master-recipes.json', url: apiUrl('/master-recipes.json'), role: 'objectstore' },
    { id: 'icon-pack', label: 'Pack icon (guide)', url: iconPack, role: 'assets' },
    { id: 'icon-named', label: 'Named weapon icon', url: namedIcon, role: 'assets' },
    { id: 'assets-cdn', label: 'Assets CDN root', url: `${ASSETS_CDN}/`, role: 'assets' },
  ];
}

function isDeprecatedDataUrl(url: string): boolean {
  return DEPRECATED_OBJECT_STORE_HOSTS.some((h) => url.includes(h));
}

export async function probeTruthEndpoint(probe: TruthProbe): Promise<TruthProbe> {
  try {
    const method = probe.role === 'game-data' || probe.role === 'identity' ? 'GET' : 'HEAD';
    const res = await fetch(probe.url, {
      method,
      headers:
        probe.role === 'game-data' || probe.role === 'identity'
          ? { Accept: 'application/json' }
          : undefined,
    });
    const contentType = res.headers.get('content-type') || '';
    const htmlLeak =
      contentType.includes('text/html') &&
      (probe.role === 'objectstore' || probe.role === 'identity');
    const deprecated = isDeprecatedDataUrl(probe.url);
    return {
      ...probe,
      ok: res.ok && !htmlLeak && !deprecated,
      status: res.status,
      detail: deprecated
        ? 'deprecated GitHub Pages host'
        : htmlLeak
          ? 'HTML leak (split-brain proxy)'
          : contentType.split(';')[0],
    };
  } catch (e: any) {
    return { ...probe, ok: false, detail: e?.message || 'unreachable' };
  }
}

export async function runTruthAudit(): Promise<{
  probes: TruthProbe[];
  score: number;
  splitBrain: string[];
}> {
  const probes = await Promise.all(buildTruthProbes().map(probeTruthEndpoint));
  const splitBrain: string[] = [];
  for (const p of probes) {
    if (p.detail?.includes('deprecated')) {
      splitBrain.push(`${p.label}: still on deprecated GitHub Pages`);
    }
    if (p.detail?.includes('html')) {
      splitBrain.push(`${p.label}: routing to frontend, not API`);
    }
    if (
      p.role === 'objectstore' &&
      p.ok &&
      !p.url.includes('/api/objectstore/') &&
      !p.url.startsWith(CANONICAL_OBJECT_STORE_API) &&
      !p.url.startsWith(OBJECTSTORE)
    ) {
      splitBrain.push(`${p.label}: not using canonical objectstore host`);
    }
  }
  const ok = probes.filter((p) => p.ok).length;
  return { probes, score: Math.round((ok / probes.length) * 100), splitBrain };
}