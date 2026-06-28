/**
 * Super Dialogue Audio Pack v1 — CDN catalog and voice profile resolution.
 *
 * Assets: https://assets.grudge-studio.com/audio/dialogue/super-pack/
 */
import { assetUrl } from '@/lib/assetConfig';
import type { TownNPC } from '@shared/definitions/factionTowns';
import type { DialogueVoiceId } from '@shared/definitions/dialogueVoices';

export type { DialogueVoiceId };

export const DIALOGUE_CDN_PREFIX = '/audio/dialogue/super-pack';

export type DialogueCategory =
  | 'completion'
  | 'confirmation'
  | 'greeting'
  | 'farewell'
  | 'refusal'
  | 'miscellaneous'
  | 'damage'
  | 'death'
  | 'grunting'
  | 'shouting';

export type DialogueGender = 'male' | 'female';

export interface DialogueVoiceProfile {
  id: DialogueVoiceId;
  gender: DialogueGender;
  /** Short suffix used in filenames, e.g. greeting_1_alex.wav */
  fileTag: string;
  displayName: string;
}

export const DIALOGUE_VOICES: Record<DialogueVoiceId, DialogueVoiceProfile> = {
  'karen-cenon': { id: 'karen-cenon', gender: 'female', fileTag: 'karen', displayName: 'Karen Cenon' },
  'meghan-christian': { id: 'meghan-christian', gender: 'female', fileTag: 'meghan', displayName: 'Meghan Christian' },
  'alex-brodie': { id: 'alex-brodie', gender: 'male', fileTag: 'alex', displayName: 'Alex Brodie' },
  'ian-lampert': { id: 'ian-lampert', gender: 'male', fileTag: 'ian', displayName: 'Ian Lampert' },
  'sean-lenhart': { id: 'sean-lenhart', gender: 'male', fileTag: 'sean', displayName: 'Sean Lenhart' },
};

/** Variants per category (1–10 in source pack). */
export const DIALOGUE_VARIANTS: Record<DialogueCategory, number> = {
  completion: 10,
  confirmation: 10,
  greeting: 10,
  farewell: 10,
  refusal: 10,
  miscellaneous: 10,
  damage: 10,
  death: 10,
  grunting: 10,
  shouting: 10,
};

/** Role → default bark category when interacting. */
export const ROLE_DIALOGUE_CATEGORY: Partial<Record<TownNPC['role'], DialogueCategory>> = {
  merchant: 'greeting',
  factionVendor: 'greeting',
  questGiver: 'greeting',
  hero: 'greeting',
  shrineKeeper: 'miscellaneous',
  guard: 'confirmation',
  civilian: 'miscellaneous',
};

/** Canonical NPC → voice overrides (town + lobby). */
export const NPC_VOICE_BY_ID: Record<string, DialogueVoiceId> = {
  // Crusade
  cru_m1: 'ian-lampert',
  cru_m2: 'karen-cenon',
  cru_m3: 'ian-lampert',
  cru_fv: 'sean-lenhart',
  cru_aurion: 'sean-lenhart',
  cru_theron: 'alex-brodie',
  cru_sk: 'ian-lampert',
  cru_c2: 'meghan-christian',
  // Legion
  leg_m1: 'ian-lampert',
  leg_m2: 'sean-lenhart',
  leg_fv: 'ian-lampert',
  leg_gruk: 'ian-lampert',
  leg_morgash: 'sean-lenhart',
  leg_sk: 'sean-lenhart',
  // Fabled
  fab_m1: 'meghan-christian',
  fab_m2: 'ian-lampert',
  fab_m3: 'karen-cenon',
  fab_fv: 'meghan-christian',
  fab_aelindor: 'alex-brodie',
  fab_thordak: 'ian-lampert',
  fab_sk: 'meghan-christian',
  // Lobby
  lobby_m1: 'karen-cenon',
  lobby_m2: 'ian-lampert',
  lobby_fv: 'meghan-christian',
  lobby_q1: 'sean-lenhart',
  lobby_sk: 'ian-lampert',
};

