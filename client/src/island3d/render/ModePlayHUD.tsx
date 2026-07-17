/**
 * ModePlayHUD — RTS-Grudge style triple UI:
 *   ⚔ Combat  ·  🌿 Harvest  ·  🔨 Build
 *
 * Mode switcher dock + mode-specific bottom panel.
 * Build mode selects assets; engine shows light-blue ghost at cursor; LMB places.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Sword, Pickaxe, Hammer, X, RotateCw, Crosshair, TreePine, Package,
  Flame, Shield, Truck, Wheat, Flag, Mountain, Armchair,
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
import { CombatUnitStatus } from '@/components/CombatUnitStatus';
import { CampCommandBar } from './CampCommandBar';

// ── Mode config ──────────────────────────────────────────────────────────────

const MODES: {
  id: ControlMode;
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
    hint: 'LMB attack · 1–5 skills · RMB focus · Tab cycle',
  },
  {
    id: 'harvest',
    label: 'Harvest',
    color: '#2ecc71',
    Icon: Pickaxe,
    hint: 'LMB gather trees · rocks · crystals · flowers · scrap',
  },
  {
    id: 'build',
    label: 'Build',
    color: '#64b5f6',
    Icon: Hammer,
    hint: 'Build Hammer in hand · WASD free move · RMB look · tabs 1–9 · LMB place · R rotate',
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
};

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

  const placing = isPlacing || placingLocal || (engine?.isBuildPlacing ?? false);

  // Tab cycles modes (mirrors CharacterController3D)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      e.preventDefault();
      const order: ControlMode[] = ['harvest', 'combat', 'build'];
      const idx = order.indexOf(mode);
      onModeChange(order[(idx + 1) % order.length]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, onModeChange]);

  // Escape cancels build ghost; digits 1–9 switch build group tabs (Dune-style)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.key === 'Escape' && placing) {
        engine?.cancelBuilding();
        setPlacingLocal(false);
        onBuildCancel?.();
        return;
      }
      if (mode === 'build') {
        const tab = buildTabFromDigitKey(e.key);
        if (tab && getAllBuildCategories().includes(tab as BuildCategory)) {
          setBuildCategory(tab as BuildCategory);
          e.preventDefault();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [placing, engine, onBuildCancel, mode]);

  const selectPiece = useCallback(
    (type: PieceType) => {
      engine?.startBuilding(type);
      setPlacingLocal(true);
      onBuildSelect?.(type, 'piece');
      if (mode !== 'build') onModeChange('build');
    },
    [engine, mode, onModeChange, onBuildSelect],
  );

  const selectProp = useCallback(
    (assetId: string) => {
      engine?.startPropBuilding(assetId);
      setPlacingLocal(true);
      onBuildSelect?.(assetId, 'prop');
      if (mode !== 'build') onModeChange('build');
    },
    [engine, mode, onModeChange, onBuildSelect],
  );

  const cancelBuild = useCallback(() => {
    engine?.cancelBuilding();
    setPlacingLocal(false);
    onBuildCancel?.();
  }, [engine, onBuildCancel]);

  const modeCfg = MODES.find((m) => m.id === mode)!;
  const categories = getAllBuildCategories();
  const propItems = getBuildAssetsByCategory(buildCategory);

  return (
    <div className="absolute inset-0 pointer-events-none z-40">
      {/* Owned camp: F1–F5 unit orders + bench craft */}
      <CampCommandBar engine={engine} />

      {/* ── Mode dock (bottom center) ─────────────────────────────────── */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-auto flex flex-col items-center gap-2">
        {/* Mode-specific panel */}
        <div
          className="rounded-2xl border backdrop-blur-md shadow-2xl overflow-hidden"
          style={{
            background: 'rgba(10, 8, 6, 0.92)',
            borderColor: `${modeCfg.color}55`,
            minWidth: mode === 'build' ? 420 : 320,
            maxWidth: 'min(92vw, 520px)',
          }}
        >
          {mode === 'combat' && (
            <CombatModePanel
              name={characterName}
              hp={hp}
              maxHp={maxHp}
              level={level}
              classHotbar={classHotbar}
              weaponHotbar={weaponHotbar}
            />
          )}
          {mode === 'harvest' && (
            <HarvestModePanel resources={resources} />
          )}
          {mode === 'build' && (
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
            />
          )}
        </div>

        {/* Mode switcher buttons */}
        <div
          className="flex gap-1.5 p-1.5 rounded-2xl border backdrop-blur-md"
          style={{
            background: 'rgba(12, 8, 5, 0.95)',
            borderColor: 'rgba(197, 160, 89, 0.35)',
          }}
        >
          {MODES.map(({ id, label, color, Icon }) => {
            const active = mode === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  onModeChange(id);
                  if (id !== 'build') cancelBuild();
                }}
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
          <span className="text-white/20 ml-2">[Tab] cycle</span>
        </p>
      </div>

      {/* Placement floating bar */}
      {placing && mode === 'build' && (
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
              <RotateCw className="w-3 h-3" /> R
            </span>
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
        <div className="w-48">
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

function HarvestModePanel({ resources }: { resources: Record<string, number> }) {
  const entries = Object.entries(resources);
  const tools = [
    { id: 'axe', label: 'Axe', emoji: '🪓' },
    { id: 'pick', label: 'Pick', emoji: '⛏️' },
    { id: 'sickle', label: 'Sickle', emoji: '🌿' },
    { id: 'scavenge', label: 'Scrap', emoji: '🔧' },
  ];

  return (
    <div className="p-3 space-y-2">
      <p className="text-[10px] uppercase tracking-widest text-emerald-400/80">Harvest Tools</p>
      <div className="flex gap-1.5">
        {tools.map((t) => (
          <div
            key={t.id}
            className="flex-1 rounded-lg border border-emerald-800/40 bg-emerald-950/30 py-2 flex flex-col items-center gap-0.5"
          >
            <span className="text-lg">{t.emoji}</span>
            <span className="text-[10px] text-emerald-200/80">{t.label}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5 pt-1">
        {entries.length === 0 ? (
          <span className="text-white/25 text-xs">No resources yet — LMB trees & rocks</span>
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

// ── Build panel (Dune Awakening–style horizontal group tabs + piece grid) ────

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
}) {
  // Prefer SSOT tab order; only show categories that exist in the catalog
  const orderedTabs = BUILD_TAB_ORDER.filter((t) =>
    categories.includes(t as BuildCategory),
  ) as BuildCategory[];
  const extraTabs = categories.filter((c) => !orderedTabs.includes(c));
  const tabs = [...orderedTabs, ...extraTabs];

  return (
    <div className="flex flex-col max-h-[320px] min-w-[440px]">
      {/* Header — Build Hammer identity */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-sky-800/30">
        <div className="flex items-center gap-2">
          <span className="text-sky-300 text-xs font-bold tracking-wider font-cinzel flex items-center gap-1.5">
            <Hammer className="w-3.5 h-3.5" /> {BUILD_HAMMER_NAME}
          </span>
          <span className="text-[9px] text-sky-400/50 font-mono">
            ×{BUILD_HAMMER_SCALE} kit mesh
          </span>
        </div>
        <div className="flex items-center gap-2">
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

      {/* Dune-style horizontal category tabs (full-width strip) */}
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

      {/* Structure snap pieces — only on Structure tab */}
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

      {/* Piece grid for active tab */}
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
        {BUILD_HAMMER_NAME} equipped · keys <span className="text-sky-400/50">1–9</span> switch
        groups · <span className="text-sky-400/50">R</span> rotate ·{' '}
        <span className="text-sky-400/50">ESC</span> cancel
      </div>
    </div>
  );
}

export default ModePlayHUD;
