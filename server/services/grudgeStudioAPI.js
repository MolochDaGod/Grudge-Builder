/**
 * Grudge Studio - Unified API Service
 * 
 * High-level orchestration layer combining Puter cloud services, AI agents,
 * asset management, and game-specific workflows into a cohesive API.
 * 
 * @module grudgeStudioAPI
 * @version 2.0.0
 * @author Grudge Studio
 */

const EventEmitter = require('events');
const { puterService, PUTER_CONFIG } = require('./puterService');
const { aiAgentService, AGENT_PERSONAS } = require('./aiAgentService');
const path = require('path');
const fs = require('fs');

// ============================================================================
// CONFIGURATION
// ============================================================================

const STUDIO_CONFIG = {
  name: 'Grudge Studio',
  version: '2.5.0',
  game: 'Grudge Warlords',
  assetBasePath: 'client/public/sprites',
  loreBasePath: 'client/public/lore',
  dataExportPath: 'exports',
  maxConcurrentGenerations: 5,
  defaultImageQuality: 'high',
  defaultSpriteSize: '512x512',
  defaultArenaSize: '1920x1080',
};

const ASSET_CATEGORIES = {
  sprites: { path: 'sprites', extensions: ['.png', '.webp'], cacheTime: 31536000 },
  arenas: { path: 'sprites/arenas', extensions: ['.png', '.jpg'], cacheTime: 86400 },
  heroes: { path: 'sprites/heroes', extensions: ['.png'], cacheTime: 31536000 },
  monsters: { path: 'sprites/monsters', extensions: ['.png'], cacheTime: 31536000 },
  items: { path: 'sprites/items', extensions: ['.png'], cacheTime: 31536000 },
  effects: { path: 'sprites/effects', extensions: ['.png', '.gif'], cacheTime: 31536000 },
  ui: { path: 'ui', extensions: ['.png', '.svg'], cacheTime: 604800 },
  lore: { path: 'lore', extensions: ['.png', '.jpg'], cacheTime: 86400 },
  maps: { path: 'maps', extensions: ['.png', '.jpg'], cacheTime: 86400 },
};

const WORKFLOW_TEMPLATES = {
  newCharacterClass: [
    { agent: 'balance_engineer', task: 'Design class mechanics and stat distribution' },
    { agent: 'loremaster', task: 'Write class lore and backstory' },
    { agent: 'art_director', task: 'Define visual style and sprite requirements' },
    { agent: 'code_architect', task: 'Implement class in schema and combat system' },
    { agent: 'qa_analyst', task: 'Create test cases and balance scenarios' },
  ],
  newArena: [
    { agent: 'loremaster', task: 'Write arena lore and faction connection' },
    { agent: 'art_director', task: 'Generate arena background prompt' },
    { agent: 'mission_designer', task: 'Design enemy encounters for arena' },
    { agent: 'balance_engineer', task: 'Balance arena difficulty curve' },
  ],
  newQuest: [
    { agent: 'mission_designer', task: 'Design quest structure and objectives' },
    { agent: 'loremaster', task: 'Write quest narrative and dialogue' },
    { agent: 'balance_engineer', task: 'Set rewards and difficulty' },
  ],
  newItem: [
    { agent: 'balance_engineer', task: 'Design item stats and tier' },
    { agent: 'loremaster', task: 'Write item lore and flavor text' },
    { agent: 'art_director', task: 'Generate item sprite prompt' },
  ],
};

// ============================================================================
// GENERATION QUEUE
// ============================================================================

class GenerationQueue {
  constructor(maxConcurrent = 5) {
    this.queue = [];
    this.active = new Map();
    this.history = [];
    this.maxConcurrent = maxConcurrent;
    this.totalGenerated = 0;
    this.totalFailed = 0;
  }

