# Puter AI Integration Guide

> **Canonical registry:** `docs/puter-registry.json` is the single source of truth for every Puter worker, frontend, SDK, and the auth bridge. The endpoint tables below are a developer reference; if they disagree with the registry, the registry wins.
> See also `docs/audit-report.md` for the latest consolidation audit.

## Overview

Grudge Warlords integrates with Puter.js for AI-powered features including sprite generation, chat AI, and cloud storage. This guide covers setup, development patterns, and best practices for working with Puter AI agents.

## Puter Server (External Worker)

The GRUDGE Server is a dedicated Puter worker providing centralized AI and game data services:

**Server URL:** `https://grudge-server.puter.work`

### Available Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Server health check and version info |
| `/api/auth/consume` | POST | Consume auth code for token |
| `/api/auth/verify` | GET | Verify auth token validity |
| `/api/ai/chat` | POST | AI chat with context/history |
| `/api/ai/vision` | POST | AI image analysis |
| `/api/sprites/generate` | POST | Generate sprites via AI |
| `/api/jobs/:jobId` | GET | Get async job status |
| `/api/jobs` | GET | List all jobs |
| `/api/data/game` | GET | Get full game data |
| `/api/data/sync` | POST | Sync game data |
| `/api/data/:dataType` | GET | Get specific data type |
| `/api/npc/chat` | POST | NPC dialogue generation |

### Client Usage

```typescript
import { puterServer } from '@/lib/puterIntegration';

// Check server health
const health = await puterServer.health();
console.log(health.status, health.version);

// AI chat via server
const response = await puterServer.aiChat([
  { role: 'system', content: 'You are a quest NPC.' },
  { role: 'user', content: 'What adventure awaits?' }
]);

// NPC chat with context
const npcResponse = await puterServer.npcChat('merchant_1', 'Show me your wares', {
  playerName: 'Aldric',
  playerLevel: 10,
  faction: 'Crusade'
});

// Generate sprite (returns job ID)
const job = await puterServer.generateSprite('orc warrior with axe', {
  style: 'pixel-art',
  size: '64x64'
});

// Check job status
const status = await puterServer.getJobStatus(job.jobId);
```

## Puter SDK Setup

### Installation

The Puter SDK is loaded via CDN in the HTML:

```html
<script src="https://js.puter.com/v2/"></script>
```

### Initialization

Puter auto-initializes when loaded. Check availability before use:

```typescript
// Check if Puter is available
if (typeof puter !== 'undefined' && puter.ai) {
  console.log('Puter AI ready');
}

// Wait for Puter to be ready
await puter.ready;
```

## AI Chat Integration

### Basic Chat

```typescript
const response = await puter.ai.chat('Your prompt here');
console.log(response.message.content);
```

### Streaming Responses

```typescript
const response = await puter.ai.chat('Your prompt here', { stream: true });

for await (const chunk of response) {
  process.stdout.write(chunk?.text || '');
}
```

### Chat with Context

```typescript
const messages = [
  { role: 'system', content: 'You are a game master for Grudge Warlords.' },
  { role: 'user', content: 'Generate a quest description for finding a lost artifact.' }
];

const response = await puter.ai.chat(messages);
```

### Model Selection

```typescript
// Use specific models
const response = await puter.ai.chat('prompt', {
  model: 'gpt-4o-mini' // or 'claude-3-5-sonnet', etc.
});
```

## AI Image Generation (txt2img)

### Generate Sprites

```typescript
const result = await puter.ai.txt2img('pixel art warrior character, 64x64, fantasy RPG style');

// Result contains image data
const imageUrl = result.url;
```

### Sprite Generation Patterns

For consistent sprite generation:

```typescript
const spritePrompt = `
  pixel art character sprite sheet,
  64x64 pixels per frame,
  4 directional walk cycle,
  fantasy RPG style,
  transparent background,
  ${characterDescription}
`;

const result = await puter.ai.txt2img(spritePrompt, {
  size: '256x256', // 4x4 grid for sprite sheet
});
```

## Puter Key-Value Storage (KV)

### Basic Operations

```typescript
// Set value
await puter.kv.set('player_prefs', JSON.stringify(preferences));

// Get value
const data = await puter.kv.get('player_prefs');
const prefs = JSON.parse(data);

// Delete
await puter.kv.del('player_prefs');

// List keys
const keys = await puter.kv.list('player_*');
```

### Use Cases in Grudge Warlords

| Key Pattern          | Purpose                           |
|---------------------|-----------------------------------|
| `session_{id}`      | User session data                 |
| `cache_items`       | Item database cache               |
| `generated_{hash}`  | AI-generated content cache        |
| `prefs_{userId}`    | User preferences                  |

## AI Agent Development Patterns

### Quest Generation Agent

```typescript
async function generateQuest(context: QuestContext): Promise<Quest> {
  const prompt = `
    Generate a quest for Grudge Warlords with:
    - Player level: ${context.playerLevel}
    - Current region: ${context.region}
    - Completed quests: ${context.completedQuests.join(', ')}
    
    Return JSON with: title, description, objectives, rewards
  `;
  
  const response = await puter.ai.chat(prompt, {
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' }
  });
  
  return JSON.parse(response.message.content);
}
```

