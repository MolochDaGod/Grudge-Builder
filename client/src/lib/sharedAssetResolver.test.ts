import { describe, it, expect } from 'vitest';
import { assetUrl, cdnAssetUrl, apiUrl, ASSET_CDN_BASE } from './assetConfig';
import { resolveIconUrl, getPackIconForCategory, iconOnError } from './iconResolver';
import { normalizeAssetPath } from './legacyAssetPaths';

const CDN = 'https://assets.grudge-studio.com';

describe('shared @grudge-studio/asset-resolver integration', () => {
  it('assetUrl/cdnAssetUrl resolve to the R2 CDN', () => {
    expect(assetUrl('/backgrounds/general.png')).toBe(`${CDN}/backgrounds/general.png`);
    expect(cdnAssetUrl('/icons/pack/misc/Effect.png')).toBe(`${CDN}/icons/pack/misc/Effect.png`);
  });

  it('ASSET_CDN_BASE is the R2 origin', () => {
    expect(ASSET_CDN_BASE).toBe(CDN);
  });

  it('normalizeAssetPath maps legacy /assets/* paths', () => {
    expect(normalizeAssetPath('/assets/ui/sigils/x.png')).toBe('/icons/sigils/x.png');
    expect(normalizeAssetPath('/assets/portraits/hero.png')).toBe('/images/portraits/hero.png');
  });

  it('resolveIconUrl rewrites deprecated hosts to R2', () => {
    expect(
      resolveIconUrl('https://molochdagod.github.io/ObjectStore/icons/pack/misc/Effect.png'),
    ).toBe(`${CDN}/icons/pack/misc/Effect.png`);
  });

  it('resolveIconUrl falls back to pack icons by category', () => {
    expect(resolveIconUrl(null, { category: 'swords' })).toBe(
      `${CDN}/icons/pack/weapons/Sword_01.png`,
    );
    expect(getPackIconForCategory({ weaponType: 'Bow' })).toBe(
      `${CDN}/icons/pack/weapons/Bow_01.png`,
    );
  });

  it('iconOnError swaps the image src to the fallback icon', () => {
    const target = { src: `${CDN}/icons/weapons/missing.png`, onerror: null as unknown };
    iconOnError({ currentTarget: target as { src: string; onerror: ((...a: unknown[]) => unknown) | null } }, {
      category: 'swords',
    });
    expect(target.src).toBe(`${CDN}/icons/pack/weapons/Sword_01.png`);
  });

  it('JSON-data helpers remain local (apiUrl uses same-origin rewrite in browser)', () => {
    expect(apiUrl('/weapons.json')).toBe('/api/objectstore/v1/weapons.json');
  });

  it('assetUrl uses the configured VITE_ASSETS_URL default (R2 CDN)', () => {
    // Local assetConfig owns the CDN base; @grudge-studio/asset-resolver is optional.
    expect(assetUrl('/x.png')).toBe(`${CDN}/x.png`);
  });
});
