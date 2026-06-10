/**
 * WeaponModelAdmin — admin page for uploading weapon/armor/tool GLB models.
 *
 * Shows a grid of all 17 weapon types × 8 tiers. Each cell shows:
 *   - Upload status (green = on R2, red = missing)
 *   - Upload button (drag-and-drop or file picker)
 *   - CDN link when uploaded
 *
 * Uploads go to ai.grudge-studio.com/v1/upload-asset → R2 bucket.
 * Protected: only master_admin and admin tiers can upload.
 *
 * Route: /weapon-admin
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'wouter';
import { Upload, Check, X, ExternalLink, ChevronDown } from 'lucide-react';
import {
  WEAPON_MODEL_CONFIGS,
  TIER_VISUALS,
  type WeaponTypeModelConfig,
} from '@shared/definitions/weaponTierVisuals';
import { ASSET_CDN_BASE } from '@/lib/assetConfig';
import { AI_GATEWAY } from '@/lib/grudgeConfig';

// ── Types ────────────────────────────────────────────────────────

interface CellStatus {
  weaponType: string;
  tier: number;
  r2Path: string;
  cdnUrl: string;
  exists: boolean | null; // null = checking
  uploading: boolean;
  error: string | null;
}

// ── Component ────────────────────────────────────────────────────

export default function WeaponModelAdminPage() {
  const [, setLocation] = useLocation();
  const [cells, setCells] = useState<Map<string, CellStatus>>(new Map());
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const weaponTypes = Object.entries(WEAPON_MODEL_CONFIGS);

  // ── Build cell map + check R2 status ────────────────────────────

  useEffect(() => {
    const map = new Map<string, CellStatus>();
    for (const [typeId, config] of weaponTypes) {
      for (const tierVis of TIER_VISUALS) {
        const key = `${typeId}_t${tierVis.tier}`;
        const r2Path = `${config.basePath}${tierVis.modelSuffix}.glb`;
        const cdnUrl = `${ASSET_CDN_BASE}/${r2Path}`;
        map.set(key, {
          weaponType: typeId,
          tier: tierVis.tier,
          r2Path,
          cdnUrl,
          exists: null,
          uploading: false,
          error: null,
        });
      }
    }
    setCells(map);

    // Probe each CDN URL with HEAD request
    for (const [key, cell] of map) {
      fetch(cell.cdnUrl, { method: 'HEAD' })
        .then(r => {
          setCells(prev => {
            const next = new Map(prev);
            const c = next.get(key);
            if (c) next.set(key, { ...c, exists: r.ok });
            return next;
          });
        })
        .catch(() => {
          setCells(prev => {
            const next = new Map(prev);
            const c = next.get(key);
            if (c) next.set(key, { ...c, exists: false });
            return next;
          });
        });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Upload handler ──────────────────────────────────────────────

  const handleUpload = useCallback(async (key: string, file: File) => {
    const cell = cells.get(key);
    if (!cell) return;

    setCells(prev => {
      const next = new Map(prev);
      next.set(key, { ...cell, uploading: true, error: null });
      return next;
    });

    try {
      const token = localStorage.getItem('grudge_auth_token');
      if (!token) throw new Error('Not logged in — need admin auth');

      const body = await file.arrayBuffer();
      const resp = await fetch(`${AI_GATEWAY}/v1/upload-asset?path=${encodeURIComponent(cell.r2Path)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/octet-stream',
        },
        body,
      });

      const data = await resp.json() as any;
      if (!data.ok) throw new Error(data.error || 'Upload failed');

      setCells(prev => {
        const next = new Map(prev);
        next.set(key, { ...cell, exists: true, uploading: false });
        return next;
      });

      setNotification(`✓ Uploaded ${cell.weaponType} T${cell.tier} (${(file.size / 1024).toFixed(0)} KB)`);
      setTimeout(() => setNotification(null), 3000);
    } catch (err: any) {
      setCells(prev => {
        const next = new Map(prev);
        next.set(key, { ...cell, uploading: false, error: err.message });
        return next;
      });
    }
  }, [cells]);

  // ── Render ──────────────────────────────────────────────────────

  const filteredTypes = selectedType
    ? weaponTypes.filter(([id]) => id === selectedType)
    : weaponTypes;

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-[#05060c] to-stone-950 text-white p-6">
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-cinzel font-bold tracking-wider bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">
              WEAPON MODEL ADMIN
            </h1>
            <p className="text-white/40 text-sm mt-1">Upload GLB models for each weapon type × tier to R2 CDN</p>
          </div>
          <button onClick={() => setLocation('/admin')} className="text-white/40 hover:text-white text-sm">
            ← Back to Admin
          </button>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-3 mb-6">
          <span className="text-white/50 text-sm">Filter:</span>
          <select
            value={selectedType || ''}
            onChange={e => setSelectedType(e.target.value || null)}
            className="bg-stone-900 border border-stone-700 rounded-lg px-3 py-1.5 text-sm text-white"
          >
            <option value="">All Types ({weaponTypes.length})</option>
            {weaponTypes.map(([id]) => (
              <option key={id} value={id}>{id}</option>
            ))}
          </select>

          {/* Stats */}
          <div className="ml-auto flex gap-4 text-xs text-white/40">
            <span className="text-green-400">
              {Array.from(cells.values()).filter(c => c.exists === true).length} uploaded
            </span>
            <span className="text-red-400">
              {Array.from(cells.values()).filter(c => c.exists === false).length} missing
            </span>
            <span>
              {Array.from(cells.values()).filter(c => c.exists === null).length} checking
            </span>
          </div>
        </div>

        {/* Notification */}
        {notification && (
          <div className="mb-4 bg-green-900/30 border border-green-700/30 rounded-xl px-4 py-2 text-green-300 text-sm">
            {notification}
          </div>
        )}

        {/* Weapon type sections */}
        <div className="space-y-6">
          {filteredTypes.map(([typeId, config]) => (
            <WeaponTypeSection
              key={typeId}
              typeId={typeId}
              config={config}
              cells={cells}
              onUpload={handleUpload}
            />
          ))}
        </div>

        {/* R2 Path Convention */}
        <div className="mt-8 bg-stone-900/50 rounded-xl border border-stone-800 p-4 text-xs text-white/30">
          <p className="font-bold text-white/50 mb-2">R2 Path Convention</p>
          <p>Weapons: <code className="text-amber-400/60">models/weapons/{'{type}{_t1-t8}'}.glb</code></p>
          <p>Example: <code className="text-amber-400/60">models/weapons/sword_t5.glb</code></p>
          <p className="mt-2">CDN: <code className="text-amber-400/60">https://assets.grudge-studio.com/models/weapons/sword_t5.glb</code></p>
        </div>
      </div>
    </div>
  );
}

