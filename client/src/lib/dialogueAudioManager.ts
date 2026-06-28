/**
 * Dialogue Audio Manager — voice barks from Super Dialogue Audio Pack (CDN).
 */
import { getSFXVolume, isSFXMuted } from '@/lib/audioManager';
import {
  dialogueClipUrl,
  randomDialogueVariant,
  resolveNPCVoice,
  resolvePlayerVoice,
  ROLE_DIALOGUE_CATEGORY,
  type DialogueCategory,
  type DialogueVoiceProfile,
} from '@/lib/dialogueAudioCatalog';
import type { TownNPC } from '@shared/definitions/factionTowns';

let currentDialogue: HTMLAudioElement | null = null;
let dialogueVolume = 0.85;

export function setDialogueVolume(vol: number): void {
  dialogueVolume = Math.max(0, Math.min(1, vol));
  if (currentDialogue && !isSFXMuted()) {
    currentDialogue.volume = dialogueVolume * getSFXVolume();
  }
}

export function stopDialogue(): void {
  if (currentDialogue) {
    currentDialogue.pause();
    currentDialogue.src = '';
    currentDialogue = null;
  }
}

export function playDialogueClip(
  category: DialogueCategory,
  voice: DialogueVoiceProfile,
  options?: { variant?: number; seed?: string; interrupt?: boolean },
): void {
  if (isSFXMuted()) return;

  const variant = options?.variant
    ?? randomDialogueVariant(category, options?.seed ?? voice.id);
  const url = dialogueClipUrl(category, voice, variant);

  if (options?.interrupt !== false) stopDialogue();

  const audio = new Audio(url);
  audio.volume = dialogueVolume * getSFXVolume();
  currentDialogue = audio;
  audio.play().catch(() => {});
  audio.addEventListener('ended', () => {
    if (currentDialogue === audio) currentDialogue = null;
  });
}

/** Play a bark for a town NPC (role picks default category unless overridden). */
export function playNPCDialogue(
  npc: TownNPC,
  category?: DialogueCategory,
  seed?: string,
): void {
  const voice = resolveNPCVoice(npc);
  const cat = category ?? ROLE_DIALOGUE_CATEGORY[npc.role] ?? 'miscellaneous';
  playDialogueClip(cat, voice, { seed: seed ?? npc.id });
}

/** Play player character bark (combat hurt/death, emotes). */
export function playPlayerDialogue(
  category: DialogueCategory,
  seed: string,
  raceId?: string,
): void {
  const voice = resolvePlayerVoice(seed, raceId);
  playDialogueClip(category, voice, { seed });
}

/** Greeting when starting NPC interaction. */
export function playNPCGreeting(npc: TownNPC): void {
  playNPCDialogue(npc, 'greeting');
}

/** Farewell when ending NPC interaction. */
export function playNPCFarewell(npc: TownNPC): void {
  playNPCDialogue(npc, 'farewell');
}

/** Combat damage grunt for player or hero. */
export function playCombatDamage(seed: string, raceId?: string): void {
  playPlayerDialogue('damage', seed, raceId);
}

/** Death bark. */
export function playCombatDeath(seed: string, raceId?: string): void {
  playPlayerDialogue('death', seed, raceId);
}

/** Quest/mission complete. */
export function playCompletion(seed: string, raceId?: string): void {
  playPlayerDialogue('completion', seed, raceId);
}