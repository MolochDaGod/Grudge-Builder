/**
 * Grudge Studio - AI Agent Worker Service
 * 
 * Intelligent AI workers that handle specialized game development tasks.
 * Each agent is purpose-built for specific domains: code, art, lore, balance, QA.
 * 
 * @module aiAgentService
 * @version 2.0.0
 * @author Grudge Studio
 */

const EventEmitter = require('events');
const { puterService, AI_MODELS } = require('./puterService');

// ============================================================================
// AGENT CONFIGURATIONS
// ============================================================================

const AGENT_PERSONAS = {
  codeArchitect: {
    id: 'code_architect',
    name: 'Code Architect',
    icon: 'code',
    color: '#3b82f6',
    systemPrompt: `You are a senior game developer for Grudge Studio, specializing in:
- Phaser 3 and Three.js game development
- TypeScript/JavaScript best practices
- React frontend architecture
- Node.js/Express backend systems
- Database design with Drizzle ORM and PostgreSQL
- WebSocket multiplayer with Colyseus
- Performance optimization for web games

Always provide concise, modern, production-ready code. Follow existing project patterns.
Explain your reasoning briefly. Format code in markdown code blocks with language tags.`,
    defaultModel: AI_MODELS.chat.claude,
    temperature: 0.3,
    maxTokens: 2000,
  },

  artDirector: {
    id: 'art_director',
    name: 'Art Director',
    icon: 'palette',
    color: '#8b5cf6',
    systemPrompt: `You are the Art Director for Grudge Warlords, a dark fantasy RPG. You specialize in:
- 2D sprite design and pixel art direction
- Isometric game asset creation
- UI/UX design for fantasy games
- Color palette and visual consistency
- Animation principles for game sprites
- Texture and tileset design

Provide specific, actionable art direction. Reference existing game art styles.
When generating prompts for AI image generation, be extremely detailed and specific.`,
    defaultModel: AI_MODELS.chat.premium,
    temperature: 0.7,
    maxTokens: 1500,
  },

  loremaster: {
    id: 'loremaster',
    name: 'Loremaster',
    icon: 'book-open',
    color: '#f59e0b',
    systemPrompt: `You are the Loremaster for Grudge Warlords. You maintain the game's narrative:
- The Sundering event that shattered the Worldboard
- Three factions: Crusade, Legion, and Fabled
- Three gods: Odin, Madra, and The Omni
- Six playable races and four character classes
- Island-based world with sailing and conquest
- Dark fantasy tone with themes of grudges and vengeance

Create lore that is mysterious, evocative, and consistent with existing worldbuilding.
Keep quest descriptions under 100 words. NPC dialogue should be atmospheric but brief.`,
    defaultModel: AI_MODELS.chat.default,
    temperature: 0.8,
    maxTokens: 800,
  },

  balanceEngineer: {
    id: 'balance_engineer',
    name: 'Balance Engineer',
    icon: 'scale',
    color: '#10b981',
    systemPrompt: `You are the Game Balance Engineer for Grudge Warlords RPG. You understand:
- 8 core attributes: STR, VIT, END, INT, WIS, DEX, AGI, TAC
- 19 secondary stats derived from attributes
- Diminishing returns after 25 attribute points
- Turn-based combat with block/crit mechanics
- 5-tier enemy scaling (Acolytes to Primordials)
- Profession XP and crafting progression
- Equipment slot system with tiered items

Provide numerical recommendations with clear reasoning. Reference existing formulas.
Always consider both PvE and potential PvP implications.`,
    defaultModel: AI_MODELS.chat.default,
    temperature: 0.2,
    maxTokens: 1200,
  },

  qaAnalyst: {
    id: 'qa_analyst',
    name: 'QA Analyst',
    icon: 'bug',
    color: '#ef4444',
    systemPrompt: `You are the QA Lead for Grudge Warlords. You excel at:
- Identifying edge cases and potential bugs
- Writing test scenarios and reproduction steps
- Analyzing error logs and stack traces
- Suggesting defensive coding practices
- Performance profiling recommendations
- Cross-browser compatibility issues
- Accessibility auditing

Be thorough but practical. Prioritize issues by severity. Provide clear reproduction steps.
Format bug reports with: Summary, Steps, Expected, Actual, Severity.`,
    defaultModel: AI_MODELS.chat.default,
    temperature: 0.1,
    maxTokens: 1000,
  },

  missionDesigner: {
    id: 'mission_designer',
    name: 'Mission Designer',
    icon: 'map',
    color: '#ec4899',
    systemPrompt: `You are the Mission Designer for Grudge Warlords. You create:
- Dynamic quests with branching objectives
- Arena encounter designs with enemy compositions
- Dungeon layouts with procedural elements
- Boss fight mechanics and phases
- Reward structures following the game's economy
- Story beats integrated with gameplay

Missions should have clear objectives, appropriate difficulty, and meaningful rewards.
Format mission data as JSON when requested. Include tier, faction, and lore context.`,
    defaultModel: AI_MODELS.chat.default,
    temperature: 0.6,
    maxTokens: 1500,
  },
};