  add(request) {
    const id = `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const job = {
      id,
      ...request,
      status: 'queued',
      createdAt: Date.now(),
      priority: request.priority || 'normal',
    };
    
    if (job.priority === 'high') {
      this.queue.unshift(job);
    } else {
      this.queue.push(job);
    }
    
    return id;
  }

  next() {
    if (this.active.size >= this.maxConcurrent || this.queue.length === 0) {
      return null;
    }
    
    const job = this.queue.shift();
    job.status = 'processing';
    job.startedAt = Date.now();
    this.active.set(job.id, job);
    return job;
  }

  complete(id, result) {
    const job = this.active.get(id);
    if (job) {
      job.status = 'completed';
      job.completedAt = Date.now();
      job.duration = job.completedAt - job.startedAt;
      job.result = result;
      this.active.delete(id);
      this.history.push(job);
      this.totalGenerated++;
      if (this.history.length > 100) this.history.shift();
    }
  }

  fail(id, error) {
    const job = this.active.get(id);
    if (job) {
      job.status = 'failed';
      job.completedAt = Date.now();
      job.error = error;
      this.active.delete(id);
      this.history.push(job);
      this.totalFailed++;
    }
  }

  getStats() {
    return {
      queued: this.queue.length,
      active: this.active.size,
      totalGenerated: this.totalGenerated,
      totalFailed: this.totalFailed,
      recentHistory: this.history.slice(-10),
    };
  }
}

// ============================================================================
// GRUDGE STUDIO API
// ============================================================================

class GrudgeStudioAPI extends EventEmitter {
  constructor() {
    super();
    this.generationQueue = new GenerationQueue(STUDIO_CONFIG.maxConcurrentGenerations);
    this.workflows = new Map();
    this.isInitialized = false;
    this.processInterval = null;
  }

  async initialize() {
    try {
      await puterService.initialize();
      this.isInitialized = true;
      this.startProcessing();
      this.emit('initialized');
      return true;
    } catch (error) {
      this.emit('error', error);
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Service Status
  // ---------------------------------------------------------------------------

  getStatus() {
    return {
      studio: {
        name: STUDIO_CONFIG.name,
        version: STUDIO_CONFIG.version,
        game: STUDIO_CONFIG.game,
        initialized: this.isInitialized,
      },
      puter: puterService.getStatus(),
      agents: aiAgentService.listAgents(),
      generations: this.generationQueue.getStats(),
      workflows: {
        active: this.workflows.size,
        templates: Object.keys(WORKFLOW_TEMPLATES),
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Asset Generation
  // ---------------------------------------------------------------------------

  async generateSprite(description, options = {}) {
    const prompt = await this.buildSpritePrompt(description, options);
    
    const jobId = this.generationQueue.add({
      type: 'sprite',
      prompt,
      options: {
        size: options.size || STUDIO_CONFIG.defaultSpriteSize,
        quality: options.quality || STUDIO_CONFIG.defaultImageQuality,
        category: options.category || 'sprites',
        name: options.name || `sprite_${Date.now()}`,
      },
    });

    return { jobId, prompt };
  }

  async generateArenaBackground(arena, options = {}) {
    const prompt = arena.prompt || await this.buildArenaPrompt(arena);
    
    const jobId = this.generationQueue.add({
      type: 'arena',
      prompt,
      options: {
        size: STUDIO_CONFIG.defaultArenaSize,
        quality: 'hd',
        category: 'arenas',
        name: arena.id || `arena_${Date.now()}`,
        arenaData: arena,
      },
    });

    return { jobId, prompt };
  }

  async generateTexture(description, options = {}) {
    const prompt = `Seamless tileable texture, ${description}, game asset, high quality, no visible seams, ${options.style || 'fantasy RPG'}`;
    
    const jobId = this.generationQueue.add({
      type: 'texture',
      prompt,
      options: {
        size: options.size || '1024x1024',
        quality: 'high',
        category: 'textures',
        name: options.name || `texture_${Date.now()}`,
      },
    });

    return { jobId, prompt };
  }

  async generateItemSprite(item, options = {}) {
    const typeStyles = {
      weapon: 'sharp metallic, battle-worn, dramatic lighting',
      armor: 'protective, sturdy, layered materials',
      accessory: 'ornate, detailed, magical glow',
      consumable: 'vibrant, fresh, appealing',
      material: 'raw, natural, textured',
    };

    const tierQuality = {
      common: 'simple, clean design',
      uncommon: 'slightly refined, subtle details',
      rare: 'intricate details, faint glow',
      epic: 'elaborate design, purple glow, ornate',
      legendary: 'masterwork, golden accents, powerful aura',
    };

    const prompt = `2D RPG item icon, ${item.name}, ${item.type} item, ${typeStyles[item.type] || ''}, ${tierQuality[item.tier] || ''}, centered on transparent background, dark fantasy style, high detail, game asset, 64x64 pixel perfect`;
    
    return this.generateSprite(prompt, {
      ...options,
      category: 'items',
      name: `item_${item.id || item.name.toLowerCase().replace(/\s+/g, '_')}`,
      size: '256x256',
    });
  }

  async generateHeroPortrait(hero, options = {}) {
    const prompt = `Fantasy RPG character portrait, ${hero.race} ${hero.class}, ${hero.name}, dark fantasy style, detailed face, dramatic lighting, ${hero.faction} faction colors, heroic pose, game avatar`;
    
    return this.generateSprite(prompt, {
      ...options,
      category: 'heroes',
      name: `hero_${hero.id || hero.name.toLowerCase().replace(/\s+/g, '_')}`,
      size: '512x512',
    });
  }

  async generateMonsterSprite(monster, options = {}) {
    const tierAppearance = {
      1: 'small, weak-looking, ragged',
      2: 'medium sized, armed, dangerous',
      3: 'large, powerful, intimidating',
      4: 'massive, glowing with power, terrifying',
      5: 'colossal, otherworldly, apocalyptic presence',
    };

    const prompt = `2D RPG monster sprite, ${monster.name}, ${tierAppearance[monster.tier] || ''}, ${monster.description || ''}, dark fantasy horror style, full body, action pose, transparent background, game asset`;
    
    return this.generateSprite(prompt, {
      ...options,
      category: 'monsters',
      name: `monster_${monster.id || monster.name.toLowerCase().replace(/\s+/g, '_')}`,
    });
  }

  // ---------------------------------------------------------------------------
  // Content Generation
  // ---------------------------------------------------------------------------

  async generateQuest(parameters) {
    const quest = await aiAgentService.generateQuest(parameters);
    
    if (quest && parameters.generateRewards) {
      quest.rewards = await aiAgentService.getAgent('balance_engineer').generate('item', {
        tier: parameters.tier || 1,
        questType: parameters.type || 'combat',
      });
    }

    this.emit('questGenerated', quest);
    return quest;
  }

  async generateNPC(parameters) {
    const npc = await aiAgentService.getAgent('loremaster').generate('npc', parameters);
    
    if (parameters.generateDialogue) {
      npc.dialogueOptions = await Promise.all([
        aiAgentService.generateNPCDialogue(npc, 'greeting'),
        aiAgentService.generateNPCDialogue(npc, 'quest_available'),
        aiAgentService.generateNPCDialogue(npc, 'farewell'),
      ]);
    }

    this.emit('npcGenerated', npc);
    return npc;
  }

  async generateLore(topic, options = {}) {
    const lore = await aiAgentService.generateLore(
      topic,
      options.faction || 'neutral',
      options.length || 'medium'
    );
    
    this.emit('loreGenerated', { topic, lore });
    return lore;
  }

  async generateArenaEncounter(arenaId, parameters = {}) {
    const encounter = await aiAgentService.generateArenaEncounter(
      arenaId,
      parameters.playerLevel || 1,
      parameters.partySize || 1
    );

    return encounter;
  }

  // ---------------------------------------------------------------------------
  // Prompt Building
  // ---------------------------------------------------------------------------

  async buildSpritePrompt(description, options = {}) {
    if (options.useAI) {
      return aiAgentService.generateSpritePrompt(description, options.style);
    }

    const baseStyle = '2D RPG game sprite, pixel art style, transparent background, centered, high quality game asset';
    return `${baseStyle}, ${description}, ${options.additionalStyle || ''}, dark fantasy theme`;
  }

  async buildArenaPrompt(arena) {
    if (arena.prompt) return arena.prompt;

    const tierDescriptions = {
      1: 'humble, broken, natural decay',
      2: 'conflict scarred, divine hints, smoldering',
      3: 'ancient power, boss arena, magical energy',
      4: 'godly presence, reality distortion, epic scale',
      5: 'primordial, world-ending, cosmic significance',
    };

    return `Isometric top-down view of ${arena.name}, ${arena.lore}, ${tierDescriptions[arena.tier] || ''}, ${arena.environment} environment, ${arena.colorScheme?.join(' and ') || 'dark fantasy colors'}, stylized fantasy RPG art, 1920x1080, no characters, dramatic lighting`;
  }

  // ---------------------------------------------------------------------------
  // Workflow Execution
  // ---------------------------------------------------------------------------

  async executeWorkflow(templateName, context = {}) {
    const template = WORKFLOW_TEMPLATES[templateName];
    if (!template) {
      throw new Error(`Workflow template '${templateName}' not found`);
    }

    const workflowId = `wf_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const workflow = {
      id: workflowId,
      template: templateName,
      context,
      steps: template.map((step, index) => ({
        ...step,
        index,
        status: 'pending',
      })),
      status: 'running',
      startedAt: Date.now(),
      results: {},
    };

    this.workflows.set(workflowId, workflow);
    this.emit('workflowStarted', { id: workflowId, template: templateName });

    for (const step of workflow.steps) {
      try {
        step.status = 'running';
        step.startedAt = Date.now();

        const agent = aiAgentService.getAgent(step.agent);
        const taskWithContext = `${step.task}\n\nContext: ${JSON.stringify({
          ...context,
          previousResults: workflow.results,
        })}`;

        const result = await agent.chat(taskWithContext);
        
        step.status = 'completed';
        step.completedAt = Date.now();
        step.result = result;
        workflow.results[step.agent] = result;

        this.emit('workflowStep', { workflowId, step: step.index, agent: step.agent, result });
      } catch (error) {
        step.status = 'failed';
        step.error = error.message;
        workflow.status = 'failed';
        this.emit('workflowFailed', { workflowId, step: step.index, error: error.message });
        break;
      }
    }

    if (workflow.status !== 'failed') {
      workflow.status = 'completed';
      workflow.completedAt = Date.now();
    }

    this.emit('workflowCompleted', { id: workflowId, results: workflow.results });
    return workflow;
  }

