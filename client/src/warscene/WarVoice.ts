/**
 * WarVoice — cinematic TTS for war declarations.
 *
 * Priority:
 *  1. ElevenLabs via POST /api/war/tts (WoW-style deep fantasy voices)
 *  2. Web Speech API fallback
 *
 * Never put API keys in the client — server proxy only.
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
  herald: {
    rate: 0.92,
    pitch: 1.02,
    prefer: /google uk english male|daniel|george|male/i,
  },
  crimson_lord: {
    rate: 0.85,
    pitch: 0.78,
    prefer: /google uk english male|daniel|david|male|mark/i,
  },
  azure_lord: {
    rate: 0.88,
    pitch: 0.88,
    prefer: /google us english|alex|fred|male/i,
  },
  narrator: {
    rate: 0.92,
    pitch: 0.95,
    prefer: /google|microsoft|natural|neural|male/i,
  },
};

export class WarVoice {
  private speechSupported: boolean;
  private queue: Array<{ text: string; opts: SpeakOpts; resolve: LineDone }> = [];
  private speaking = false;
  private muted = false;
  private voices: SpeechSynthesisVoice[] = [];
  private audio: HTMLAudioElement | null = null;
  private preferEleven = true;
  private elevenAvailable: boolean | null = null;

  constructor() {
    this.speechSupported =
      typeof window !== 'undefined' && typeof window.speechSynthesis !== 'undefined';
    if (this.speechSupported) {
      this.refreshVoices();
      window.speechSynthesis.onvoiceschanged = () => this.refreshVoices();
    }
    // Probe ElevenLabs proxy once
    void this.probeEleven();
  }

  get isSupported(): boolean {
    return this.speechSupported || this.preferEleven;
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (m) this.cancel();
  }

  private async probeEleven(): Promise<void> {
    try {
      const r = await fetch('/api/war/tts/status', { method: 'GET' });
      if (!r.ok) {
        this.elevenAvailable = false;
        return;
      }
      const j = (await r.json()) as { configured?: boolean };
      this.elevenAvailable = !!j.configured;
    } catch {
      this.elevenAvailable = false;
    }
  }

  private refreshVoices(): void {
    if (!this.speechSupported) return;
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

  speak(text: string, opts: SpeakOpts = {}): Promise<void> {
    return new Promise((resolve) => {
      if (this.muted || !text.trim()) {
        resolve();
        return;
      }
      if (opts.queue === false && this.speaking) {
        this.cancel();
      }
      this.queue.push({ text: text.trim(), opts, resolve });
      void this.pump();
    });
  }

  async speakScript(
    lines: Array<{ text: string; role?: WarVoiceRole; pauseMs?: number }>,
  ): Promise<void> {
    for (const line of lines) {
      await this.speak(line.text, { role: line.role ?? 'narrator', queue: true });
      if (line.pauseMs) await delay(line.pauseMs);
    }
  }

  cancel(): void {
    if (this.speechSupported) window.speechSynthesis.cancel();
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
      this.audio = null;
    }
    for (const q of this.queue) q.resolve();
    this.queue = [];
    this.speaking = false;
  }

  private async pump(): Promise<void> {
    if (this.speaking || !this.queue.length) return;
    const next = this.queue.shift()!;
    this.speaking = true;
    const role = next.opts.role ?? 'narrator';

    try {
      const usedEleven = await this.speakEleven(next.text, role, next.opts.volume ?? 1);
      if (!usedEleven) {
        await this.speakWeb(next.text, role, next.opts);
      }
    } catch {
      await this.speakWeb(next.text, role, next.opts);
    }

    this.speaking = false;
    next.resolve();
    void this.pump();
  }

  private async speakEleven(
    text: string,
    role: WarVoiceRole,
    volume: number,
  ): Promise<boolean> {
    if (!this.preferEleven) return false;
    if (this.elevenAvailable === false) return false;

    try {
      const r = await fetch('/api/war/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, role }),
      });
      if (!r.ok) {
        this.elevenAvailable = false;
        return false;
      }
      this.elevenAvailable = true;
      const blob = await r.blob();
      if (!blob.size || !blob.type.includes('audio')) return false;

      const url = URL.createObjectURL(blob);
      await new Promise<void>((resolve, reject) => {
        const audio = new Audio(url);
        this.audio = audio;
        audio.volume = Math.min(1, Math.max(0, volume));
        audio.onended = () => {
          URL.revokeObjectURL(url);
          this.audio = null;
          resolve();
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          this.audio = null;
          reject(new Error('audio_play_failed'));
        };
        void audio.play().catch(reject);
      });
      return true;
    } catch {
      this.elevenAvailable = false;
      return false;
    }
  }

  private speakWeb(text: string, role: WarVoiceRole, opts: SpeakOpts): Promise<void> {
    return new Promise((resolve) => {
      if (!this.speechSupported) {
        resolve();
        return;
      }
      const hint = ROLE_HINT[role];
      const u = new SpeechSynthesisUtterance(text);
      u.rate = opts.rate ?? hint.rate;
      u.pitch = opts.pitch ?? hint.pitch;
      u.volume = opts.volume ?? 1;
      const voice = this.pickVoice(role);
      if (voice) u.voice = voice;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      window.speechSynthesis.speak(u);
    });
  }

  dispose(): void {
    this.cancel();
    if (this.speechSupported) window.speechSynthesis.onvoiceschanged = null;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
