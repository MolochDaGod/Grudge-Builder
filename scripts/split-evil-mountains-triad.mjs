#!/usr/bin/env node
/**
 * Split Sketchfab triad GLB into 3 per-peak GLBs (no three.js dependency).
 * Peaks: Mountain2 (0), Mountain1 (1), Mountain3 (2 + ladder).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INPUT = process.argv[2] || path.join(__dirname, '..', 'client', 'public', 'models', 'evil_rock_mountains_triad.glb');
const OUT_DIR = process.argv[3] || path.join(__dirname, '..', 'client', 'public', 'models');

/** RootNode child indices for each peak group in source GLB */
const PEAK_ROOT_NODE_INDICES = [3, 5, 7];

function readGlb(filePath) {
  const buf = fs.readFileSync(filePath);
  const jsonLen = buf.readUInt32LE(12);
  const json = JSON.parse(buf.slice(20, 20 + jsonLen).toString('utf8'));
  const binOffset = 20 + jsonLen;
  const binLen = buf.readUInt32LE(binOffset);
  const bin = buf.slice(binOffset + 8, binOffset + 8 + binLen);
  return { json, bin };
}

function collectSubtree(nodeIndex, json, meshes = new Set(), nodes = new Set()) {
  nodes.add(nodeIndex);
  const node = json.nodes[nodeIndex];
  if (node.mesh !== undefined) meshes.add(node.mesh);
  for (const c of node.children ?? []) collectSubtree(c, json, meshes, nodes);
}

function collectDependencies(meshIndices, json) {
  const accessors = new Set();
  const materials = new Set();
  const textures = new Set();
  const images = new Set();
  const samplers = new Set();

  for (const mi of meshIndices) {
    const mesh = json.meshes[mi];
    for (const prim of mesh.primitives ?? []) {
      for (const attr of Object.values(prim.attributes ?? {})) accessors.add(attr);
      if (prim.indices !== undefined) accessors.add(prim.indices);
      if (prim.material !== undefined) materials.add(prim.material);
    }
  }

  for (const matI of materials) {
    const mat = json.materials[matI];
    for (const key of ['baseColorTexture', 'metallicRoughnessTexture', 'normalTexture', 'emissiveTexture', 'occlusionTexture']) {
      const ref = mat?.[key]?.index;
      if (ref !== undefined) textures.add(ref);
    }
  }
  for (const texI of textures) {
    const tex = json.textures[texI];
    if (tex?.source !== undefined) images.add(tex.source);
    if (tex?.sampler !== undefined) samplers.add(tex.sampler);
  }

  const bufferViews = new Set();
  for (const accI of accessors) {
    const acc = json.accessors[accI];
    if (acc?.bufferView !== undefined) bufferViews.add(acc.bufferView);
    if (acc?.sparse) {
      if (acc.sparse.indices?.bufferView !== undefined) bufferViews.add(acc.sparse.indices.bufferView);
      if (acc.sparse.values?.bufferView !== undefined) bufferViews.add(acc.sparse.values.bufferView);
    }
  }
  for (const imgI of images) {
    const img = json.images[imgI];
    if (img?.bufferView !== undefined) bufferViews.add(img.bufferView);
  }

  return { accessors, materials, textures, images, samplers, bufferViews, meshes: meshIndices };
}

function remapIndex(oldIndex, oldToNew) {
  return oldIndex === undefined ? undefined : oldToNew.get(oldIndex);
}

