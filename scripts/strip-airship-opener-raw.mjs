#!/usr/bin/env node
/**
 * Binary GLB edit — drop skins/animations/joint attrs. No gltf-transform.
 * Keeps node names and BIN buffers.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SRC = process.argv[2] || path.join(ROOT, 'tmp', 'airship-zone', 'opener-scene.glb');
const OUT = process.argv[3] || path.join(ROOT, 'tmp', 'airship-zone', 'opener-scene-8.glb');

const buf = fs.readFileSync(SRC);
if (buf.toString('ascii', 0, 4) !== 'glTF') {
  console.error('not a GLB');
  process.exit(1);
}
const jsonLen = buf.readUInt32LE(12);
const json = JSON.parse(buf.slice(20, 20 + jsonLen).toString('utf8'));
const binStart = 20 + jsonLen;

const skinN = json.skins?.length || 0;
const animN = json.animations?.length || 0;
delete json.skins;
delete json.animations;
for (const m of json.meshes || []) {
  for (const p of m.primitives || []) {
    if (p.attributes) {
      delete p.attributes.JOINTS_0;
      delete p.attributes.WEIGHTS_0;
      delete p.attributes.JOINTS_1;
      delete p.attributes.WEIGHTS_1;
    }
  }
}
// nodes may reference skin
for (const n of json.nodes || []) {
  delete n.skin;
}

const jsonBuf = Buffer.from(JSON.stringify(json));
const pad = (4 - (jsonBuf.length % 4)) % 4;
const jsonPadded = Buffer.concat([jsonBuf, Buffer.alloc(pad, 0x20)]);
const binRest = buf.subarray(binStart);
const header = Buffer.alloc(12);
header.write('glTF', 0);
header.writeUInt32LE(2, 4);
const total = 12 + 8 + jsonPadded.length + binRest.length;
header.writeUInt32LE(total, 8);
const jsonHdr = Buffer.alloc(8);
jsonHdr.writeUInt32LE(jsonPadded.length, 0);
jsonHdr.write('JSON', 4);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, Buffer.concat([header, jsonHdr, jsonPadded, binRest]));
console.log(
  `wrote ${OUT}  ${(fs.statSync(OUT).size / 1024 / 1024).toFixed(2)} MiB  skins=${skinN} anims=${animN} removed`,
);
