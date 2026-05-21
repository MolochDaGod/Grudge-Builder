/**
 * Tool Registry & Model Routing Tests
 *
 * Verifies that:
 *   1. Every model in the registry is valid and has correct metadata
 *   2. resolveModel routes to the right model for every capability/agent/override combo
 *   3. Defaults match the documented smart defaults
 *   4. Agent → model mapping is consistent
 *   5. Avatar → voice mapping is complete
 *   6. getModel / getModelsByCapability / isValidModel behave correctly
 *   7. Provider routing produces correct gateway paths
 */

import { describe, it, expect } from 'vitest';
import {
  MODEL_REGISTRY,
  AI_DEFAULTS,
  AGENT_MODELS,
  AVATAR_VOICES,
  getModel,
  getModelsByCapability,
  isValidModel,
  resolveModel,
} from '../../../shared/aiModels';
import type { ModelCapability, CostTier } from '../../../shared/aiModels';

// ── Registry Integrity ───────────────────────────────────────────────────────

describe('MODEL_REGISTRY', () => {
  it('contains 24 models', () => {
    expect(MODEL_REGISTRY.length).toBe(24);
  });

  it('has no duplicate IDs', () => {
    const ids = MODEL_REGISTRY.map(m => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every model has required fields', () => {
    for (const m of MODEL_REGISTRY) {
      expect(m.id).toBeTruthy();
      expect(m.provider).toBeTruthy();
      expect(m.capability).toBeTruthy();
      expect(m.costTier).toBeTruthy();
    }
  });

  const validCapabilities: ModelCapability[] = ['chat', 'image', 'video', 'speech', 'music', 'image-to-video'];
  const validCostTiers: CostTier[] = ['free', 'budget', 'standard', 'premium'];

  it('all capabilities are valid', () => {
    for (const m of MODEL_REGISTRY) {
      expect(validCapabilities).toContain(m.capability);
    }
  });

  it('all cost tiers are valid', () => {
    for (const m of MODEL_REGISTRY) {
      expect(validCostTiers).toContain(m.costTier);
    }
  });

  it('has models for every primary capability', () => {
    const caps = new Set(MODEL_REGISTRY.map(m => m.capability));
    expect(caps.has('chat')).toBe(true);
    expect(caps.has('image')).toBe(true);
    expect(caps.has('video')).toBe(true);
    expect(caps.has('speech')).toBe(true);
    expect(caps.has('music')).toBe(true);
  });
});

// ── Model Counts Per Capability ──────────────────────────────────────────────

describe('getModelsByCapability', () => {
  it('returns 7 chat models', () => {
    expect(getModelsByCapability('chat').length).toBe(7);
  });

  it('returns 5 image models', () => {
    expect(getModelsByCapability('image').length).toBe(5);
  });

  it('returns 9 video models (excludes image-to-video)', () => {
    expect(getModelsByCapability('video').length).toBe(9);
  });

  it('returns 1 image-to-video model', () => {
    expect(getModelsByCapability('image-to-video').length).toBe(1);
  });

  it('returns 1 speech model', () => {
    expect(getModelsByCapability('speech').length).toBe(1);
  });

  it('returns 1 music model', () => {
    expect(getModelsByCapability('music').length).toBe(1);
  });

  it('returns empty for unknown capability', () => {
    expect(getModelsByCapability('unknown' as any).length).toBe(0);
  });
});

// ── getModel / isValidModel ──────────────────────────────────────────────────

describe('getModel', () => {
  it('returns the correct model for known IDs', () => {
    const m = getModel('claude-opus-4.7');
    expect(m).toBeDefined();
    expect(m!.provider).toBe('anthropic');
    expect(m!.capability).toBe('chat');
    expect(m!.costTier).toBe('premium');
  });

  it('returns undefined for unknown IDs', () => {
    expect(getModel('nonexistent-model')).toBeUndefined();
  });

  it('finds every registered model by ID', () => {
    for (const m of MODEL_REGISTRY) {
      expect(getModel(m.id)).toBe(m);
    }
  });
});

describe('isValidModel', () => {
  it('returns true for all registered models', () => {
    for (const m of MODEL_REGISTRY) {
      expect(isValidModel(m.id)).toBe(true);
    }
  });

  it('returns false for unknown models', () => {
    expect(isValidModel('gpt-99')).toBe(false);
    expect(isValidModel('')).toBe(false);
  });
});

// ── Smart Defaults ───────────────────────────────────────────────────────────

describe('AI_DEFAULTS', () => {
  it('chat default is gpt-5.4-pro', () => {
    expect(AI_DEFAULTS.chat.default).toBe('gpt-5.4-pro');
  });

  it('image default is gpt-image-1.5 (transparency)', () => {
    expect(AI_DEFAULTS.image.default).toBe('gpt-image-1.5');
  });

  it('video default is seedance-2.0', () => {
    expect(AI_DEFAULTS.video.default).toBe('seedance-2.0');
  });

  it('speech default is tts-2', () => {
    expect(AI_DEFAULTS.speech.default).toBe('tts-2');
  });

  it('music default is music-2.6', () => {
    expect(AI_DEFAULTS.music.default).toBe('music-2.6');
  });

  it('every default model ID exists in the registry', () => {
    for (const [, tier] of Object.entries(AI_DEFAULTS)) {
      for (const [, modelId] of Object.entries(tier)) {
        expect(isValidModel(modelId)).toBe(true);
      }
    }
  });
});

// ── resolveModel ─────────────────────────────────────────────────────────────

describe('resolveModel', () => {
  // Priority 1: explicit model
  it('returns explicit model when valid', () => {
    expect(resolveModel('recraftv3', 'image')).toBe('recraftv3');
    expect(resolveModel('qwen3-max', 'chat')).toBe('qwen3-max');
    expect(resolveModel('hh1-t2v', 'video')).toBe('hh1-t2v');
  });

  it('ignores invalid explicit model and falls through', () => {
    expect(resolveModel('nonexistent', 'chat')).toBe('gpt-5.4-pro');
    expect(resolveModel('fake-model', 'image')).toBe('gpt-image-1.5');
  });

  // Priority 2: agent-specific default
  it('resolves agent-specific model when no explicit', () => {
    expect(resolveModel(undefined, 'chat', 'code_architect')).toBe('claude-opus-4.7');
    expect(resolveModel(undefined, 'chat', 'loremaster')).toBe('gpt-5.5');
    expect(resolveModel(undefined, 'chat', 'balance_engineer')).toBe('qwen3-max');
    expect(resolveModel(undefined, 'chat', 'art_director')).toBe('gpt-5.5');
    expect(resolveModel(undefined, 'chat', 'qa_analyst')).toBe('claude-opus-4.7');
    expect(resolveModel(undefined, 'chat', 'mission_designer')).toBe('gpt-5.5');
  });

  it('explicit model overrides agent default', () => {
    expect(resolveModel('kimi-k2.6', 'chat', 'code_architect')).toBe('kimi-k2.6');
  });

  it('unknown agent falls through to capability default', () => {
    expect(resolveModel(undefined, 'chat', 'unknown_agent')).toBe('gpt-5.4-pro');
  });

  // Priority 3: capability default
  it('falls through to capability default when no explicit/agent', () => {
    expect(resolveModel(undefined, 'chat')).toBe('gpt-5.4-pro');
    expect(resolveModel(undefined, 'image')).toBe('gpt-image-1.5');
    expect(resolveModel(undefined, 'video')).toBe('seedance-2.0');
    expect(resolveModel(undefined, 'speech')).toBe('tts-2');
    expect(resolveModel(undefined, 'music')).toBe('music-2.6');
  });

  // Priority 4: global fallback
  it('falls back to gpt-5.4-pro for unknown capability', () => {
    expect(resolveModel(undefined, 'unknown' as any)).toBe('gpt-5.4-pro');
  });
});

// ── Agent → Model Mapping ────────────────────────────────────────────────────

describe('AGENT_MODELS', () => {
  it('has 6 agent personas', () => {
    expect(Object.keys(AGENT_MODELS).length).toBe(6);
  });

  it('all agent model IDs are valid', () => {
    for (const [agent, modelId] of Object.entries(AGENT_MODELS)) {
      expect(isValidModel(modelId)).toBe(true);
    }
  });

  it('maps code_architect to claude-opus-4.7 (reasoning)', () => {
    expect(AGENT_MODELS.code_architect).toBe('claude-opus-4.7');
  });

  it('maps art_director to gpt-5.5 (creative)', () => {
    expect(AGENT_MODELS.art_director).toBe('gpt-5.5');
  });

  it('maps balance_engineer to qwen3-max (budget)', () => {
    expect(AGENT_MODELS.balance_engineer).toBe('qwen3-max');
  });
});

// ── Avatar → Voice Mapping ───────────────────────────────────────────────────

describe('AVATAR_VOICES', () => {
  it('has 3 avatar presets', () => {
    expect(Object.keys(AVATAR_VOICES).length).toBe(3);
  });

  it('crusade-ninja uses nova', () => {
    expect(AVATAR_VOICES['crusade-ninja'].voice).toBe('nova');
  });

  it('legion-viking uses onyx', () => {
    expect(AVATAR_VOICES['legion-viking'].voice).toBe('onyx');
  });

  it('fabled-mage uses shimmer', () => {
    expect(AVATAR_VOICES['fabled-mage'].voice).toBe('shimmer');
  });

  it('every avatar has both voice and style', () => {
    for (const [, v] of Object.entries(AVATAR_VOICES)) {
      expect(v.voice).toBeTruthy();
      expect(v.style).toBeTruthy();
    }
  });
});

// ── Provider Routing ─────────────────────────────────────────────────────────

describe('provider routing', () => {
  const providerMap: Record<string, string> = {
    'claude-opus-4.7': 'anthropic',
    'gpt-5.5': 'openai',
    'gpt-5.4-pro': 'openai',
    'kimi-k2.6': 'moonshot',
    'qwen3-max': 'alibaba',
    'gpt-image-1.5': 'openai',
    'gpt-image-2': 'openai',
    'recraftv3': 'recraft',
    'wan-2.6-image': 'alibaba',
    'grok-imagine-image': 'xai',
    'seedance-2.0': 'bytedance',
    'grok-imagine-video': 'xai',
    'gen-4.5': 'runwayml',
    'hh1-t2v': 'alibaba',
    'v6': 'pixverse',
    'q3-turbo': 'vidu',
    'tts-2': 'inworld',
    'music-2.6': 'minimax',
  };

  for (const [modelId, expectedProvider] of Object.entries(providerMap)) {
    it(`${modelId} → ${expectedProvider}`, () => {
      const m = getModel(modelId);
      expect(m).toBeDefined();
      expect(m!.provider).toBe(expectedProvider);
    });
  }
});

// ── Transparency Support ─────────────────────────────────────────────────────

describe('transparency support', () => {
  it('gpt-image-1.5 supports transparency', () => {
    expect(getModel('gpt-image-1.5')!.supportsTransparency).toBe(true);
  });

  it('gpt-image-2 does NOT support transparency', () => {
    expect(getModel('gpt-image-2')!.supportsTransparency).toBe(false);
  });

  it('only gpt-image-1.5 has supportsTransparency=true among image models', () => {
    const imageModels = getModelsByCapability('image');
    const transparentModels = imageModels.filter(m => m.supportsTransparency === true);
    expect(transparentModels.length).toBe(1);
    expect(transparentModels[0].id).toBe('gpt-image-1.5');
  });
});

// ── Audio Support ────────────────────────────────────────────────────────────

describe('audio support on video models', () => {
  const audioModels = ['seedance-2.0', 'seedance-2.0-fast', 'grok-imagine-video', 'v6', 'v5.6', 'q3-turbo', 'q3-pro'];
  const noAudioModels = ['gen-4.5', 'hh1-t2v'];

  for (const id of audioModels) {
    it(`${id} supports audio`, () => {
      expect(getModel(id)!.supportsAudio).toBe(true);
    });
  }

  for (const id of noAudioModels) {
    it(`${id} does not have audio flag`, () => {
      const m = getModel(id)!;
      expect(m.supportsAudio).toBeFalsy();
    });
  }
});

// ── Tool Calling Support ─────────────────────────────────────────────────────

describe('tool calling support', () => {
  it('kimi-k2.6 supports tool calling', () => {
    expect(getModel('kimi-k2.6')!.supportsToolCalling).toBe(true);
  });

  it('only kimi-k2.6 has supportsToolCalling=true', () => {
    const toolCallers = MODEL_REGISTRY.filter(m => m.supportsToolCalling === true);
    expect(toolCallers.length).toBe(1);
    expect(toolCallers[0].id).toBe('kimi-k2.6');
  });
});

// ── Cross-references: defaults → registry consistency ────────────────────────

describe('defaults ↔ registry consistency', () => {
  it('image.default model has transparency', () => {
    const m = getModel(AI_DEFAULTS.image.default)!;
    expect(m.supportsTransparency).toBe(true);
  });

  it('video.default model has audio', () => {
    const m = getModel(AI_DEFAULTS.video.default)!;
    expect(m.supportsAudio).toBe(true);
  });

  it('chat.agentic model has tool calling', () => {
    const m = getModel(AI_DEFAULTS.chat.agentic)!;
    expect(m.supportsToolCalling).toBe(true);
  });

  it('image.edit model is from xai (inpainting provider)', () => {
    const m = getModel(AI_DEFAULTS.image.edit)!;
    expect(m.provider).toBe('xai');
  });

  it('video.budget is the cheapest video option', () => {
    const m = getModel(AI_DEFAULTS.video.budget)!;
    expect(m.costTier).toBe('budget');
  });

  it('chat.budget is budget tier', () => {
    const m = getModel(AI_DEFAULTS.chat.budget)!;
    expect(m.costTier).toBe('budget');
  });

  it('chat.premium is premium tier', () => {
    const m = getModel(AI_DEFAULTS.chat.premium)!;
    expect(m.costTier).toBe('premium');
  });
});
