/**
 * aiPersonality — character personality, greeting, chat, and random
 * discussion generation.
 *
 * This file replaces the previous placeholder import in `server/routes.ts`
 * which silently produced `MODULE_NOT_FOUND` errors at runtime. Per
 * AGENTS.md ("What Does NOT Exist on VPS"), these endpoints are **local
 * dev only** — the production VPS does not host them. The frontend is
 * expected to render `BackendRequired` for affected pages.
 *
 * Behavior:
 *   - When `OPENAI_API_KEY` (or `AI_INTEGRATIONS_OPENAI_API_KEY`) is set,
 *     these functions call OpenAI and return live results.
 *   - When no key is configured, every entry point throws
 *     `ServiceDisabledError`. Route handlers in `server/routes.ts` map
 *     that error to HTTP 503 with a structured body so callers can
 *     surface a "service unavailable" UI instead of a 500.
 */
import OpenAI from "openai";
import { storage } from "../storage";

const OPENAI_KEY = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
const MODEL = process.env.AI_PERSONALITY_MODEL || "gpt-4o-mini";

export class ServiceDisabledError extends Error {
  readonly code = "AI_PERSONALITY_DISABLED";
  constructor(message = "AI personality service is not configured on this host") {
    super(message);
    this.name = "ServiceDisabledError";
  }
}

let _client: OpenAI | null = null;
function client(): OpenAI {
  if (!OPENAI_KEY) throw new ServiceDisabledError();
  if (!_client) _client = new OpenAI({ apiKey: OPENAI_KEY, baseURL: OPENAI_BASE_URL });
  return _client;
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

export async function generatePersonality(
  raceName: string,
  className: string,
  characterName: string,
): Promise<CharacterPersonality> {
  const ai = client();
  const prompt = [
    `Generate a unique fantasy RPG personality profile for a character named "${characterName}",`,
    `a ${raceName} ${className}. Return JSON with these exact string fields:`,
    `trueGoals, hobbies, obsessions, behavior, catchphrase, fears.`,
    `Each field should be 1-2 sentences. Catchphrase should be a single line of dialogue.`,
  ].join(" ");

  const resp = await ai.chat.completions.create({
    model: MODEL,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: "You are a fantasy RPG narrative designer. Output strict JSON." },
      { role: "user", content: prompt },
    ],
    temperature: 0.9,
  });

  const raw = resp.choices?.[0]?.message?.content || "{}";
  let parsed: Partial<CharacterPersonality> = {};
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = {};
  }
  return {
    trueGoals: parsed.trueGoals || "",
    hobbies: parsed.hobbies || "",
    obsessions: parsed.obsessions || "",
    behavior: parsed.behavior || "",
    catchphrase: parsed.catchphrase || "",
    fears: parsed.fears || "",
    generatedAt: Date.now(),
  };
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface ChatResult {
  reply: string;
  history: ChatTurn[];
}

export async function chatWithCharacter(
  characterId: string,
  message: string,
  history: ChatTurn[] = [],
): Promise<ChatResult> {
  const ai = client();
  const character = await storage.getCharacter(characterId);
  if (!character) throw new Error("Character not found");

  const personality = (character as any).personality as CharacterPersonality | undefined;
  const tempPct = (character as any).chatTemperature ?? 70;
  const temperature = Math.max(0, Math.min(1.5, tempPct / 100));

  const systemLines = [
    `You are role-playing a fantasy RPG character named "${character.name}".`,
    personality?.behavior && `Behavior: ${personality.behavior}`,
    personality?.trueGoals && `Goals: ${personality.trueGoals}`,
    personality?.obsessions && `Obsessions: ${personality.obsessions}`,
    personality?.fears && `Fears: ${personality.fears}`,
    personality?.catchphrase && `You sometimes use the catchphrase: "${personality.catchphrase}"`,
    `Stay in character. Reply in 1-3 short sentences.`,
  ].filter(Boolean) as string[];

  const trimmed = history.slice(-12);
  const resp = await ai.chat.completions.create({
    model: MODEL,
    temperature,
    messages: [
      { role: "system", content: systemLines.join("\n") },
      ...trimmed.map((t) => ({ role: t.role, content: t.content })),
      { role: "user", content: message },
    ],
  });

  const reply = resp.choices?.[0]?.message?.content?.trim() || "...";
  const now = Date.now();
  const newHistory: ChatTurn[] = [
    ...trimmed,
    { role: "user", content: message, timestamp: now },
    { role: "assistant", content: reply, timestamp: now + 1 },
  ];

  await storage.updateCharacter(characterId, { chatHistory: newHistory } as any);
  return { reply, history: newHistory };
}

export async function generateCharacterGreeting(characterId: string): Promise<string> {
  const ai = client();
  const character = await storage.getCharacter(characterId);
  if (!character) throw new Error("Character not found");

  const personality = (character as any).personality as CharacterPersonality | undefined;
  const prompt = personality?.catchphrase
    ? `Greet the player as ${character.name}. You may riff on your catchphrase: "${personality.catchphrase}". One short line.`
    : `Greet the player as ${character.name}, a fantasy RPG hero. One short line, in character.`;

  const resp = await ai.chat.completions.create({
    model: MODEL,
    temperature: 0.85,
    messages: [
      { role: "system", content: "Stay in character. Output a single short greeting." },
      { role: "user", content: prompt },
    ],
  });
  return resp.choices?.[0]?.message?.content?.trim() || "...";
}

export interface RandomDiscussion {
  speakerId: string;
  message: string;
}

export async function triggerRandomDiscussion(
  characterIds: string[],
): Promise<RandomDiscussion | null> {
  if (!characterIds.length) return null;
  const ai = client();

  const speakerId = characterIds[Math.floor(Math.random() * characterIds.length)];
  const speaker = await storage.getCharacter(speakerId);
  if (!speaker) return null;

  const personality = (speaker as any).personality as CharacterPersonality | undefined;
  const flavor = personality?.behavior || personality?.obsessions || "musing about adventure";

  const resp = await ai.chat.completions.create({
    model: MODEL,
    temperature: 0.95,
    messages: [
      { role: "system", content: "You are a fantasy RPG hero making a brief, in-character remark. One short line." },
      { role: "user", content: `As ${speaker.name}, say something in character. Flavor: ${flavor}.` },
    ],
  });
  const message = resp.choices?.[0]?.message?.content?.trim();
  if (!message) return null;
  return { speakerId, message };
}
