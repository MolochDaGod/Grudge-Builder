import fs from 'node:fs';
import path from 'node:path';

/**
 * Music packs under D:\Games\Models
 * CDN: https://assets.grudge-studio.com/audio/music/<id>/manifest.json
 */
export const MUSIC_PACKS = [
  {
    id: 'boss-battle-v2',
    label: 'Boss Battle Music Pack Vol. 2',
    zip: 'D:/Games/Models/Boss Battle Music Pack Vol. 2.zip',
    staging: 'D:/Games/Models/_staging/boss-battle-music-v2',
    includeWav: false,
    preferredFormat: 'ogg',
  },
  {
    id: 'shooter-synthwave',
    label: 'Shooter Synthwave Music Pack',
    zip: 'D:/Games/Models/Shooter Synthwave Music Pack.zip',
    staging: 'D:/Games/Models/_staging/shooter-synthwave',
    includeWav: false,
    preferredFormat: 'mp3',
  },
  {
    id: 'pirate',
    label: 'Pirate Music Pack',
    zip: 'D:/Games/Models/Pirate Music Pack.zip',
    staging: 'D:/Games/Models/_staging/pirate-music',
    includeWav: false,
    preferredFormat: 'ogg',
  },
  {
    id: 'medieval-tracks',
    label: '10 Medieval Tracks Music Pack',
    zip: 'D:/Games/Models/10 Medieval Tracks Music pack.zip',
    staging: 'D:/Games/Models/_staging/medieval-tracks',
    includeWav: false,
    preferredFormat: 'ogg',
  },
  {
    id: 'lo-fi',
    label: 'Lo-Fi Music Pack',
    zip: 'D:/Games/Models/Lo-Fi Music Pack.zip',
    staging: 'D:/Games/Models/_staging/lo-fi-music',
    includeWav: true,
    preferredFormat: 'wav',
  },
  {
    id: 'free-action',
    label: 'FREE Action Music Pack',
    zip: null,
    staging: 'D:/Games/Models/_staging/free-action-music',
    sourceFallback: 'D:/Games/Models/_game_asset_framework/organized/audio/FREE_Action_Music_Pack/FREE Action Music Pack',
    includeWav: true,
    preferredFormat: 'wav',
  },
];

const AUDIO_EXT = (includeWav) => (includeWav ? ['.mp3', '.ogg', '.wav'] : ['.mp3', '.ogg']);

function hasAudio(dir, includeWav) {
  const exts = AUDIO_EXT(includeWav);
  let found = false;
  const walk = (d) => {
    if (found) return;
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      if (ent.name.startsWith('.') || ent.name === '__MACOSX') continue;
      const full = path.join(d, ent.name);
      if (ent.isDirectory()) walk(full);
      else if (exts.some((e) => ent.name.toLowerCase().endsWith(e))) found = true;
    }
  };
  try { walk(dir); } catch { /* */ }
  return found;
}

export function resolvePackSource(pack) {
  if (pack.staging && fs.existsSync(pack.staging) && hasAudio(pack.staging, pack.includeWav)) {
    return pack.staging;
  }
  if (pack.sourceFallback && fs.existsSync(pack.sourceFallback) && hasAudio(pack.sourceFallback, pack.includeWav)) {
    return pack.sourceFallback;
  }
  return pack.staging;
}