  getWorkflow(workflowId) {
    return this.workflows.get(workflowId);
  }

  // ---------------------------------------------------------------------------
  // Batch Operations
  // ---------------------------------------------------------------------------

  async batchGenerateSprites(requests) {
    const jobs = await Promise.all(
      requests.map(req => this.generateSprite(req.description, req.options))
    );
    return jobs.map(j => j.jobId);
  }

  async batchGenerateArenas(arenas) {
    const jobs = await Promise.all(
      arenas.map(arena => this.generateArenaBackground(arena))
    );
    return jobs.map(j => j.jobId);
  }

  async generateAllArenasForTier(tier) {
    const { TIERED_ARENAS, getTieredArenasByTier } = require('../../shared/definitions/battleArenas');
    const arenas = getTieredArenasByTier(tier);
    return this.batchGenerateArenas(arenas);
  }

  // ---------------------------------------------------------------------------
  // Queue Processing
  // ---------------------------------------------------------------------------

  startProcessing() {
    if (this.processInterval) return;

    this.processInterval = setInterval(async () => {
      const job = this.generationQueue.next();
      if (!job) return;

      try {
        let result;

        switch (job.type) {
          case 'sprite':
          case 'texture':
          case 'arena':
            result = await puterService.generateImage(job.prompt, {
              size: job.options.size,
              quality: job.options.quality,
            });
            break;
          default:
            throw new Error(`Unknown job type: ${job.type}`);
        }

        if (result && job.options.savePath) {
          await this.saveAsset(result, job.options);
        }

        this.generationQueue.complete(job.id, result);
        this.emit('generationComplete', { jobId: job.id, type: job.type, result });
      } catch (error) {
        this.generationQueue.fail(job.id, error.message);
        this.emit('generationFailed', { jobId: job.id, type: job.type, error: error.message });
      }
    }, 500);
  }

