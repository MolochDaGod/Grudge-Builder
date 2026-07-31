/**
 * Unit tests — smart harvest tool gates for pinata ore/rock/trees.
 */
import { describe, it, expect } from 'vitest';
import {
  classifyRock,
  gateHarvestStrike,
  toolMatchesNode,
  toolsFor,
  resourceTypeForClass,
  HARVEST_STRIKE_RANGE_M,
} from './HarvestNodeRecognition';

describe('HarvestNodeRecognition', () => {
  it('classifies ore vs rock', () => {
    expect(classifyRock(true)).toBe('ore');
    expect(classifyRock(false)).toBe('rock');
    expect(classifyRock(undefined)).toBe('rock');
  });

  it('requires axe for trees and pickaxe for rock/ore', () => {
    expect(toolsFor('tree')).toContain('axe');
    expect(toolsFor('rock')).toContain('pickaxe');
    expect(toolsFor('ore')).toContain('pickaxe');
    expect(toolMatchesNode('axe', 'tree')).toBe(true);
    expect(toolMatchesNode('pickaxe', 'tree')).toBe(false);
    expect(toolMatchesNode('pickaxe', 'ore')).toBe(true);
    expect(toolMatchesNode('axe', 'ore')).toBe(false);
  });

  it('gates wrong tool with message', () => {
    const r = gateHarvestStrike('axe', 'ore');
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/Wrong tool/i);
    expect(r.required).toContain('pickaxe');
  });

  it('gates out of range', () => {
    const r = gateHarvestStrike('axe', 'tree', {
      distanceM: HARVEST_STRIKE_RANGE_M + 2,
    });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/Too far/i);
  });

  it('allows correct tool in range', () => {
    const r = gateHarvestStrike('pickaxe', 'rock', { distanceM: 2 });
    expect(r.ok).toBe(true);
    expect(r.label).toBe('Rock');
  });

  it('maps resource types for loot bag', () => {
    expect(resourceTypeForClass('tree')).toBe('forest');
    expect(resourceTypeForClass('ore')).toBe('mining');
    expect(resourceTypeForClass('flower')).toBe('herbalism');
  });
});
