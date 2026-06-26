#!/usr/bin/env node
import fs from 'node:fs';

const file = process.argv[2];
if (!file) { console.error('Usage: node inspect-glb-nodes.mjs <file.glb>'); process.exit(1); }
const buf = fs.readFileSync(file);
const jsonLen = buf.readUInt32LE(12);
const json = JSON.parse(buf.slice(20, 20 + jsonLen).toString('utf8'));
const nodes = json.nodes ?? [];
const meshes = json.meshes ?? [];
console.log('scenes:', json.scenes?.length, 'nodes:', nodes.length, 'meshes:', meshes.length);
nodes.forEach((n, i) => {
  console.log(`node[${i}] name=${n.name ?? '(unnamed)'} mesh=${n.mesh ?? '-'} children=${JSON.stringify(n.children ?? [])}`);
});
meshes.forEach((m, i) => console.log(`mesh[${i}] name=${m.name ?? '(unnamed)'} prims=${m.primitives?.length}`));