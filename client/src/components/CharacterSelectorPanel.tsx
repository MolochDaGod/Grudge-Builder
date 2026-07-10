/**
 * CharacterSelectorPanel
 *
 * Displays all characters owned by the logged-in player as a selectable grid.
 * Uses useCharacters() hook which polls the Grudge backend every 60s.
 * Selecting a character updates CharacterManager and fires a custom DOM event
 * so the crafting iframe (and any other listener) gets notified immediately.
 */

import React from 'react';
import { Link } from 'wouter';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sword, Star, Hammer, RefreshCw, PlusCircle } from 'lucide-react';
import { useCharacters } from '@/hooks/use-characters';
import { RACES, CLASSES, FACTION_COLORS } from '@/lib/gameData';
import { getRacePortrait, getClassHeroImage } from '@/lib/artAssets';
import type { Character } from '@/lib/characterManager';

// ── Helpers ────────────────────────────────────────────────────────────────────

function getRaceName(id: string) {
  return RACES.find(r => r.id === id)?.name ?? id;
}

function getClassName(id: string) {
  return CLASSES.find(c => c.id === id)?.name ?? id;
}

function getCharacterPortrait(char: Character): string {
  if (char.avatarUrl) return char.avatarUrl;
  const classHero = getClassHeroImage(char.classId);
  if (classHero) return classHero;
  return getRacePortrait(char.raceId);
}

/** Portrait specifically for onError fallback — never recurse */
function getPortraitFallback(char: Character): string {
  return getRacePortrait(char.raceId);
}

function getFactionColor(raceId: string) {
  const race = RACES.find(r => r.id === raceId);
  return race ? FACTION_COLORS[race.faction] : FACTION_COLORS.Crusade;
}

// ── CharacterCard ──────────────────────────────────────────────────────────────

interface CharacterCardProps {
  character: Character;
  isActive:  boolean;
  onSelect:  (id: string) => void;
  label?:    string;  // e.g. "Select for Crafting"
}

function CharacterCard({ character: c, isActive, onSelect, label = 'Select' }: CharacterCardProps) {
  const fc = getFactionColor(c.raceId);
  const hpMax = (c.attributes?.Vitality ?? 10) * 25 + 100;
  const hp    = Math.min(c.hp ?? hpMax, hpMax);
  const energy = Math.min(c.energy ?? 50, 100);

  return (
    <div
      onClick={() => onSelect(c.id)}
      className={[
        'relative cursor-pointer rounded-xl border-2 transition-all p-3',
        'bg-black/40 hover:bg-black/60 hover:scale-[1.02]',
        isActive
          ? 'border-amber-400 shadow-lg shadow-amber-500/30 scale-[1.02]'
          : `border-slate-700 hover:border-slate-500`,
      ].join(' ')}
    >
      {/* Active badge */}
      {isActive && (
        <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-xs px-2 py-0 z-10">
          ✦ Active
        </Badge>
      )}

      {/* Portrait */}
      <div className="relative w-full aspect-square mb-2 overflow-hidden rounded-lg bg-slate-800">
        <img
          src={getCharacterPortrait(c)}
          alt={c.name}
          className="w-full h-full object-cover object-top"
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            // Only try the race fallback once — avoid infinite loop
            const fallback = getPortraitFallback(c);
            if (img.src !== fallback) img.src = fallback;
          }}
        />
        {/* Level badge */}
        <div className="absolute bottom-1 right-1 bg-black/80 rounded px-1.5 py-0.5 text-xs font-bold text-amber-300">
          Lv {c.level}
        </div>
      </div>

      {/* Name + race/class + grudge code */}
      <div className="text-center mb-2">
        <div className="font-cinzel font-bold text-white text-sm truncate">{c.name}</div>
        <div className={`text-xs ${fc.text}`}>
          {getRaceName(c.raceId)} · {getClassName(c.classId)}
        </div>
        {c.grudgeCode && (
          <div className="font-mono text-[9px] text-amber-500/70 mt-0.5 truncate" title={c.grudgeCode}>
            {c.grudgeCode}
          </div>
        )}
      </div>

      {/* HP bar */}
      <div className="mb-1">
        <div className="flex justify-between text-xs text-slate-500 mb-0.5">
          <span>HP</span>
          <span>{hp}/{hpMax}</span>
        </div>
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-red-700 to-red-500 rounded-full transition-all"
            style={{ width: `${Math.max(0, (hp / hpMax) * 100)}%` }}
          />
        </div>
      </div>

      {/* Energy bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-slate-500 mb-0.5">
          <span>Energy</span>
          <span>{energy}/100</span>
        </div>
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-yellow-700 to-yellow-400 rounded-full transition-all"
            style={{ width: `${energy}%` }}
          />
        </div>
      </div>

      {/* Profession quick-view (top 2 professions) */}
      {c.professionLevels && Object.keys(c.professionLevels).length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2 justify-center">
          {Object.entries(c.professionLevels)
            .sort(([, a], [, b]) => b.level - a.level)
            .slice(0, 2)
            .map(([prof, data]) => (
              <span key={prof} className="text-xs bg-slate-800 text-slate-300 rounded px-1.5 py-0.5">
                {prof.charAt(0).toUpperCase() + prof.slice(1)} {data.level}
              </span>
            ))}
        </div>
      )}

      {/* Select button */}
      <Button
        size="sm"
        className={[
          'w-full text-xs h-7',
          isActive
            ? 'bg-amber-600 hover:bg-amber-500 text-black font-bold'
            : 'bg-slate-700 hover:bg-slate-600 text-white',
        ].join(' ')}
        onClick={(e) => { e.stopPropagation(); onSelect(c.id); }}
      >
        {isActive ? (
          <><Hammer className="w-3 h-3 mr-1" /> Crafting</>
        ) : (
          <><Star className="w-3 h-3 mr-1" /> {label}</>
        )}
      </Button>
    </div>
  );
}