// ── Weapon Type Section ──────────────────────────────────────────

function WeaponTypeSection({
  typeId, config, cells, onUpload,
}: {
  typeId: string;
  config: WeaponTypeModelConfig;
  cells: Map<string, CellStatus>;
  onUpload: (key: string, file: File) => void;
}) {
  const uploadedCount = TIER_VISUALS.filter(t => cells.get(`${typeId}_t${t.tier}`)?.exists === true).length;

  return (
    <div className="bg-stone-900/40 rounded-2xl border border-stone-800 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-stone-800/50">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold font-cinzel">{typeId}</span>
          <span className="text-white/30 text-xs">{config.basePath}</span>
          <span className="text-white/20 text-xs">attach: {config.attachBone}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-24 h-1.5 bg-stone-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${(uploadedCount / 8) * 100}%` }}
            />
          </div>
          <span className="text-white/40 text-xs">{uploadedCount}/8</span>
        </div>
      </div>

      <div className="grid grid-cols-8 gap-0">
        {TIER_VISUALS.map(tierVis => {
          const key = `${typeId}_t${tierVis.tier}`;
          const cell = cells.get(key);
          return (
            <TierCell
              key={key}
              cellKey={key}
              tierVis={tierVis}
              cell={cell}
              onUpload={onUpload}
            />
          );
        })}
      </div>
    </div>
  );
}

// ── Tier Cell ────────────────────────────────────────────────────

function TierCell({
  cellKey, tierVis, cell, onUpload,
}: {
  cellKey: string;
  tierVis: typeof TIER_VISUALS[0];
  cell: CellStatus | undefined;
  onUpload: (key: string, file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (file: File) => {
    if (!file.name.endsWith('.glb') && !file.name.endsWith('.gltf')) {
      alert('Only .glb and .gltf files allowed');
      return;
    }
    onUpload(cellKey, file);
  };

  const statusColor = cell?.exists === true ? 'border-green-600/40 bg-green-900/10'
    : cell?.exists === false ? 'border-red-800/30 bg-red-950/10'
    : 'border-stone-700/30 bg-stone-900/20';

  return (
    <div
      className={`relative border-r border-b p-3 ${statusColor} ${dragOver ? 'bg-amber-900/20 border-amber-500/50' : ''} transition-colors`}
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
    >
      {/* Tier label */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold" style={{ color: tierVis.rarityColor }}>
          T{tierVis.tier}
        </span>
        <span className="text-[9px] text-white/30">{tierVis.tierName}</span>
      </div>

      {/* Status icon */}
      <div className="flex items-center justify-center mb-2">
        {cell?.uploading ? (
          <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
        ) : cell?.exists === true ? (
          <Check className="w-5 h-5 text-green-400" />
        ) : cell?.exists === false ? (
          <X className="w-5 h-5 text-red-400/50" />
        ) : (
          <div className="w-5 h-5 bg-stone-700/30 rounded-full animate-pulse" />
        )}
      </div>

      {/* Upload button */}
      <button
        onClick={() => inputRef.current?.click()}
        disabled={cell?.uploading}
        className="w-full flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-[10px] border border-white/10 hover:border-amber-500/30 hover:bg-amber-900/20 transition-all disabled:opacity-30"
      >
        <Upload className="w-3 h-3" />
        {cell?.exists ? 'Replace' : 'Upload'}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept=".glb,.gltf"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
      />

      {/* CDN link */}
      {cell?.exists && (
        <a
          href={cell.cdnUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 flex items-center justify-center gap-0.5 text-[8px] text-blue-400/50 hover:text-blue-400"
        >
          <ExternalLink className="w-2 h-2" /> CDN
        </a>
      )}

      {/* Error */}
      {cell?.error && (
        <div className="mt-1 text-[8px] text-red-400 truncate" title={cell.error}>
          {cell.error}
        </div>
      )}
    </div>
  );
}