// ============================================================================
// JOB QUEUE
// ============================================================================

class JobQueue {
  constructor(concurrency = 3) {
    this.queue = [];
    this.running = new Map();
    this.completed = new Map();
    this.concurrency = concurrency;
    this.jobCounter = 0;
  }

  generateJobId() {
    return `job_${Date.now()}_${++this.jobCounter}`;
  }

  enqueue(job) {
    const jobId = this.generateJobId();
    const queuedJob = {
      id: jobId,
      ...job,
      status: 'pending',
      createdAt: Date.now(),
      attempts: 0,
    };
    this.queue.push(queuedJob);
    return jobId;
  }

  dequeue() {
    if (this.running.size >= this.concurrency) return null;
    const job = this.queue.shift();
    if (job) {
      job.status = 'running';
      job.startedAt = Date.now();
      this.running.set(job.id, job);
    }
    return job;
  }

  complete(jobId, result) {
    const job = this.running.get(jobId);
    if (job) {
      job.status = 'completed';
      job.completedAt = Date.now();
      job.result = result;
      job.duration = job.completedAt - job.startedAt;
      this.running.delete(jobId);
      this.completed.set(jobId, job);
    }
  }

  fail(jobId, error) {
    const job = this.running.get(jobId);
    if (job) {
      job.status = 'failed';
      job.completedAt = Date.now();
      job.error = error;
      job.attempts++;
      
      if (job.attempts < 3 && job.retryable !== false) {
        job.status = 'pending';
        this.running.delete(jobId);
        this.queue.unshift(job);
      } else {
        this.running.delete(jobId);
        this.completed.set(jobId, job);
      }
    }
  }

  getJob(jobId) {
    return this.running.get(jobId) || 
           this.completed.get(jobId) || 
           this.queue.find(j => j.id === jobId);
  }

  getStats() {
    return {
      pending: this.queue.length,
      running: this.running.size,
      completed: this.completed.size,
      jobs: [...this.queue, ...this.running.values()].map(j => ({
        id: j.id,
        type: j.type,
        agent: j.agent,
        status: j.status,
        createdAt: j.createdAt,
      })),
    };
  }

  clearCompleted() {
    this.completed.clear();
  }
}

// ============================================================================
// AI AGENT CLASS
// ============================================================================

class AIAgent extends EventEmitter {
  constructor(config) {
    super();
    this.id = config.id;
    this.name = config.name;
    this.systemPrompt = config.systemPrompt;
    this.defaultModel = config.defaultModel;
    this.temperature = config.temperature;
    this.maxTokens = config.maxTokens;
    this.conversationHistory = [];
    this.maxHistoryLength = 10;
  }

  async chat(userMessage, options = {}) {
    const messages = [
      { role: 'system', content: this.systemPrompt },
      ...this.conversationHistory.slice(-this.maxHistoryLength * 2),
      { role: 'user', content: userMessage },
    ];

    try {
      const response = await puterService.chat(messages, {
        model: options.model || this.defaultModel,
        temperature: options.temperature ?? this.temperature,
        maxTokens: options.maxTokens || this.maxTokens,
      });

      this.conversationHistory.push(
        { role: 'user', content: userMessage },
        { role: 'assistant', content: response }
      );

      this.emit('response', { agent: this.id, message: userMessage, response });
      return response;
    } catch (error) {
      this.emit('error', { agent: this.id, error });
      throw error;
    }
  }

  async analyze(content, analysisType = 'general') {
    const analysisPrompts = {
      general: `Analyze the following and provide insights:\n\n${content}`,
      code: `Review this code for bugs, performance issues, and improvements:\n\n\`\`\`\n${content}\n\`\`\``,
      balance: `Analyze these game stats for balance issues:\n\n${content}`,
      lore: `Check this lore for consistency and suggest improvements:\n\n${content}`,
      art: `Evaluate this asset description and suggest improvements:\n\n${content}`,
    };

    return this.chat(analysisPrompts[analysisType] || analysisPrompts.general);
  }

