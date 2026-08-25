import { describe, it, expect } from 'vitest';
import {
  classifyBossArenaMesh,
  colliderRoleForArenaLayer,
  decideArenaScale,
} from './bossArenaPlay';

describe('boss arena play layers + size', () => {
  it('classifies named Hoth / desert / lava meshes', () => {
    expect(classifyBossArenaMesh('WalkableFloor_lambert1_0')).toBe('terrain');
    expect(classifyBossArenaMesh('Central_Water_lambert2_0')).toBe('water');
    expect(classifyBossArenaMesh('IceColumn_lambert3_0')).toBe('column');
    expect(classifyBossArenaMesh('Room_Boss_11:Column_1')).toBe('column');
    expect(classifyBossArenaMesh('base_Main_Base_0')).toBe('terrain');
    expect(classifyBossArenaMesh('lower_Bottom_Main__0')).toBe('seafloor');
    expect(classifyBossArenaMesh('sky_Sky01_0 Sky01')).toBe('ignore');
    expect(classifyBossArenaMesh('Outer_lambert1_0')).toBe('building');
    expect(classifyBossArenaMesh('Walls_lambert2_0')).toBe('building');
  });

  it('maps layers to fleet collider roles', () => {
    expect(colliderRoleForArenaLayer('terrain')).toBe('ground');
    expect(colliderRoleForArenaLayer('column')).toBe('wall');
    expect(colliderRoleForArenaLayer('water')).toBe('sensor_trigger');
    expect(colliderRoleForArenaLayer('ignore')).toBe(null);
  });

  it('keeps SI arenas, fixes 100× and tiny maps', () => {
    expect(decideArenaScale(78).reason).toBe('si_ok');
    expect(decideArenaScale(78).scale).toBe(1);
    expect(decideArenaScale(7800).reason).toBe('cm_as_m');
    expect(decideArenaScale(7800).scale).toBe(0.01);
    expect(decideArenaScale(4).reason).toBe('upscale');
  });
});
