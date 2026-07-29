/**
 * BuildModePanel — Dune Awakening / Conan–style build wheel for modular pieces + props.
 *
 * Toggle: B key opens/closes the panel.
 * Usage: Select a category tab (or keys 1–9) → click an item → place with mouse ghost.
 *        R rotates 90°, ESC cancels, click confirms.
 *        Build Hammer (0.8× survival kit hammer) equips in-hand via CharacterController.
 * Catalog: BUILD_ASSETS (survival kit + fantasy village multipack node extract).
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Hammer, X, RotateCw, TreePine, Package, Flame, Shield,
  Truck, Wheat, Flag, Mountain, Armchair,
} from 'lucide-react';
import {
  BUILD_ASSETS,
  getBuildAssetsByCategory,
  getAllBuildCategories,
  type BuildAssetDef,
  type BuildCategory,
} from '@/island3d/building/BuildAssetManifest';
import {
  BUILD_TAB_ORDER,
  BUILD_HAMMER_NAME,
  BUILD_HAMMER_SCALE,
  buildTabFromDigitKey,
} from '@shared/definitions/buildHammer';

// ── Category metadata ────────────────────────────────────────────

const CATEGORY_META: Record<BuildCategory, { label: string; icon: React.ReactNode; color: string }> = {
  structure:  { label: 'Structure',  icon: <Hammer className="w-3.5 h-3.5" />,    color: '#888' },
  furniture:  { label: 'Furniture',  icon: <Armchair className="w-3.5 h-3.5" />,   color: '#c8a060' },
  storage:    { label: 'Storage',    icon: <Package className="w-3.5 h-3.5" />,    color: '#8B6914' },
  crafting:   { label: 'Crafting',   icon: <Flame className="w-3.5 h-3.5" />,      color: '#e06030' },
  defense:    { label: 'Defense',    icon: <Shield className="w-3.5 h-3.5" />,     color: '#6688aa' },
  transport:  { label: 'Transport',  icon: <Truck className="w-3.5 h-3.5" />,      color: '#8B6914' },
  farming:    { label: 'Farming',    icon: <Wheat className="w-3.5 h-3.5" />,      color: '#6a9040' },
  decoration: { label: 'Decor',      icon: <Flag className="w-3.5 h-3.5" />,       color: '#cc4444' },
  nature:     { label: 'Nature',     icon: <TreePine className="w-3.5 h-3.5" />,   color: '#44aa44' },
  terrain:    { label: 'Terrain',    icon: <Mountain className="w-3.5 h-3.5" />,   color: '#777' },
  camp:       { label: 'Camps',      icon: <Flag className="w-3.5 h-3.5" />,       color: '#64b5f6' },
  units:      { label: 'Units',      icon: <Shield className="w-3.5 h-3.5" />,     color: '#c4a35a' },
  siege:      { label: 'Siege',      icon: <Truck className="w-3.5 h-3.5" />,      color: '#aa6644' },
  monsters:   { label: 'Monsters',   icon: <Mountain className="w-3.5 h-3.5" />,   color: '#884466' },
};

// ── Props ────────────────────────────────────────────────────────

interface BuildModePanelProps {
  /** Called when user selects an item to place */
  onSelectItem: (assetId: string) => void;
  /** Called when user cancels placement */
  onCancel: () => void;
  /** Whether a ghost is currently being placed */
  isPlacing: boolean;
  /** Currently selected asset ID (null if not placing) */
  selectedAssetId: string | null;
}

// ── Component ────────────────────────────────────────────────────