  async generate(type, context = {}) {
    const generatePrompts = {
      quest: `Generate a quest for: ${JSON.stringify(context)}. Return as JSON with fields: name, description, objectives, rewards, tier, faction.`,
      npc: `Create an NPC: ${JSON.stringify(context)}. Return as JSON with fields: name, race, class, dialogue, personality, location.`,
      item: `Design an item: ${JSON.stringify(context)}. Return as JSON with fields: name, type, tier, stats, lore, slot.`,
      enemy: `Design an enemy: ${JSON.stringify(context)}. Return as JSON with fields: name, tier, type, stats, abilities, loot.`,
      dialogue: `Write NPC dialogue for: ${JSON.stringify(context)}. Keep it atmospheric and under 50 words.`,
      prompt: `Create an AI image generation prompt for: ${JSON.stringify(context)}. Be detailed and specific for fantasy RPG art.`,
    };

    const response = await this.chat(generatePrompts[type] || `Generate ${type} with context: ${JSON.stringify(context)}`);
    
    if (['quest', 'npc', 'item', 'enemy'].includes(type)) {
      try {
        const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) || response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[1] || jsonMatch[0]);
        }
      } catch (e) {
        // Return raw response if JSON parsing fails
      }
    }
    
    return response;
  }

  clearHistory() {
    this.conversationHistory = [];
  }

  getHistory() {
    return [...this.conversationHistory];
  }
}

// ============================================================================
// AI AGENT SERVICE
// ============================================================================

class AIAgentService extends EventEmitter {
  constructor() {
    super();
    this.agents = new Map();
    this.jobQueue = new JobQueue(3);
    this.isProcessing = false;
    this.processInterval = null;
    
    this.initializeAgents();
  }

  initializeAgents() {
    for (const [key, config] of Object.entries(AGENT_PERSONAS)) {
      const agent = new AIAgent(config);
      
      agent.on('response', (data) => this.emit('agentResponse', data));
      agent.on('error', (data) => this.emit('agentError', data));
      
      this.agents.set(config.id, agent);
    }
  }

  getAgent(agentId) {
    return this.agents.get(agentId);
  }

  listAgents() {
    return Object.values(AGENT_PERSONAS).map(p => ({
      id: p.id,
      name: p.name,
      icon: p.icon,
      color: p.color,
    }));
  }

  // ---------------------------------------------------------------------------
  // Specialized Agent Methods
  // ---------------------------------------------------------------------------

  async codeReview(code, language = 'typescript') {
    const agent = this.getAgent('code_architect');
    return agent.analyze(code, 'code');
  }

  async generateQuest(context) {
    const agent = this.getAgent('mission_designer');
    return agent.generate('quest', context);
  }

  async generateNPCDialogue(npc, situation) {
    const agent = this.getAgent('loremaster');
    return agent.generate('dialogue', { npc, situation });
  }

  async generateSpritePrompt(description, style = 'pixel art') {
    const agent = this.getAgent('art_director');
    return agent.generate('prompt', { description, style, type: 'sprite' });
  }

  async analyzeBalance(stats) {
    const agent = this.getAgent('balance_engineer');
    return agent.analyze(JSON.stringify(stats, null, 2), 'balance');
  }

  async reportBug(description, context) {
    const agent = this.getAgent('qa_analyst');
    return agent.chat(`Analyze this bug report and suggest fixes:\n\nDescription: ${description}\n\nContext: ${JSON.stringify(context)}`);
  }

  async generateItem(itemType, tier, faction) {
    const agent = this.getAgent('balance_engineer');
    return agent.generate('item', { itemType, tier, faction });
  }

  async generateEnemy(tier, environment, bossType) {
    const agent = this.getAgent('mission_designer');
    return agent.generate('enemy', { tier, environment, bossType });
  }

  async generateLore(topic, faction, length = 'short') {
    const agent = this.getAgent('loremaster');
    return agent.chat(`Write ${length} lore about ${topic} for faction ${faction}. Be mysterious and evocative.`);
  }