  stopProcessing() {
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Asset Management
  // ---------------------------------------------------------------------------

  async saveAsset(imageData, options = {}) {
    const category = ASSET_CATEGORIES[options.category] || ASSET_CATEGORIES.sprites;
    const filename = `${options.name || Date.now()}.png`;
    const filePath = path.join(STUDIO_CONFIG.assetBasePath, category.path, filename);

    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (typeof imageData === 'string' && imageData.startsWith('data:')) {
        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
        fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
      } else if (imageData.src) {
        const response = await fetch(imageData.src);
        const buffer = Buffer.from(await response.arrayBuffer());
        fs.writeFileSync(filePath, buffer);
      }

      this.emit('assetSaved', { path: filePath, category: options.category });
      return filePath;
    } catch (error) {
      this.emit('error', { type: 'saveAsset', error });
      throw error;
    }
  }

  listAssets(category) {
    const categoryConfig = ASSET_CATEGORIES[category];
    if (!categoryConfig) return [];

    const dirPath = path.join(STUDIO_CONFIG.assetBasePath, categoryConfig.path);
    if (!fs.existsSync(dirPath)) return [];

    const files = fs.readdirSync(dirPath, { withFileTypes: true });
    return files
      .filter(f => f.isFile() && categoryConfig.extensions.some(ext => f.name.endsWith(ext)))
      .map(f => ({
        name: f.name,
        path: path.join(categoryConfig.path, f.name),
        category,
      }));
  }