export function BuildModePanel({ onSelectItem, onCancel, isPlacing, selectedAssetId }: BuildModePanelProps) {
  const [open, setOpen] = useState(false);
  // Structure first — Conan-style modular walls/foundations default tab
  const [activeCategory, setActiveCategory] = useState<BuildCategory>('structure');
  const [filter, setFilter] = useState('');

  // B key toggles build panel; 1–9 switch Dune-style group tabs
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
      if (e.key === 'b' || e.key === 'B') {
        setOpen(prev => !prev);
        if (isPlacing) onCancel();
      }
      if (e.key === 'Escape' && isPlacing) {
        onCancel();
      }
      if (open || isPlacing) {
        const tab = buildTabFromDigitKey(e.key);
        if (tab && getAllBuildCategories().includes(tab as BuildCategory)) {
          setActiveCategory(tab as BuildCategory);
          e.preventDefault();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isPlacing, onCancel, open]);

  const categories = getAllBuildCategories();
  const orderedCats = BUILD_TAB_ORDER.filter((t) =>
    categories.includes(t as BuildCategory),
  ) as BuildCategory[];
  const tabCategories = [
    ...orderedCats,
    ...categories.filter((c) => !orderedCats.includes(c)),
  ];
  const items = getBuildAssetsByCategory(activeCategory).filter((item) => {
    if (!filter.trim()) return true;
    const q = filter.trim().toLowerCase();
    return (
      item.id.toLowerCase().includes(q) ||
      item.name.toLowerCase().includes(q) ||
      (item.nodeName?.toLowerCase().includes(q) ?? false) ||
      (item.buildLayer?.toLowerCase().includes(q) ?? false)
    );
  });

  if (!open && !isPlacing) {
    // Collapsed: just show the build toggle button
    return (
      <div className="absolute bottom-6 right-4 z-50 pointer-events-auto">
        <button
          onClick={() => setOpen(true)}
          className="bg-black/60 backdrop-blur-sm rounded-xl border border-white/10 p-3 text-white/40 hover:text-amber-400 hover:border-amber-500/30 transition-all group"
          title="Build Mode (B)"
        >
          <Hammer className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 text-[9px] bg-amber-500/80 text-black font-bold px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">B</span>
        </button>
      </div>
    );
  }

  // Placement mode hint (no panel, just floating controls)
  if (isPlacing && !open) {
    const asset = selectedAssetId ? BUILD_ASSETS[selectedAssetId] : null;
    return (
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
        <div className="bg-black/80 backdrop-blur-sm rounded-xl border border-amber-500/30 px-4 py-2 flex items-center gap-4">
          <span className="text-amber-300 text-sm font-bold">{asset?.name || 'Placing...'}</span>
          <div className="flex items-center gap-1.5 text-white/50 text-xs">
            <RotateCw className="w-3 h-3" />
            <span>R rotate</span>
          </div>
          <span className="text-white/30 text-xs">Click to place</span>
          <button onClick={onCancel} className="text-red-400 hover:text-red-300 text-xs font-bold">
            ESC cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute bottom-6 right-4 z-50 pointer-events-auto">
      <div className="bg-black/85 backdrop-blur-md rounded-2xl border border-white/10 w-[360px] max-h-[480px] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Hammer className="w-4 h-4 text-amber-400" />
            <span className="text-amber-400 text-sm font-bold tracking-wider font-cinzel">
              {BUILD_HAMMER_NAME}
            </span>
            <span className="text-[9px] text-amber-500/40 font-mono">×{BUILD_HAMMER_SCALE}</span>
          </div>
          <button onClick={() => { setOpen(false); if (isPlacing) onCancel(); }}
            className="text-white/30 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dune Awakening–style horizontal group tabs */}
        <div
          className="flex gap-0.5 px-2 py-2 border-b border-white/5 overflow-x-auto"
          style={{
            background: 'linear-gradient(180deg, rgba(40,30,10,0.5), transparent)',
          }}
        >
          {tabCategories.map((cat, i) => {
            const meta = CATEGORY_META[cat];
            const isActive = activeCategory === cat;
            const hotkey = i < 9 ? String(i + 1) : null;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                title={hotkey ? `${meta.label} [${hotkey}]` : meta.label}
                className={`relative flex flex-col items-center gap-0.5 min-w-[52px] px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                  isActive
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                    : 'text-white/40 hover:text-white/70 border border-transparent'
                }`}
              >
                {meta.icon}
                <span className="whitespace-nowrap">{meta.label}</span>
                {hotkey && (
                  <span className={`absolute top-0.5 right-1 text-[8px] font-mono ${isActive ? 'text-amber-400/70' : 'text-white/20'}`}>
                    {hotkey}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search — filter by id, display name, or GLB nodeName */}
        <div className="px-3 py-2 border-b border-white/5">
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search pieces (wall, tower, cart…)"
            className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] text-white/80 placeholder:text-white/25 outline-none focus:border-amber-500/40"
          />
        </div>

        {/* Item grid */}
        <div className="flex-1 overflow-y-auto px-3 py-2">
          {items.length === 0 ? (
            <div className="text-white/20 text-xs text-center py-8">No items in this category</div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {items.map(item => (
                <BuildItemCard
                  key={item.id}
                  item={item}
                  selected={selectedAssetId === item.id}
                  onSelect={() => onSelectItem(item.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-white/5 text-white/20 text-[10px] text-center">
          {BUILD_HAMMER_NAME} · WASD free move · RMB look ·{' '}
          <span className="text-amber-400/50">1–9</span> tabs ·{' '}
          <span className="text-amber-400/50">R</span> rotate ·{' '}
          <span className="text-amber-400/50">ESC</span> cancel ·{' '}
          <span className="text-amber-400/50">B</span> close
          <span className="block text-white/15 mt-0.5">{items.length} pieces · multipack node extract</span>
        </div>
      </div>
    </div>
  );
}

// ── Item Card ────────────────────────────────────────────────────

function BuildItemCard({ item, selected, onSelect }: { item: BuildAssetDef; selected: boolean; onSelect: () => void }) {
  const meta = CATEGORY_META[item.category];

  return (
    <button
      onClick={onSelect}
      className={`relative rounded-xl p-2.5 text-left transition-all border ${
        selected
          ? 'bg-amber-500/15 border-amber-500/40 shadow-lg shadow-amber-500/10'
          : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.06] hover:border-white/10'
      }`}
    >
      {/* Color swatch */}
      <div
        className="w-full h-10 rounded-lg mb-2 flex items-center justify-center"
        style={{ background: `linear-gradient(135deg, #${item.color.toString(16).padStart(6, '0')}44, #${item.color.toString(16).padStart(6, '0')}22)` }}
      >
        <div
          className="w-6 h-6 rounded"
          style={{ backgroundColor: `#${item.color.toString(16).padStart(6, '0')}` }}
        />
      </div>

      {/* Name + API id */}
      <div className="text-white text-[11px] font-bold truncate" title={item.id}>{item.name}</div>
      {item.nodeName && (
        <div className="text-white/25 text-[9px] font-mono truncate" title={`nodeName: ${item.nodeName}`}>
          {item.nodeName}
        </div>
      )}
      {item.buildLayer && (
        <div className="text-amber-500/40 text-[8px] uppercase tracking-wider mt-0.5">{item.buildLayer}</div>
      )}

      {/* Cost */}
      {item.cost.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {item.cost.map(c => (
            <span key={c.itemId} className="text-[9px] text-white/30 bg-white/5 px-1 rounded">
              {c.quantity} {c.itemId}
            </span>
          ))}
        </div>
      )}

      {/* Effect */}
      {item.effect && (
        <div className="text-[9px] text-amber-400/60 mt-1 truncate" title={item.effect.description}>
          {item.effect.description}
        </div>
      )}

      {/* Rotation indicator */}
      {item.rotatable && (
        <RotateCw className="absolute top-1.5 right-1.5 w-2.5 h-2.5 text-white/15" />
      )}
    </button>
  );
}