  async generateArenaEncounter(arenaId, playerLevel, partySize) {
    const agent = this.getAgent('mission_designer');
    return agent.chat(`Design an arena encounter for arena ${arenaId}, party level ${playerLevel}, ${partySize} players. Include enemy composition, waves, and special mechanics.`);
  }

  // ---------------------------------------------------------------------------
  // Multi-Agent Collaboration
  // ---------------------------------------------------------------------------

  async collaborativeDesign(feature, context = {}) {
    const results = {};

    results.mechanics = await this.getAgent('balance_engineer').chat(
      `Design game mechanics for: ${feature}. Context: ${JSON.stringify(context)}`
    );

    results.content = await this.getAgent('mission_designer').chat(
      `Design content for: ${feature}. Mechanics: ${results.mechanics}`
    );

    results.lore = await this.getAgent('loremaster').chat(
      `Write lore integration for: ${feature}. Content: ${results.content}`
    );

    results.art = await this.getAgent('art_director').chat(
      `Design visual style for: ${feature}. Theme: ${results.lore}`
    );

    return results;
  }

  async fullQAPass(feature, implementation) {
    const agent = this.getAgent('qa_analyst');
    
    const codeReview = await this.getAgent('code_architect').analyze(implementation, 'code');
    const balanceReview = await this.getAgent('balance_engineer').chat(`Review balance of: ${feature}`);
    
    const qaReport = await agent.chat(`
      Compile QA report for: ${feature}
      
      Code Review: ${codeReview}
      Balance Review: ${balanceReview}
      
      Provide: 1) Critical issues 2) Warnings 3) Suggestions 4) Test cases needed
    `);

    return {
      codeReview,
      balanceReview,
      qaReport,
      timestamp: new Date().toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // Job Queue Processing
  // ---------------------------------------------------------------------------

  async submitJob(agentId, task, data = {}) {
    const jobId = this.jobQueue.enqueue({
      type: 'agent_task',
      agent: agentId,
      task,
      data,
      retryable: true,
    });

    this.startProcessing();
    return jobId;
  }

  startProcessing() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    this.processInterval = setInterval(async () => {
      const job = this.jobQueue.dequeue();
      if (!job) return;

      try {
        const agent = this.getAgent(job.agent);
        if (!agent) throw new Error(`Agent ${job.agent} not found`);

        let result;
        switch (job.task) {
          case 'chat':
            result = await agent.chat(job.data.message, job.data.options);
            break;
          case 'analyze':
            result = await agent.analyze(job.data.content, job.data.type);
            break;
          case 'generate':
            result = await agent.generate(job.data.type, job.data.context);
            break;
          default:
            result = await agent.chat(job.data.message || JSON.stringify(job.data));
        }

        this.jobQueue.complete(job.id, result);
        this.emit('jobComplete', { jobId: job.id, result });
      } catch (error) {
        this.jobQueue.fail(job.id, error.message);
        this.emit('jobFailed', { jobId: job.id, error: error.message });
      }
    }, 100);
  }

  stopProcessing() {
    this.isProcessing = false;
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
    }
  }

  getJobStatus(jobId) {
    return this.jobQueue.getJob(jobId);
  }

  getQueueStats() {
    return this.jobQueue.getStats();
  }

  // ---------------------------------------------------------------------------
  // Batch Operations
  // ---------------------------------------------------------------------------

  async batchGenerate(agentId, tasks) {
    const jobIds = tasks.map(task => 
      this.submitJob(agentId, task.type || 'generate', task.data || task)
    );
    return jobIds;
  }

  async waitForJobs(jobIds, timeoutMs = 60000) {
    const startTime = Date.now();
    const results = {};

    while (Date.now() - startTime < timeoutMs) {
      let allComplete = true;

      for (const jobId of jobIds) {
        const job = this.getJobStatus(jobId);
        if (job?.status === 'completed') {
          results[jobId] = job.result;
        } else if (job?.status === 'failed') {
          results[jobId] = { error: job.error };
        } else {
          allComplete = false;
        }
      }

      if (allComplete) return results;
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    throw new Error('Timeout waiting for jobs to complete');
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  clearAgentHistories() {
    for (const agent of this.agents.values()) {
      agent.clearHistory();
    }
  }

  destroy() {
    this.stopProcessing();
    this.jobQueue.clearCompleted();
    this.removeAllListeners();
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

const aiAgentService = new AIAgentService();

module.exports = {
  aiAgentService,
  AIAgentService,
  AIAgent,
  JobQueue,
  AGENT_PERSONAS,
};
