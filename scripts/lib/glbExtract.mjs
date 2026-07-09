/**
 * Extract named node subtrees from a multi-mesh GLB into standalone GLBs.
 * Adapted from split-evil-mountains-triad.mjs (no three.js dependency).
 */
import fs from 'node:fs';
import path from 'node:path';

export function readGlb(filePath) {
  const buf = fs.readFileSync(filePath);
  const magic = buf.toString('utf8', 0, 4);
  if (magic !== 'glTF') throw new Error(`Not a GLB: ${filePath}`);
  const jsonLen = buf.readUInt32LE(12);
  const json = JSON.parse(buf.slice(20, 20 + jsonLen).toString('utf8'));
  const binOffset = 20 + jsonLen;
  const binLen = buf.readUInt32LE(binOffset);
  const bin = buf.slice(binOffset + 8, binOffset + 8 + binLen);
  return { json, bin };
}

export function listNamedMeshRoots(json) {
  const roots = [];
  for (let i = 0; i < (json.nodes?.length ?? 0); i++) {
    const n = json.nodes[i];
    if (!n?.name || /Object_|Sketchfab|RootNode|GLTF_Scene|root$/i.test(n.name)) continue;
    // Prefer nodes that are parents of mesh-bearing children, or have mesh themselves
    const hasMesh = n.mesh !== undefined;
    const childHasMesh = (n.children ?? []).some((c) => json.nodes[c]?.mesh !== undefined);
    if (hasMesh || childHasMesh) {
      roots.push({ index: i, name: n.name });
    }
  }
  return roots;
}

function collectSubtree(nodeIndex, json, meshes = new Set(), nodes = new Set()) {
  nodes.add(nodeIndex);
  const node = json.nodes[nodeIndex];
  if (!node) return { meshes, nodes };
  if (node.mesh !== undefined) meshes.add(node.mesh);
  for (const c of node.children ?? []) collectSubtree(c, json, meshes, nodes);
  return { meshes, nodes };
}

