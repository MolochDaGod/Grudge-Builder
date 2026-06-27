/**
 * LegionDevPanel — ALE Legion dev overlay (replaces GrudgeAI).
 *
 * Bottom-right, z-[9999], over everything. WebGL Legion orb + agentic chat.
 * Routes: Local Ollama → Legion hub → Puter free AI → GRUDA Agent workspace.
 * Voice: "AL BABY AL BABY AL BABY" wake phrase (Pixel / browser Speech API).
 * Shortcut: Ctrl+Shift+G
 */

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { aiClient, useAIStatus, type AITaskType } from "@/lib/aiClient";
import { cn } from "@/lib/utils";

const GRUDA_AGENT_URL =
  import.meta.env.VITE_GRUDA_AGENT_URL || "https://grudaagent.vercel.app";
const LEGION_HUB = "https://ai.grudge-studio.com";

const TASK_PRESETS: Array<{
  id: AITaskType;
  label: string;
  icon: string;
  system?: string;
  agent?: string;
}> = [
  {
    id: "game",
    label: "Game Dev",
    icon: "🎮",
    system:
      "You are ALE Legion — Grudge Studio dev agent. Concise, code-first, fleet-aware.",
    agent: "dev",
  },
  {
    id: "code",
    label: "Code",
    icon: "💻",
    system: "Senior TypeScript/Three.js developer. Production-ready patches only.",
    agent: "dev",
  },
  {
    id: "debug",
    label: "Debug",
    icon: "🐛",
    system: "Debug expert. Root cause, minimal fix, test steps.",
    agent: "dev",
  },
  {
    id: "generate",
    label: "Lore",
    icon: "✨",
    system: "Grudge Warlords content generator.",
    agent: "lore",
  },
  { id: "chat", label: "Chat", icon: "💬", agent: "general" },
  { id: "quick", label: "Quick", icon: "⚡", agent: "general" },
];

type PanelTab = "chat" | "agent" | "local";

interface Message {
  role: "user" | "assistant";
  content: string;
  provider?: string;
  timestamp: number;
}

const WAKE_RE =
  /al\s*baby|ale\s*baby|legion\s*activate|grudge\s*legion/i;

/** Minimal Web Speech API types (not in default lib.dom for all TS configs). */
interface LegionSpeechResult {
  isFinal: boolean;
  0: { transcript: string };
}

interface LegionSpeechRecognitionEvent {
  resultIndex: number;
  results: LegionSpeechResult[];
}

interface LegionSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: LegionSpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type LegionSpeechRecognitionCtor = new () => LegionSpeechRecognition;

