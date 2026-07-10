/**
 * WarVoice — AI declaration / herald speech for war cinematics.
 *
 * Best practice stack (browser-first, progressive enhancement):
 *  1. Web Speech API (instant, free, works offline after voices load)
 *  2. Optional remote TTS via /api/ai speech if wired later
 *
 * Voices prefer deep male for warlords, brighter for heralds.
 */

export type WarVoiceRole = 'herald' | 'crimson_lord' | 'azure_lord' | 'narrator';

export interface SpeakOpts {
  role?: WarVoiceRole;
  rate?: number;
  pitch?: number;
  volume?: number;
  /** Prefer not to interrupt current line */
  queue?: boolean;
}

type LineDone = () => void;

const ROLE_HINT: Record<
  WarVoiceRole,
  { rate: number; pitch: number; prefer: RegExp }
> = {
  herald: { rate: 0.92, pitch: 1.05, prefer: /google uk english female|samantha|zira|female|aria/i },
  crimson_lord: { rate: 0.88, pitch: 0.82, prefer: /google uk english male|daniel|david|male|mark/i },
  azure_lord: { rate: 0.9, pitch: 0.9, prefer: /google us english|alex|fred|male/i },
  narrator: { rate: 0.95, pitch: 1.0, prefer: /google|microsoft|natural|neural/i },
};

export class WarVoice {
  private supported: boolean;
  private queue: Array<{ text: string; opts: SpeakOpts; resolve: LineDone }> = [];
  private speaking = false;
  private muted = false;
  private voices: SpeechSynthesisVoice[] = [];

  constructor() {
    this.supported =
      typeof window !== 'undefined' && typeof window.speechSynthesis !== 'undefined';
    if (this.supported) {
      this.refreshVoices();
      window.speechSynthesis.onvoiceschanged = () => this.refreshVoices();
    }
  }

  get isSupported(): boolean {
    return this.supported;
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (m) this.cancel();
  }

  private refreshVoices(): void {
    if (!this.supported) return;
    this.voices = window.speechSynthesis.getVoices();
  }

  private pickVoice(role: WarVoiceRole): SpeechSynthesisVoice | null {
    if (!this.voices.length) this.refreshVoices();
    if (!this.voices.length) return null;
    const prefer = ROLE_HINT[role].prefer;
    const en = this.voices.filter((v) => /en(-|_|$)/i.test(v.lang));
    const pool = en.length ? en : this.voices;
    return pool.find((v) => prefer.test(v.name)) ?? pool[0] ?? null;
  }

  /** Speak one line; resolves when utterance ends (or immediately if muted/unsupported). */
  speak(text: string, opts: SpeakOpts = {}): Promise<void> {
    return new Promise((resolve) => {
      if (!this.supported || this.muted || !text.trim()) {
        resolve();
        return;
      }
      if (opts.queue === false && this.speaking) {
        window.speechSynthesis.cancel();
        this.queue = [];
        this.speaking = false;
      }
      this.queue.push({ text: text.trim(), opts, resolve });
      this.pump();
    });
  }

  /** Speak several lines in sequence. */
  async speakScript(
    lines: Array<{ text: string; role?: WarVoiceRole; pauseMs?: number }>,
  ): Promise<void> {
    for (const line of lines) {
      await this.speak(line.text, { role: line.role ?? 'narrator', queue: true });
      if (line.pauseMs) await delay(line.pauseMs);
    }
  }

  cancel(): void {
    if (this.supported) window.speechSynthesis.cancel();
    for (const q of this.queue) q.resolve();
    this.queue = [];
    this.speaking = false;
  }

  private pump(): void {
    if (this.speaking || !this.queue.length || !this.supported) return;
    const next = this.queue.shift()!;
    this.speaking = true;
    const role = next.opts.role ?? 'narrator';
    const hint = ROLE_HINT[role];
    const u = new SpeechSynthesisUtterance(next.text);
    u.rate = next.opts.rate ?? hint.rate;
    u.pitch = next.opts.pitch ?? hint.pitch;
    u.volume = next.opts.volume ?? 1;
    const voice = this.pickVoice(role);
    if (voice) u.voice = voice;
    u.onend = () => {
      this.speaking = false;
      next.resolve();
      this.pump();
    };
    u.onerror = () => {
      this.speaking = false;
      next.resolve();
      this.pump();
    };
    window.speechSynthesis.speak(u);
  }

  dispose(): void {
    this.cancel();
    if (this.supported) window.speechSynthesis.onvoiceschanged = null;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
