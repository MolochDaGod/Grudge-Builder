/**
 * GrudgeAI — floating AI assistant panel.
 *
 * Single ⚡ button (bottom-right) → expands into a chat panel.
 * Streams responses from local Ollama (grudge-dev) or cloud AI gateway.
 * Keyboard shortcut: Ctrl+Shift+G to toggle.
 */

import { useState, useRef, useEffect, useCallback, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { aiClient, useAIStatus, type AITaskType } from "@/lib/aiClient";

// ── Task presets ─────────────────────────────────────────────────────

const TASK_PRESETS: Array<{ id: AITaskType; label: string; icon: string; system?: string }> = [
  { id: "game", label: "Game Dev", icon: "🎮", system: "You are Grudge Dev, an AI assistant for Grudge Studio game development. Be concise and code-focused." },
  { id: "code", label: "Code", icon: "💻", system: "You are a senior TypeScript/JavaScript developer. Give concise, production-ready code." },
  { id: "debug", label: "Debug", icon: "🐛", system: "You are a debugging expert. Analyze errors, suggest fixes, explain root causes concisely." },
  { id: "generate", label: "Generate", icon: "✨", system: "You are a content generator for Grudge Warlords. Create lore, missions, items, NPC dialogue." },
  { id: "chat", label: "Chat", icon: "💬" },
  { id: "quick", label: "Quick", icon: "⚡" },
];

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

export default function GrudgeAI() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [activeTask, setActiveTask] = useState<AITaskType>("game");
  const [showSettings, setShowSettings] = useState(false);

  const { data: status } = useAIStatus();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Ctrl+Shift+G global shortcut
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "G") {
        e.preventDefault();
        setOpen(v => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ── Send message ──────────────────────────────────────────────────

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg: Message = { role: "user", content: text, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setStreaming(true);

    const preset = TASK_PRESETS.find(t => t.id === activeTask);
    const assistantMsg: Message = { role: "assistant", content: "", timestamp: Date.now() };
    setMessages(prev => [...prev, assistantMsg]);

    try {
      let full = "";
      for await (const token of aiClient.chatStream(activeTask, text, preset?.system)) {
        full += token;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { ...assistantMsg, content: full };
          return updated;
        });
      }
    } catch (err: any) {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...assistantMsg,
          content: `Error: ${err.message || "AI request failed"}`,
        };
        return updated;
      });
    } finally {
      setStreaming(false);
    }
  }, [input, streaming, activeTask]);

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  // ── Provider indicator ────────────────────────────────────────────

  const ollamaOnline = status?.ollama?.online ?? false;
  const cloudOnline = status?.cloud?.online ?? false;
  const providerLabel = ollamaOnline ? "Local (Ollama)" : cloudOnline ? "Cloud" : "Offline";
  const providerColor = ollamaOnline ? "#22c55e" : cloudOnline ? "#3b82f6" : "#ef4444";

  // ── Floating button (collapsed) ───────────────────────────────────

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/30 flex items-center justify-center text-white text-2xl hover:scale-110 transition-transform cursor-pointer"
        title="Grudge AI (Ctrl+Shift+G)"
      >
        ⚡
      </button>
    );
  }

  // ── Expanded panel ────────────────────────────────────────────────

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[420px] h-[600px] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl shadow-black/50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800/80 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <span className="text-lg">⚡</span>
          <span className="font-bold text-white text-sm">Grudge AI</span>
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ backgroundColor: providerColor }}
            title={providerLabel}
          />
          <span className="text-xs text-slate-400">{providerLabel}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSettings(v => !v)}
            className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white text-xs"
            title="Settings"
          >⚙</button>
          <button
            onClick={() => { setMessages([]); }}
            className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white text-xs"
            title="Clear"
          >🗑</button>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white text-sm"
            title="Close (Ctrl+Shift+G)"
          >✕</button>
        </div>
      </div>

      {/* Task selector */}
      <div className="flex gap-1 px-3 py-2 bg-slate-800/40 border-b border-slate-700/50 overflow-x-auto">
        {TASK_PRESETS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTask(t.id)}
            className={`px-2.5 py-1 rounded-full text-xs whitespace-nowrap transition-colors ${
              activeTask === t.id
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                : "text-slate-400 hover:text-white hover:bg-slate-700/50"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Settings panel (collapsible) */}
      {showSettings && (
        <div className="px-3 py-2 bg-slate-800/60 border-b border-slate-700/50 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Prefer Local (Ollama)</span>
            <button
              onClick={() => {
                const prefs = aiClient.getPrefs();
                aiClient.setPreferLocal(!prefs.preferLocal);
              }}
              className={`px-2 py-0.5 rounded text-xs ${
                aiClient.getPrefs().preferLocal
                  ? "bg-green-500/20 text-green-400"
                  : "bg-slate-700 text-slate-400"
              }`}
            >
              {aiClient.getPrefs().preferLocal ? "ON" : "OFF"}
            </button>
          </div>
          {status?.ollama?.online && (
            <div className="text-slate-500">
              Models: {status.ollama.models.map(m => m.split(":")[0]).join(", ")}
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-slate-500 text-sm mt-8">
            <p className="text-2xl mb-2">⚡</p>
            <p>Ask anything about Grudge Studio</p>
            <p className="text-xs mt-1 text-slate-600">
              {ollamaOnline ? "Using local grudge-dev model" : "Using cloud AI"}
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] px-3 py-2 rounded-xl text-sm whitespace-pre-wrap break-words ${
                msg.role === "user"
                  ? "bg-amber-500/20 text-amber-100 rounded-br-sm"
                  : "bg-slate-800 text-slate-200 rounded-bl-sm border border-slate-700/50"
              }`}
            >
              {msg.content || (streaming && i === messages.length - 1 ? "..." : "")}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-3 bg-slate-800/50 border-t border-slate-700">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask Grudge AI (${TASK_PRESETS.find(t => t.id === activeTask)?.label})...`}
            rows={1}
            className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 resize-none focus:outline-none focus:border-amber-500/50"
            disabled={streaming}
          />
          <button
            onClick={send}
            disabled={streaming || !input.trim()}
            className="px-3 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-700 disabled:text-slate-500 text-black font-bold rounded-lg text-sm transition-colors"
          >
            {streaming ? "..." : "→"}
          </button>
        </div>
      </div>
    </div>
  );
}