function getSpeechRecognitionCtor(): LegionSpeechRecognitionCtor | null {
  const w = window as Window & {
    SpeechRecognition?: LegionSpeechRecognitionCtor;
    webkitSpeechRecognition?: LegionSpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export default function LegionDevPanel() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<PanelTab>("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [activeTask, setActiveTask] = useState<AITaskType>("game");
  const [voiceOn, setVoiceOn] = useState(false);
  const [intensity, setIntensity] = useState(75);

  const { data: status } = useAIStatus();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const orbRef = useRef<HTMLIFrameElement>(null);
  const recognitionRef = useRef<LegionSpeechRecognition | null>(null);

  const ollamaOnline = status?.ollama?.online ?? false;
  const cloudOnline = status?.cloud?.online ?? false;
  const puterOnline = status?.puter?.online ?? false;
  const providerLabel = ollamaOnline
    ? "Local Ollama"
    : cloudOnline
      ? "Legion Hub"
      : puterOnline
        ? "Puter (free)"
        : "Offline";
  const providerColor = ollamaOnline
    ? "#22c55e"
    : cloudOnline
      ? "#00ffff"
      : puterOnline
        ? "#a855f7"
        : "#ef4444";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open, tab]);

  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "G") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const postToOrb = useCallback(
    (payload: Record<string, unknown>) => {
      orbRef.current?.contentWindow?.postMessage(
        { type: "legion-control", ...payload },
        "*",
      );
    },
    [],
  );

  useEffect(() => {
    postToOrb({ voiceActive: voiceOn, connected: cloudOnline || ollamaOnline || puterOnline, intensity });
  }, [voiceOn, cloudOnline, ollamaOnline, puterOnline, intensity, postToOrb]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;

    setMessages((prev) => [
      ...prev,
      { role: "user", content: text, timestamp: Date.now() },
    ]);
    setInput("");
    setStreaming(true);
    setIntensity((i) => Math.min(100, i + 12));

    const preset = TASK_PRESETS.find((t) => t.id === activeTask);
    const assistantIdx = messages.length + 1;

    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "", timestamp: Date.now() },
    ]);

    try {
      let full = "";
      for await (const token of aiClient.chatStream(
        activeTask,
        text,
        preset?.system,
      )) {
        full += token;
        setMessages((prev) => {
          const next = [...prev];
          next[assistantIdx] = {
            role: "assistant",
            content: full,
            provider: providerLabel,
            timestamp: Date.now(),
          };
          return next;
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "AI request failed";
      setMessages((prev) => {
        const next = [...prev];
        next[assistantIdx] = {
          role: "assistant",
          content: `Legion error: ${msg}`,
          timestamp: Date.now(),
        };
        return next;
      });
    } finally {
      setStreaming(false);
      setIntensity((i) => Math.max(40, i - 8));
    }
  }, [input, streaming, activeTask, messages.length, providerLabel]);

  const handleVoiceResult = useCallback(
    (transcript: string) => {
      const t = transcript.trim();
      if (!t) return;
      if (WAKE_RE.test(t)) {
        setOpen(true);
        setVoiceOn(true);
        return;
      }
      if (open) {
        setInput(t);
      }
    },
    [open],
  );

  useEffect(() => {
    const SR = getSpeechRecognitionCtor();
    if (!SR) return;

    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    recognitionRef.current = rec;

    rec.onresult = (event) => {
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        }
      }
      if (final) handleVoiceResult(final);
    };

    rec.onend = () => {
      if (voiceOn) {
        try {
          rec.start();
        } catch {
          /* already started */
        }
      }
    };

    if (voiceOn) {
      try {
        rec.start();
      } catch {
        /* mic busy */
      }
    } else {
      rec.stop();
    }

    return () => {
      rec.onresult = null;
      rec.onend = null;
      rec.stop();
    };
  }, [voiceOn, handleVoiceResult]);

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-[9999] w-16 h-16 rounded-full border-2 border-cyan-400/60 bg-gradient-to-br from-[#0f0f23] to-[#16213e] shadow-lg shadow-cyan-500/25 flex items-center justify-center overflow-hidden hover:scale-105 transition-transform cursor-pointer"
        title="Legion Dev (Ctrl+Shift+G)"
      >
        <iframe
          src="/legion/orb.html"
          title="Legion orb"
          className="pointer-events-none w-full h-full border-0 scale-110"
        />
        <span
          className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full border border-black/50"
          style={{ backgroundColor: providerColor }}
        />
      </button>
    );
  }

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-[9999] flex flex-col overflow-hidden",
        "w-[min(440px,calc(100vw-2rem))] h-[min(680px,calc(100vh-2rem))]",
        "rounded-2xl border border-cyan-500/30 bg-[#0a0a18]/95 backdrop-blur-xl",
        "shadow-2xl shadow-cyan-900/40 font-sans",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-cyan-500/20 bg-[#0f0f23]/90">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-cyan-500/40">
            <iframe
              ref={orbRef}
              src="/legion/orb.html"
              title="Legion orb"
              className="w-full h-full border-0 pointer-events-none scale-125"
            />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-cyan-300 tracking-wide truncate">
              ALE LEGION
            </div>
            <div className="text-[10px] text-cyan-600/80 truncate">
              Brother Keeper · {providerLabel} · {Math.round(intensity)}%
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setVoiceOn((v) => !v)}
            className={cn(
              "px-2 py-1 rounded text-[10px] border",
              voiceOn
                ? "border-green-500/50 text-green-300 bg-green-950/40"
                : "border-slate-600 text-slate-400",
            )}
            title='Voice wake: "AL BABY AL BABY AL BABY"'
          >
            🎤
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="px-2 py-1 rounded text-slate-400 hover:text-white text-sm"
            title="Close (Ctrl+Shift+G)"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-cyan-500/15 text-xs">
        {(
          [
            ["chat", "💬 Chat"],
            ["agent", "⚡ GRUDA"],
            ["local", "🖥 Local"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "flex-1 py-2 transition-colors",
              tab === id
                ? "text-cyan-300 border-b-2 border-cyan-400 bg-cyan-950/30"
                : "text-slate-500 hover:text-slate-300",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "chat" && (
        <>
          <div className="flex gap-1 px-2 py-1.5 overflow-x-auto border-b border-cyan-500/10">
            {TASK_PRESETS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTask(t.id)}
                className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] whitespace-nowrap",
                  activeTask === t.id
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                    : "text-slate-500 hover:text-slate-300",
                )}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-0">
            {messages.length === 0 && (
              <div className="text-center text-slate-500 text-xs mt-6 px-4">
                <p className="text-cyan-400/80 font-semibold mb-2">Legion Dev Tool</p>
                <p>Local Ollama first, then Legion hub, then Puter free AI.</p>
                <p className="mt-2 text-slate-600">
                  Pixel / Gemini BYOK → set GEMINI_API_KEY on Legion hub.
                </p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex",
                  msg.role === "user" ? "justify-end" : "justify-start",
                )}
              >
                <div
                  className={cn(
                    "max-w-[88%] px-2.5 py-1.5 rounded-lg text-xs whitespace-pre-wrap break-words",
                    msg.role === "user"
                      ? "bg-cyan-500/15 text-cyan-100 rounded-br-sm"
                      : "bg-slate-900/80 text-slate-200 border border-slate-700/50 rounded-bl-sm",
                  )}
                >
                  {msg.content || (streaming && i === messages.length - 1 ? "…" : "")}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="px-3 py-2 border-t border-cyan-500/15">
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Legion…"
                rows={1}
                disabled={streaming}
                className="flex-1 bg-slate-900/80 border border-slate-600 rounded-lg px-2 py-1.5 text-xs text-white placeholder-slate-500 resize-none focus:outline-none focus:border-cyan-500/50"
              />
              <button
                type="button"
                onClick={send}
                disabled={streaming || !input.trim()}
                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 text-black font-bold rounded-lg text-xs"
              >
                {streaming ? "…" : "→"}
              </button>
            </div>
          </div>
        </>
      )}

      {tab === "agent" && (
        <div className="flex-1 flex flex-col p-4 gap-3 text-xs text-slate-300 min-h-0 overflow-y-auto">
          <p className="text-cyan-300/90 font-semibold">GRUDA Agent — Warp-like workspace</p>
          <p>
            Full agentic builder: tools, projects, skills, Treaty chat, voice.
            Runs locally or on Vercel with Legion AI models.
          </p>
          <a
            href={GRUDA_AGENT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 py-3 rounded-lg bg-gradient-to-r from-orange-600 to-amber-500 text-black font-bold hover:opacity-90"
          >
            Open GRUDA Agent ↗
          </a>
          <a
            href={`${LEGION_HUB}/v1/agents`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-500 hover:text-cyan-300"
          >
            Legion agent roles API
          </a>
          <p className="text-slate-500 mt-auto">
            Tip: run <code className="text-cyan-600">npx gruda-agent</code> locally for
            zero-latency file + shell tools.
          </p>
        </div>
      )}

      {tab === "local" && (
        <div className="flex-1 p-4 text-xs text-slate-300 space-y-3 overflow-y-auto min-h-0">
          <p className="text-cyan-300/90 font-semibold">Local resource stack</p>
          <ul className="space-y-2 list-disc pl-4 text-slate-400">
            <li>
              <strong className="text-green-400">Ollama</strong> —{" "}
              {ollamaOnline
                ? status?.ollama.models.slice(0, 4).join(", ") || "online"
                : "offline — install Ollama + pull grudge-dev"}
            </li>
            <li>
              <strong className="text-cyan-400">Legion hub</strong> —{" "}
              {cloudOnline ? "ai.grudge-studio.com online" : "unreachable"}
            </li>
            <li>
              <strong className="text-purple-400">Puter AI</strong> —{" "}
              {puterOnline ? "free tier via Puter SDK" : "sign in to Puter"}
            </li>
            <li>
              <strong className="text-amber-400">Pixel / Google</strong> — Gemini BYOK on
              hub; on-device Gemini via Pixel AI where available
            </li>
          </ul>
          <div className="flex items-center justify-between pt-2 border-t border-slate-700">
            <span className="text-slate-400">Prefer local Ollama</span>
            <button
              type="button"
              onClick={() => {
                const prefs = aiClient.getPrefs();
                aiClient.setPreferLocal(!prefs.preferLocal);
              }}
              className={cn(
                "px-2 py-0.5 rounded text-[10px]",
                aiClient.getPrefs().preferLocal
                  ? "bg-green-500/20 text-green-400"
                  : "bg-slate-700 text-slate-400",
              )}
            >
              {aiClient.getPrefs().preferLocal ? "ON" : "OFF"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}