/**
 * /viewer — Grudge6 hero model viewer with portrait-matched textures + animations.
 */
import { useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Home, Play, Pause, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import ThreeScene, { type ThreeSceneHandle } from "@/components/ThreeScene";
import Grudge6Character3D from "@/components/Grudge6Character3D";
import { HERO_PORTRAITS } from "@/lib/artAssets";
import { panelEquipmentToModel3d } from "@shared/fleet";
import type { AnimState3D } from "@/lib/modelManifest";
import { HERO_ROSTER } from "@shared/definitions/lore";

const HERO_IDS = Object.keys(HERO_PORTRAITS);

/** Canonical hero roster lookup: maps hero ID → { raceId, classId } */
const HERO_RACE_CLASS_MAP = new Map(
  HERO_ROSTER.map((h) => [h.id, { raceId: h.raceId, classId: h.classId }])
);

const ARMOR_TINT: Record<string, string> = {
  human_warrior: "#e6e9ef",
  human_mage: "#5a4cbf",
  human_ranger: "#2a3a18",
  barbarian_warrior: "#7a4e28",
  barbarian_mage: "#8a1030",
  barbarian_ranger: "#c8b890",
  dwarf_warrior: "#a8b0b8",
  dwarf_mage: "#ff5500",
  dwarf_ranger: "#604820",
  elf_warrior: "#c8e0a8",
  elf_mage: "#2a4838",
  elf_ranger: "#c8e8b0",
  orc_warrior: "#2e4820",
  orc_mage: "#28380a",
  orc_ranger: "#4a6a18",
  undead_warrior: "#18140c",
  undead_mage: "#c0b8a8",
  undead_ranger: "#b0ae90",
};

const ANIM_OPTIONS: AnimState3D[] = [
  "idle",
  "walk",
  "run",
  "attack1",
  "cast",
  "block",
  "death",
];

function parseHeroId(heroId: string): { raceId: string; classId: string; label: string } {
  // First, check canonical roster for named heroes (aurion, sigurd, etc.)
  const canonical = HERO_RACE_CLASS_MAP.get(heroId);
  if (canonical) {
    const raceLabel = canonical.raceId.charAt(0).toUpperCase() + canonical.raceId.slice(1);
    const classLabel = canonical.classId.charAt(0).toUpperCase() + canonical.classId.slice(1);
    return {
      raceId: canonical.raceId,
      classId: canonical.classId,
      label: `${raceLabel} ${classLabel}`,
    };
  }

  // Fallback: parse race_class format (human_warrior, barbarian_mage, etc.)
  const idx = heroId.indexOf("_");
  const raceId = idx > 0 ? heroId.slice(0, idx) : "human";
  const role = idx > 0 ? heroId.slice(idx + 1) : "warrior";
  const classId = role;
  const label = `${raceId.charAt(0).toUpperCase()}${raceId.slice(1)} ${classId}`;
  return { raceId, classId, label };
}

export default function Grudge6ViewerPage() {
  const [, setLocation] = useLocation();
  const sceneRef = useRef<ThreeSceneHandle | null>(null);
  const [heroId, setHeroId] = useState(HERO_IDS[0] ?? "human_warrior");
  const [anim, setAnim] = useState<AnimState3D>("idle");
  const [autoRotate, setAutoRotate] = useState(true);

  const { raceId, classId, label } = useMemo(() => parseHeroId(heroId), [heroId]);

  const model3d = useMemo(
    () =>
      panelEquipmentToModel3d(raceId, classId, {}, {
        armorColor: ARMOR_TINT[heroId] ?? "#ffffff",
      }),
    [raceId, classId, heroId],
  );

  const portrait = HERO_PORTRAITS[heroId];

  return (
    <div className="flex h-screen w-screen flex-col bg-[#0a0a12]">
      <header className="flex shrink-0 items-center gap-3 border-b border-slate-800 bg-slate-900/90 px-4 py-2 backdrop-blur-sm">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/home")} className="text-slate-400">
          <Home className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-sm font-bold text-transparent">
            Grudge6 Hero Viewer
          </h1>
          <p className="text-[10px] text-slate-500">Portrait-matched textures · Mixamo animations</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-slate-700 text-xs text-slate-300"
            onClick={() => setAutoRotate((v) => !v)}
          >
            {autoRotate ? <Pause className="mr-1 h-3 w-3" /> : <Play className="mr-1 h-3 w-3" />}
            Orbit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-slate-700 text-xs text-slate-300"
            onClick={() => setAnim("idle")}
          >
            <RotateCcw className="mr-1 h-3 w-3" />
            Reset
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-56 shrink-0 flex-col border-r border-slate-800 bg-slate-950/80">
          <p className="border-b border-slate-800 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Heroes
          </p>
          <div className="flex-1 overflow-y-auto p-2">
            {HERO_IDS.map((id) => {
              const { label: heroLabel } = parseHeroId(id);
              const active = id === heroId;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setHeroId(id);
                    setAnim("idle");
                  }}
                  className={cn(
                    "mb-1.5 flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-colors",
                    active
                      ? "border-amber-500/50 bg-amber-500/10"
                      : "border-transparent hover:border-slate-700 hover:bg-slate-900",
                  )}
                >
                  <img
                    src={HERO_PORTRAITS[id]}
                    alt={heroLabel}
                    className="h-9 w-9 shrink-0 rounded-full border border-slate-700 object-cover"
                  />
                  <span className={cn("text-xs", active ? "text-amber-200" : "text-slate-400")}>
                    {heroLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="relative min-h-0 min-w-0 flex-1">
          <ThreeScene
            ref={sceneRef}
            className="!h-full !min-h-0 !rounded-none"
            cameraMode="orbit"
            orbitSpeed={autoRotate ? 18 : 0}
            cameraDistance={4.2}
            cameraHeight={2.2}
            bgColor="#0d1117"
          />
          <Grudge6Character3D
            sceneRef={sceneRef}
            raceId={raceId}
            classId={classId}
            heroId={heroId}
            model3d={model3d}
            animation={anim}
            position={{ x: 0, y: 0, z: 0 }}
          />

          <div className="pointer-events-none absolute bottom-4 left-4 flex items-end gap-3">
            <img
              src={portrait}
              alt={label}
              className="h-20 w-20 rounded-xl border-2 border-amber-500/40 object-cover shadow-lg"
            />
            <div>
              <p className="text-lg font-bold text-white">{label}</p>
              <p className="font-mono text-xs text-slate-500">{heroId}</p>
            </div>
          </div>

          <div className="absolute bottom-4 right-4 flex flex-wrap justify-end gap-1.5">
            {ANIM_OPTIONS.map((a) => (
              <Button
                key={a}
                size="sm"
                variant={anim === a ? "default" : "outline"}
                className={cn(
                  "h-7 text-[10px] capitalize",
                  anim !== a && "border-slate-700 bg-slate-900/80 text-slate-400",
                )}
                onClick={() => setAnim(a)}
              >
                {a}
              </Button>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}