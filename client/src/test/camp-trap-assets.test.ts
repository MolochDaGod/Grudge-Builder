import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { NpcCampSystem } from '../island3d/camps/NpcCampSystem';
import { loadBuildAssetModel } from '../island3d/building/PackModelLoader';

vi.mock('../lib/three/SharedGltfPipeline', () => ({
  loadAssetGltf: async () => ({ scene: new THREE.Group() }),
}));
vi.mock('../island3d/building/PackModelLoader', () => ({
  loadBuildAssetModel: vi.fn(),
}));

describe('camp trap asset recovery', () => {
  it('does not grant a failed trap upgrade and allows a successful retry', async () => {
    const onUpgradeAdded = vi.fn();
    const system = new NpcCampSystem({
      scene: new THREE.Scene(), playerFaction: 'crusade',
      sampleHeight: () => 10, onUpgradeAdded,
    });
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      vi.mocked(loadBuildAssetModel).mockImplementation(async () => new THREE.Group());
      const camp = await system.spawnCamp({ faction: 'crusade', x: 0, z: 0 });
      expect(camp).not.toBeNull();
      const initialUpgrades = [...camp!.data.upgrades];
      const initialRoots = [...camp!.upgradeRoots];
      onUpgradeAdded.mockClear();
      vi.mocked(loadBuildAssetModel).mockRejectedValueOnce(new Error('asset unavailable'));
      await expect(system.addUpgrade(camp!.data.id, 'camp_spike_trap')).resolves.toBe(false);
      expect(camp!.data.upgrades).toEqual(initialUpgrades);
      expect(camp!.upgradeRoots).toEqual(initialRoots);
      expect(onUpgradeAdded).not.toHaveBeenCalled();

      const asset = new THREE.Group();
      vi.mocked(loadBuildAssetModel).mockResolvedValueOnce(asset);
      await expect(system.addUpgrade(camp!.data.id, 'camp_spike_trap')).resolves.toBe(true);
      expect(camp!.data.upgrades).toHaveLength(initialUpgrades.length + 1);
      expect(camp!.upgradeRoots.at(-1)!.children).toContain(asset);
      expect(onUpgradeAdded).toHaveBeenCalledOnce();
    } finally {
      warning.mockRestore();
      system.dispose();
    }
  });
});
