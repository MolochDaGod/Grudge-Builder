/**
 * /combat-lab — Canonical combat equipment lab
 *
 * Unifies:
 *  - Item database (weapons / armor) for test & improve
 *  - Grip + wrist IK (bone-locked, anti mesh-through-body)
 *  - Hit collider / optimal reach placement
 *  - Force patterns (push, pull, knock-up, uppercut, back-uppercut)
 *  - Passives + stacking
 *  - Status effects (buffs/debuffs) with icons, tooltips, live stack apply
 *
 * SSOT:
 *  shared/definitions/weaponCombatGeometry.ts
 *  shared/definitions/weaponAttachSystem.ts
 *  shared/definitions/statusEffects.ts
 *  client/src/lib/grudaDB.ts (items)
 *  client/src/lib/statusEffectRuntime.ts
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import {
  ArrowLeft,
  Database,
  Crosshair,
  Bone,
  Zap,
  Shield,
  Sparkles,
  Sword,
  Info,
  Play,
  RotateCcw,
  Save,
} from 'lucide-react';
import { ITEMS, type GrudaItem, resolveItemImage } from '@/lib/grudaDB';
import { assetUrl } from '@/lib/assetConfig';
import {
  WEAPON_COMBAT_PROFILES,
  FORCE_PATTERN_LIST,
  WEAPON_PASSIVES,
  getWeaponCombatProfile,
  updateWeaponCombatProfile,
  resolveHitImpulse,
  type ForcePatternId,
  type WeaponCombatProfile,
} from '@shared/definitions/weaponCombatGeometry';
import {
  STATUS_EFFECT_DEFS,
  listBuffs,
  listDebuffs,
  getStatusDef,
  type StatusEffectDef,
} from '@shared/definitions/statusEffects';
import { playerStatusEffects } from '@/lib/statusEffectRuntime';
import { usePlayerStatusEffects } from '@/hooks/useStatusEffects';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type LabTab = 'database' | 'grip' | 'collider' | 'forces' | 'passives' | 'status';

const TABS: { id: LabTab; label: string; icon: React.ReactNode }[] = [
  { id: 'database', label: 'Database', icon: <Database className="w-3.5 h-3.5" /> },
  { id: 'grip', label: 'Grip & Wrist IK', icon: <Bone className="w-3.5 h-3.5" /> },
  { id: 'collider', label: 'Reach & Collider', icon: <Crosshair className="w-3.5 h-3.5" /> },
  { id: 'forces', label: 'Forces', icon: <Zap className="w-3.5 h-3.5" /> },
  { id: 'passives', label: 'Passives', icon: <Sword className="w-3.5 h-3.5" /> },
  { id: 'status', label: 'Buffs / Debuffs', icon: <Sparkles className="w-3.5 h-3.5" /> },
];

function StatusIcon({ def, size = 28 }: { def: StatusEffectDef; size?: number }) {
  const [err, setErr] = useState(false);
  return (
    <div
      className="relative rounded border border-white/10 bg-black/40 flex items-center justify-center overflow-hidden shrink-0"
      style={{ width: size, height: size }}
    >
      {!err ? (
        <img
          src={assetUrl(def.icon)}
          alt={def.name}
          className="w-full h-full object-contain"
          onError={() => setErr(true)}
        />
      ) : (
        <span className="text-sm leading-none">{def.emoji}</span>
      )}
    </div>
  );
}

function StatusTooltipCard({ def }: { def: StatusEffectDef }) {
  return (
    <div className="max-w-[240px] space-y-1.5 p-0.5">
      <div className="flex items-center gap-2">
        <StatusIcon def={def} size={32} />
        <div>
          <div className="font-semibold text-sm" style={{ color: def.color }}>
            {def.name}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-slate-400">
            {def.polarity} · {def.category}
          </div>
        </div>
      </div>
      <p className="text-xs text-slate-200 leading-snug">{def.description}</p>
      <div className="flex flex-wrap gap-1 text-[10px] text-slate-400">
        <span>stacks {def.maxStacks}</span>
        <span>·</span>
        <span>{def.stackRule}</span>
        <span>·</span>
        <span>{def.defaultDurationSec || '∞'}s</span>
        {def.isDot && <Badge className="h-4 text-[9px] bg-red-900/60">DoT</Badge>}
        {def.isHardCc && <Badge className="h-4 text-[9px] bg-amber-900/60">Hard CC</Badge>}
      </div>
    </div>
  );
}

export default function CombatLabPage() {
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<LabTab>('database');
  const [weaponType, setWeaponType] = useState('SWORD');
  const [profile, setProfile] = useState<WeaponCombatProfile>(() => getWeaponCombatProfile('SWORD'));
  const [itemFilter, setItemFilter] = useState('');
  const [itemKind, setItemKind] = useState<'all' | 'Weapon' | 'Armor'>('all');
  const [forcePattern, setForcePattern] = useState<ForcePatternId>('slash');
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const activeStatuses = usePlayerStatusEffects();

  useEffect(() => {
    setProfile(getWeaponCombatProfile(weaponType));
    setForcePattern(getWeaponCombatProfile(weaponType).primaryForce);
  }, [weaponType]);

  // Tick status durations so tooltips / stack timers behave like in-game HUD
  useEffect(() => {
    let last = performance.now();
    let id = 0;
    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      playerStatusEffects.tick(dt);
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, []);

  const weaponTypes = useMemo(() => Object.keys(WEAPON_COMBAT_PROFILES).sort(), []);

  const items = useMemo(() => {
    const q = itemFilter.toLowerCase();
    return ITEMS.filter((it) => {
      if (itemKind !== 'all' && it.type !== itemKind) return false;
      if (!q) return true;
      return (
        it.name.toLowerCase().includes(q) ||
        it.id.toLowerCase().includes(q) ||
        (it.weaponType || '').toLowerCase().includes(q)
      );
    }).slice(0, 80);
  }, [itemFilter, itemKind]);

  const patchProfile = useCallback(
    (partial: Partial<WeaponCombatProfile>) => {
      const next = updateWeaponCombatProfile(weaponType, partial);
      setProfile({ ...next });
    },
    [weaponType],
  );

  const impulsePreview = useMemo(() => {
    return resolveHitImpulse(forcePattern, profile, { x: 0, z: 1 });
  }, [forcePattern, profile]);

  const persistNote = () => {
    setSavedNote(
      `Session profile for ${profile.weaponTypeId} updated in memory. Export JSON below or keep testing — deploy writes via shared SSOT commit.`,
    );
    setTimeout(() => setSavedNote(null), 4000);
  };

  const applyStatus = (id: string, stacks = 1) => {
    playerStatusEffects.apply(id, { stacks });
  };

  const clearStatuses = () => playerStatusEffects.clear();

  const seedDemo = () => playerStatusEffects.seedDemo();

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen bg-gradient-to-b from-stone-950 via-[#07080f] to-stone-950 text-slate-100">
        <header className="border-b border-amber-900/30 bg-black/40 backdrop-blur sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3 justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-400"
                onClick={() => setLocation('/systems')}
              >
                <ArrowLeft className="w-4 h-4 mr-1" /> Systems
              </Button>
              <div>
                <h1 className="font-cinzel text-lg tracking-[0.18em] text-amber-200">
                  COMBAT LAB
                </h1>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                  Canonical DB · Grip/Wrist IK · Reach · Forces · Status stacks
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                className="bg-stone-900 border border-amber-800/40 rounded px-2 py-1.5 text-sm font-mono"
                value={weaponType}
                onChange={(e) => setWeaponType(e.target.value)}
              >
                {weaponTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <Button size="sm" variant="outline" className="border-amber-700/50" onClick={persistNote}>
                <Save className="w-3.5 h-3.5 mr-1" /> Save session
              </Button>
            </div>
          </div>
          <div className="max-w-7xl mx-auto px-4 pb-2 flex flex-wrap gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-t text-xs font-medium border-b-2 transition',
                  tab === t.id
                    ? 'border-amber-400 text-amber-100 bg-amber-500/10'
                    : 'border-transparent text-slate-400 hover:text-slate-200',
                )}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        </header>

        {savedNote && (
          <div className="max-w-7xl mx-auto px-4 pt-3">
            <div className="text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-800/40 rounded px-3 py-2">
              {savedNote}
            </div>
          </div>
        )}

        <main className="max-w-7xl mx-auto px-4 py-5 grid lg:grid-cols-[1fr_320px] gap-4">
          <section className="min-h-[60vh] rounded-lg border border-white/10 bg-black/30 p-4">
            {tab === 'database' && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2 items-center">
                  <Input
                    placeholder="Search weapons / armor…"
                    value={itemFilter}
                    onChange={(e) => setItemFilter(e.target.value)}
                    className="max-w-xs bg-stone-900 border-stone-700"
                  />
                  {(['all', 'Weapon', 'Armor'] as const).map((k) => (
                    <Button
                      key={k}
                      size="sm"
                      variant={itemKind === k ? 'default' : 'outline'}
                      onClick={() => setItemKind(k)}
                    >
                      {k}
                    </Button>
                  ))}
                  <span className="text-[10px] text-slate-500">
                    Source: grudaDB / ObjectStore master-items (canonical)
                  </span>
                </div>
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-2 max-h-[70vh] overflow-y-auto pr-1">
                  {items.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      onPickWeapon={(wt) => {
                        if (wt) setWeaponType(wt.toUpperCase());
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {tab === 'grip' && (
              <div className="space-y-5 max-w-xl">
                <p className="text-sm text-slate-400">
                  Grip offsets parent the weapon to <code className="text-amber-200/90">R_hand_container</code>{' '}
                  (or left). Wrist lock clamps pitch/yaw/roll and biases the blade away from the torso so
                  run/attack animations do not mesh the weapon through the body.
                </p>
                <Vec3Sliders
                  label="Grip offset (m)"
                  value={profile.grip.offset}
                  min={-0.2}
                  max={0.25}
                  step={0.005}
                  onChange={(offset) => patchProfile({ grip: { ...profile.grip, offset } })}
                />
                <Vec3Sliders
                  label="Grip rotation (rad)"
                  value={profile.grip.rotation}
                  min={-Math.PI}
                  max={Math.PI}
                  step={0.02}
                  onChange={(rotation) => patchProfile({ grip: { ...profile.grip, rotation } })}
                />
                <div>
                  <label className="text-xs text-slate-400">Scale {profile.grip.scale.toFixed(2)}</label>
                  <Slider
                    value={[profile.grip.scale]}
                    min={0.4}
                    max={1.6}
                    step={0.01}
                    onValueChange={([scale]) =>
                      patchProfile({ grip: { ...profile.grip, scale } })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {(
                    [
                      ['maxPitch', profile.wrist.maxPitch],
                      ['maxYaw', profile.wrist.maxYaw],
                      ['maxRoll', profile.wrist.maxRoll],
                      ['spring', profile.wrist.spring],
                    ] as const
                  ).map(([key, val]) => (
                    <div key={key}>
                      <label className="text-xs text-slate-400">
                        Wrist {key} {val.toFixed(2)}
                      </label>
                      <Slider
                        value={[val]}
                        min={0}
                        max={key === 'spring' ? 1 : 1.5}
                        step={0.01}
                        onValueChange={([v]) =>
                          patchProfile({ wrist: { ...profile.wrist, [key]: v } })
                        }
                      />
                    </div>
                  ))}
                </div>
                <Vec3Sliders
                  label="Wrist bias Euler (outward)"
                  value={profile.wrist.biasEuler}
                  min={-1}
                  max={1}
                  step={0.01}
                  onChange={(biasEuler) =>
                    patchProfile({ wrist: { ...profile.wrist, biasEuler } })
                  }
                />
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!profile.grip.leftHand}
                    onChange={(e) =>
                      patchProfile({ grip: { ...profile.grip, leftHand: e.target.checked } })
                    }
                  />
                  Left hand socket
                </label>
              </div>
            )}

            {tab === 'collider' && (
              <div className="space-y-5 max-w-xl">
                <p className="text-sm text-slate-400">
                  Hit volume sits along the weapon from the grip. Reach and arc define optimal attack
                  area — melee systems should use these values, not hard-coded numbers.
                </p>
                <div className="flex gap-2">
                  {(['capsule', 'box', 'sphere'] as const).map((shape) => (
                    <Button
                      key={shape}
                      size="sm"
                      variant={profile.collider.shape === shape ? 'default' : 'outline'}
                      onClick={() =>
                        patchProfile({ collider: { ...profile.collider, shape } })
                      }
                    >
                      {shape}
                    </Button>
                  ))}
                </div>
                <Vec3Sliders
                  label="Collider center (local)"
                  value={profile.collider.center}
                  min={-0.5}
                  max={1.5}
                  step={0.01}
                  onChange={(center) =>
                    patchProfile({ collider: { ...profile.collider, center } })
                  }
                />
                <Vec3Sliders
                  label="Collider size"
                  value={profile.collider.size}
                  min={0.02}
                  max={1.2}
                  step={0.01}
                  onChange={(size) =>
                    patchProfile({ collider: { ...profile.collider, size } })
                  }
                />
                <div>
                  <label className="text-xs text-slate-400">
                    Reach {profile.collider.reachM.toFixed(2)} m
                  </label>
                  <Slider
                    value={[profile.collider.reachM]}
                    min={0.8}
                    max={25}
                    step={0.05}
                    onValueChange={([reachM]) =>
                      patchProfile({ collider: { ...profile.collider, reachM } })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400">
                    Arc half-angle {(profile.collider.arcHalfRad * (180 / Math.PI)).toFixed(0)}°
                  </label>
                  <Slider
                    value={[profile.collider.arcHalfRad]}
                    min={0.05}
                    max={1.6}
                    step={0.01}
                    onValueChange={([arcHalfRad]) =>
                      patchProfile({ collider: { ...profile.collider, arcHalfRad } })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400">
                    Height bias {profile.collider.heightBiasM.toFixed(2)} m (chest-ish)
                  </label>
                  <Slider
                    value={[profile.collider.heightBiasM]}
                    min={0.4}
                    max={2.0}
                    step={0.02}
                    onValueChange={([heightBiasM]) =>
                      patchProfile({ collider: { ...profile.collider, heightBiasM } })
                    }
                  />
                </div>
                <div className="rounded border border-emerald-800/40 bg-emerald-950/20 p-3 text-xs font-mono text-emerald-200/90">
                  Optimal attack point ≈ forward × reach×0.55 @ y+heightBias
                  <br />
                  reach={profile.collider.reachM}m · arc±
                  {(profile.collider.arcHalfRad * 57.3).toFixed(0)}°
                </div>
              </div>
            )}

            {tab === 'forces' && (
              <div className="space-y-4">
                <p className="text-sm text-slate-400">
                  Pattern-deployed impulses for LMB / heavy. Back uppercut pulls into a rising reverse
                  arc; knock-up launches; push/pull move planar.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {FORCE_PATTERN_LIST.map((p) => (
                    <Tooltip key={p.id}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => setForcePattern(p.id)}
                          className={cn(
                            'px-2.5 py-1 rounded text-xs border',
                            forcePattern === p.id
                              ? 'bg-amber-500/20 border-amber-400 text-amber-100'
                              : 'border-white/10 text-slate-400 hover:border-white/25',
                          )}
                        >
                          {p.label}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-[200px] text-xs">
                        {p.description}
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="rounded border border-white/10 p-3 space-y-2">
                    <div className="text-xs uppercase tracking-wider text-slate-500">Primary / Heavy</div>
                    <div className="flex gap-2 items-center text-sm">
                      <span className="text-slate-400 w-16">Primary</span>
                      <select
                        className="bg-stone-900 border border-stone-700 rounded px-2 py-1 flex-1"
                        value={profile.primaryForce}
                        onChange={(e) =>
                          patchProfile({ primaryForce: e.target.value as ForcePatternId })
                        }
                      >
                        {FORCE_PATTERN_LIST.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-2 items-center text-sm">
                      <span className="text-slate-400 w-16">Heavy</span>
                      <select
                        className="bg-stone-900 border border-stone-700 rounded px-2 py-1 flex-1"
                        value={profile.heavyForce}
                        onChange={(e) =>
                          patchProfile({ heavyForce: e.target.value as ForcePatternId })
                        }
                      >
                        {FORCE_PATTERN_LIST.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="rounded border border-cyan-800/40 bg-cyan-950/20 p-3 font-mono text-xs space-y-1">
                    <div className="text-cyan-300/90 uppercase tracking-wider text-[10px]">
                      Impulse preview (facing +Z)
                    </div>
                    <div>vx {impulsePreview.vx.toFixed(2)}</div>
                    <div>vy {impulsePreview.vy.toFixed(2)} (knock-up / uppercut)</div>
                    <div>vz {impulsePreview.vz.toFixed(2)}</div>
                    <div>stagger {(impulsePreview.staggerChance * 100).toFixed(0)}%</div>
                    <div>
                      statuses:{' '}
                      {impulsePreview.applyStatusIds.length
                        ? impulsePreview.applyStatusIds.join(', ')
                        : '—'}{' '}
                      ×{impulsePreview.statusStacks}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tab === 'passives' && (
              <div className="space-y-3">
                <p className="text-sm text-slate-400">
                  Weapon passives stack on hit / equip. Prime every N hits for empowered skill-1.
                  Icons and stack rules match status SSOT where linked.
                </p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {Object.values(WEAPON_PASSIVES).map((p) => {
                    const active = profile.passiveIds.includes(p.id);
                    const onHit = p.onHitStatusId ? getStatusDef(p.onHitStatusId) : null;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          const set = new Set(profile.passiveIds);
                          if (set.has(p.id)) set.delete(p.id);
                          else set.add(p.id);
                          patchProfile({ passiveIds: [...set] });
                        }}
                        className={cn(
                          'text-left rounded border p-3 transition',
                          active
                            ? 'border-amber-500/50 bg-amber-500/10'
                            : 'border-white/10 hover:border-white/25 bg-black/20',
                        )}
                      >
                        <div className="flex gap-2 items-start">
                          <img
                            src={assetUrl(p.icon)}
                            alt=""
                            className="w-8 h-8 object-contain bg-black/40 rounded"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                          <div className="min-w-0">
                            <div className="font-medium text-sm text-amber-100">{p.name}</div>
                            <p className="text-[11px] text-slate-400 leading-snug">{p.description}</p>
                            <div className="text-[10px] text-slate-500 mt-1">
                              stacks {p.maxStacks} · prime every {p.primeEvery}
                              {onHit && ` · on-hit ${onHit.name}`}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {tab === 'status' && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={seedDemo}>
                    <Play className="w-3.5 h-3.5 mr-1" /> Seed demo set
                  </Button>
                  <Button size="sm" variant="outline" onClick={clearStatuses}>
                    <RotateCcw className="w-3.5 h-3.5 mr-1" /> Clear
                  </Button>
                  <span className="text-[10px] text-slate-500 self-center">
                    Live runtime → playerStatusEffects (same as in-game HUD)
                  </span>
                </div>
                <StatusGrid title="Buffs" defs={listBuffs()} onApply={applyStatus} />
                <StatusGrid title="Debuffs" defs={listDebuffs()} onApply={applyStatus} />
              </div>
            )}
          </section>

          {/* Side panel */}
          <aside className="space-y-3">
            <div className="rounded-lg border border-amber-800/30 bg-black/40 p-3">
              <div className="text-[10px] uppercase tracking-wider text-amber-500/80 mb-1">
                Active profile
              </div>
              <div className="font-cinzel text-amber-100 text-lg">{profile.displayName}</div>
              <div className="text-xs font-mono text-slate-500">{profile.weaponTypeId}</div>
              <div className="mt-2 grid grid-cols-2 gap-1 text-[11px] text-slate-400">
                <span>Holster</span>
                <span className="text-slate-200">{profile.holsterClass}</span>
                <span>Reach</span>
                <span className="text-slate-200">{profile.collider.reachM}m</span>
                <span>Primary</span>
                <span className="text-slate-200">{profile.primaryForce}</span>
                <span>Heavy</span>
                <span className="text-slate-200">{profile.heavyForce}</span>
                <span>Dmg scale</span>
                <span className="text-slate-200">{profile.damageScale}</span>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-black/40 p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] uppercase tracking-wider text-slate-500">
                  Active statuses
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {activeStatuses.length}
                </Badge>
              </div>
              {activeStatuses.length === 0 && (
                <p className="text-xs text-slate-600">None — apply from Buffs / Debuffs tab</p>
              )}
              <div className="flex flex-wrap gap-1.5">
                {activeStatuses.map((s) => {
                  const def = getStatusDef(s.statusId);
                  if (!def) return null;
                  return (
                    <Tooltip key={s.instanceId}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="relative"
                          onClick={() => playerStatusEffects.remove(s.statusId)}
                        >
                          <StatusIcon def={def} size={36} />
                          {s.stacks > 1 && (
                            <span className="absolute -bottom-0.5 -right-0.5 text-[9px] font-bold bg-black/90 text-amber-200 rounded px-0.5 min-w-[14px] text-center">
                              {s.stacks}
                            </span>
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="left">
                        <StatusTooltipCard def={def} />
                        <div className="text-[10px] text-slate-400 mt-1">
                          {s.remainingSec === Infinity
                            ? 'permanent'
                            : `${s.remainingSec.toFixed(1)}s left`}{' '}
                          · click to remove
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-black/40 p-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1">
                <Info className="w-3 h-3" /> Links
              </div>
              <div className="flex flex-col gap-1 text-xs">
                <a className="text-sky-400 hover:underline" href="/weapon-admin">
                  Weapon model admin (GLB upload)
                </a>
                <a className="text-sky-400 hover:underline" href="/weapon-skills">
                  Weapon skills
                </a>
                <a className="text-sky-400 hover:underline" href="/admin-combat">
                  Admin combat timeline
                </a>
                <a className="text-sky-400 hover:underline" href="/database">
                  Item database browser
                </a>
                <a className="text-sky-400 hover:underline" href="/arsenal">
                  Arsenal
                </a>
              </div>
            </div>

            <details className="rounded-lg border border-white/10 bg-black/40 p-3 text-[10px]">
              <summary className="cursor-pointer text-slate-400">Export profile JSON</summary>
              <pre className="mt-2 overflow-auto max-h-48 text-slate-500 whitespace-pre-wrap">
                {JSON.stringify(profile, null, 2)}
              </pre>
            </details>
          </aside>
        </main>
      </div>
    </TooltipProvider>
  );
}

function ItemCard({
  item,
  onPickWeapon,
}: {
  item: GrudaItem;
  onPickWeapon: (weaponType?: string) => void;
}) {
  const img = resolveItemImage(item);
  const isW = item.type === 'Weapon';
  return (
    <button
      type="button"
      onClick={() => {
        if (isW && item.weaponType) onPickWeapon(item.weaponType);
      }}
      className="flex gap-2 text-left rounded border border-white/10 bg-stone-900/50 hover:border-amber-600/40 p-2 transition"
    >
      <img
        src={img}
        alt=""
        className="w-12 h-12 object-contain bg-black/50 rounded"
        onError={(e) => {
          (e.target as HTMLImageElement).src = assetUrl('/icons/misc/Core.png');
        }}
      />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-slate-100 truncate">{item.name}</div>
        <div className="text-[10px] text-slate-500">
          T{item.tier} · {item.type}
          {item.weaponType ? ` · ${item.weaponType}` : ''}
          {item.material ? ` · ${item.material}` : ''}
        </div>
        {item.effects && item.effects.length > 0 && (
          <div className="text-[10px] text-amber-200/70 truncate">{item.effects[0]}</div>
        )}
      </div>
      {isW ? <Sword className="w-3.5 h-3.5 text-slate-600 shrink-0" /> : <Shield className="w-3.5 h-3.5 text-slate-600 shrink-0" />}
    </button>
  );
}

function StatusGrid({
  title,
  defs,
  onApply,
}: {
  title: string;
  defs: StatusEffectDef[];
  onApply: (id: string, stacks?: number) => void;
}) {
  return (
    <div>
      <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-2">{title}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
        {defs.map((def) => (
          <Tooltip key={def.id}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => onApply(def.id, 1)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onApply(def.id, Math.min(def.maxStacks, 3));
                }}
                className="flex items-center gap-2 rounded border border-white/10 bg-black/30 hover:border-white/30 px-2 py-1.5 text-left"
              >
                <StatusIcon def={def} size={28} />
                <span className="text-[11px] truncate" style={{ color: def.color }}>
                  {def.name}
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="border border-white/10 bg-stone-950">
              <StatusTooltipCard def={def} />
              <div className="text-[10px] text-slate-500 mt-1">LMB apply · RMB +3 stacks</div>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}

function Vec3Sliders({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: [number, number, number];
  min: number;
  max: number;
  step: number;
  onChange: (v: [number, number, number]) => void;
}) {
  const axes = ['X', 'Y', 'Z'] as const;
  return (
    <div className="space-y-2">
      <div className="text-xs text-slate-400">{label}</div>
      {axes.map((axis, i) => (
        <div key={axis} className="flex items-center gap-2">
          <span className="w-4 text-[10px] text-slate-500">{axis}</span>
          <Slider
            className="flex-1"
            value={[value[i]]}
            min={min}
            max={max}
            step={step}
            onValueChange={([v]) => {
              const next: [number, number, number] = [...value];
              next[i] = v;
              onChange(next);
            }}
          />
          <span className="w-12 text-right font-mono text-[10px] text-slate-400">
            {value[i].toFixed(3)}
          </span>
        </div>
      ))}
    </div>
  );
}
