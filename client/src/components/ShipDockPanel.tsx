/**
 * ShipDockPanel — build, select, board, and deploy to tactical ocean from RTS dock.
 */
import { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  SHIP_CATALOG,
  RTS_SOUTH_DOCK,
  type ShipSize,
} from '@shared/definitions/shipCatalog';
import {
  buildShipAtDock,
  ensureStarterShip,
  getActiveShip,
  loadRoster,
  setActiveShip,
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

  const active = useMemo(
    () => getActiveShip(accountId),
    [accountId, roster],
  );

  const refresh = () => setRoster(loadRoster(accountId));

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

  const handleOcean = () => {
    sessionStorage.setItem('grudge-ocean-account', accountId);
    setLocation('/ocean');
    onClose();
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
              Build · board · sail to open ocean
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
              Board {active?.name ?? 'Ship'} (lobby sail)
            </Button>
          )}
          <Button
            variant="outline"
            className="w-full border-indigo-600/60 text-indigo-200 hover:bg-indigo-950/50 text-xs"
            onClick={handleOcean}
            disabled={!active}
          >
            <Waves className="w-3.5 h-3.5 mr-1.5" />
            Set Sail — Tactical Ocean
          </Button>
        </div>
      </div>
    </div>
  );
}