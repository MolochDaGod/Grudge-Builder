/**
 * Grudge Studio - Puter Cloud Service Integration
 * 
 * Core service layer for interacting with Puter.js cloud infrastructure.
 * Handles AI, storage, key-value, authentication, and CDN operations.
 * 
 * @module puterService
 * @version 2.0.0
 * @author Grudge Studio
 */

const EventEmitter = require('events');

// ============================================================================
// CONFIGURATION
// ============================================================================

const PUTER_CONFIG = {
  appName: 'Grudge Warlords',
  version: '2.5.0',
  studio: 'Grudge Studio',
  author: 'RacalvinDaPirateKing',
  serverUrl: process.env.PUTER_SERVER_URL || 'https://grudge-server.puter.work',
  cdnUrl: process.env.PUTER_CDN_URL || 'https://cdn.puter.com',
  apiTimeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
  cachePrefix: 'grudge_studio_',
  rateLimitPerMinute: 60,
};

/**
 * AI model IDs — synced with shared/aiModels.ts (the shared source of truth).
 * These are used as Puter-side fallbacks when the AI Gateway Worker is unreachable.
 * Prefer routing through https://ai.grudge-studio.com for centralized billing/logs.
 */
const AI_MODELS = {
  chat: {
    default: 'gpt-5.4-pro',
    premium: 'gpt-5.5',
    claude: 'claude-opus-4.7',
    agentic: 'kimi-k2.6',
    budget: 'qwen3-max',
    fast: 'gpt-5.4-pro',
  },
  image: {
    default: 'gpt-image-1.5',   // Transparent PNGs (sprites)
    quality: 'gpt-image-2',
    design: 'recraftv3',
    bulk: 'wan-2.6-image',
    edit: 'grok-imagine-image',
  },
  video: {
    default: 'seedance-2.0',
    fast: 'seedance-2.0-fast',
    budget: 'hh1-t2v',
  },
  voice: {
    voices: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
    defaultVoice: 'nova',
    default: 'tts-2',
  },
  music: {
    default: 'music-2.6',
  },
};

// ============================================================================
// CACHE LAYER
// ============================================================================

class MemoryCache {
  constructor(ttlMs = 300000) {
    this.cache = new Map();
    this.ttl = ttlMs;
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }

  set(key, value, ttlMs = this.ttl) {
    this.cache.set(key, {
      value,
      expires: Date.now() + ttlMs,
    });
  }

  delete(key) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expires) {
        this.cache.delete(key);
      }
    }
  }

  destroy() {
    clearInterval(this.cleanupInterval);
    this.cache.clear();
  }
}

// ============================================================================
// RATE LIMITER
// ============================================================================

class RateLimiter {
  constructor(maxRequests = 60, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = new Map();
  }

  canMakeRequest(key = 'global') {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    let requests = this.requests.get(key) || [];
    requests = requests.filter(time => time > windowStart);
    
    if (requests.length >= this.maxRequests) {
      return false;
    }
    
    requests.push(now);
    this.requests.set(key, requests);
    return true;
  }

  getRemainingRequests(key = 'global') {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    let requests = this.requests.get(key) || [];
    requests = requests.filter(time => time > windowStart);
    return Math.max(0, this.maxRequests - requests.length);
  }

  getResetTime(key = 'global') {
    const requests = this.requests.get(key) || [];
    if (requests.length === 0) return 0;
    return Math.max(0, requests[0] + this.windowMs - Date.now());
  }
}

// ============================================================================
// HTTP CLIENT WITH RETRY
// ============================================================================

async function fetchWithRetry(url, options = {}, maxRetries = PUTER_CONFIG.retryAttempts) {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), options.timeout || PUTER_CONFIG.apiTimeout);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      
      clearTimeout(timeout);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response;
    } catch (error) {
      lastError = error;
      
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => 
          setTimeout(resolve, PUTER_CONFIG.retryDelay * Math.pow(2, attempt))
        );
      }
    }
  }
  
  throw lastError;
}

