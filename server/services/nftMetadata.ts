/**
 * NFT Metadata Pipeline
 *
 * Handles the full flow from generated image → permanent storage → Metaplex metadata.
 * Used by both character cNFT minting and island cNFT minting.
 *
 * Flow:
 *   1. Receive image (base64 data URI or URL)
 *   2. Upload image to Grudge object storage (assets.grudge-studio.com)
 *   3. Build Metaplex-compatible metadata JSON
 *   4. Upload metadata JSON to object storage
 *   5. Return { imageUri, metadataUri } for Crossmint mint call
 */

import crypto from 'node:crypto';

const OBJECT_STORAGE_BASE = process.env.OBJECT_STORAGE_URL || 'https://assets.grudge-studio.com';
const OBJECT_STORAGE_UPLOAD = `${OBJECT_STORAGE_BASE}/upload`;
const METADATA_COLLECTION = 'grudge-warlords';

// ── Image Upload ──────────────────────────────────────────────────────────────

/**
 * Upload a base64 data URI or fetch a remote URL, store in object storage.
 * Returns the permanent public URL.
 */
export async function uploadImageToStorage(
  imageData: string,
  filename: string,
): Promise<string> {
  let buffer: Buffer;
  let contentType = 'image/png';

  if (imageData.startsWith('data:')) {
    // Base64 data URI
    const match = imageData.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) throw new Error('Invalid data URI');
    contentType = match[1];
    buffer = Buffer.from(match[2], 'base64');
  } else if (imageData.startsWith('http')) {
    // Remote URL — fetch and re-upload for permanence
    const res = await fetch(imageData);
    if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
    const arrayBuf = await res.arrayBuffer();
    buffer = Buffer.from(arrayBuf);
    contentType = res.headers.get('content-type') || 'image/png';
  } else {
    throw new Error('Image must be a data URI or URL');
  }

  // Upload to object storage via R2-compatible PUT
  // The CDN worker at assets.grudge-studio.com needs a PUT /upload endpoint,
  // or we write directly via the R2 binding from the server.
  // For now, use a simple PUT with the binary body.
  const uploadUrl = `${OBJECT_STORAGE_BASE}/nft/${filename}`;
  try {
    const uploadRes = await fetch(`${OBJECT_STORAGE_UPLOAD}`, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        'X-Upload-Path': `nft/${filename}`,
        'Authorization': `Bearer ${process.env.OBJECT_STORAGE_TOKEN || ''}`,
      },
      body: buffer,
    });
    if (uploadRes.ok) {
      const result = await uploadRes.json().catch(() => ({}));
      return (result as any).url || uploadUrl;
    }
  } catch (e) {
    console.warn('Object storage upload failed, using local fallback:', e);
  }

  // Fallback: save to local public directory and serve from app origin
  const fs = await import('node:fs');
  const path = await import('node:path');
  const localDir = path.join(process.cwd(), 'public', 'avatars');
  if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });
  fs.writeFileSync(path.join(localDir, filename), buffer);
  return `/avatars/${filename}`;
}

// ── Metaplex Metadata ─────────────────────────────────────────────────────────

interface MetaplexAttribute {
  trait_type: string;
  value: string | number;
}

interface MetaplexMetadata {
  name: string;
  symbol: string;
  description: string;
  image: string;
  external_url: string;
  attributes: MetaplexAttribute[];
  properties: {
    files: { uri: string; type: string }[];
    category: string;
    creators: { address: string; share: number }[];
  };
  collection?: {
    name: string;
    family: string;
  };
}

/**
 * Build Metaplex-compatible metadata JSON for a character cNFT.
 */
export function buildCharacterMetadata(
  name: string,
  imageUri: string,
  race: string,
  characterClass: string,
  level: number,
  faction?: string,
): MetaplexMetadata {
  return {
    name,
    symbol: 'GRUDA',
    description: `${name} — a ${race} ${characterClass} of the Grudge Warlords.`,
    image: imageUri,
    external_url: 'https://grudgewarlords.com',
    attributes: [
      { trait_type: 'Race', value: race },
      { trait_type: 'Class', value: characterClass },
      { trait_type: 'Level', value: level },
      ...(faction ? [{ trait_type: 'Faction', value: faction }] : []),
    ],
    properties: {
      files: [{ uri: imageUri, type: 'image/png' }],
      category: 'image',
      creators: [{ address: process.env.CREATOR_WALLET || '', share: 100 }],
    },
    collection: {
      name: 'Grudge Warlords Characters',
      family: METADATA_COLLECTION,
    },
  };
}

