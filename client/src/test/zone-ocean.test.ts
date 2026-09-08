import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { buildZoneScene } from '../island3d/engine/ZoneSceneBuilder';
import { getSectorById } from '@shared/definitions/worldMapSectors';

describe('sector ocean animation', () => {
  it('advances the real ocean shader without deforming the base mesh', () => {
    const sector = getSectorById('haven_shore')!;
    const zone = buildZoneScene(sector, {
      sectorId: sector.id, worldSeed: 'ocean-regression', nodes: new Map(),
      islandIds: [], lastTickMs: 0, playerCount: 0,
    });
    try {
      const material = zone.ocean.material as THREE.ShaderMaterial;
      const positions = zone.ocean.geometry.getAttribute('position');
      const initial = Array.from(positions.array);
      zone.update(1 / 60, 3);
      expect(material.uniforms.uTime.value).toBe(3);
      zone.update(1 / 60, 6);
      expect(material.uniforms.uTime.value).toBe(6);
      expect(Array.from(positions.array)).toEqual(initial);
    } finally {
      zone.dispose();
    }
  });
});