// ── CharacterSelectorPanel ─────────────────────────────────────────────────────

interface CharacterSelectorPanelProps {
  /** Label shown on non-active cards' select button */
  selectLabel?: string;
  /** Max cards per row in the grid (default: 3) */
  columns?: 2 | 3 | 4;
  /** Compact mode — smaller cards, no energy bar, no professions */
  compact?: boolean;
  /** Callback fired when user selects a character */
  onSelected?: (characterId: string) => void;
}

export default function CharacterSelectorPanel({
  selectLabel = 'Select',
  columns = 3,
  compact = false,
  onSelected,
}: CharacterSelectorPanelProps) {
  const { characters, loading, error, activeId, setActive, refetch } = useCharacters();

  const handleSelect = (id: string) => {
    setActive(id);

    // Fire DOM event — any listener (e.g. the crafting page) can catch this
    window.dispatchEvent(new CustomEvent('grudge:character:selected', { detail: { characterId: id } }));

    onSelected?.(id);
  };

  const colClass = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 sm:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
  }[columns];

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-slate-400">
        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
        Loading characters...
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className="text-center py-6">
        <p className="text-red-400 text-sm mb-3">{error}</p>
        <Button size="sm" variant="outline" onClick={refetch} className="border-slate-700 text-slate-300">
          <RefreshCw className="w-4 h-4 mr-2" /> Retry
        </Button>
      </div>
    );
  }

  // ── Empty state ──
  if (characters.length === 0) {
    return (
      <div className="text-center py-8 space-y-4">
        <Sword className="w-10 h-10 text-slate-600 mx-auto" />
        <div>
          <p className="text-slate-400 text-sm">You have no characters yet.</p>
          <p className="text-slate-500 text-xs mt-1">Create one to start crafting and adventuring.</p>
        </div>
        <Link href="/character">
          <Button size="sm" className="bg-amber-700 hover:bg-amber-600 text-white">
            <PlusCircle className="w-4 h-4 mr-2" /> Create Character
          </Button>
        </Link>
      </div>
    );
  }

  // ── Character grid ──
  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-slate-500 uppercase tracking-wider">
          {characters.length} character{characters.length !== 1 ? 's' : ''}
        </span>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs text-slate-400 hover:text-amber-400"
          onClick={refetch}
        >
          <RefreshCw className="w-3 h-3 mr-1" /> Sync
        </Button>
      </div>

      <div className={`grid ${colClass} gap-3`}>
        {characters.map(c => (
          <CharacterCard
            key={c.id}
            character={c}
            isActive={c.id === activeId}
            onSelect={handleSelect}
            label={selectLabel}
          />
        ))}

        {/* Add character card */}
        <Link href="/character">
          <div className="rounded-xl border-2 border-dashed border-slate-700 hover:border-amber-700/50 transition-all cursor-pointer flex flex-col items-center justify-center p-4 min-h-[180px] text-slate-600 hover:text-amber-500">
            <PlusCircle className="w-8 h-8 mb-2" />
            <span className="text-xs font-medium">New Character</span>
          </div>
        </Link>
      </div>
    </div>
  );
}
