/**
 * Grudge Studio Forge — /forge
 *
 * Unified game editor shell with tabs:
 *   Assets — Browse ObjectStore, preview 3D models
 *   Items  — CRUD items with live UUID generation
 *   Ledger — UUID audit trail viewer
 *   AI     — AI gateway status, provider routing, model info
 *   Tools  — DevTools: ObjectStore browser, health checks
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { useAIStatus, aiClient, type AITaskType } from "@/lib/aiClient";
import { useObjectStoreData } from "@/lib/objectStoreData";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import OpeningScene from "@/components/forge/OpeningScene";

type ForgeTab = "assets" | "items" | "ledger" | "ai" | "tools";

const TABS: Array<{ id: ForgeTab; label: string; icon: string }> = [
  { id: "assets", label: "Assets", icon: "📦" },
  { id: "items",  label: "Items",  icon: "⚔️" },
  { id: "ledger", label: "UUID Ledger", icon: "📋" },
  { id: "ai",     label: "AI Hub", icon: "🤖" },
  { id: "tools",  label: "Dev Tools", icon: "🔧" },
];

export default function ForgePage() {
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<ForgeTab>("ai");

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/home")}>
              <Home className="w-4 h-4" />
            </Button>
            <h1 className="text-lg font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              Grudge Studio Forge
            </h1>
          </div>
          <div className="flex gap-1">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  tab === t.id
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {tab === "ai" && <AIHubTab />}
        {tab === "assets" && <AssetsTab />}
        {tab === "items" && <ItemsTab />}
        {tab === "ledger" && <LedgerTab />}
        {tab === "tools" && <ToolsTab />}
      </div>
    </div>
  );
}

// ── AI Hub Tab ──────────────────────────────────────────────────────

function AIHubTab() {
  const { data: status, isLoading, error } = useAIStatus();

  if (isLoading) return <div className="text-slate-500 text-center py-12">Loading AI status...</div>;
  if (error) return <div className="text-red-400 text-center py-12">Failed to load AI status</div>;

  const ollama = status?.ollama;
  const cloud = status?.cloud;

  return (
    <div className="space-y-6">
      {/* Provider cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`rounded-xl p-5 border ${ollama?.online ? "border-green-500/30 bg-green-500/5" : "border-slate-700 bg-slate-800/50"}`}>
          <div className="flex items-center gap-2 mb-3">
            <span className={`w-3 h-3 rounded-full ${ollama?.online ? "bg-green-500" : "bg-red-500"}`} />
            <h3 className="font-bold text-white">Local (Ollama)</h3>
            <span className="text-xs text-slate-400">{ollama?.host}</span>
          </div>
          {ollama?.online ? (
            <div className="space-y-2">
              <p className="text-sm text-green-400">{ollama.models.length} models loaded</p>
              <div className="flex flex-wrap gap-1">
                {ollama.models.map(m => (
                  <span key={m} className="px-2 py-0.5 rounded bg-slate-700 text-xs text-slate-300">
                    {m}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-red-400">Offline — start Ollama to enable local AI</p>
          )}
        </div>

        <div className={`rounded-xl p-5 border ${cloud?.online ? "border-blue-500/30 bg-blue-500/5" : "border-slate-700 bg-slate-800/50"}`}>
          <div className="flex items-center gap-2 mb-3">
            <span className={`w-3 h-3 rounded-full ${cloud?.online ? "bg-blue-500" : "bg-red-500"}`} />
            <h3 className="font-bold text-white">Cloud (AI Gateway)</h3>
            <span className="text-xs text-slate-400">{cloud?.host}</span>
          </div>
          {cloud?.online ? (
            <p className="text-sm text-blue-400">137+ models via Cloudflare AI Gateway</p>
          ) : (
            <p className="text-sm text-red-400">Unreachable</p>
          )}
        </div>
      </div>

      {/* Routing table */}
      <div className="rounded-xl border border-slate-700 overflow-hidden">
        <div className="bg-slate-800 px-4 py-2 border-b border-slate-700">
          <h3 className="font-bold text-sm text-white">Task → Model Routing</h3>
        </div>
        <div className="divide-y divide-slate-700/50">
          {status?.routing?.map(r => (
            <div key={r.task} className="px-4 py-2.5 flex items-center gap-4 text-sm">
              <span className="w-20 font-mono text-amber-400">{r.task}</span>
              <span className="text-slate-500 flex-1 text-xs">{r.description}</span>
              {r.localModel && (
                <span className={`px-2 py-0.5 rounded text-xs ${r.localAvailable ? "bg-green-500/10 text-green-400" : "bg-slate-700 text-slate-500"}`}>
                  {r.localModel}
                </span>
              )}
              <span className={`px-2 py-0.5 rounded text-xs ${r.cloudAvailable ? "bg-blue-500/10 text-blue-400" : "bg-slate-700 text-slate-500"}`}>
                {r.cloudModel}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Preferences */}
      <div className="rounded-xl border border-slate-700 p-4 bg-slate-800/50">
        <h3 className="font-bold text-sm text-white mb-3">AI Preferences</h3>
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-400">Prefer Local (Ollama first, free)</span>
          <button
            onClick={() => {
              const prefs = aiClient.getPrefs();
              aiClient.setPreferLocal(!prefs.preferLocal);
            }}
            className={`px-3 py-1 rounded text-sm ${
              aiClient.getPrefs().preferLocal
                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                : "bg-slate-700 text-slate-400"
            }`}
          >
            {aiClient.getPrefs().preferLocal ? "ON" : "OFF"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Assets Tab ──────────────────────────────────────────────────────

function AssetsTab() {
  const { totalItems, isLoading } = useObjectStoreData();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">3D Viewer & Asset Inspector</h2>
        <span className="text-sm text-slate-400">
          {isLoading ? "Loading..." : `${totalItems} items in database`}
        </span>
      </div>
      {/* Opening scene doubles as a universal model viewer: drop or import a
          GLB/glTF/FBX/OBJ/STL/PLY/DAE/3MF file to inspect it. */}
      <OpeningScene className="h-[70vh]" />
      <p className="text-xs text-slate-500">
        Drag-and-drop or use <span className="text-amber-400">Import</span> to load any supported
        format. Connected to objectstore.grudge-studio.com.
      </p>
    </div>
  );
}

// ── Items Tab ───────────────────────────────────────────────────────

function ItemsTab() {
  const { items, totalItems, isLoading } = useObjectStoreData();
  const categories = [...new Set(items.map(i => i.category))].sort();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Item Database</h2>
        <span className="text-sm text-slate-400">
          {isLoading ? "Loading..." : `${totalItems} items across ${categories.length} categories`}
        </span>
      </div>
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {categories.map(c => (
            <span key={c} className="px-2 py-0.5 rounded bg-slate-800 text-xs text-slate-300 border border-slate-700">
              {c}
            </span>
          ))}
        </div>
      )}
      <div className="rounded-xl border border-slate-700 p-8 bg-slate-800/30 text-center text-slate-500">
        <p className="text-4xl mb-3">⚔️</p>
        <p>Item CRUD with live UUID generation, tier/slot editing</p>
        <p className="text-xs mt-1">Every item gets a Grudge UUID on create</p>
      </div>
    </div>
  );
}

