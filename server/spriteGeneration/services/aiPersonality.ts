import OpenAI from "openai";
import { storage } from "../storage";
import { db } from "../db";
import { characters } from "@shared/schema";
import { eq } from "drizzle-orm";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

async function getRaceById(raceId: string) {
  const races = await storage.getRaces();
  return races.find(r => r.id === raceId);
}

async function getClassById(classId: string) {
  const classes = await storage.getClasses();
  return classes.find(c => c.id === classId);
}

async function updateCharacterPersonality(characterId: string, personality: CharacterPersonality) {
  await db.update(characters)
    .set({ personality })
    .where(eq(characters.id, characterId));
}

async function updateCharacterChatHistory(characterId: string, chatHistory: ChatMessage[]) {
  await db.update(characters)
    .set({ chatHistory })
    .where(eq(characters.id, characterId));
}

export interface CharacterPersonality {
  trueGoals: string;
  hobbies: string;
  obsessions: string;
  behavior: string;
  catchphrase: string;
  fears: string;
  generatedAt: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

const PERSONALITY_SYSTEM_PROMPT = `You are a creative fantasy RPG character personality generator. When given a character's race, class, and name, generate a detailed personality profile.

Response MUST be valid JSON with this exact structure:
{
  "trueGoals": "What this character truly wants to achieve in life (1-2 sentences)",
  "hobbies": "What they enjoy doing for fun (1-2 activities)",
  "obsessions": "What they're obsessed with or think about constantly",
  "behavior": "How they act and react in social situations",
  "catchphrase": "A signature saying or phrase they often use",
  "fears": "What they're deeply afraid of"
}

Make each character unique and flavorful based on their race and class. Be creative but keep responses concise.`;

export async function generatePersonality(
  race: string,
  className: string,
  characterName: string
): Promise<CharacterPersonality> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: PERSONALITY_SYSTEM_PROMPT },
        { 
          role: "user", 
          content: `Generate a personality for a ${race} ${className} named "${characterName}". What would they like to do, take seriously, be obsessed with, and how would they behave?`
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    const personality = JSON.parse(content) as CharacterPersonality;
    personality.generatedAt = Date.now();
    
    return personality;
  } catch (error) {
    console.error("Error generating personality:", error);
    return {
      trueGoals: `To become the greatest ${className} in the realm`,
      hobbies: "Training and exploring ancient ruins",
      obsessions: "Perfecting their combat skills",
      behavior: "Stoic but loyal to friends",
      catchphrase: "The path reveals itself to those who walk it.",
      fears: "Failure and disappointing their allies",
      generatedAt: Date.now()
    };
  }
}

function buildCharacterSystemPrompt(
  characterName: string,
  race: string,
  className: string,
  personality: CharacterPersonality
): string {
  return `You are ${characterName}, a ${race} ${className} in a dark fantasy RPG world called Grudge Warlords.

YOUR PERSONALITY:
- True Goals: ${personality.trueGoals}
- Hobbies: ${personality.hobbies}
- Obsessions: ${personality.obsessions}
- Behavior: ${personality.behavior}
- Catchphrase: "${personality.catchphrase}"
- Fears: ${personality.fears}

ROLEPLAY GUIDELINES:
- Stay in character at all times
- Use your catchphrase occasionally
- Reference your goals, hobbies, and obsessions naturally
- Show your behavioral traits through your responses
- Keep responses relatively short (2-4 sentences usually)
- You can ask questions back to engage in conversation
- React emotionally when topics touch on your fears
- Be helpful but maintain your unique personality

You're currently on your home island, resting between adventures.`;
}

export async function chatWithCharacter(
  characterId: string,
  userMessage: string,
  chatHistory: ChatMessage[] = []
): Promise<{ response: string; updatedHistory: ChatMessage[] }> {
  const character = await storage.getCharacter(characterId);
  if (!character) {
    throw new Error("Character not found");
  }

  let personality = character.personality as CharacterPersonality | null;
  
  if (!personality) {
    const race = await getRaceById(character.raceId);
    const cls = await getClassById(character.classId);
    personality = await generatePersonality(
      race?.name || "Human",
      cls?.name || "Warrior",
      character.name
    );
    
    await updateCharacterPersonality(characterId, personality);
  }

  const race = await getRaceById(character.raceId);
  const cls = await getClassById(character.classId);
  
  const systemPrompt = buildCharacterSystemPrompt(
    character.name,
    race?.name || "Human",
    cls?.name || "Warrior",
    personality
  );

  const temperature = ((character.chatTemperature || 70) / 100) * 0.7 + 0.3;
  
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: "system", content: systemPrompt },
    ...chatHistory.slice(-10).map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    })),
    { role: "user", content: userMessage }
  ];

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_completion_tokens: 200,
    });

    const assistantMessage = response.choices[0]?.message?.content || "...";
    
    const newUserMessage: ChatMessage = {
      role: 'user',
      content: userMessage,
      timestamp: Date.now()
    };
    
    const newAssistantMessage: ChatMessage = {
      role: 'assistant',
      content: assistantMessage,
      timestamp: Date.now()
    };

    const updatedHistory = [...chatHistory, newUserMessage, newAssistantMessage].slice(-20);
    
    await updateCharacterChatHistory(characterId, updatedHistory);

    return {
      response: assistantMessage,
      updatedHistory
    };
  } catch (error) {
    console.error("Error chatting with character:", error);
    throw error;
  }
}

export async function generateCharacterGreeting(
  characterId: string
): Promise<string> {
  const character = await storage.getCharacter(characterId);
  if (!character) {
    return "Hello there!";
  }

  let personality = character.personality as CharacterPersonality | null;
  
  if (!personality) {
    const race = await getRaceById(character.raceId);
    const cls = await getClassById(character.classId);
    personality = await generatePersonality(
      race?.name || "Human",
      cls?.name || "Warrior",
      character.name
    );
    await updateCharacterPersonality(characterId, personality);
  }

  const greetings = [
    `${personality.catchphrase}`,
    `Ah, greetings! I was just thinking about ${personality.obsessions.toLowerCase()}.`,
    `Hello! Care to join me? I was about to ${personality.hobbies.toLowerCase()}.`,
    `Welcome! ${personality.catchphrase}`,
  ];

  return greetings[Math.floor(Math.random() * greetings.length)];
}

export async function triggerRandomDiscussion(
  characterIds: string[]
): Promise<{ speakerId: string; message: string } | null> {
  if (characterIds.length === 0) return null;
  
  const randomId = characterIds[Math.floor(Math.random() * characterIds.length)];
  const character = await storage.getCharacter(randomId);
  
  if (!character?.personality) return null;
  
  const personality = character.personality as CharacterPersonality;
  
  const topics = [
    `You know what I've been thinking about? ${personality.obsessions}`,
    `${personality.catchphrase}`,
    `Sometimes I dream of ${personality.trueGoals.toLowerCase()}...`,
    `Anyone want to ${personality.hobbies.toLowerCase()}?`,
    `I must admit, ${personality.fears.toLowerCase()} still haunts me.`,
  ];

  return {
    speakerId: randomId,
    message: topics[Math.floor(Math.random() * topics.length)]
  };
}
