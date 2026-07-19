#!/usr/bin/env node
/**
 * Generate the canonical Warlords world minimap PNG (3×3 sectors + lobby ring).
 *
 * Output:
 *   client/public/maps/warlords-canonical-minimap.png
 *   public/maps/warlords-canonical-minimap.png
 *   client/public/production/warlords-canonical-minimap.png
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas } from 'canvas';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const GRID = [
  [
    { id: 'ethereal_falls', name: 'Ethereal Falls', color: '#2d1b69', accent: '#00e5ff' },
    { id: 'frostbite_expanse', name: 'Frostbite', color: '#1e3a5f', accent: '#7dd3fc' },
    { id: 'thornwood_wilds', name: 'Thornwood', color: '#14532d', accent: '#4ade80' },
  ],
  [
    { id: 'stormbreak_reef', name: 'Stormbreak', color: '#1e293b', accent: '#fbbf24' },
    { id: 'convergence_nexus', name: 'Nexus', color: '#312e81', accent: '#a78bfa' },
    { id: 'ashen_wastes', name: 'Ashen Wastes', color: '#78350f', accent: '#f59e0b' },
  ],
  [
    { id: 'abyssal_trench', name: 'Abyssal', color: '#020617', accent: '#22d3ee' },
    { id: 'haven_shore', name: 'Haven Shore', color: '#0e7490', accent: '#67e8f9' },
    { id: 'ember_depths', name: 'Ember Depths', color: '#7f1d1d', accent: '#f97316' },
  ],
];

const FACTION_RING = [
  { name: 'Human', color: '#c9a227' },
  { name: 'Barbarian', color: '#dc2626' },
  { name: 'Elf', color: '#22c55e' },
  { name: 'Dwarf', color: '#78716c' },
  { name: 'Orc', color: '#84cc16' },
  { name: 'Undead', color: '#a78bfa' },
];

const W = 1024;
const H = 1024;

function main() {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Ocean base
  const bg = ctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, W * 0.7);
  bg.addColorStop(0, '#0c2c4a');
  bg.addColorStop(0.55, '#072038');
  bg.addColorStop(1, '#030b14');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Soft grid
  ctx.strokeStyle = 'rgba(100,160,200,0.08)';
  ctx.lineWidth = 1;
  for (let i = 0; i < W; i += 64) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, H);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(W, i);
    ctx.stroke();
  }

  // Outer faction lobby ring (pirates open-world border)
  const cx = W / 2;
  const cy = H / 2;
  const ringR = 470;
  ctx.strokeStyle = 'rgba(251,191,36,0.35)';
  ctx.lineWidth = 3;
  ctx.setLineDash([12, 10]);
  ctx.beginPath();
  ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  FACTION_RING.forEach((f, i) => {
    const a = -Math.PI / 2 + (i / FACTION_RING.length) * Math.PI * 2;
    const x = cx + Math.cos(a) * ringR;
    const y = cy + Math.sin(a) * ringR;
    ctx.beginPath();
    ctx.fillStyle = f.color;
    ctx.arc(x, y, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.font = 'bold 11px Georgia,serif';
    ctx.textAlign = 'center';
    const tw = ctx.measureText(f.name).width;
    ctx.fillRect(x - tw / 2 - 4, y + 22, tw + 8, 14);
    ctx.fillStyle = '#fff';
    ctx.fillText(f.name, x, y + 33);
  });

  // 3×3 sector tiles
  const pad = 140;
  const cell = (W - pad * 2) / 3;
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const s = GRID[row][col];
      const x = pad + col * cell;
      const y = pad + row * cell;
      const m = 10;

      // Sector plate
      ctx.fillStyle = s.color;
      roundRect(ctx, x + m, y + m, cell - m * 2, cell - m * 2, 16);
      ctx.fill();

      // Accent border
      ctx.strokeStyle = s.accent;
      ctx.lineWidth = 3;
      roundRect(ctx, x + m, y + m, cell - m * 2, cell - m * 2, 16);
      ctx.stroke();

      // Island dots (decorative land mass hint)
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      const dots = 14 + ((col + row * 3) % 5);
      for (let d = 0; d < dots; d++) {
        const seed = (col + 1) * 17 + (row + 1) * 31 + d * 13;
        const dx = x + m + 24 + ((seed * 17) % Math.floor(cell - m * 2 - 48));
        const dy = y + m + 40 + ((seed * 29) % Math.floor(cell - m * 2 - 80));
        const rr = 4 + (seed % 7);
        ctx.beginPath();
        ctx.arc(dx, dy, rr, 0, Math.PI * 2);
        ctx.fill();
      }

      // Ship diamonds
      ctx.fillStyle = s.accent;
      for (let sh = 0; sh < 3; sh++) {
        const sx = x + cell * (0.25 + sh * 0.25);
        const sy = y + cell * 0.72;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-3, -3, 6, 6);
        ctx.restore();
      }

      // Labels
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(x + m + 8, y + m + 10, cell - m * 2 - 16, 36);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 18px Georgia,serif';
      ctx.textAlign = 'center';
      ctx.fillText(s.name, x + cell / 2, y + m + 34);
      ctx.font = '11px Consolas,monospace';
      ctx.fillStyle = s.accent;
      ctx.fillText(s.id, x + cell / 2, y + cell - m - 14);
    }
  }

  // Title banner
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(0, 0, W, 56);
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 22px Georgia,serif';
  ctx.textAlign = 'center';
  ctx.fillText('WARLORDS · CANONICAL WORLD MINIMAP', W / 2, 28);
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.font = '12px system-ui,sans-serif';
  ctx.fillText(
    '9 sectors · denser land · NPC camps · enemy boats · outer faction ring (6 races)',
    W / 2,
    48,
  );

  // Compass
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = 'bold 16px system-ui';
  ctx.fillText('N', W / 2, 78);

  // Legend
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(24, H - 88, 280, 64);
  ctx.fillStyle = '#e2e8f0';
  ctx.font = '11px system-ui';
  ctx.textAlign = 'left';
  ctx.fillText('● Island land mass', 36, H - 64);
  ctx.fillText('◆ Enemy / faction ship', 36, H - 46);
  ctx.fillText('○ Outer ring = race faction islands', 36, H - 28);

  const buf = canvas.toBuffer('image/png');
  const outs = [
    path.join(ROOT, 'client', 'public', 'maps', 'warlords-canonical-minimap.png'),
    path.join(ROOT, 'public', 'maps', 'warlords-canonical-minimap.png'),
    path.join(ROOT, 'client', 'public', 'production', 'warlords-canonical-minimap.png'),
  ];
  for (const p of outs) {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, buf);
    console.log('wrote', path.relative(ROOT, p), `(${(buf.length / 1024).toFixed(1)} KB)`);
  }
  console.log('canonical minimap OK 1024×1024');
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

main();