// ── Ledger Tab ──────────────────────────────────────────────────────

function LedgerTab() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">UUID Audit Ledger</h2>
      <div className="rounded-xl border border-slate-700 p-8 bg-slate-800/30 text-center text-slate-500">
        <p className="text-4xl mb-3">📋</p>
        <p>Search and filter UUID events — CREATED, ASSIGNED, EQUIPPED, CONSUMED, TRANSFERRED, DESTROYED</p>
        <p className="text-xs mt-1">Append-only audit trail for anti-cheat verification</p>
        <div className="mt-4 flex justify-center gap-2">
          {["CREATED", "CONSUMED", "TRANSFERRED", "DESTROYED"].map(e => (
            <span key={e} className="px-2 py-0.5 rounded bg-slate-800 text-xs text-slate-400 border border-slate-700">
              {e}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Tools Tab ───────────────────────────────────────────────────────

function ToolsTab() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Dev Tools</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { icon: "📦", title: "ObjectStore Browser", desc: "Browse, upload, preview assets on R2" },
          { icon: "🔍", title: "UUID Validator", desc: "Validate any Grudge UUID's state and history" },
          { icon: "📊", title: "Game Health", desc: "Service health checks across all endpoints" },
          { icon: "🤖", title: "Ollama Console", desc: "Direct model interaction and testing" },
        ].map(card => (
          <div key={card.title} className="rounded-xl border border-slate-700 p-5 bg-slate-800/30 hover:border-amber-500/30 transition-colors">
            <p className="text-2xl mb-2">{card.icon}</p>
            <h3 className="font-bold text-white text-sm">{card.title}</h3>
            <p className="text-xs text-slate-400 mt-1">{card.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
