/**
 * ShipDockPanel — build, select, board, and deploy to tactical ocean from RTS dock.
 */
import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  SHIP_CATALOG,
  RTS_SOUTH_DOCK,
  LONG_ROW_BOAT_HULL,
  type ShipSize,
} from '@shared/definitions/shipCatalog';
import { hasLearnedRecipe, getActiveCharacterId } from '@/lib/recipeLearn';
import {
  buildShipAtDock,
  ensureStarterShip,
  fetchRoster,
  getActiveShip,
  loadRoster,
  setActiveShip,
  syncRosterToServer,
  type PlayerShipRoster,
} from '@/lib/shipDockService';
import { Anchor, Hammer, Ship, Waves } from 'lucide-react';

interface ShipDockPanelProps {
  accountId: string;
  captainId: string | null;
  captainName?: string;
  onBoard: () => void;
  onClose: () => void;
  isBoarded?: boolean;
}

export function ShipDockPanel({
  accountId,
  captainId,
  captainName,
  onBoard,
  onClose,
  isBoarded,
}: ShipDockPanelProps) {
  const [, setLocation] = useLocation();
  const [roster, setRoster] = useState<PlayerShipRoster>(() => {
    ensureStarterShip(accountId, captainId);
    return loadRoster(accountId);
  });
  const [message, setMessage] = useState<string | null>(null);
  const [ssotSource, setSsotSource] = useState<'railway' | 'local' | 'loading'>('loading');

  // Railway SSOT: pull roster (or migrate localStorage once)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      ensureStarterShip(accountId, captainId);
      let r = await fetchRoster(accountId);
      if (r.ships.length === 0 || r.source === 'local') {
        r = await syncRosterToServer(accountId);
      }
      if (!cancelled) {
        setRoster(r);
        setSsotSource(r.source === 'railway' ? 'railway' : 'local');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accountId, captainId]);

  const active = useMemo(
    () => getActiveShip(accountId),
    [accountId, roster],
  );

  const refresh = async () => {
    const r = await fetchRoster(accountId);
    setRoster(r);
    setSsotSource(r.source === 'railway' ? 'railway' : 'local');
  };

  const handleBuild = (size: ShipSize) => {
    const entry = SHIP_CATALOG.find((e) => e.size === size)!;
    if (!entry.starterFree) {
      setMessage(`Cost: ${entry.craftGold}g · ${entry.craftWood} wood · ${entry.craftIron} iron · ${entry.craftCloth} cloth`);
    }
    const result = buildShipAtDock({
      accountId,
      captainId,
      size,
      dockId: RTS_SOUTH_DOCK.id,
      name: `${captainName || 'Captain'}'s ${entry.label}`,
    });
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setMessage(`Built ${result.ship.name}!`);
    refresh();
  };

  const handleSelect = (shipId: string) => {
    setActiveShip(accountId, shipId);
    refresh();
  };

  const ensureFleetAndGo = (path: string) => {
    // Always grant a free starter so ocean is never gated on empty roster
    ensureStarterShip(accountId, captainId);
    const ship = getActiveShip(accountId);
    sessionStorage.setItem('grudge-ocean-account', accountId);
    if (ship) sessionStorage.setItem('grudge-ocean-ship', ship.id);
    setLocation(path);
    onClose();
  };

  const handleOcean = () => {
    ensureFleetAndGo('/ocean?worldSeed=grudge-world-1');
  };

  const handleWorldMap = () => {
    ensureFleetAndGo('/world-map');
  };

  return (
    <div className="absolute bottom-24 left-4 z-30 w-80 pointer-events-auto">
      <div className="bg-black/85 backdrop-blur border border-cyan-700/50 rounded-xl p-4 shadow-2xl space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-cinzel font-bold text-cyan-200 flex items-center gap-2">
              <Anchor className="w-4 h-4" />
              {RTS_SOUTH_DOCK.label}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Craft boats · board · tactical ocean · world map
            </p>
            <p className="text-[9px] text-slate-500 mt-0.5">
              Fleet SSOT:{' '}
              {ssotSource === 'loading'
                ? '…'
                : ssotSource === 'railway'
                  ? 'Railway Postgres'
                  : 'local cache'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 text-xs"
          >
            ✕
          </button>
        </div>

        {message && (
          <p className="text-xs text-amber-200/90 bg-amber-950/40 rounded px-2 py-1">{message}</p>
        )}

        <div className="space-y-1.5">
          <p className="text-[10px] uppercase text-slate-500 tracking-wide">Your Fleet</p>
          {roster.ships.length === 0 && (
            <p className="text-xs text-slate-400">No ships — build a rowboat below.</p>
          )}
          {roster.ships.map((ship) => (
            <button
              key={ship.id}
              type="button"
              onClick={() => handleSelect(ship.id)}
              className={`w-full text-left px-2 py-1.5 rounded border text-xs ${
                active?.id === ship.id
                  ? 'border-cyan-500 bg-cyan-950/50 text-cyan-100'
                  : 'border-slate-700 bg-slate-900/50 text-slate-300 hover:border-slate-500'
              }`}
            >
              <span className="font-medium">{ship.name}</span>
              <Badge className="ml-2 text-[9px] bg-slate-800">{ship.size}</Badge>
              <span className="text-slate-500 ml-2">{ship.hp}/{ship.maxHp} HP</span>
            </button>
          ))}
        </div>

        <div className="space-y-1">
          <p className="text-[10px] uppercase text-slate-500 tracking-wide flex items-center gap-1">
            <Hammer className="w-3 h-3" /> Build at Dock
          </p>
          <div className="flex flex-wrap gap-1">
            {SHIP_CATALOG.map((entry) => (
              <Button
                key={entry.size}
                size="sm"
                variant="outline"
                className="text-[10px] h-7 border-slate-600"
                onClick={() => handleBuild(entry.size)}
              >
                {entry.label}
                {entry.starterFree && <span className="text-emerald-400 ml-1">Free</span>}
              </Button>
            ))}
            {(() => {
              const cid = getActiveCharacterId();
              const known = cid ? hasLearnedRecipe(cid, LONG_ROW_BOAT_HULL.unlockRecipeId) : false;
              return (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-[10px] h-7 border-amber-700"
                  disabled={!known}
                  title={
                    known
                      ? 'Craft Long Row Boat'
                      : 'Buy recipe from Stormfang Dock Master (Barbarian isle)'
                  }
                  onClick={() => {
                    if (!known) {
                      setMessage('Unlock the Long Row Boat recipe from the Barbarian Dock Master on Stormfang Isle.');
                      return;
                    }
                    const result = buildShipAtDock({
                      accountId,
                      captainId,
                      size: LONG_ROW_BOAT_HULL.size,
                      dockId: RTS_SOUTH_DOCK.id,
                      name: LONG_ROW_BOAT_HULL.label,
                    });
                    if (!result.ok) {
                      setMessage(result.error);
                      return;
                    }
                    setMessage(`Built ${result.ship.name}!`);
                    refresh();
                  }}
                >
                  {LONG_ROW_BOAT_HULL.label}
                  {!known && <span className="text-amber-400 ml-1">Recipe</span>}
                </Button>
              );
            })()}
          </div>
        </div>

        <div className="grid gap-1.5 pt-1">
          {!isBoarded && (
            <Button
              className="w-full bg-cyan-800 hover:bg-cyan-700 text-xs"
              onClick={() => { onBoard(); onClose(); }}
              disabled={!active}
            >
              <Ship className="w-3.5 h-3.5 mr-1.5" />
              Board {active?.name ?? 'Ship'} (lobby waters)
            </Button>
          )}
          <Button
            className="w-full bg-indigo-700 hover:bg-indigo-600 text-xs font-semibold"
            onClick={handleOcean}
            data-testid="dock-set-sail-ocean"
          >
            <Waves className="w-3.5 h-3.5 mr-1.5" />
            Set Sail — Tactical Ocean
          </Button>
          <Button
            variant="outline"
            className="w-full border-amber-600/50 text-amber-100 hover:bg-amber-950/40 text-xs"
            onClick={handleWorldMap}
            data-testid="dock-embark-world-map"
          >
            <Ship className="w-3.5 h-3.5 mr-1.5" />
            Embark — 9-Sector World Map
          </Button>
        </div>
      </div>
    </div>
  );
}