/**
 * GrudaWars Launcher — 2D game entry point.
 *
 * Receives `characterId` and `islandId` query params from the character creator,
 * fetches live character + island data, and deep-links the player into
 * the external 2D GrudaWars app (grudgewarlords.com) with their session context.
 */
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CharacterManager, type Character } from "@/lib/characterManager";
import { authHeaders } from "@/lib/grudgeBackend";

const GRUDAWARS_BASE = "https://grudgewarlords.com";

export default function GrudaWarsPage() {
  const [, navigate] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const characterId = params.get("characterId") || "";
  const islandId = params.get("islandId") || "";

  const [character, setCharacter] = useState<Character | null>(null);
  const [island, setIsland] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        // Load character by ID or fall back to the active one
        let char: Character | null = null;
        if (characterId) {
          const all = await CharacterManager.getAll();
          char = all.find(c => c.id === characterId) || null;
        }
        if (!char) {
          char = await CharacterManager.getActiveCharacter();
        }
        setCharacter(char);

        // Load island
        if (islandId) {
          const res = await fetch(`/api/islands/${islandId}`, { headers: authHeaders() });
          if (res.ok) {
            setIsland(await res.json());
          }
        } else {
          // fallback: load home island for active user
          const res = await fetch("/api/island", { headers: authHeaders() });
          if (res.ok) setIsland(await res.json());
        }
      } catch (e) {
        setError("Failed to load character or island data.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [characterId, islandId]);

  const buildLaunchUrl = () => {
    const url = new URL(GRUDAWARS_BASE);
    if (character?.id) url.searchParams.set("characterId", character.id);
    if (island?.id) url.searchParams.set("islandId", island.id);
    if (character?.name) url.searchParams.set("name", character.name);
    if (character?.classId) url.searchParams.set("class", character.classId);
    if (character?.raceId) url.searchParams.set("race", character.raceId);
    return url.toString();
  };

  const handleLaunch = () => {
    window.location.href = buildLaunchUrl();
  };

  const handleOpenInTab = () => {
    window.open(buildLaunchUrl(), "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900 flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        {/* Back button */}
        <button
          onClick={() => navigate("/home")}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Hub
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-cinzel font-black text-transparent bg-clip-text bg-gradient-to-b from-emerald-300 to-emerald-600 mb-2">
            GrudaWars
          </h1>
          <p className="text-slate-400 text-sm">2D Island Conquest · Turn-Based Strategy</p>
        </div>

        {/* Content panel */}
        <div className="bg-black/40 backdrop-blur border border-slate-700/60 rounded-2xl p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-8 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Loading your hero...</span>
            </div>
          ) : error ? (
            <div className="text-center py-6">
              <p className="text-red-400 mb-4">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
                className="border-slate-600 text-slate-300"
              >
                <RefreshCw className="w-4 h-4 mr-2" /> Retry
              </Button>
            </div>
          ) : (
            <>
              {/* Character card */}
              {character && (
                <div className="flex items-center gap-4 bg-emerald-950/40 border border-emerald-800/40 rounded-xl p-4">
                  {character.avatarUrl ? (
                    <img
                      src={character.avatarUrl}
                      alt={character.name}
                      className="w-14 h-14 rounded-lg object-cover ring-2 ring-emerald-600/50"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-emerald-700 to-teal-900 flex items-center justify-center text-2xl ring-2 ring-emerald-600/50">
                      ⚔️
                    </div>
                  )}
                  <div>
                    <div className="font-cinzel font-bold text-emerald-200 text-base">{character.name}</div>
                    <div className="text-sm text-slate-400 capitalize">
                      Lv {character.level} {character.raceId} {character.classId}
                    </div>
                  </div>
                </div>
              )}

              {/* Island preview */}
              {island && (
                <div className="bg-slate-900/60 border border-slate-700/60 rounded-xl p-4">
                  <div className="text-xs text-emerald-400 uppercase tracking-widest font-bold mb-2">Home Island</div>
                  <div className="text-slate-200 font-medium mb-1">{island.name || "Unnamed Island"}</div>
                  <div className="grid grid-cols-3 gap-3 mt-3">
                    <div className="text-center">
                      <div className="text-xl font-bold text-amber-300">
                        {(island.state?.nodes || []).length}
                      </div>
                      <div className="text-[10px] text-slate-500 uppercase">Nodes</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-green-300">
                        {(island.state?.animals || island.state?.sheep || []).length}
                      </div>
                      <div className="text-[10px] text-slate-500 uppercase">Animals</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-blue-300">
                        {(island.state?.terrainZones || []).length}
                      </div>
                      <div className="text-[10px] text-slate-500 uppercase">Zones</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Launch actions */}
              <div className="space-y-3 pt-2">
                <Button
                  onClick={handleLaunch}
                  className="w-full h-12 bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-600 hover:to-emerald-500 text-white font-cinzel font-bold tracking-widest"
                >
                  ⚔️ ENTER GRUDAWARS
                </Button>
                <Button
                  onClick={handleOpenInTab}
                  variant="outline"
                  className="w-full border-slate-600 text-slate-300 hover:bg-slate-800"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open in New Tab
                </Button>
              </div>

              <p className="text-xs text-slate-500 text-center">
                Launching at{" "}
                <span className="text-emerald-500/70">{GRUDAWARS_BASE}</span>
                {" "}with your character and island context
              </p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