function buildPeakGlb(sourceJson, sourceBin, peakRootIndex, peakIndex) {
  const meshes = new Set();
  const nodeSet = new Set();
  collectSubtree(peakRootIndex, sourceJson, meshes, nodeSet);

  const deps = collectDependencies(meshes, sourceJson);
  const bufferViewList = [...deps.bufferViews].sort((a, b) => a - b);
  const bvMap = new Map(bufferViewList.map((v, i) => [v, i]));
  const accMap = new Map([...deps.accessors].map((v, i) => [v, i]));
  const meshMap = new Map([...deps.meshes].map((v, i) => [v, i]));
  const matMap = new Map([...deps.materials].map((v, i) => [v, i]));
  const texMap = new Map([...deps.textures].map((v, i) => [v, i]));
  const imgMap = new Map([...deps.images].map((v, i) => [v, i]));
  const sampMap = new Map([...deps.samplers].map((v, i) => [v, i]));

  let binCursor = 0;
  const newBinParts = [];
  const newBufferViews = bufferViewList.map((oldBv) => {
    const bv = sourceJson.bufferViews[oldBv];
    const start = bv.byteOffset ?? 0;
    const len = bv.byteLength;
    const slice = sourceBin.slice(start, start + len);
    const padded = Buffer.alloc(Math.ceil(len / 4) * 4);
    slice.copy(padded);
    newBinParts.push(padded);
    const out = {
      buffer: 0,
      byteOffset: binCursor,
      byteLength: len,
    };
    if (bv.target !== undefined) out.target = bv.target;
    binCursor += padded.length;
    return out;
  });

  const newAccessors = [...deps.accessors].sort((a, b) => a - b).map((oldAcc) => {
    const acc = sourceJson.accessors[oldAcc];
    const out = {
      componentType: acc.componentType,
      count: acc.count,
      type: acc.type,
    };
    if (acc.min) out.min = acc.min;
    if (acc.max) out.max = acc.max;
    if (acc.normalized) out.normalized = acc.normalized;
    if (acc.bufferView !== undefined) out.bufferView = bvMap.get(acc.bufferView);
    if (acc.byteOffset) out.byteOffset = acc.byteOffset;
    return out;
  });

  const newMeshes = [...deps.meshes].sort((a, b) => a - b).map((oldMesh) => {
    const mesh = sourceJson.meshes[oldMesh];
    return {
      name: mesh.name,
      primitives: mesh.primitives.map((prim) => {
        const p = {
          attributes: Object.fromEntries(
            Object.entries(prim.attributes).map(([k, v]) => [k, accMap.get(v)]),
          ),
          mode: prim.mode ?? 4,
        };
        if (prim.indices !== undefined) p.indices = accMap.get(prim.indices);
        if (prim.material !== undefined) p.material = matMap.get(prim.material);
        return p;
      }),
    };
  });

  const remapMaterial = (oldMat) => {
    const mat = JSON.parse(JSON.stringify(oldMat));
    for (const key of ['baseColorTexture', 'metallicRoughnessTexture', 'normalTexture', 'emissiveTexture', 'occlusionTexture']) {
      if (mat[key]?.index !== undefined) mat[key].index = texMap.get(mat[key].index);
    }
    return mat;
  };

  const newMaterials = [...deps.materials].sort((a, b) => a - b).map((i) => remapMaterial(sourceJson.materials[i]));
  const newTextures = [...deps.textures].sort((a, b) => a - b).map((i) => {
    const t = sourceJson.textures[i];
    return {
      source: imgMap.get(t.source),
      sampler: t.sampler !== undefined ? sampMap.get(t.sampler) : 0,
    };
  });
  const newImages = [...deps.images].sort((a, b) => a - b).map((i) => {
    const img = sourceJson.images[i];
    const out = { mimeType: img.mimeType };
    if (img.bufferView !== undefined) out.bufferView = bvMap.get(img.bufferView);
    if (img.name) out.name = img.name;
    return out;
  });
  const newSamplers = [...deps.samplers].sort((a, b) => a - b).map((i) => sourceJson.samplers[i] ?? {});

  function cloneNode(oldIndex, newNodes) {
    const old = sourceJson.nodes[oldIndex];
    const newIndex = newNodes.length;
    const node = { name: old.name };
    if (old.mesh !== undefined) node.mesh = meshMap.get(old.mesh);
    if (old.translation) node.translation = old.translation;
    if (old.rotation) node.rotation = old.rotation;
    if (old.scale) node.scale = old.scale;
    if (old.matrix) node.matrix = old.matrix;
    newNodes.push(node);
    const childIndices = [];
    for (const c of old.children ?? []) {
      childIndices.push(cloneNode(c, newNodes));
    }
    if (childIndices.length) node.children = childIndices;
    return newIndex;
  }

  const newNodes = [];
  const root = cloneNode(peakRootIndex, newNodes);

  const outJson = {
    asset: { version: '2.0', generator: 'grudge-split-evil-mountains' },
    scene: 0,
    scenes: [{ nodes: [root] }],
    nodes: newNodes,
    meshes: newMeshes,
    accessors: newAccessors,
    bufferViews: newBufferViews,
    buffers: [{ byteLength: binCursor }],
  };
  if (newMaterials.length) outJson.materials = newMaterials;
  if (newTextures.length) outJson.textures = newTextures;
  if (newImages.length) outJson.images = newImages;
  if (newSamplers.length) outJson.samplers = newSamplers;

  const jsonStr = JSON.stringify(outJson);
  const jsonBuf = Buffer.from(jsonStr);
  const jsonPad = (4 - (jsonBuf.length % 4)) % 4;
  const jsonChunk = Buffer.concat([jsonBuf, Buffer.alloc(jsonPad, 0x20)]);
  const binChunk = Buffer.concat(newBinParts);
  const totalLen = 12 + 8 + jsonChunk.length + 8 + binChunk.length;
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(totalLen, 8);
  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(jsonChunk.length, 0);
  jsonHeader.write('JSON', 4);
  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(binChunk.length, 0);
  binHeader.write('BIN\0', 4);

  const outPath = path.join(OUT_DIR, `evil_rock_mountain_peak_${peakIndex}.glb`);
  fs.writeFileSync(outPath, Buffer.concat([header, jsonHeader, jsonChunk, binHeader, binChunk]));
  return { outPath, bytes: totalLen };
}

const { json, bin } = readGlb(INPUT);
fs.mkdirSync(OUT_DIR, { recursive: true });

for (let i = 0; i < PEAK_ROOT_NODE_INDICES.length; i++) {
  const { outPath, bytes } = buildPeakGlb(json, bin, PEAK_ROOT_NODE_INDICES[i], i);
  console.log(`Wrote ${outPath} (${bytes} bytes)`);
}