/**
 * Effects API client — api-server /effects routes (vfx-sandbox stack).
 *
 * Production: same-origin `/api/effects` (Vercel rewrite → api.grudge-studio.com).
 * Override: VITE_EFFECTS_API_URL or grudgeConfig.EFFECTS_API.
 * Offline: VITE_EFFECTS_API_URL=off
 */

import { EFFECTS_API } from '@/lib/grudgeConfig';
import { authHeaders } from '@/lib/grudgeBackend';

export interface EffectDescriptor {
  uuid: string;
  name: string;
  category: string;
  source?: string;
  tags?: string[];
  definition: Record<string, unknown>;
}

export interface EffectRow {
  uuid: string;
  name: string;
  category: string;
  source: string | null;
  tags: string[] | null;
  definition: EffectDescriptor;
  createdAt: string;
  updatedAt: string;
}

function resolveEffectsConfig(): { enabled: boolean; base: string } {
  const raw = (EFFECTS_API ?? '').trim();
  if (raw.toLowerCase() === 'off') {
    return { enabled: false, base: '' };
  }
  if (raw === '') {
    return { enabled: true, base: '' };
  }
  return { enabled: true, base: raw.replace(/\/+$/, '') };
}

const config = resolveEffectsConfig();

export const EFFECTS_API_ENABLED = config.enabled;
export const EFFECTS_API_BASE = config.base;

function effectsUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (EFFECTS_API_BASE) {
    return `${EFFECTS_API_BASE}${normalized}`;
  }
  return `/api${normalized}`;
}

async function effectsFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(effectsUrl(path), {
    ...init,
    headers: {
      ...authHeaders(),
      ...(init?.headers as Record<string, string> | undefined),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? `Effects API ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function listEffects(): Promise<EffectRow[]> {
  if (!EFFECTS_API_ENABLED) return [];
  return effectsFetch<EffectRow[]>('/effects');
}

export async function getEffect(uuid: string): Promise<EffectRow | null> {
  if (!EFFECTS_API_ENABLED) return null;
  try {
    return await effectsFetch<EffectRow>(`/effects/${uuid}`);
  } catch (e) {
    if (e instanceof Error && e.message.includes('404')) return null;
    throw e;
  }
}

export async function upsertEffect(definition: EffectDescriptor): Promise<EffectRow> {
  return effectsFetch<EffectRow>('/effects', {
    method: 'POST',
    body: JSON.stringify({ definition }),
  });
}

const effectCache = new Map<string, EffectDescriptor>();

export async function resolveEffectDescriptor(
  uuid: string,
): Promise<EffectDescriptor | null> {
  if (effectCache.has(uuid)) return effectCache.get(uuid)!;
  const row = await getEffect(uuid);
  if (!row) return null;
  effectCache.set(uuid, row.definition);
  return row.definition;
}

export function clearEffectCache(): void {
  effectCache.clear();
}