  // ---------------------------------------------------------------------------
  // Data Export
  // ---------------------------------------------------------------------------

  async exportGameData(dataType) {
    const exportPath = path.join(STUDIO_CONFIG.dataExportPath, `${dataType}_${Date.now()}.json`);
    
    try {
      let data;
      switch (dataType) {
        case 'arenas':
          data = require('../../shared/definitions/battleArenas').TIERED_ARENAS;
          break;
        case 'agents':
          data = AGENT_PERSONAS;
          break;
        case 'config':
          data = { STUDIO_CONFIG, PUTER_CONFIG };
          break;
        default:
          throw new Error(`Unknown data type: ${dataType}`);
      }

      const dir = path.dirname(exportPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(exportPath, JSON.stringify(data, null, 2));
      return exportPath;
    } catch (error) {
      this.emit('error', { type: 'export', error });
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // Voice & Audio
  // ---------------------------------------------------------------------------

  async generateNPCVoice(npcName, dialogue, npcType = 'merchant') {
    return puterService.generateNPCVoice(npcName, dialogue, { npcType });
  }

  async generateBattleCry(characterName, situation) {
    const dialogue = await aiAgentService.getAgent('loremaster').chat(
      `Generate a short battle cry (max 10 words) for ${characterName} in situation: ${situation}`
    );
    return puterService.textToSpeech(dialogue, { voice: 'onyx' });
  }

  // ---------------------------------------------------------------------------
  // Analysis & Review
  // ---------------------------------------------------------------------------

  async analyzeAsset(imageUrl, assetType = 'sprite') {
    return puterService.analyzeGameAsset(imageUrl, assetType);
  }

  async reviewCode(code, language = 'typescript') {
    return aiAgentService.codeReview(code, language);
  }

  async reviewBalance(gameElement) {
    return aiAgentService.analyzeBalance(gameElement);
  }

  async runQACheck(feature, implementation) {
    return aiAgentService.fullQAPass(feature, implementation);
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  destroy() {
    this.stopProcessing();
    aiAgentService.destroy();
    puterService.destroy();
    this.removeAllListeners();
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

const grudgeStudioAPI = new GrudgeStudioAPI();

module.exports = {
  grudgeStudioAPI,
  GrudgeStudioAPI,
  GenerationQueue,
  STUDIO_CONFIG,
  ASSET_CATEGORIES,
  WORKFLOW_TEMPLATES,
};
