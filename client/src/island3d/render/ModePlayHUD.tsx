/**
 * ModePlayHUD — dual mode shell:
 *   ⚔ Combat  ·  🌿 Harvest
 *
 * Harvest: sheath weapons, equip last harvest tool (default hatchet).
 * R = tool radial (hatchet, pick, knife, fishing pole, build hammer).
 * Build hammer opens build UI under harvest; R still opens tools; Q → combat.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Sword, Pickaxe, Hammer, X, RotateCw, Crosshair, TreePine, Package,
  Flame, Shield, Truck, Wheat, Flag, Mountain, Armchair, Users, Bug,
} from 'lucide-react';
import type { ControlMode } from '../player/CharacterController3D';
import type { Island3DEngine } from '../engine/Island3DEngine';
import type { PieceType } from '../building/BuildingSystem';
import {
  getBuildAssetsByCategory,
  getAllBuildCategories,
  type BuildAssetDef,
  type BuildCategory,
} from '../building/BuildAssetManifest';
import {
  BUILD_TAB_ORDER,
  BUILD_TAB_LABELS,
  buildTabFromDigitKey,
  BUILD_HAMMER_NAME,
  BUILD_HAMMER_SCALE,
} from '@shared/definitions/buildHammer';
import { FARM_SEEDS } from '@shared/definitions/farming';
import {
  HARVEST_RADIAL_TOOLS,
  DEFAULT_HARVEST_RADIAL_TOOL,
  type HarvestRadialToolId,
} from '@/game/harvest/HarvestToolActions';
import { CombatUnitStatus } from '@/components/CombatUnitStatus';
import { CampCommandBar } from './CampCommandBar';
import { usePlayerStatusEffects } from '@/hooks/useStatusEffects';
import { preloadMagicIndicatorThumbs } from '@/lib/magicIndicatorThumbs';

// ── Mode config (combat + harvest only) ──────────────────────────────────────

/** UI modes — build is a harvest sub-state (build hammer), not a top-level tab. */
type HudMode = 'combat' | 'harvest';

const MODES: {
  id: HudMode;
  label: string;
  color: string;
  Icon: typeof Sword;
  hint: string;
}[] = [
  {
    id: 'combat',
    label: 'Combat',
    color: '#e74c3c',
    Icon: Sword,
    hint: 'LMB attack · 1–5 skills · Tab soft-lock · Z sheath · RMB hard focus · Q harvest',
  },
  {
    id: 'harvest',
    label: 'Harvest',
    color: '#2ecc71',
    Icon: Pickaxe,
    hint: 'R tools · LMB gather · Q combat · hammer opens build UI',
  },
];

const STRUCTURE_PIECES: { type: PieceType; label: string }[] = [
  { type: 'foundation', label: 'Foundation' },
  { type: 'wall', label: 'Wall' },
  { type: 'ceiling', label: 'Ceiling' },
  { type: 'stairs', label: 'Stairs' },
  { type: 'pillar', label: 'Pillar' },
  { type: 'doorframe', label: 'Door' },
  { type: 'window', label: 'Window' },
];

const CATEGORY_META: Record<BuildCategory, { label: string; icon: React.ReactNode }> = {
  structure: { label: 'Structure', icon: <Hammer className="w-3 h-3" /> },
  furniture: { label: 'Furniture', icon: <Armchair className="w-3 h-3" /> },
  storage: { label: 'Storage', icon: <Package className="w-3 h-3" /> },
  crafting: { label: 'Crafting', icon: <Flame className="w-3 h-3" /> },
  defense: { label: 'Defense', icon: <Shield className="w-3 h-3" /> },
  transport: { label: 'Transport', icon: <Truck className="w-3 h-3" /> },
  farming: { label: 'Farming', icon: <Wheat className="w-3 h-3" /> },
  decoration: { label: 'Decor', icon: <Flag className="w-3 h-3" /> },
  nature: { label: 'Nature', icon: <TreePine className="w-3 h-3" /> },
  terrain: { label: 'Terrain', icon: <Mountain className="w-3 h-3" /> },
  camp: { label: 'Camps', icon: <Flag className="w-3 h-3" /> },
  units: { label: 'Units', icon: <Users className="w-3 h-3" /> },
  siege: { label: 'Siege', icon: <Shield className="w-3 h-3" /> },
  monsters: { label: 'Monsters', icon: <Bug className="w-3 h-3" /> },
};