function collectDependencies(meshIndices, json) {
  const accessors = new Set();
  const materials = new Set();
  const textures = new Set();
  const images = new Set();
  const samplers = new Set();

  for (const mi of meshIndices) {
    const mesh = json.meshes[mi];
    if (!mesh) continue;
    for (const prim of mesh.primitives ?? []) {
      for (const attr of Object.values(prim.attributes ?? {})) accessors.add(attr);
      if (prim.indices !== undefined) accessors.add(prim.indices);
      if (prim.material !== undefined) materials.add(prim.material);
    }
  }

  for (const matI of materials) {
    const mat = json.materials[matI];
    const pbr = mat?.pbrMetallicRoughness ?? {};
    for (const key of ['baseColorTexture', 'metallicRoughnessTexture']) {
      const ref = pbr[key]?.index;
      if (ref !== undefined) textures.add(ref);
    }
    for (const key of ['normalTexture', 'emissiveTexture', 'occlusionTexture']) {
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

function writeGlb(json, binBuffer) {
  const jsonStr = JSON.stringify(json);
  const jsonPad = (4 - (jsonStr.length % 4)) % 4;
  const jsonChunk = Buffer.alloc(jsonStr.length + jsonPad, 0x20);
  jsonChunk.write(jsonStr, 0, 'utf8');

  const binPad = (4 - (binBuffer.length % 4)) % 4;
  const binChunk = Buffer.concat([binBuffer, Buffer.alloc(binPad, 0)]);

  const total = 12 + 8 + jsonChunk.length + 8 + binChunk.length;
  const out = Buffer.alloc(total);
  out.write('glTF', 0);
  out.writeUInt32LE(2, 4);
  out.writeUInt32LE(total, 8);
  out.writeUInt32LE(jsonChunk.length, 12);
  out.writeUInt32LE(0x4e4f534a, 16); // JSON
  jsonChunk.copy(out, 20);
  const binHdr = 20 + jsonChunk.length;
  out.writeUInt32LE(binChunk.length, binHdr);
  out.writeUInt32LE(0x004e4942, binHdr + 4); // BIN
  binChunk.copy(out, binHdr + 8);
  return out;
}

/**
 * Extract one named root node (and subtree) into a standalone GLB buffer.
 */
export function extractNodeToGlb(sourceJson, sourceBin, rootNodeIndex, outName) {
  const { meshes, nodes: nodeSet } = collectSubtree(rootNodeIndex, sourceJson);
  if (meshes.size === 0) {
    throw new Error(`Node ${rootNodeIndex} has no meshes`);
  }

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
  const newBufferViews = [];
  for (const oldBv of bufferViewList) {
    const bv = sourceJson.bufferViews[oldBv];
    const byteOffset = bv.byteOffset ?? 0;
    const byteLength = bv.byteLength;
    const slice = sourceBin.subarray(byteOffset, byteOffset + byteLength);
    const pad = (4 - (binCursor % 4)) % 4;
    if (pad) {
      newBinParts.push(Buffer.alloc(pad, 0));
      binCursor += pad;
    }
    newBinParts.push(Buffer.from(slice));
    newBufferViews.push({
      buffer: 0,
      byteOffset: binCursor,
      byteLength,
      ...(bv.byteStride !== undefined ? { byteStride: bv.byteStride } : {}),
      ...(bv.target !== undefined ? { target: bv.target } : {}),
    });
    binCursor += byteLength;
  }
  const newBin = Buffer.concat(newBinParts.length ? newBinParts : [Buffer.alloc(0)]);

  const newAccessors = [...deps.accessors].map((oldI) => {
    const a = { ...sourceJson.accessors[oldI] };
    if (a.bufferView !== undefined) a.bufferView = bvMap.get(a.bufferView);
    return a;
  });

  const newMeshes = [...deps.meshes].map((oldI) => {
    const m = JSON.parse(JSON.stringify(sourceJson.meshes[oldI]));
    for (const prim of m.primitives ?? []) {
      for (const [k, v] of Object.entries(prim.attributes ?? {})) {
        prim.attributes[k] = accMap.get(v);
      }
      if (prim.indices !== undefined) prim.indices = accMap.get(prim.indices);
      if (prim.material !== undefined) prim.material = matMap.get(prim.material);
    }
    return m;
  });

  const newMaterials = [...deps.materials].map((oldI) => {
    const mat = JSON.parse(JSON.stringify(sourceJson.materials[oldI]));
    const pbr = mat.pbrMetallicRoughness;
    if (pbr?.baseColorTexture) pbr.baseColorTexture.index = texMap.get(pbr.baseColorTexture.index);
    if (pbr?.metallicRoughnessTexture) {
      pbr.metallicRoughnessTexture.index = texMap.get(pbr.metallicRoughnessTexture.index);
    }
    for (const key of ['normalTexture', 'emissiveTexture', 'occlusionTexture']) {
      if (mat[key]?.index !== undefined) mat[key].index = texMap.get(mat[key].index);
    }
    return mat;
  });

  const newTextures = [...deps.textures].map((oldI) => {
    const t = { ...sourceJson.textures[oldI] };
    if (t.source !== undefined) t.source = imgMap.get(t.source);
    if (t.sampler !== undefined) t.sampler = sampMap.get(t.sampler);
    return t;
  });

  const newImages = [...deps.images].map((oldI) => {
    const img = { ...sourceJson.images[oldI] };
    if (img.bufferView !== undefined) img.bufferView = bvMap.get(img.bufferView);
    return img;
  });

  const newSamplers = [...deps.samplers].map((oldI) => ({ ...sourceJson.samplers[oldI] }));

  // Rebuild node list — only subtree, remapped children
  const nodeList = [...nodeSet].sort((a, b) => a - b);
  const nodeMap = new Map(nodeList.map((v, i) => [v, i]));
  const newNodes = nodeList.map((oldI) => {
    const n = sourceJson.nodes[oldI];
    const nn = { name: n.name };
    if (n.mesh !== undefined) nn.mesh = meshMap.get(n.mesh);
    if (n.translation) nn.translation = n.translation;
    if (n.rotation) nn.rotation = n.rotation;
    if (n.scale) nn.scale = n.scale;
    if (n.matrix) nn.matrix = n.matrix;
    if (n.children?.length) {
      nn.children = n.children
        .filter((c) => nodeMap.has(c))
        .map((c) => nodeMap.get(c));
      if (!nn.children.length) delete nn.children;
    }
    return nn;
  });

  const rootNew = nodeMap.get(rootNodeIndex);
  const outJson = {
    asset: { version: '2.0', generator: 'grudge-glbExtract' },
    scene: 0,
    scenes: [{ name: outName, nodes: [rootNew] }],
    nodes: newNodes,
    meshes: newMeshes,
    accessors: newAccessors,
    bufferViews: newBufferViews,
    buffers: [{ byteLength: newBin.length }],
  };
  if (newMaterials.length) outJson.materials = newMaterials;
  if (newTextures.length) outJson.textures = newTextures;
  if (newImages.length) outJson.images = newImages;
  if (newSamplers.length) outJson.samplers = newSamplers;

  return writeGlb(outJson, newBin);
}

/**
 * Extract all named roots matching optional allowlist into outDir.
 * @returns {{ name: string, path: string, bytes: number }[]}
 */
export function extractAllNamedRoots(sourceGlbPath, outDir, { allowlist = null, nameMap = null } = {}) {
  const { json, bin } = readGlb(sourceGlbPath);
  fs.mkdirSync(outDir, { recursive: true });
  const roots = listNamedMeshRoots(json);
  const written = [];

  for (const { index, name } of roots) {
    if (allowlist && !allowlist.has(name) && !allowlist.has(name.toLowerCase())) continue;
    const safe = (nameMap?.[name] ?? name).replace(/[^\w.-]+/g, '_');
    const outPath = path.join(outDir, `${safe}.glb`);
    try {
      const glb = extractNodeToGlb(json, bin, index, safe);
      fs.writeFileSync(outPath, glb);
      written.push({ name: safe, sourceName: name, path: outPath, bytes: glb.length });
    } catch (e) {
      console.warn(`  skip ${name}: ${e.message}`);
    }
  }
  return written;
}