// ============================================================================
// PUTER SERVICE CLASS
// ============================================================================

class PuterService extends EventEmitter {
  constructor() {
    super();
    this.cache = new MemoryCache();
    this.rateLimiter = new RateLimiter(PUTER_CONFIG.rateLimitPerMinute);
    this.isInitialized = false;
    this.connectionStatus = 'disconnected';
  }

  async initialize() {
    try {
      const health = await this.checkHealth();
      this.isInitialized = health.status === 'online';
      this.connectionStatus = health.status;
      this.emit('initialized', { status: this.connectionStatus });
      return this.isInitialized;
    } catch (error) {
      this.connectionStatus = 'error';
      this.emit('error', error);
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Health & Status
  // ---------------------------------------------------------------------------

  async checkHealth() {
    try {
      const response = await fetchWithRetry(`${PUTER_CONFIG.serverUrl}/api/health`);
      const data = await response.json();
      return {
        status: 'online',
        version: data.version || PUTER_CONFIG.version,
        latency: Date.now() - performance.now(),
        services: data.services || {},
      };
    } catch (error) {
      return {
        status: 'offline',
        version: 'unknown',
        error: error.message,
      };
    }
  }

  getStatus() {
    return {
      initialized: this.isInitialized,
      connectionStatus: this.connectionStatus,
      cacheSize: this.cache.cache.size,
      remainingRequests: this.rateLimiter.getRemainingRequests(),
      config: {
        serverUrl: PUTER_CONFIG.serverUrl,
        appName: PUTER_CONFIG.appName,
        version: PUTER_CONFIG.version,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // AI Chat Services
  // ---------------------------------------------------------------------------

  async chat(messages, options = {}) {
    if (!this.rateLimiter.canMakeRequest('chat')) {
      throw new Error('Rate limit exceeded. Please wait before making more requests.');
    }

    const cacheKey = `chat:${JSON.stringify({ messages, options })}`;
    const cached = this.cache.get(cacheKey);
    if (cached && !options.skipCache) return cached;

    try {
      const response = await fetchWithRetry(`${PUTER_CONFIG.serverUrl}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: Array.isArray(messages) ? messages : [{ role: 'user', content: messages }],
          model: options.model || AI_MODELS.chat.default,
          temperature: options.temperature || 0.7,
          max_tokens: options.maxTokens || 1000,
          stream: options.stream || false,
        }),
      });

      const data = await response.json();
      const result = data.content || data.message || data.response || null;
      
      if (result && !options.skipCache) {
        this.cache.set(cacheKey, result, 60000);
      }
      
      this.emit('chat', { messages, result });
      return result;
    } catch (error) {
      this.emit('error', { type: 'chat', error });
      throw error;
    }
  }

  async streamChat(messages, options = {}, onChunk) {
    if (!this.rateLimiter.canMakeRequest('chat')) {
      throw new Error('Rate limit exceeded');
    }

    const response = await fetch(`${PUTER_CONFIG.serverUrl}/api/ai/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: Array.isArray(messages) ? messages : [{ role: 'user', content: messages }],
        model: options.model || AI_MODELS.chat.default,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 1000,
        stream: true,
      }),
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      fullResponse += chunk;
      onChunk?.(chunk, fullResponse);
    }

    return fullResponse;
  }

  // ---------------------------------------------------------------------------
  // AI Image Generation
  // ---------------------------------------------------------------------------

  async generateImage(prompt, options = {}) {
    if (!this.rateLimiter.canMakeRequest('image')) {
      throw new Error('Rate limit exceeded');
    }

    try {
      const response = await fetchWithRetry(`${PUTER_CONFIG.serverUrl}/api/ai/txt2img`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          model: options.model || AI_MODELS.image.default,
          size: options.size || '1024x1024',
          quality: options.quality || 'standard',
          style: options.style || 'vivid',
          n: options.count || 1,
        }),
        timeout: 60000,
      });

      const data = await response.json();
      this.emit('imageGenerated', { prompt, result: data });
      return data;
    } catch (error) {
      this.emit('error', { type: 'image', error });
      throw error;
    }
  }

  async generateSprite(prompt, options = {}) {
    const enhancedPrompt = `2D RPG game sprite, ${prompt}, pixel art style, transparent background, centered, high quality game asset`;
    return this.generateImage(enhancedPrompt, {
      ...options,
      size: options.size || '512x512',
    });
  }

  async generateTexture(prompt, options = {}) {
    const enhancedPrompt = `Seamless tileable texture, ${prompt}, game asset, high quality, no seams visible`;
    return this.generateImage(enhancedPrompt, {
      ...options,
      size: options.size || '1024x1024',
    });
  }

  async generateArenaBackground(arenaConfig) {
    const prompt = arenaConfig.prompt || 
      `Isometric top-down view of ${arenaConfig.name}, ${arenaConfig.lore}, stylized fantasy RPG art, 1920x1080, no characters`;
    return this.generateImage(prompt, {
      size: '1920x1080',
      quality: 'hd',
    });
  }

  // ---------------------------------------------------------------------------
  // AI Vision Analysis
  // ---------------------------------------------------------------------------

  async analyzeImage(imageUrl, prompt = 'Describe this image in detail') {
    if (!this.rateLimiter.canMakeRequest('vision')) {
      throw new Error('Rate limit exceeded');
    }

    try {
      const response = await fetchWithRetry(`${PUTER_CONFIG.serverUrl}/api/ai/vision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl, prompt }),
      });

      const data = await response.json();
      return data.content || data.description || null;
    } catch (error) {
      this.emit('error', { type: 'vision', error });
      throw error;
    }
  }

  async analyzeGameAsset(imageUrl, assetType = 'sprite') {
    const prompts = {
      sprite: 'Analyze this game sprite. Describe its style, animation potential, and suggest improvements for a dark fantasy RPG.',
      texture: 'Analyze this game texture. Check for seamlessness, color palette consistency, and detail level.',
      background: 'Analyze this game background. Evaluate composition, mood, and suitability for isometric RPG combat.',
      ui: 'Analyze this UI element. Evaluate readability, style consistency, and accessibility.',
    };
    
    return this.analyzeImage(imageUrl, prompts[assetType] || prompts.sprite);
  }

  // ---------------------------------------------------------------------------
  // AI Text-to-Speech
  // ---------------------------------------------------------------------------

  async textToSpeech(text, options = {}) {
    if (!this.rateLimiter.canMakeRequest('tts')) {
      throw new Error('Rate limit exceeded');
    }

    try {
      const response = await fetchWithRetry(`${PUTER_CONFIG.serverUrl}/api/ai/txt2speech`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voice: options.voice || AI_MODELS.voice.defaultVoice,
          engine: options.engine || AI_MODELS.voice.engine,
          speed: options.speed || 1.0,
        }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      this.emit('error', { type: 'tts', error });
      throw error;
    }
  }

  async generateNPCVoice(npcName, dialogue, options = {}) {
    const voiceMap = {
      warrior: 'onyx',
      mage: 'nova',
      merchant: 'echo',
      elder: 'fable',
      demon: 'onyx',
      elf: 'shimmer',
    };
    
    const voice = voiceMap[options.npcType] || AI_MODELS.voice.defaultVoice;
    return this.textToSpeech(dialogue, { voice, ...options });
  }

  // ---------------------------------------------------------------------------
  // Key-Value Storage
  // ---------------------------------------------------------------------------

  async kvGet(key) {
    const cacheKey = `kv:${key}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetchWithRetry(`${PUTER_CONFIG.serverUrl}/api/kv/${encodeURIComponent(key)}`);
      const data = await response.json();
      
      if (data.value) {
        this.cache.set(cacheKey, data.value, 30000);
      }
      
      return data.value || null;
    } catch (error) {
      this.emit('error', { type: 'kv-get', error });
      return null;
    }
  }

  async kvSet(key, value, options = {}) {
    try {
      const response = await fetchWithRetry(`${PUTER_CONFIG.serverUrl}/api/kv/${encodeURIComponent(key)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          value, 
          ttl: options.ttl,
          metadata: options.metadata,
        }),
      });

      const cacheKey = `kv:${key}`;
      this.cache.set(cacheKey, value, options.ttl || 30000);
      
      return response.ok;
    } catch (error) {
      this.emit('error', { type: 'kv-set', error });
      return false;
    }
  }

  async kvDelete(key) {
    try {
      const response = await fetchWithRetry(`${PUTER_CONFIG.serverUrl}/api/kv/${encodeURIComponent(key)}`, {
        method: 'DELETE',
      });

      this.cache.delete(`kv:${key}`);
      return response.ok;
    } catch (error) {
      this.emit('error', { type: 'kv-delete', error });
      return false;
    }
  }

  async kvList(prefix = '') {
    try {
      const response = await fetchWithRetry(
        `${PUTER_CONFIG.serverUrl}/api/kv?prefix=${encodeURIComponent(prefix)}`
      );
      const data = await response.json();
      return data.keys || [];
    } catch (error) {
      this.emit('error', { type: 'kv-list', error });
      return [];
    }
  }

  // ---------------------------------------------------------------------------
  // File Storage
  // ---------------------------------------------------------------------------

  async uploadFile(path, content, options = {}) {
    try {
      const formData = new FormData();
      
      if (content instanceof Buffer || content instanceof Uint8Array) {
        formData.append('file', new Blob([content]), path.split('/').pop());
      } else if (typeof content === 'string') {
        formData.append('file', new Blob([content], { type: 'text/plain' }), path.split('/').pop());
      } else {
        formData.append('file', content);
      }
      
      formData.append('path', path);
      if (options.metadata) {
        formData.append('metadata', JSON.stringify(options.metadata));
      }

      const response = await fetchWithRetry(`${PUTER_CONFIG.serverUrl}/api/fs/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      this.emit('fileUploaded', { path, result: data });
      return data;
    } catch (error) {
      this.emit('error', { type: 'upload', error });
      throw error;
    }
  }

  async downloadFile(path) {
    try {
      const response = await fetchWithRetry(
        `${PUTER_CONFIG.serverUrl}/api/fs/download?path=${encodeURIComponent(path)}`
      );
      return await response.blob();
    } catch (error) {
      this.emit('error', { type: 'download', error });
      throw error;
    }
  }

  async listFiles(directory = '/') {
    try {
      const response = await fetchWithRetry(
        `${PUTER_CONFIG.serverUrl}/api/fs/list?path=${encodeURIComponent(directory)}`
      );
      const data = await response.json();
      return data.files || [];
    } catch (error) {
      this.emit('error', { type: 'list', error });
      return [];
    }
  }

  async deleteFile(path) {
    try {
      const response = await fetchWithRetry(
        `${PUTER_CONFIG.serverUrl}/api/fs/delete?path=${encodeURIComponent(path)}`,
        { method: 'DELETE' }
      );
      return response.ok;
    } catch (error) {
      this.emit('error', { type: 'delete', error });
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Authentication
  // ---------------------------------------------------------------------------

  async verifyAuth(token) {
    try {
      const response = await fetchWithRetry(`${PUTER_CONFIG.serverUrl}/api/auth/verify`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      return await response.json();
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  async consumeAuthCode(code) {
    try {
      const response = await fetchWithRetry(`${PUTER_CONFIG.serverUrl}/api/auth/consume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      return await response.json();
    } catch (error) {
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  destroy() {
    this.cache.destroy();
    this.removeAllListeners();
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

const puterService = new PuterService();

module.exports = {
  puterService,
  PuterService,
  PUTER_CONFIG,
  AI_MODELS,
  MemoryCache,
  RateLimiter,
  fetchWithRetry,
};
