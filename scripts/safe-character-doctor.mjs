/**
 * safe-character-doctor — prove Safe Character System files + gate checklist exist.
 * Run: node scripts/safe-character-doctor.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const required = [
  'shared/character/SafeCharacterContract.ts',
  'client/src/lib/safeCharacter/index.ts',
  'client/src/lib/safeCharacter/deploySafeCharacter.ts',
  'client/src/lib/safeCharacter/bindSafeAnimation.ts',
  'client/src/lib/safeCharacter/validateSafeCharacter.ts',
  'client/src/lib/safeCharacter/bodyMeasure.ts',
  'docs/SAFE_CHARACTER_SYSTEM.md',
  'client/src/lib/grudge6Textures.ts',
  'client/src/lib/loadGrudge6Player.ts',
];

let ok = true;
console.log('Safe Character Doctor\n');
for (const rel of required) {
  const p = path.join(root, rel);
  const exists = fs.existsSync(p);
  console.log(`${exists ? 'OK  ' : 'MISS'} ${rel}`);
  if (!exists) ok = false;
}

console.log(`
────────────────────────────────────────
MANDATORY PROCESS (fail closed)
────────────────────────────────────────
1. Load grudge6 race kit (GLB production preferred)
2. applyGrudge6RaceTextures (sRGB, flipY=false)
3. Equip mesh_ids only (no body GLB swap)
4. deploySafeCharacter → fit · face · feet Box3
5. if (!shippable) STOP
6. bindSafeAnimation (Bip001 packs; strip position)
7. reGroundAfterAnimSample after first frame
8. grudge-convert + R2 only after gates green

FORBIDDEN
· Pelvis as feet
· Mixamo tracks on Bip001
· CharacterGen/UniRig as hero SSOT
· Yellow atlas ignored
· Second deploy helper

API
  import { deploySafeCharacter, bindSafeAnimation } from '@/lib/safeCharacter'
  Doc: docs/SAFE_CHARACTER_SYSTEM.md
`);

process.exit(ok ? 0 : 1);