/** Hero roster → distinct voices for combat barks. */
export const HERO_VOICE_BY_ID: Record<string, DialogueVoiceId> = {
  aurion: 'sean-lenhart',
  sigurd: 'ian-lampert',
  kael: 'alex-brodie',
  theron: 'alex-brodie',
  thrax: 'ian-lampert',
  grok: 'sean-lenhart',
  kira: 'karen-cenon',
  vox: 'alex-brodie',
  gruk: 'ian-lampert',
  nazgrim: 'sean-lenhart',
  vexol: 'alex-brodie',
  morgash: 'sean-lenhart',
  silesh: 'sean-lenhart',
  bone: 'ian-lampert',
  whisper: 'meghan-christian',
  dredge: 'ian-lampert',
  aelindor: 'alex-brodie',
  silvaine: 'meghan-christian',
  lyra: 'karen-cenon',
  fenwick: 'alex-brodie',
  durgin: 'ian-lampert',
  brenna: 'karen-cenon',
  thordak: 'ian-lampert',
  helga: 'meghan-christian',
};

const FEMALE_NAME_HINTS = /\b(elara|ilyana|brenna|kira|lyra|silvaine|helga|whisper|townswoman|scholar|voice|starweave|ironheart|acolyte)\b/i;

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function pickVoiceFromPool(pool: DialogueVoiceId[], seed: string): DialogueVoiceId {
  return pool[hashString(seed) % pool.length];
}

const MALE_VOICES: DialogueVoiceId[] = ['alex-brodie', 'ian-lampert', 'sean-lenhart'];
const FEMALE_VOICES: DialogueVoiceId[] = ['karen-cenon', 'meghan-christian'];

/** Build CDN URL for a specific dialogue clip. */
export function dialogueClipUrl(
  category: DialogueCategory,
  voice: DialogueVoiceProfile,
  variant = 1,
): string {
  const clamped = Math.max(1, Math.min(variant, DIALOGUE_VARIANTS[category]));
  const file = `${category}_${clamped}_${voice.fileTag}.wav`;
  const rel = `${DIALOGUE_CDN_PREFIX}/${category}/${voice.gender}/${voice.id}/${file}`;
  return assetUrl(rel);
}

/** Resolve voice for a town NPC definition. */
export function resolveNPCVoice(npc: TownNPC): DialogueVoiceProfile {
  if (npc.voiceProfile && DIALOGUE_VOICES[npc.voiceProfile]) {
    return DIALOGUE_VOICES[npc.voiceProfile];
  }
  const override = NPC_VOICE_BY_ID[npc.id] ?? (npc.heroId ? HERO_VOICE_BY_ID[npc.heroId] : undefined);
  if (override) return DIALOGUE_VOICES[override];

  const female = FEMALE_NAME_HINTS.test(npc.name);
  const pool = female ? FEMALE_VOICES : MALE_VOICES;
  const id = pickVoiceFromPool(pool, npc.id);
  return DIALOGUE_VOICES[id];
}

/** Resolve player character voice from race + stable seed (name or id). */
export function resolvePlayerVoice(seed: string, raceId?: string): DialogueVoiceProfile {
  const heroVoice = HERO_VOICE_BY_ID[seed.toLowerCase()];
  if (heroVoice) return DIALOGUE_VOICES[heroVoice];

  const femaleRaces = raceId === 'elf';
  const pool = femaleRaces && hashString(seed) % 2 === 0
    ? FEMALE_VOICES
    : MALE_VOICES;
  const id = pickVoiceFromPool(pool, seed);
  return DIALOGUE_VOICES[id];
}

/** Pick a random variant index for a category. */
export function randomDialogueVariant(category: DialogueCategory, seed?: string): number {
  const max = DIALOGUE_VARIANTS[category];
  if (seed) return (hashString(seed + category) % max) + 1;
  return Math.floor(Math.random() * max) + 1;
}