### NPC Dialogue Agent

```typescript
async function generateDialogue(npc: NPC, context: DialogueContext): Promise<string> {
  const systemPrompt = `
    You are ${npc.name}, a ${npc.race} ${npc.occupation} in Grudge Warlords.
    Personality: ${npc.personality}
    Current situation: ${context.situation}
    
    Respond in character with 1-3 sentences.
  `;
  
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: context.playerMessage }
  ];
  
  const response = await puter.ai.chat(messages);
  return response.message.content;
}
```

### Dungeon Description Agent

```typescript
async function describeDungeon(dungeon: Dungeon, room: Room): Promise<string> {
  const prompt = `
    Describe this dungeon room in 2-3 atmospheric sentences:
    - Dungeon type: ${dungeon.type}
    - Room type: ${room.type}
    - Enemies present: ${room.enemies.map(e => e.name).join(', ')}
    - Notable features: ${room.features.join(', ')}
    
    Style: Dark fantasy, immersive, brief
  `;
  
  const response = await puter.ai.chat(prompt);
  return response.message.content;
}
```

## Sprite Generation Workflow

### Admin Sprite Generator

The admin panel includes a sprite generation tool:

```typescript
// In client/src/pages/admin/sprite-generator.tsx
async function generateSprite(description: string, category: string) {
  const prompt = buildSpritePrompt(description, category);
  
  const result = await puter.ai.txt2img(prompt, {
    size: '256x256',
    quality: 'high'
  });
  
  // Save to object storage
  const filename = `sprites/${category}/${nanoid()}.png`;
  await saveToStorage(result.url, filename);
  
  return filename;
}

function buildSpritePrompt(description: string, category: string): string {
  const styleGuide = {
    character: 'pixel art character, 64x64, 4-frame walk cycle',
    monster: 'pixel art monster, menacing, dark fantasy style',
    item: 'pixel art item icon, 32x32, clear silhouette',
    tile: 'pixel art tile, seamless, top-down perspective'
  };
  
  return `${styleGuide[category]}, ${description}, transparent background`;
}
```

## Error Handling

### Rate Limiting

```typescript
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (error.message?.includes('rate limit')) {
        await sleep(1000 * Math.pow(2, attempt));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}

// Usage
const response = await withRetry(() => puter.ai.chat(prompt));
```

### Fallback Responses

```typescript
async function safeAIChat(prompt: string, fallback: string): Promise<string> {
  try {
    const response = await puter.ai.chat(prompt);
    return response.message.content;
  } catch (error) {
    console.error('AI chat failed:', error);
    return fallback;
  }
}
```

## Best Practices

### Prompt Engineering

1. **Be Specific** - Include context, constraints, and expected format
2. **Use System Messages** - Set tone and behavior clearly
3. **Request JSON** - For structured data, ask for JSON explicitly
4. **Keep It Focused** - One task per prompt for better results

### Performance

1. **Cache Responses** - Store generated content in KV storage
2. **Batch Requests** - Combine multiple AI calls when possible
3. **Use Streaming** - For long responses, stream to improve UX
4. **Timeout Handling** - Set reasonable timeouts for AI calls

### Security

1. **Validate Output** - Don't trust AI output directly for code execution
2. **Sanitize Prompts** - Escape user input in prompts
3. **Rate Limit Users** - Prevent abuse of AI features
4. **Log Usage** - Track AI calls for debugging and billing

## Integration Patterns

### Client-Side AI

For real-time features like NPC chat:

```typescript
// In React component
const [response, setResponse] = useState('');

async function chat(message: string) {
  const result = await puter.ai.chat([
    { role: 'system', content: npcSystemPrompt },
    { role: 'user', content: message }
  ], { stream: true });
  
  for await (const chunk of result) {
    setResponse(prev => prev + (chunk?.text || ''));
  }
}
```

### Server-Side AI (via API)

For complex generation that needs validation:

```typescript
// In server/routes.ts
app.post('/api/generate-quest', async (req, res) => {
  const { context } = req.body;
  
  // Generate via Puter AI
  const quest = await generateQuest(context);
  
  // Validate and store
  const validated = validateQuest(quest);
  await storage.createQuest(validated);
  
  res.json(validated);
});
```

## File Structure

| File                              | Purpose                          |
|-----------------------------------|----------------------------------|
| `client/src/lib/puterAI.ts`       | Puter AI wrapper utilities       |
| `client/src/hooks/usePuterAI.ts`  | React hooks for AI features      |
| `client/src/pages/admin/sprite-generator.tsx` | Admin sprite tool |
| `server/routes.ts`                | API endpoints for AI generation  |

## Environment Variables

No environment variables needed for Puter - it uses the authenticated user's account automatically when running in a Puter environment.

For local development:
- Puter features will be disabled if not in Puter environment
- Use mock responses or fallback data for testing

## Resources

- [Puter.js Documentation](https://docs.puter.com/)
- [Puter AI API Reference](https://docs.puter.com/ai/)
- [Puter KV Storage Guide](https://docs.puter.com/kv/)
