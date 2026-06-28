import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  FLEET_VIDEO_FALLBACK,
  resolveFleetVideo,
  resolveWarlordsPvpLoadscreenVideo,
  resolveWarlordsIntroVideo,
} from './fleetVideo';

describe('fleetVideo — Warlords era cinematics', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('exposes distinct intro vs PvP loadscreen CDN fallbacks', () => {
    expect(FLEET_VIDEO_FALLBACK.warlordsIntro).toContain('/grudge-warlords/videos/intro.mp4');
    expect(FLEET_VIDEO_FALLBACK.warlordsPvpLoadscreen).toContain('/grudge-warlords/videos/pvp-loadscreen.mp4');
    expect(FLEET_VIDEO_FALLBACK.warlordsIntro).not.toBe(FLEET_VIDEO_FALLBACK.warlordsPvpLoadscreen);
  });

  it('resolveWarlordsPvpLoadscreenVideo uses CDN when catalog API fails', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('offline'));
    const url = await resolveWarlordsPvpLoadscreenVideo();
    expect(url).toBe(FLEET_VIDEO_FALLBACK.warlordsPvpLoadscreen);
  });

  it('resolveWarlordsIntroVideo prefers catalog API override', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        catalog: {
          warlordsIntro: { r2_url: 'https://cdn.example/override-intro.mp4' },
        },
      }),
    } as Response);

    const { resolveWarlordsIntroVideo: resolveIntro } = await import('./fleetVideo');
    const url = await resolveIntro();
    expect(url).toBe('https://cdn.example/override-intro.mp4');
  });

  it('resolveFleetVideo falls back per key', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('offline'));
    const pvp = await resolveFleetVideo('warlordsPvpLoadscreen');
    const intro = await resolveFleetVideo('warlordsIntro');
    expect(pvp).toBe(FLEET_VIDEO_FALLBACK.warlordsPvpLoadscreen);
    expect(intro).toBe(FLEET_VIDEO_FALLBACK.warlordsIntro);
  });
});