/**
 * Build Metaplex-compatible metadata JSON for an island cNFT.
 */
export function buildIslandMetadata(
  islandName: string,
  imageUri: string,
  seed: string,
  mapStyle: string,
  landTiles?: number,
): MetaplexMetadata {
  return {
    name: islandName,
    symbol: 'GRUDISLE',
    description: `${islandName} — a home island in the Grudge Warlords world.`,
    image: imageUri,
    external_url: 'https://grudgewarlords.com',
    attributes: [
      { trait_type: 'Seed', value: seed },
      { trait_type: 'Map Style', value: mapStyle },
      ...(landTiles ? [{ trait_type: 'Land Tiles', value: landTiles }] : []),
    ],
    properties: {
      files: [{ uri: imageUri, type: 'image/png' }],
      category: 'image',
      creators: [{ address: process.env.CREATOR_WALLET || '', share: 100 }],
    },
    collection: {
      name: 'Grudge Warlords Islands',
      family: METADATA_COLLECTION,
    },
  };
}

/**
 * Upload metadata JSON to object storage.
 * Returns the permanent metadata URI.
 */
export async function uploadMetadataToStorage(
  metadata: MetaplexMetadata,
  entityId: string,
  type: 'character' | 'island',
): Promise<string> {
  const filename = `${type}_${entityId}_metadata.json`;
  const json = JSON.stringify(metadata, null, 2);
  const buffer = Buffer.from(json, 'utf-8');

  const metadataUrl = `${OBJECT_STORAGE_BASE}/nft/metadata/${filename}`;
  try {
    const res = await fetch(`${OBJECT_STORAGE_UPLOAD}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Upload-Path': `nft/metadata/${filename}`,
        'Authorization': `Bearer ${process.env.OBJECT_STORAGE_TOKEN || ''}`,
      },
      body: json,
    });
    if (res.ok) {
      const result = await res.json().catch(() => ({}));
      return (result as any).url || metadataUrl;
    }
  } catch (e) {
    console.warn('Metadata upload failed, using local fallback:', e);
  }

  // Fallback: save locally
  const fs = await import('node:fs');
  const path = await import('node:path');
  const localDir = path.join(process.cwd(), 'public', 'avatars', 'metadata');
  if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });
  fs.writeFileSync(path.join(localDir, filename), json);
  return `/avatars/metadata/${filename}`;
}

// ── Full Pipeline ─────────────────────────────────────────────────────────────

/**
 * Full character cNFT metadata pipeline:
 *   image → object storage → metadata JSON → object storage → URIs
 */
export async function prepareCharacterNFTMetadata(
  characterId: string,
  characterName: string,
  avatarImageData: string,
  race: string,
  characterClass: string,
  level: number,
  faction?: string,
): Promise<{ imageUri: string; metadataUri: string }> {
  const hash = crypto.createHash('md5').update(characterId).digest('hex').slice(0, 8);
  const imageFilename = `char_${hash}_avatar.png`;

  // 1. Upload image
  const imageUri = await uploadImageToStorage(avatarImageData, imageFilename);

  // 2. Build metadata
  const metadata = buildCharacterMetadata(characterName, imageUri, race, characterClass, level, faction);

  // 3. Upload metadata JSON
  const metadataUri = await uploadMetadataToStorage(metadata, characterId, 'character');

  return { imageUri, metadataUri };
}

/**
 * Full island cNFT metadata pipeline:
 *   island map image → object storage → metadata JSON → object storage → URIs
 */
export async function prepareIslandNFTMetadata(
  islandId: string,
  islandName: string,
  mapImageData: string,
  seed: string,
  mapStyle: string,
  landTiles?: number,
): Promise<{ imageUri: string; metadataUri: string }> {
  const hash = crypto.createHash('md5').update(islandId).digest('hex').slice(0, 8);
  const imageFilename = `island_${hash}_map.png`;

  const imageUri = await uploadImageToStorage(mapImageData, imageFilename);
  const metadata = buildIslandMetadata(islandName, imageUri, seed, mapStyle, landTiles);
  const metadataUri = await uploadMetadataToStorage(metadata, islandId, 'island');

  return { imageUri, metadataUri };
}
