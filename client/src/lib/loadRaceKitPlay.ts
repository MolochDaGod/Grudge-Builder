/**
 * Warlords play body — ONLY loadRaceKit (CDN grudge6-kit.js).
 * Same contract as casting.grudge.studio play-kit health.
 * Do not freestyle GLB + deploySafeCharacter for play heroes.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { ensureSharedGltfReady } from '@/lib/three/SharedGltfPipeline';
import { WARLORDS_PLAY_CONTRACT_VERSION } from '@shared/fleet';

const KIT_URL = 'https://assets.grudge-studio.com/js/grudge6-kit.js';

export type LoadRaceKitPlayOpts = {
  targetHeightM?: number;
  meshIds?: string[];
  /** Leave all equippable hidden — caller applies paperdoll */
  skipDefaultLoadout?: boolean;
};

type KitModule = {
  loadRaceKit: (
    three: typeof THREE,
    loaders: { GLTFLoader: typeof GLTFLoader; FBXLoader: typeof FBXLoader },
    raceId: string,
    opts?: Record<string, unknown>,
  ) => Promise<{
    root: THREE.Object3D;
    equip: {
      applyMeshIds: (ids: string[]) => unknown;
      applyDefaultLoadout: () => void;
      enforceExclusiveVisibility?: () => void;
    };
    ground: { heightM?: number; scale?: number } | null;
    url: string;
    source: string;
    materialMode?: string;
  }>;
};

let kitPromise: Promise<KitModule> | null = null;

function loadKitModule(): Promise<KitModule> {
  if (!kitPromise) {
    kitPromise = import(/* @vite-ignore */ KIT_URL) as Promise<KitModule>;
  }
  return kitPromise;
}

/** Stamp play-contract on kit root (fleet fail-closed gate). */
export function stampWarlordsPlayContract(
  root: THREE.Object3D,
  meta: { raceId: string; url: string; loader: string },
): void {
  root.userData.warlordsPlayContract = {
    id: 'grudge6-warlords-play',
    version: WARLORDS_PLAY_CONTRACT_VERSION,
    loader: meta.loader,
    raceId: meta.raceId,
    sourceUrl: meta.url,
    mixer: 1,
    siHumanM: 1.8,
    stampedAt: new Date().toISOString(),
  };
}

/**
 * Load Toon RTS play kit via CDN loadRaceKit — SI fit + embeds + equip catalog.
 */
export async function loadRaceKitPlay(
  raceId: string,
  opts: LoadRaceKitPlayOpts = {},
): Promise<{
  root: THREE.Group;
  equip: KitModule extends { loadRaceKit: (...a: infer _A) => Promise<infer R> }
    ? R extends { equip: infer E }
      ? E
      : never
    : never;
  heightM: number;
  url: string;
}> {
  await ensureSharedGltfReady();
  const kit = await loadKitModule();
  const loaded = await kit.loadRaceKit(
    THREE,
    { GLTFLoader, FBXLoader },
    raceId,
    {
      source: 'toonRts',
      targetHeight: opts.targetHeightM ?? 1.8,
      meshIds: opts.meshIds,
      skipDefaultLoadout: opts.skipDefaultLoadout === true || !!opts.meshIds?.length,
      ground: true,
      centerXZ: true,
    },
  );

  const root =
    loaded.root instanceof THREE.Group
      ? loaded.root
      : (() => {
          const g = new THREE.Group();
          g.name = `raceKit_${raceId}`;
          g.add(loaded.root);
          return g;
        })();

  stampWarlordsPlayContract(root, {
    raceId,
    url: loaded.url,
    loader: 'loadRaceKit',
  });

  const heightM =
    typeof loaded.ground?.heightM === 'number' && loaded.ground.heightM > 0
      ? loaded.ground.heightM
      : opts.targetHeightM ?? 1.8;

  return {
    root,
    equip: loaded.equip as never,
    heightM,
    url: loaded.url,
  };
}
