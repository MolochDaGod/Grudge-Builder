/**
 * islandMapRenderer — renders a HomeIslandState into a top-down 2D overhead
 * map as an SVG `data:` URL, suitable for an <img src> or upload payload.
 *
 * Pure and SSR-safe (no DOM / canvas required). Defensive against partial
 * state: derives a bounding box from whatever points exist and normalizes
 * them into the output viewport, so any coordinate scale renders sensibly.
 *
 * Used by the Island Reveal flow (src/pages/island-reveal.tsx):
 *   const url = renderIslandMapToDataUrl(dto.state, 1024);
 */
import type { HomeIslandState, HomeIslandMapStyle } from './homeIslandApi';

interface Palette {
  water: string;
  land: string;
  land2: string;
  node: string;
  camp: string;
  animal: string;
}

const PALETTES: Record<HomeIslandMapStyle, Palette> = {
  fantasy:  { water: '#0b1e3a', land: '#1f5135', land2: '#2c6b45', node: '#f6c945', camp: '#ff7849', animal: '#cde7ff' },
  iron:     { water: '#0a0d12', land: '#2a2f38', land2: '#3a414d', node: '#d7b56d', camp: '#ff6b3d', animal: '#9fb3c8' },
  tactical: { water: '#06121a', land: '#10303a', land2: '#16404d', node: '#36e0c8', camp: '#ffd166', animal: '#9af2e4' },
  night:    { water: '#05060c', land: '#15182b', land2: '#1f2440', node: '#b388ff', camp: '#ffb86b', animal: '#8fb3ff' },
};

const RARITY_COLOR: Record<string, string> = {
  common: '#cbd5e1',
  uncommon: '#4ade80',
  rare: '#60a5fa',
  epic: '#c084fc',
  legendary: '#fbbf24',
};

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Render the island state to a top-down SVG map and return it as a data URL.
 * @param state HomeIslandState (nodes/animals/zones/clearings/camp). May be partial.
 * @param size  Output square size in px (default 1024).
 */
export function renderIslandMapToDataUrl(
  state: HomeIslandState | null | undefined,
  size = 1024,
): string {
  const S = Math.max(64, Math.floor(size) || 1024);
  const pal = PALETTES[(state?.mapStyle as HomeIslandMapStyle)] ?? PALETTES.fantasy;

  const nodes = Array.isArray(state?.nodes) ? state!.nodes : [];
  const animals = Array.isArray(state?.animals) ? state!.animals : [];
  const zones = Array.isArray(state?.terrainZones) ? state!.terrainZones : [];
  const clearings = Array.isArray(state?.clearings) ? state!.clearings : [];
  const camp = state?.campPosition;

  // Derive a bounding box from every known point so any coordinate scale fits.
  const xs: number[] = [];
  const ys: number[] = [];
  const pushPt = (x: number, y: number) => {
    if (Number.isFinite(x) && Number.isFinite(y)) { xs.push(x); ys.push(y); }
  };
  nodes.forEach((n) => pushPt(n.x, n.y));
  animals.forEach((a) => pushPt(a.x, a.y));
  zones.forEach((z) => { pushPt(z.x, z.y); pushPt(z.x + z.width, z.y + z.height); });
  clearings.forEach((c) => { pushPt(c.x, c.y); pushPt(c.x + c.width, c.y + c.height); });
  if (camp) pushPt(camp.x, camp.y);

  let minX = xs.length ? Math.min(...xs) : 0;
  let minY = ys.length ? Math.min(...ys) : 0;
  let maxX = xs.length ? Math.max(...xs) : 100;
  let maxY = ys.length ? Math.max(...ys) : 100;
  if (maxX - minX < 1) maxX = minX + 100;
  if (maxY - minY < 1) maxY = minY + 100;
  const pad = Math.max(maxX - minX, maxY - minY) * 0.08;
  minX -= pad; minY -= pad; maxX += pad; maxY += pad;
  const span = Math.max(maxX - minX, maxY - minY) || 100;

  const projX = (x: number) => (((x - minX) / span) * S);
  const projY = (y: number) => (((y - minY) / span) * S);
  const scale = (v: number) => (v / span) * S;

  const parts: string[] = [];

  // Ocean
  parts.push(`<rect width="${S}" height="${S}" fill="${pal.water}"/>`);
  // Landmass
  parts.push(
    `<circle cx="${S / 2}" cy="${S / 2}" r="${(S * 0.44).toFixed(1)}" fill="${pal.land}" stroke="${pal.land2}" stroke-width="${(S * 0.012).toFixed(1)}"/>`,
  );
  // Terrain zones
  zones.forEach((z) => {
    parts.push(
      `<rect x="${projX(z.x).toFixed(1)}" y="${projY(z.y).toFixed(1)}" width="${Math.max(2, scale(z.width)).toFixed(1)}" height="${Math.max(2, scale(z.height)).toFixed(1)}" rx="${(S * 0.01).toFixed(1)}" fill="${pal.land2}" opacity="0.5"/>`,
    );
  });
  // Clearings
  clearings.forEach((c) => {
    const w = Math.max(2, scale(c.width));
    const h = Math.max(2, scale(c.height));
    parts.push(
      `<rect x="${projX(c.x).toFixed(1)}" y="${projY(c.y).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="${(Math.min(w, h) / 2).toFixed(1)}" fill="${pal.land2}" opacity="0.35"/>`,
    );
  });
  // Resource nodes
  const nodeR = Math.max(3, S * 0.008);
  nodes.forEach((n) => {
    const col = (n.rarity && RARITY_COLOR[n.rarity.toLowerCase()]) || pal.node;
    parts.push(
      `<circle cx="${projX(n.x).toFixed(1)}" cy="${projY(n.y).toFixed(1)}" r="${nodeR.toFixed(1)}" fill="${col}" stroke="#00000060" stroke-width="1"/>`,
    );
  });
  // Animals
  const animalR = Math.max(2, S * 0.005);
  animals.forEach((a) => {
    parts.push(
      `<circle cx="${projX(a.x).toFixed(1)}" cy="${projY(a.y).toFixed(1)}" r="${animalR.toFixed(1)}" fill="${pal.animal}" opacity="0.85"/>`,
    );
  });
  // Camp marker (tent triangle)
  if (camp) {
    const cs = Math.max(6, S * 0.018);
    const x = projX(camp.x);
    const y = projY(camp.y);
    parts.push(
      `<g transform="translate(${x.toFixed(1)},${y.toFixed(1)})">` +
        `<circle r="${(cs * 1.4).toFixed(1)}" fill="${pal.camp}" opacity="0.18"/>` +
        `<path d="M0 ${(-cs).toFixed(1)} L${cs.toFixed(1)} ${cs.toFixed(1)} L${(-cs).toFixed(1)} ${cs.toFixed(1)} Z" fill="${pal.camp}" stroke="#000000" stroke-width="1"/>` +
        `</g>`,
    );
  }
  // Title
  const name = escapeXml(String(state?.name ?? 'Home Island'));
  parts.push(
    `<text x="${(S * 0.04).toFixed(0)}" y="${(S * 0.075).toFixed(0)}" font-family="Cinzel, Georgia, serif" font-size="${(S * 0.035).toFixed(0)}" fill="#ffffffcc">${name}</text>`,
  );

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">${parts.join('')}</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export default renderIslandMapToDataUrl;