/** Map engine/controller ControlMode to HUD dual-mode (build → harvest shell). */
function toHudMode(mode: ControlMode): HudMode {
  return mode === 'combat' ? 'combat' : 'harvest';
}

// ── Props ────────────────────────────────────────────────────────────────────

export interface ModePlayHUDProps {
  engine: Island3DEngine | null;
  mode: ControlMode;
  onModeChange: (mode: ControlMode) => void;
  characterName?: string;
  hp?: number;
  maxHp?: number;
  level?: number;
  resources?: Record<string, number>;
  isPlacing?: boolean;
  selectedBuildId?: string | null;
  onBuildSelect?: (id: string, kind: 'prop' | 'piece') => void;
  onBuildCancel?: () => void;
  classHotbar?: Array<{ key: string; label: string; skillId?: string }>;
  weaponHotbar?: Array<{ key: string; label: string; skillId?: string }>;
}

// ── Component ────────────────────────────────────────────────────────────────

export function ModePlayHUD({
  engine,
  mode,
  onModeChange,
  characterName = 'Captain',
  hp = 100,
  maxHp = 100,
  level = 1,
  resources = {},
  isPlacing = false,
  selectedBuildId = null,
  onBuildSelect,
  onBuildCancel,
  classHotbar = [],
  weaponHotbar = [],
}: ModePlayHUDProps) {
  const [buildCategory, setBuildCategory] = useState<BuildCategory>('structure');
  const [placingLocal, setPlacingLocal] = useState(false);
  const [toolRadialOpen, setToolRadialOpen] = useState(false);
  const [activeTool, setActiveTool] = useState<HarvestRadialToolId>(
    () => engine?.activeHarvestTool ?? engine?.lastHarvestTool ?? DEFAULT_HARVEST_RADIAL_TOOL,
  );

  const hudMode = toHudMode(mode);
  const buildUiOpen =
    hudMode === 'harvest'
    && (engine?.harvestBuildUiOpen || engine?.character?.hasBuildHammer || activeTool === 'toolkit' || mode === 'build');
  const placing = isPlacing || placingLocal || (engine?.isBuildPlacing ?? false);

  // Bake magic buff/debuff GLB orbs for unit-frame indicators
  useEffect(() => {
    void preloadMagicIndicatorThumbs();
  }, []);

  // Sync tool from engine when it changes externally
  useEffect(() => {
    if (engine?.activeHarvestTool) setActiveTool(engine.activeHarvestTool);
  }, [engine, engine?.activeHarvestTool]);

  const applyHudMode = useCallback(
    async (next: HudMode) => {
      setToolRadialOpen(false);
      if (next === 'combat') {
        if (engine) {
          await engine.enterCombatMode();
        } else {
          onModeChange('combat');
        }
        onModeChange('combat');
        setPlacingLocal(false);
        onBuildCancel?.();
        return;
      }
      // harvest — sheath + last tool (default hatchet)
      if (engine) {
        await engine.enterHarvestMode();
        setActiveTool(engine.activeHarvestTool || DEFAULT_HARVEST_RADIAL_TOOL);
      }
      onModeChange('harvest');
    },
    [engine, onModeChange, onBuildCancel],
  );

  const selectRadialTool = useCallback(
    async (tool: HarvestRadialToolId) => {
      setActiveTool(tool);
      setToolRadialOpen(false);
      if (engine) {
        await engine.setHarvestRadialTool(tool);
      }
      // Parent mode stays harvest for both tools and build-hammer UI
      onModeChange(tool === 'toolkit' ? 'build' : 'harvest');
      if (tool !== 'toolkit') {
        setPlacingLocal(false);
        onBuildCancel?.();
        engine?.cancelBuilding();
      }
    },
    [engine, onModeChange, onBuildCancel],
  );

  // Q = combat ↔ harvest · R = tool radial (harvest / build-hammer shell)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') {
        return;
      }
      const key = e.key.toLowerCase();

      // Q — toggle combat / harvest
      if (key === 'q' && !e.ctrlKey && !e.altKey && !e.metaKey && !e.repeat) {
        e.preventDefault();
        e.stopPropagation();
        void applyHudMode(hudMode === 'combat' ? 'harvest' : 'combat');
        return;
      }

      // R — harvest tool radial (also while build UI open from hammer)
      if (key === 'r' && !e.ctrlKey && !e.altKey && !e.metaKey && hudMode === 'harvest') {
        e.preventDefault();
        e.stopPropagation();
        setToolRadialOpen((open) => !open);
        return;
      }

      // Escape closes radial first, then cancels place
      if (e.key === 'Escape') {
        if (toolRadialOpen) {
          e.preventDefault();
          setToolRadialOpen(false);
          return;
        }
        if (placing) {
          engine?.cancelBuilding();
          setPlacingLocal(false);
          onBuildCancel?.();
        }
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [hudMode, applyHudMode, toolRadialOpen, placing, engine, onBuildCancel]);

  // Digit 1–9 build group tabs when build UI open
  useEffect(() => {
    if (!buildUiOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      const tab = buildTabFromDigitKey(e.key);
      if (tab && getAllBuildCategories().includes(tab as BuildCategory)) {
        setBuildCategory(tab as BuildCategory);
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [buildUiOpen]);

  // Close radial when leaving harvest
  useEffect(() => {
    if (hudMode !== 'harvest') setToolRadialOpen(false);
  }, [hudMode]);

  const selectPiece = useCallback(
    (type: PieceType) => {
      engine?.startBuilding(type);
      setPlacingLocal(true);
      onBuildSelect?.(type, 'piece');
      if (activeTool !== 'toolkit') {
        void selectRadialTool('toolkit');
      }
    },
    [engine, onBuildSelect, activeTool, selectRadialTool],
  );

  const selectProp = useCallback(
    (assetId: string) => {
      engine?.startPropBuilding(assetId);
      setPlacingLocal(true);
      onBuildSelect?.(assetId, 'prop');
      if (activeTool !== 'toolkit') {
        void selectRadialTool('toolkit');
      }
    },
    [engine, onBuildSelect, activeTool, selectRadialTool],
  );

  const cancelBuild = useCallback(() => {
    engine?.cancelBuilding();
    setPlacingLocal(false);
    onBuildCancel?.();
  }, [engine, onBuildCancel]);

  const modeCfg = MODES.find((m) => m.id === hudMode)!;
  const categories = getAllBuildCategories();
  const propItems = getBuildAssetsByCategory(buildCategory);
  const activeRadialMeta = HARVEST_RADIAL_TOOLS.find((t) => t.id === activeTool);

  return (
    <div className="absolute inset-0 pointer-events-none z-40">
      <CampCommandBar engine={engine} />

      {/* ── Harvest tool radial (R) ─────────────────────────────────── */}
      {toolRadialOpen && hudMode === 'harvest' && (
        <div className="absolute inset-0 pointer-events-auto z-50 flex items-center justify-center">
          <button
            type="button"
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            aria-label="Close tool radial"
            onClick={() => setToolRadialOpen(false)}
          />
          <div className="relative w-[280px] h-[280px]">
            <div
              className="absolute inset-0 rounded-full border-2 shadow-2xl"
              style={{
                background: 'radial-gradient(circle, rgba(12,20,14,0.96) 0%, rgba(6,10,8,0.98) 70%)',
                borderColor: 'rgba(46,204,113,0.45)',
                boxShadow: '0 0 40px rgba(46,204,113,0.2)',
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-widest text-emerald-400/80">Tools</p>
                <p className="text-sm text-emerald-100 font-semibold">
                  {activeRadialMeta?.emoji} {activeRadialMeta?.label ?? 'Tool'}
                </p>
                <p className="text-[9px] text-white/35 mt-0.5">R / Esc close · Q combat</p>
              </div>
            </div>
            {HARVEST_RADIAL_TOOLS.map((t, i) => {
              const n = HARVEST_RADIAL_TOOLS.length;
              const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
              const radius = 96;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;
              const active = activeTool === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  title={t.title}
                  onClick={() => void selectRadialTool(t.id)}
                  className="absolute w-16 h-16 -ml-8 -mt-8 rounded-2xl border flex flex-col items-center justify-center gap-0.5 transition-all"
                  style={{
                    left: `calc(50% + ${x}px)`,
                    top: `calc(50% + ${y}px)`,
                    borderColor: active ? '#2ecc71' : 'rgba(46,204,113,0.25)',
                    background: active
                      ? 'linear-gradient(180deg, rgba(46,204,113,0.35), rgba(20,60,40,0.9))'
                      : 'rgba(10,16,12,0.92)',
                    boxShadow: active ? '0 0 16px rgba(46,204,113,0.45)' : 'none',
                    color: active ? '#d8ffe8' : 'rgba(200,220,200,0.85)',
                  }}
                >
                  <span className="text-xl leading-none">{t.emoji}</span>
                  <span className="text-[9px] font-bold uppercase tracking-wide">{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Mode dock (bottom center) ─────────────────────────────────── */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-auto flex flex-col items-center gap-2">
        <div
          className="rounded-2xl border backdrop-blur-md shadow-2xl overflow-hidden"
          style={{
            background: 'rgba(10, 8, 6, 0.92)',
            borderColor: `${modeCfg.color}55`,
            minWidth: buildUiOpen ? 420 : 320,
            maxWidth: 'min(92vw, 520px)',
          }}
        >
          {hudMode === 'combat' && (
            <CombatModePanel
              name={characterName}
              hp={hp}
              maxHp={maxHp}
              level={level}
              classHotbar={classHotbar}
              weaponHotbar={weaponHotbar}
            />
          )}
          {hudMode === 'harvest' && !buildUiOpen && (
            <HarvestModePanel
              resources={resources}
              engine={engine}
              activeRadialTool={activeTool}
              onOpenRadial={() => setToolRadialOpen(true)}
              onSelectRadialTool={(t) => void selectRadialTool(t)}
            />
          )}
          {hudMode === 'harvest' && buildUiOpen && (
            <BuildModeInner
              categories={categories}
              activeCategory={buildCategory}
              onCategory={setBuildCategory}
              propItems={propItems}
              pieces={STRUCTURE_PIECES}
              selectedId={selectedBuildId}
              placing={placing}
              onSelectPiece={selectPiece}
              onSelectProp={selectProp}
              onCancel={cancelBuild}
              activeToolLabel={activeRadialMeta?.label ?? 'Hammer'}
            />
          )}
        </div>

        {/* Mode switcher — combat + harvest only */}
        <div
          className="flex gap-1.5 p-1.5 rounded-2xl border backdrop-blur-md"
          style={{
            background: 'rgba(12, 8, 5, 0.95)',
            borderColor: 'rgba(197, 160, 89, 0.35)',
          }}
        >
          {MODES.map(({ id, label, color, Icon }) => {
            const active = hudMode === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => void applyHudMode(id)}
                className="relative flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all text-sm font-semibold"
                style={{
                  background: active
                    ? `linear-gradient(180deg, ${color}33, ${color}18)`
                    : 'transparent',
                  border: `1.5px solid ${active ? color : 'transparent'}`,
                  color: active ? color : 'rgba(224, 216, 200, 0.55)',
                  boxShadow: active ? `0 0 14px ${color}40` : 'none',
                }}
              >
                <Icon className="w-4 h-4" />
                <span className="font-cinzel tracking-wide">{label}</span>
                {active && (
                  <span
                    className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full"
                    style={{ background: color, boxShadow: `0 0 6px ${color}` }}
                  />
                )}
              </button>
            );
          })}
        </div>

        <p className="text-[10px] text-white/35 tracking-wide">
          {modeCfg.hint}
          <span className="text-white/20 ml-2">[Q] swap · [R] tools</span>
        </p>
      </div>

      {/* Placement floating bar */}
      {placing && buildUiOpen && (
        <div className="absolute bottom-36 left-1/2 -translate-x-1/2 pointer-events-auto">
          <div
            className="flex items-center gap-3 px-4 py-2 rounded-xl border backdrop-blur-md"
            style={{
              background: 'rgba(30, 60, 90, 0.85)',
              borderColor: 'rgba(100, 181, 246, 0.55)',
            }}
          >
            <span className="w-3 h-3 rounded-sm bg-sky-400/80 shadow-[0_0_8px_#64b5f6]" />
            <span className="text-sky-200 text-sm font-medium">
              Blue ghost · LMB place
            </span>
            <span className="text-sky-300/60 text-xs flex items-center gap-1">
              <RotateCw className="w-3 h-3" /> T rotate
            </span>
            <span className="text-emerald-300/70 text-xs">R tools</span>
            <span className="text-red-300/70 text-xs">Q combat</span>
            <button
              type="button"
              onClick={cancelBuild}
              className="text-red-300/90 hover:text-red-200 text-xs font-bold flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" /> ESC
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Combat panel ─────────────────────────────────────────────────────────────

function CombatModePanel({
  name,
  hp,
  maxHp,
  level,
  classHotbar,
  weaponHotbar,
}: {
  name: string;
  hp: number;
  maxHp: number;
  level: number;
  classHotbar: Array<{ key: string; label: string }>;
  weaponHotbar: Array<{ key: string; label: string }>;
}) {
  const statusEffects = usePlayerStatusEffects();
  const slots = [
    ...weaponHotbar.slice(0, 3).map((s, i) => ({ ...s, key: s.key || String(i + 1) })),
    ...classHotbar.slice(0, 2).map((s, i) => ({ ...s, key: s.key || String(i + 4) })),
  ];
  while (slots.length < 5) {
    slots.push({ key: String(slots.length + 1), label: `Skill ${slots.length + 1}` });
  }

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-48 pt-2">
          <CombatUnitStatus
            name={name}
            hp={hp}
            maxHp={maxHp}
            mp={80}
            maxMp={100}
            sp={60}
            maxSp={100}
            level={level}
            isActive
            compact
            statusEffects={statusEffects}
          />
        </div>
        <div className="flex-1">
          <p className="text-[10px] uppercase tracking-widest text-red-400/80 mb-1.5 flex items-center gap-1">
            <Crosshair className="w-3 h-3" /> Combat Skills
          </p>
          <div className="flex gap-1.5">
            {slots.slice(0, 5).map((s) => (
              <div
                key={s.key}
                className="w-11 h-11 rounded-lg border border-red-800/50 bg-red-950/40 flex flex-col items-center justify-center"
              >
                <span className="text-[9px] text-red-300/70 font-mono">{s.key}</span>
                <span className="text-[9px] text-red-100/90 truncate max-w-[40px] text-center leading-tight">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Harvest panel ────────────────────────────────────────────────────────────

function HarvestModePanel({
  resources,
  engine,
  activeRadialTool,
  onOpenRadial,
  onSelectRadialTool,
}: {
  resources: Record<string, number>;
  engine: Island3DEngine | null;
  activeRadialTool: HarvestRadialToolId;
  onOpenRadial: () => void;
  onSelectRadialTool: (t: HarvestRadialToolId) => void;
}) {
  const [activeGround, setActiveGround] = useState<string | null>(
    () => engine?.harvestToolOverride ?? null,
  );
  const [selectedSeed, setSelectedSeed] = useState<string | null>(
    () => engine?.selectedSeedId ?? null,
  );
  const [craftMsg, setCraftMsg] = useState<string | null>(null);
  const [, tick] = useState(0);

  const bag = {
    ...resources,
    ...(engine?.farmInventory ?? {}),
  };
  const entries = Object.entries(bag);

  const seedSlots = FARM_SEEDS.map((s) => ({
    ...s,
    qty: bag[s.itemId] ?? 0,
  })).filter((s) => s.qty > 0);

  const groundTools: Array<{
    id: string;
    label: string;
    emoji: string;
    ground: 'shovel' | 'hoe' | 'seed' | 'bucket' | null;
    title: string;
  }> = [
    { id: 'shovel', label: 'Shovel', emoji: '🪚', ground: 'shovel', title: '2m raise / dig / level' },
    { id: 'hoe', label: 'Hoe', emoji: '🌾', ground: 'hoe', title: 'Till 4×4 garden bed (16 plants)' },
    {
      id: 'bucket',
      label: engine?.bucketHasWater ? 'Water' : 'Bucket',
      emoji: engine?.bucketHasWater ? '💧' : '🪣',
      ground: 'bucket',
      title: 'Fill at shore · water garden beds · auto-craft',
    },
  ];

  const selectGround = (id: string, ground: typeof groundTools[0]['ground']) => {
    if (!ground) return;
    const next = activeGround === id ? null : ground;
    setActiveGround(next);
    engine?.setHarvestToolOverride(next);
    tick((n) => n + 1);
  };

  const selectSeedSlot = (seedId: string) => {
    const next = selectedSeed === seedId ? null : seedId;
    setSelectedSeed(next);
    setActiveGround(next ? 'seed' : null);
    engine?.setSelectedSeed(next);
    if (next) engine?.setHarvestToolOverride('seed');
    else engine?.setHarvestToolOverride(null);
    tick((n) => n + 1);
  };

  const runAutoCraft = () => {
    if (!engine) return;
    const r = engine.tryAutoCraftWithWater();
    setCraftMsg(r.message);
    tick((n) => n + 1);
  };

  const groundActive = (t: typeof groundTools[0]) =>
    activeGround === t.id
    || (t.ground !== null && engine?.harvestToolOverride === t.ground);

  const radialMeta = HARVEST_RADIAL_TOOLS.find((t) => t.id === activeRadialTool);

  const hint =
    engine?.harvestToolOverride === 'shovel'
      ? '2m shovel: LMB raise · Shift dig · Ctrl level'
      : engine?.harvestToolOverride === 'hoe'
        ? 'Hoe: LMB tills a 4×4 garden bed (16 plant slots)'
        : engine?.harvestToolOverride === 'seed'
          ? 'LMB empty cell in bed to plant (up to 16 per plot)'
          : engine?.harvestToolOverride === 'bucket'
            ? engine.bucketHasWater
              ? `Water garden (charges ${engine.waterCharges}) · shore to refill`
              : 'Empty bucket — LMB near water to fill'
            : activeRadialTool === 'fishing_rod'
              ? 'Fishing pole out — LMB cast near water / deck rail'
              : activeRadialTool === 'pickaxe'
                ? 'Pick out — LMB mine rock / ore'
                : activeRadialTool === 'skinning_knife'
                  ? 'Knife out — LMB skin / cut fiber'
                  : 'Hatchet out — LMB chop trees · R tools · Q combat';

  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-widest text-emerald-400/80">
          Harvest · Tools
        </p>
        <button
          type="button"
          onClick={onOpenRadial}
          className="text-[10px] px-2 py-0.5 rounded-md border border-emerald-700/50 bg-emerald-950/50 text-emerald-200 hover:bg-emerald-900/50"
          title="Open tool radial [R]"
        >
          R · {radialMeta?.emoji ?? '🪓'} {radialMeta?.label ?? 'Hatchet'}
        </button>
      </div>

      {/* Compact radial tool strip */}
      <div className="flex gap-1">
        {HARVEST_RADIAL_TOOLS.map((t) => {
          const active = activeRadialTool === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelectRadialTool(t.id)}
              title={t.title}
              className="flex-1 rounded-lg border py-1.5 flex flex-col items-center gap-0.5 transition-colors"
              style={{
                borderColor: active ? '#2ecc71' : 'rgba(6, 78, 59, 0.4)',
                background: active ? 'rgba(46,204,113,0.22)' : 'rgba(6, 40, 30, 0.3)',
              }}
            >
              <span className="text-base leading-none">{t.emoji}</span>
              <span
                className="text-[9px]"
                style={{ color: active ? '#e8dcc0' : 'rgba(167, 243, 208, 0.75)' }}
              >
                {t.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Secondary ground tools */}
      <p className="text-[9px] uppercase tracking-widest text-amber-400/60">Ground tools</p>
      <div className="flex gap-1.5">
        {groundTools.map((t) => {
          const active = groundActive(t);
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => selectGround(t.id, t.ground)}
              className="flex-1 rounded-lg border py-1.5 flex flex-col items-center gap-0.5 transition-colors"
              style={{
                borderColor: active ? '#c4a35a' : 'rgba(6, 78, 59, 0.4)',
                background: active ? 'rgba(196,163,90,0.2)' : 'rgba(6, 40, 30, 0.3)',
              }}
              title={t.title}
            >
              <span className="text-base">{t.emoji}</span>
              <span
                className="text-[10px]"
                style={{ color: active ? '#e8dcc0' : 'rgba(167, 243, 208, 0.8)' }}
              >
                {t.label}
              </span>
            </button>
          );
        })}
      </div>

      <div>
        <p className="text-[9px] uppercase tracking-widest text-amber-400/70 mb-1">
          Seed action slots
        </p>
        <div className="flex gap-1.5 flex-wrap">
          {seedSlots.length === 0 ? (
            <span className="text-white/30 text-[10px]">No seeds — starter pack loads on farm systems</span>
          ) : (
            seedSlots.map((s, i) => {
              const active = selectedSeed === s.id || engine?.selectedSeedId === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => selectSeedSlot(s.id)}
                  className="relative min-w-[3.2rem] rounded-lg border px-2 py-1.5 flex flex-col items-center gap-0.5"
                  style={{
                    borderColor: active ? '#6bcb77' : 'rgba(100, 80, 40, 0.5)',
                    background: active ? 'rgba(107, 203, 119, 0.2)' : 'rgba(30, 24, 12, 0.55)',
                    boxShadow: active ? '0 0 10px rgba(107,203,119,0.35)' : 'none',
                  }}
                  title={`${s.name} — click then plant on tilled dirt`}
                >
                  <span className="absolute top-0.5 left-1 text-[8px] text-white/40">{i + 1}</span>
                  <span className="text-base leading-none">{s.icon}</span>
                  <span className="text-[9px] text-amber-100/90">{s.qty}</span>
                </button>
              );
            })
          )}
        </div>
      </div>

      <p className="text-[10px] text-amber-200/80 leading-snug">{hint}</p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={runAutoCraft}
          className="text-[10px] px-2 py-1 rounded-md border border-sky-700/50 bg-sky-950/40 text-sky-200 hover:bg-sky-900/50"
          title="Uses water charges + farm ingredients (dough, fiber, mash)"
        >
          Auto-craft (water)
        </button>
        {engine && (
          <span className="text-[10px] text-sky-300/70">
            💧 {engine.waterCharges} · {engine.bucketHasWater ? 'full pail' : 'empty pail'}
          </span>
        )}
      </div>
      {craftMsg && (
        <p className="text-[10px] text-emerald-300/90">{craftMsg}</p>
      )}

      <div className="flex flex-wrap gap-1.5 pt-1 max-h-16 overflow-y-auto">
        {entries.length === 0 ? (
          <span className="text-white/25 text-xs">
            Bag empty — gather or farm · R → hammer for build
          </span>
        ) : (
          entries.map(([k, v]) => (
            <span
              key={k}
              className="px-2 py-0.5 rounded-md bg-emerald-900/40 border border-emerald-700/30 text-emerald-200 text-[11px]"
            >
              {k}: <strong>{v}</strong>
            </span>
          ))
        )}
      </div>
    </div>
  );
}


// ── Build panel (under harvest + build hammer) ───────────────────────────────

function BuildModeInner({
  categories,
  activeCategory,
  onCategory,
  propItems,
  pieces,
  selectedId,
  placing,
  onSelectPiece,
  onSelectProp,
  onCancel,
  activeToolLabel,
}: {
  categories: BuildCategory[];
  activeCategory: BuildCategory;
  onCategory: (c: BuildCategory) => void;
  propItems: BuildAssetDef[];
  pieces: { type: PieceType; label: string }[];
  selectedId: string | null;
  placing: boolean;
  onSelectPiece: (t: PieceType) => void;
  onSelectProp: (id: string) => void;
  onCancel: () => void;
  activeToolLabel: string;
}) {
  const orderedTabs = BUILD_TAB_ORDER.filter((t) =>
    categories.includes(t as BuildCategory),
  ) as BuildCategory[];
  const extraTabs = categories.filter((c) => !orderedTabs.includes(c));
  const tabs = [...orderedTabs, ...extraTabs];

  return (
    <div className="flex flex-col max-h-[320px] min-w-[440px]">
      <div className="flex items-center justify-between px-3 py-2 border-b border-sky-800/30">
        <div className="flex items-center gap-2">
          <span className="text-sky-300 text-xs font-bold tracking-wider font-cinzel flex items-center gap-1.5">
            <Hammer className="w-3.5 h-3.5" /> {BUILD_HAMMER_NAME}
          </span>
          <span className="text-[9px] text-sky-400/50 font-mono">
            ×{BUILD_HAMMER_SCALE} · {activeToolLabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-emerald-400/60 hidden sm:inline">
            R tools · Q combat
          </span>
          <span className="text-[9px] text-white/30 hidden sm:inline">
            WASD move · RMB look
          </span>
          {placing && (
            <button type="button" onClick={onCancel} className="text-red-300/80 text-[10px] font-bold">
              Cancel
            </button>
          )}
        </div>
      </div>

      <div
        className="flex gap-0.5 px-1.5 py-1.5 border-b border-white/10 overflow-x-auto scrollbar-thin"
        style={{
          background: 'linear-gradient(180deg, rgba(20,40,60,0.9), rgba(8,12,18,0.95))',
        }}
      >
        {tabs.map((cat, i) => {
          const meta = CATEGORY_META[cat] ?? {
            label: BUILD_TAB_LABELS[cat as keyof typeof BUILD_TAB_LABELS] ?? cat,
            icon: <Hammer className="w-3 h-3" />,
          };
          const active = activeCategory === cat;
          const hotkey = i < 9 ? String(i + 1) : null;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => onCategory(cat)}
              title={hotkey ? `${meta.label} [${hotkey}]` : meta.label}
              className={`relative flex flex-col items-center justify-center gap-0.5 min-w-[58px] px-2 py-1.5 rounded-lg transition-all ${
                active
                  ? 'bg-sky-500/25 text-sky-100 border border-sky-400/50 shadow-[0_0_12px_rgba(56,189,248,0.25)]'
                  : 'text-white/40 border border-transparent hover:text-white/70 hover:bg-white/5'
              }`}
            >
              {meta.icon}
              <span className="text-[9px] font-bold uppercase tracking-wide whitespace-nowrap">
                {meta.label}
              </span>
              {hotkey && (
                <span
                  className={`absolute top-0.5 right-1 text-[8px] font-mono ${
                    active ? 'text-sky-300/80' : 'text-white/20'
                  }`}
                >
                  {hotkey}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {activeCategory === 'structure' && (
        <div className="px-2 py-1.5 border-b border-white/5 flex flex-wrap gap-1">
          <span className="text-[9px] text-white/25 uppercase tracking-wider self-center mr-1">
            Snap
          </span>
          {pieces.map((p) => (
            <button
              key={p.type}
              type="button"
              onClick={() => onSelectPiece(p.type)}
              className={`px-2 py-1 rounded text-[10px] border transition-all ${
                selectedId === p.type
                  ? 'bg-sky-500/25 border-sky-400/50 text-sky-100'
                  : 'bg-slate-900/50 border-slate-700 text-slate-300 hover:border-sky-600/40'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-2 py-2 grid grid-cols-4 gap-1.5">
        {propItems.length === 0 && activeCategory !== 'structure' ? (
          <p className="col-span-4 text-center text-white/20 text-xs py-4">
            Empty category — pick another tab
          </p>
        ) : propItems.length === 0 && activeCategory === 'structure' ? (
          <p className="col-span-4 text-center text-white/25 text-[11px] py-2">
            Use snap pieces above, or place modular props from the catalog when available
          </p>
        ) : (
          propItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectProp(item.id)}
              className={`rounded-lg p-1.5 text-left border transition-all ${
                selectedId === item.id
                  ? 'border-sky-400/50 bg-sky-500/15 ring-1 ring-sky-400/30'
                  : 'border-white/5 bg-white/[0.03] hover:border-sky-600/30'
              }`}
            >
              <div
                className="h-9 rounded mb-1 flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, #${item.color.toString(16).padStart(6, '0')}99, #64b5f633)`,
                }}
              >
                <Hammer className="w-3.5 h-3.5 text-white/40" />
              </div>
              <p className="text-[10px] text-sky-100/90 font-medium truncate" title={item.name}>
                {item.name}
              </p>
              {item.buildLayer && (
                <p className="text-[8px] text-sky-400/40 uppercase truncate">{item.buildLayer}</p>
              )}
            </button>
          ))
        )}
      </div>

      <div className="px-3 py-1 border-t border-white/5 text-[9px] text-white/25 text-center">
        {BUILD_HAMMER_NAME} · <span className="text-sky-400/50">1–9</span> groups ·{' '}
        <span className="text-sky-400/50">T</span> rotate ·{' '}
        <span className="text-emerald-400/50">R</span> tools ·{' '}
        <span className="text-red-400/50">Q</span> combat ·{' '}
        <span className="text-sky-400/50">ESC</span> cancel
      </div>
    </div>
  );
}

export default ModePlayHUD;
