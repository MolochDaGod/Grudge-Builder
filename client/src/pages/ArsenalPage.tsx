/**
 * Production Arsenal — migrated from warlord-crafting-suite.vercel.app/arsenal
 * onto the GrudgeBuilder SPA (grudgewarlords.com / grudge.studio).
 *
 * Purpose: browse + improve weapons, stats, systems, and abilities/skills.
 * SSOT: shared/definitions (weaponPrefabCatalog, weaponSkillsNew, weaponTierVisuals).
 * Edits go to local draft store → export JSON for merge (never silent repo writes).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  Sword,
  Shield,
  Search,
  Sparkles,
  Download,
  Save,
  Trash2,
  ExternalLink,
  Wrench,
  Layers,
  Zap,
  BarChart3,
  Box,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import {
  PRODUCTION_WEAPON_TYPES,
  WEAPON_STYLE_DEFS,
  WEAPON_CLASS_ROLE,
  listPrefabsForType,
  buildWeaponPrefabCoverage,
  type WeaponPrefabEntry,
  type ProductionWeaponType,
} from '@shared/definitions/weaponPrefabCatalog';
import {
  getWeaponTypeDefinition,
  type WeaponSkillOption,
  type WeaponTypeDefinition,
} from '@shared/definitions/weaponSkillsNew';
import { TIER_VISUALS } from '@shared/definitions/weaponTierVisuals';
import { getEquipmentIconSync } from '@/lib/equipmentIconResolver';
import {
  loadArsenalDrafts,
  saveArsenalDrafts,
  patchSkillDraft,
  patchPrefabDraft,
  applySkillDraft,
  clearArsenalDrafts,
  downloadArsenalDrafts,
  countDraftPatches,
  type ArsenalDrafts,
} from '@/lib/arsenalDraftStore';
import {
  CLOTH_EQUIPMENT,
  LEATHER_EQUIPMENT,
  METAL_EQUIPMENT,
  type EquipmentItem,
} from '@shared/definitions/equipmentData';

type StudioTab =
  | 'prefabs'
  | 'skills'
  | 'stats'
  | 'systems'
  | 'armor'
  | 'export';

const STATUS_STYLE: Record<
  string,
  { label: string; className: string; Icon: typeof CheckCircle2 }
> = {
  ready: {
    label: 'ready',
    className: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    Icon: CheckCircle2,
  },
  fallback: {
    label: 'fallback',
    className: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    Icon: AlertTriangle,
  },
  missing: {
    label: 'missing',
    className: 'text-red-400 bg-red-500/10 border-red-500/30',
    Icon: XCircle,
  },
};

function prefabIcon(p: WeaponPrefabEntry): string {
  return getEquipmentIconSync({
    prefabId: p.id,
    weaponType: p.weaponType,
    styleId: p.styleId,
    preferMeshIcon: true,
    image: p.iconUrl ?? undefined,
  });
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.missing;
  const Icon = s.Icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-semibold uppercase tracking-wide',
        s.className,
      )}
    >
      <Icon className="w-3 h-3" />
      {s.label}
    </span>
  );
}

function SkillEditorRow({
  skill,
  weaponType,
  drafts,
  onChange,
}: {
  skill: WeaponSkillOption;
  weaponType: string;
  drafts: ArsenalDrafts;
  onChange: (skillId: string, patch: Partial<WeaponSkillOption>) => void;
}) {
  const merged = applySkillDraft(skill, weaponType, drafts);
  const dirty = !!drafts.skills[weaponType.toUpperCase()]?.[skill.id];

  return (
    <div
      className={cn(
        'rounded-lg border p-3 space-y-2 bg-slate-900/60',
        dirty ? 'border-amber-500/40' : 'border-slate-700/50',
      )}
      data-testid={`skill-row-${skill.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg shrink-0">{merged.icon || '⚔️'}</span>
          <div className="min-w-0">
            <input
              className="w-full bg-transparent text-sm font-semibold text-amber-300 border-b border-transparent focus:border-amber-500/50 outline-none"
              value={merged.name}
              onChange={(e) => onChange(skill.id, { name: e.target.value })}
            />
            <div className="text-[10px] text-slate-500 font-mono truncate">
              {skill.id}
              {dirty && (
                <span className="ml-2 text-amber-400">· draft</span>
              )}
            </div>
          </div>
        </div>
        <span className="text-[10px] text-slate-400 shrink-0">T{merged.tier}</span>
      </div>
      <textarea
        className="w-full bg-slate-950/50 border border-slate-700/40 rounded px-2 py-1.5 text-xs text-slate-300 min-h-[52px] outline-none focus:border-amber-500/40"
        value={merged.description}
        onChange={(e) => onChange(skill.id, { description: e.target.value })}
      />
      <div className="grid grid-cols-3 gap-2">
        <label className="text-[10px] text-slate-500">
          Damage
          <input
            type="number"
            className="mt-0.5 w-full bg-slate-950/50 border border-slate-700/40 rounded px-2 py-1 text-sm text-red-300"
            value={merged.damage}
            onChange={(e) =>
              onChange(skill.id, { damage: Number(e.target.value) || 0 })
            }
          />
        </label>
        <label className="text-[10px] text-slate-500">
          Cooldown
          <input
            type="number"
            className="mt-0.5 w-full bg-slate-950/50 border border-slate-700/40 rounded px-2 py-1 text-sm text-blue-300"
            value={merged.cooldown}
            onChange={(e) =>
              onChange(skill.id, { cooldown: Number(e.target.value) || 0 })
            }
          />
        </label>
        <label className="text-[10px] text-slate-500">
          Unlock tier
          <input
            type="number"
            min={1}
            max={8}
            className="mt-0.5 w-full bg-slate-950/50 border border-slate-700/40 rounded px-2 py-1 text-sm text-purple-300"
            value={merged.tier}
            onChange={(e) =>
              onChange(skill.id, {
                tier: Math.min(8, Math.max(1, Number(e.target.value) || 1)),
              })
            }
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-1">
        {(merged.effects || []).map((fx, i) => (
          <span
            key={i}
            className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400"
          >
            {fx}
          </span>
        ))}
      </div>
    </div>
  );
}

function PrefabCard({
  prefab,
  selected,
  onSelect,
  draftNotes,
}: {
  prefab: WeaponPrefabEntry;
  selected: boolean;
  onSelect: () => void;
  draftNotes?: string;
}) {
  const icon = prefabIcon(prefab);
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'text-left rounded-xl border p-3 transition-all bg-gradient-to-br from-slate-800/80 to-slate-900/90',
        selected
          ? 'border-amber-500/70 ring-1 ring-amber-500/30'
          : 'border-slate-700/50 hover:border-slate-500/60',
      )}
      data-testid={`prefab-${prefab.id}`}
    >
      <div className="flex items-start gap-3">
        <div className="w-14 h-14 rounded-lg bg-slate-950/80 border border-slate-700/50 flex items-center justify-center overflow-hidden shrink-0">
          <img
            src={icon}
            alt={prefab.label}
            className="w-12 h-12 object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-amber-300 truncate">
              {prefab.label}
            </h3>
            <StatusBadge status={prefab.status} />
          </div>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
            {prefab.id}
          </p>
          <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
            {draftNotes || prefab.notes || prefab.sourcePack || '—'}
          </p>
          <div className="flex flex-wrap gap-1 mt-2">
            {prefab.productionReady && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                prod
              </span>
            )}
            {prefab.classRole && prefab.classRole !== 'any' && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-300">
                {prefab.classRole}
              </span>
            )}
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-400">
              style {prefab.styleIndex}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

function ArmorCard({ item, tier }: { item: EquipmentItem; tier: number }) {
  const tb = tier - 1;
  const stats = {
    hp: Math.round(item.stats.hpBase + item.stats.hpPerTier * tb),
    defense: Math.round(item.stats.defenseBase + item.stats.defensePerTier * tb),
  };
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-3">
      <h3 className="font-semibold text-sm text-white">{item.name}</h3>
      <p className="text-[10px] text-slate-500">
        {item.type} · {item.material}
      </p>
      <div className="flex gap-3 mt-2 text-xs">
        <span className="text-red-400">HP {stats.hp}</span>
        <span className="text-slate-300">DEF {stats.defense}</span>
      </div>
    </div>
  );
}

export default function ArsenalPage() {
  const authReady = useAuthGuard();
  const [, setLocation] = useLocation();

  const [tab, setTab] = useState<StudioTab>('prefabs');
  const [search, setSearch] = useState('');
  const [weaponType, setWeaponType] = useState<ProductionWeaponType>('SWORD');
  const [selectedPrefabId, setSelectedPrefabId] = useState<string | null>(null);
  const [tier, setTier] = useState(1);
  const [drafts, setDrafts] = useState<ArsenalDrafts>(loadArsenalDrafts);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    setDrafts(loadArsenalDrafts());
  }, []);

  const coverage = useMemo(() => buildWeaponPrefabCoverage(), []);
  const prefabs = useMemo(
    () => listPrefabsForType(weaponType),
    [weaponType],
  );
  const skillDef: WeaponTypeDefinition | undefined = useMemo(
    () => getWeaponTypeDefinition(weaponType),
    [weaponType],
  );
  const selectedPrefab =
    prefabs.find((p) => p.id === selectedPrefabId) ?? prefabs[0] ?? null;

  useEffect(() => {
    if (!selectedPrefabId && prefabs[0]) {
      setSelectedPrefabId(prefabs[0].id);
    }
  }, [weaponType, prefabs, selectedPrefabId]);

  const filteredTypes = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return [...PRODUCTION_WEAPON_TYPES];
    return PRODUCTION_WEAPON_TYPES.filter(
      (t) =>
        t.toLowerCase().includes(q) ||
        (WEAPON_CLASS_ROLE[t] || '').includes(q) ||
        listPrefabsForType(t).some(
          (p) =>
            p.id.includes(q) ||
            p.label.toLowerCase().includes(q) ||
            (p.notes || '').toLowerCase().includes(q),
        ),
    );
  }, [search]);

  const draftCounts = useMemo(() => countDraftPatches(drafts), [drafts]);

  const persist = useCallback((next: ArsenalDrafts) => {
    setDrafts(next);
    saveArsenalDrafts(next);
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1200);
  }, []);

  const onSkillPatch = useCallback(
    (skillId: string, patch: Partial<WeaponSkillOption>) => {
      const next = patchSkillDraft(drafts, weaponType, skillId, {
        name: patch.name,
        description: patch.description,
        damage: patch.damage,
        cooldown: patch.cooldown,
        tier: patch.tier,
        effects: patch.effects,
      });
      persist(next);
    },
    [drafts, weaponType, persist],
  );

  const onPrefabNotes = useCallback(
    (prefabId: string, notes: string) => {
      persist(patchPrefabDraft(drafts, prefabId, { notes }));
    },
    [drafts, persist],
  );

  const allArmor = useMemo(
    () => [
      ...(CLOTH_EQUIPMENT || []),
      ...(LEATHER_EQUIPMENT || []),
      ...(METAL_EQUIPMENT || []),
    ],
    [],
  );

  if (!authReady) return null;

  const tabs: { id: StudioTab; label: string; icon: typeof Sword }[] = [
    { id: 'prefabs', label: 'Prefabs', icon: Box },
    { id: 'skills', label: 'Skills', icon: Zap },
    { id: 'stats', label: 'Stats / Tiers', icon: BarChart3 },
    { id: 'systems', label: 'Systems', icon: Layers },
    { id: 'armor', label: 'Armor', icon: Shield },
    { id: 'export', label: 'Export', icon: Download },
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 pb-16">
        <div className="max-w-[1400px] mx-auto">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation('/home')}
                className="text-slate-400 hover:text-white"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-amber-400 font-serif flex items-center gap-2">
                  <Sparkles className="w-7 h-7" /> Production Arsenal
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Migrated from WCS · edit weapons, stats, systems &amp; skills on
                  grudgewarlords.com · mesh-true icons · same mesh T1–T8
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(draftCounts.skills > 0 || draftCounts.prefabs > 0) && (
                <span className="text-[11px] px-2 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  {draftCounts.skills} skill · {draftCounts.prefabs} prefab drafts
                  {savedFlash ? ' · saved' : ''}
                </span>
              )}
              <Button
                size="sm"
                variant="outline"
                className="border-slate-600 text-slate-300"
                onClick={() => setLocation('/weapon-skills')}
              >
                <ExternalLink className="w-3.5 h-3.5 mr-1" /> Skills ref
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-slate-600 text-slate-300"
                onClick={() => setLocation('/weapon-admin')}
              >
                <Wrench className="w-3.5 h-3.5 mr-1" /> Model admin
              </Button>
            </div>
          </div>

          {/* Tabs + search */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="flex flex-wrap bg-slate-800/50 rounded-lg p-1 gap-0.5">
              {tabs.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5',
                      tab === t.id
                        ? 'bg-amber-500 text-black'
                        : 'text-slate-400 hover:text-white',
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {t.label}
                  </button>
                );
              })}
            </div>
            <div className="relative flex-1 min-w-[160px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter types / prefabs…"
                className="w-full bg-slate-800/50 border border-slate-700 rounded-lg pl-10 pr-3 py-2 text-sm text-white placeholder:text-slate-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Tier preview</span>
              <select
                value={tier}
                onChange={(e) => setTier(Number(e.target.value))}
                className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white"
              >
                {TIER_VISUALS.map((tv) => (
                  <option key={tv.tier} value={tv.tier}>
                    T{tv.tier} {tv.tierName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Coverage strip */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-5">
            {[
              { label: 'Types', value: coverage.weaponTypes },
              { label: 'Slots', value: coverage.totalSlots },
              { label: 'Ready', value: coverage.ready, color: 'text-emerald-400' },
              { label: 'Fallback', value: coverage.fallback, color: 'text-amber-400' },
              { label: 'Missing', value: coverage.missing, color: 'text-red-400' },
            ].map((c) => (
              <div
                key={c.label}
                className="rounded-lg border border-slate-700/40 bg-slate-900/50 px-3 py-2"
              >
                <div className={cn('text-lg font-bold', c.color || 'text-white')}>
                  {c.value}
                </div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wide">
                  {c.label}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Type rail */}
            {(tab === 'prefabs' ||
              tab === 'skills' ||
              tab === 'stats' ||
              tab === 'systems') && (
              <aside className="lg:col-span-2 space-y-1 max-h-[70vh] overflow-y-auto pr-1">
                {filteredTypes.map((t) => {
                  const cov = coverage.byType[t];
                  const role = WEAPON_CLASS_ROLE[t];
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setWeaponType(t);
                        setSelectedPrefabId(null);
                      }}
                      className={cn(
                        'w-full text-left px-2.5 py-2 rounded-lg border text-xs transition-all',
                        weaponType === t
                          ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                          : 'bg-slate-900/40 border-transparent text-slate-400 hover:border-slate-600',
                      )}
                    >
                      <div className="font-semibold tracking-wide">{t}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {cov
                          ? `${cov.ready}r/${cov.fallback}f/${cov.missing}m`
                          : '—'}
                        {role && role !== 'any' ? ` · ${role}` : ''}
                      </div>
                    </button>
                  );
                })}
              </aside>
            )}

            {/* Main panel */}
            <main
              className={cn(
                tab === 'armor' || tab === 'export'
                  ? 'lg:col-span-12'
                  : 'lg:col-span-10',
              )}
            >
              <AnimatePresence mode="wait">
                {tab === 'prefabs' && (
                  <motion.div
                    key="prefabs"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="grid grid-cols-1 xl:grid-cols-5 gap-4"
                  >
                    <div className="xl:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {prefabs.map((p) => (
                        <PrefabCard
                          key={p.id}
                          prefab={p}
                          selected={selectedPrefab?.id === p.id}
                          onSelect={() => setSelectedPrefabId(p.id)}
                          draftNotes={drafts.prefabs[p.id]?.notes}
                        />
                      ))}
                      {prefabs.length === 0 && (
                        <p className="text-slate-500 text-sm col-span-2">
                          No prefabs for {weaponType}
                        </p>
                      )}
                    </div>
                    <div className="xl:col-span-2 rounded-xl border border-slate-700/50 bg-slate-900/70 p-4 space-y-3">
                      {selectedPrefab ? (
                        <>
                          <div className="flex items-start gap-3">
                            <img
                              src={prefabIcon(selectedPrefab)}
                              alt=""
                              className="w-20 h-20 object-contain rounded-lg bg-slate-950 border border-slate-700"
                            />
                            <div>
                              <h2 className="text-lg font-bold text-amber-300">
                                {selectedPrefab.label}
                              </h2>
                              <p className="text-xs font-mono text-slate-500">
                                {selectedPrefab.id}
                              </p>
                              <div className="mt-1">
                                <StatusBadge status={selectedPrefab.status} />
                              </div>
                            </div>
                          </div>
                          <div className="text-xs space-y-1 text-slate-400">
                            <div>
                              <span className="text-slate-500">CDN: </span>
                              <span className="break-all">
                                {selectedPrefab.cdnUrl || '—'}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500">Local: </span>
                              <span className="break-all">
                                {selectedPrefab.localPath || '—'}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500">Pack: </span>
                              {selectedPrefab.sourcePack || '—'}
                            </div>
                            <div>
                              <span className="text-slate-500">Style: </span>
                              {selectedPrefab.styleId} (
                              {
                                WEAPON_STYLE_DEFS.find(
                                  (s) => s.id === selectedPrefab.styleId,
                                )?.label
                              }
                              )
                            </div>
                          </div>
                          <label className="block text-xs text-slate-500">
                            Notes (draft)
                            <textarea
                              className="mt-1 w-full min-h-[80px] bg-slate-950/60 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-slate-200 outline-none focus:border-amber-500/40"
                              value={
                                drafts.prefabs[selectedPrefab.id]?.notes ??
                                selectedPrefab.notes ??
                                ''
                              }
                              onChange={(e) =>
                                onPrefabNotes(selectedPrefab.id, e.target.value)
                              }
                              placeholder="Pipeline notes, art debt, cool mesh swap ideas…"
                            />
                          </label>
                          <p className="text-[11px] text-slate-500">
                            Cool meshes are fine — inventory icons generate from
                            this prefab mesh (
                            <code className="text-slate-400">
                              icons/weapons/generated/{'{prefabId}'}.png
                            </code>
                            ).
                          </p>
                        </>
                      ) : (
                        <p className="text-slate-500 text-sm">
                          Select a style prefab
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}

                {tab === 'skills' && (
                  <motion.div
                    key="skills"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-white">
                        {skillDef?.name || weaponType} abilities
                      </h2>
                      <span className="text-xs text-slate-500">
                        SSOT: weaponSkillsNew · drafts overlay local edits
                      </span>
                    </div>
                    {!skillDef && (
                      <p className="text-amber-400/80 text-sm">
                        No skill tree defined for {weaponType} yet — add slots in
                        shared/definitions/weaponSkillsNew.ts
                      </p>
                    )}
                    {skillDef?.slots.map((slot, si) => (
                      <section key={`${slot.type}-${si}`} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-bold tracking-widest text-amber-400/90">
                            {slot.label}
                          </h3>
                          <span className="text-[10px] text-slate-500">
                            unlock T{slot.unlockTier} · {slot.type}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {slot.skills.map((sk) => (
                            <SkillEditorRow
                              key={sk.id}
                              skill={sk}
                              weaponType={weaponType}
                              drafts={drafts}
                              onChange={onSkillPatch}
                            />
                          ))}
                          {slot.skills.length === 0 && (
                            <p className="text-xs text-slate-600 col-span-2">
                              Empty pool
                              {slot.recipeSource
                                ? ` (recipe → ${slot.recipeSource})`
                                : ''}
                            </p>
                          )}
                        </div>
                      </section>
                    ))}
                  </motion.div>
                )}

                {tab === 'stats' && (
                  <motion.div
                    key="stats"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    <h2 className="text-lg font-semibold text-white">
                      Tier ladder (looks only — same mesh)
                    </h2>
                    <p className="text-xs text-slate-500 max-w-2xl">
                      T1–T8 never swap the prefab GLB. Stats / skills / passives
                      live on the item UUID; materials use this visual ladder.
                      Preview tier selector affects UI only.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {TIER_VISUALS.map((tv) => (
                        <div
                          key={tv.tier}
                          className={cn(
                            'rounded-xl border p-3 bg-slate-900/60',
                            tier === tv.tier
                              ? 'border-amber-500/50'
                              : 'border-slate-700/40',
                          )}
                          style={{ boxShadow: `inset 0 0 0 1px ${tv.rarityColor}22` }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span
                              className="text-sm font-bold"
                              style={{ color: tv.rarityColor }}
                            >
                              T{tv.tier} {tv.tierName}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {tv.rarityName}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-400">
                            <span>rough {tv.roughness.toFixed(2)}</span>
                            <span>metal {tv.metalness.toFixed(2)}</span>
                            <span>glow {tv.glowIntensity.toFixed(2)}</span>
                            <span>rim {tv.edgeRim.toFixed(2)}</span>
                            <span>clearcoat {tv.clearcoat.toFixed(2)}</span>
                            <span>pulse {tv.glowPulse.toFixed(2)}</span>
                          </div>
                          {tv.trailEffect && (
                            <div className="mt-2 text-[10px] text-orange-300/80">
                              trail: {tv.trailEffect}
                            </div>
                          )}
                          {tv.auraEffect && (
                            <div className="text-[10px] text-violet-300/80">
                              aura: {tv.auraEffect}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="rounded-xl border border-slate-700/40 bg-slate-900/50 p-4">
                      <h3 className="text-sm font-semibold text-amber-300 mb-2">
                        Style slots (art skins)
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {WEAPON_STYLE_DEFS.map((s) => (
                          <div
                            key={s.id}
                            className="px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/40 text-xs"
                          >
                            <div className="text-white font-semibold">
                              {s.index}. {s.label}
                            </div>
                            <div className="text-slate-500">
                              {s.id} · {s.pack}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {tab === 'systems' && (
                  <motion.div
                    key="systems"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    <h2 className="text-lg font-semibold text-white">
                      Systems coverage
                    </h2>
                    <div className="overflow-x-auto rounded-xl border border-slate-700/40">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-900 text-slate-400">
                          <tr>
                            <th className="text-left p-2">Type</th>
                            <th className="p-2">Ready</th>
                            <th className="p-2">Fallback</th>
                            <th className="p-2">Missing</th>
                            <th className="p-2">Skills</th>
                            <th className="p-2">Role</th>
                            <th className="p-2">Prod</th>
                          </tr>
                        </thead>
                        <tbody>
                          {PRODUCTION_WEAPON_TYPES.map((t) => {
                            const cov = coverage.byType[t];
                            const def = getWeaponTypeDefinition(t);
                            const skillCount =
                              def?.slots.reduce(
                                (n, s) => n + s.skills.length,
                                0,
                              ) ?? 0;
                            return (
                              <tr
                                key={t}
                                className={cn(
                                  'border-t border-slate-800 cursor-pointer hover:bg-slate-800/40',
                                  weaponType === t && 'bg-amber-500/5',
                                )}
                                onClick={() => setWeaponType(t)}
                              >
                                <td className="p-2 font-semibold text-slate-200">
                                  {t}
                                </td>
                                <td className="p-2 text-center text-emerald-400">
                                  {cov?.ready ?? 0}
                                </td>
                                <td className="p-2 text-center text-amber-400">
                                  {cov?.fallback ?? 0}
                                </td>
                                <td className="p-2 text-center text-red-400">
                                  {cov?.missing ?? 0}
                                </td>
                                <td className="p-2 text-center text-slate-300">
                                  {skillCount}
                                </td>
                                <td className="p-2 text-center text-slate-400">
                                  {WEAPON_CLASS_ROLE[t] || 'any'}
                                </td>
                                <td className="p-2 text-center">
                                  {cov?.productionReady ? '✓' : '·'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {coverage.gaps.length > 0 && (
                      <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-4">
                        <h3 className="text-sm font-semibold text-red-300 mb-2">
                          Art gaps ({coverage.gaps.length})
                        </h3>
                        <ul className="max-h-48 overflow-y-auto space-y-1 text-[11px] text-red-200/70">
                          {coverage.gaps.slice(0, 40).map((g, i) => (
                            <li key={i}>
                              {g.weaponType} · {g.styleId}
                              {g.notes ? ` — ${g.notes}` : ''}
                            </li>
                          ))}
                          {coverage.gaps.length > 40 && (
                            <li>…and {coverage.gaps.length - 40} more</li>
                          )}
                        </ul>
                      </div>
                    )}
                    <label className="block text-xs text-slate-500">
                      Systems notes (draft)
                      <textarea
                        className="mt-1 w-full min-h-[100px] bg-slate-950/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
                        value={drafts.systemNotes}
                        onChange={(e) =>
                          persist({ ...drafts, systemNotes: e.target.value })
                        }
                        placeholder="Combat systems, chain knife yank, gun styles, class locks…"
                      />
                    </label>
                  </motion.div>
                )}

                {tab === 'armor' && (
                  <motion.div
                    key="armor"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
                  >
                    {allArmor
                      .filter(
                        (a) =>
                          !search ||
                          a.name.toLowerCase().includes(search.toLowerCase()),
                      )
                      .map((item) => (
                        <ArmorCard key={item.id} item={item} tier={tier} />
                      ))}
                  </motion.div>
                )}

                {tab === 'export' && (
                  <motion.div
                    key="export"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="max-w-2xl space-y-4 rounded-xl border border-slate-700/50 bg-slate-900/70 p-6"
                  >
                    <h2 className="text-lg font-semibold text-amber-300 flex items-center gap-2">
                      <Save className="w-5 h-5" /> Draft export
                    </h2>
                    <p className="text-sm text-slate-400">
                      Production Arsenal keeps edits in{' '}
                      <code className="text-slate-300">localStorage</code> so you
                      can improve weapons, stats, and skills without redeploying
                      mid-session. Download JSON and merge into:
                    </p>
                    <ul className="text-xs text-slate-500 list-disc pl-5 space-y-1">
                      <li>
                        <code>shared/definitions/weaponSkillsNew.ts</code>
                      </li>
                      <li>
                        <code>shared/definitions/weaponPrefabCatalog.ts</code>
                      </li>
                      <li>
                        <code>shared/definitions/weaponTierVisuals.ts</code>
                      </li>
                    </ul>
                    <pre className="text-[10px] bg-slate-950 rounded-lg p-3 max-h-48 overflow-auto text-slate-400 border border-slate-800">
                      {JSON.stringify(
                        {
                          updatedAt: drafts.updatedAt,
                          counts: draftCounts,
                          systemNotes: drafts.systemNotes?.slice(0, 200),
                          skillTypes: Object.keys(drafts.skills),
                          prefabIds: Object.keys(drafts.prefabs),
                        },
                        null,
                        2,
                      )}
                    </pre>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        className="bg-amber-500 text-black hover:bg-amber-400"
                        onClick={() => downloadArsenalDrafts(drafts)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download drafts JSON
                      </Button>
                      <Button
                        variant="outline"
                        className="border-red-800 text-red-300 hover:bg-red-950/40"
                        onClick={() => {
                          if (
                            window.confirm(
                              'Clear all local arsenal drafts on this browser?',
                            )
                          ) {
                            persist(clearArsenalDrafts());
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Clear drafts
                      </Button>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Canonical product URL:{' '}
                      <span className="text-slate-400">
                        https://grudgewarlords.com/arsenal
                      </span>{' '}
                      (not warlord-crafting-suite.vercel.app)
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </main>
          </div>
        </div>
      </div>
    </Layout>
  );
}
