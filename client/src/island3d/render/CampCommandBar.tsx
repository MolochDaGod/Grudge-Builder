/**
 * CampCommandBar — F1–F5 unit orders when near a player-owned camp with Claim Flag garrison.
 *
 * F1 Defend · F2 Follow (party) · F3 Go Home · F4 Attack · F5 Group On Me
 * Also starts IslandDefenceDirector (auto-garrison / auto-defend).
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { Flag, Shield, Users, Home, Swords, Crosshair } from 'lucide-react';
import { CAMP_UNIT_ORDERS, type CampUnitOrderId } from '@shared/definitions/campUnits';
import type { Island3DEngine } from '../engine/Island3DEngine';
import { IslandDefenceDirector } from '../systems/IslandDefenceDirector';

const ICONS: Record<CampUnitOrderId, typeof Shield> = {
  defend_camp: Shield,
  follow: Users,
  go_home: Home,
  attack: Swords,
  group_on_me: Crosshair,
};

export interface CampCommandBarProps {
  engine: Island3DEngine | null;
  /** Poll near-camp every N ms */
  pollMs?: number;
}

export function CampCommandBar({ engine, pollMs = 400 }: CampCommandBarProps) {
  const [visible, setVisible] = useState(false);
  const [activeOrder, setActiveOrder] = useState<CampUnitOrderId | null>(null);
  const [unitCount, setUnitCount] = useState(0);
  const [professions, setProfessions] = useState<string[]>([]);
  const [craftMsg, setCraftMsg] = useState<string | null>(null);
  const [defenceLine, setDefenceLine] = useState<string | null>(null);
  const directorRef = useRef<IslandDefenceDirector | null>(null);

  useEffect(() => {
    if (!engine) return;
    const director = new IslandDefenceDirector({ engine });
    director.start();
    directorRef.current = director;
    let last = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.25, (now - last) / 1000);
      last = now;
      director.update(dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      director.stop();
      directorRef.current = null;
    };
  }, [engine]);

  useEffect(() => {
    if (!engine) return;
    const tick = () => {
      const near = engine.isNearOwnedCamp(48);
      setVisible(near);
      if (near && engine.campUnits) {
        setUnitCount(engine.campUnits.getUnits().filter((u) => {
          const camp = engine.campUnits!.findNearestOwnedCamp(48);
          return camp && u.campId === camp.data.id;
        }).length);
        setProfessions(
          engine.campUnits.getCampProfessions().map((p) => p.label),
        );
        setActiveOrder(engine.campUnits.getLastOrder());
      }
      const snap = directorRef.current?.snapshot();
      if (snap?.lastEvent) setDefenceLine(snap.lastEvent);
    };
    tick();
    const id = window.setInterval(tick, pollMs);
    return () => window.clearInterval(id);
  }, [engine, pollMs]);

  const issue = useCallback(
    (orderId: CampUnitOrderId) => {
      if (!engine) return;
      const ok = engine.issueCampOrder(orderId);
      if (ok) setActiveOrder(orderId);
    },
    [engine],
  );

  useEffect(() => {
    if (!engine) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.shiftKey) return;
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      const key = e.key.toUpperCase();
      if (!/^F[1-5]$/.test(key)) return;
      if (!engine.isNearOwnedCamp(48)) return;
      const handled = engine.campUnits?.handleHotkey(key, false);
      if (handled) {
        e.preventDefault();
        setActiveOrder(engine.campUnits?.getLastOrder() ?? null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [engine]);

  const craft = useCallback(() => {
    if (!engine) return;
    const r = engine.craftAtOwnedCamp('camp');
    if (r.ok) {
      setCraftMsg(`+${r.xp} profession XP`);
      window.setTimeout(() => setCraftMsg(null), 2000);
    } else {
      setCraftMsg(r.reason ?? 'Cannot craft');
      window.setTimeout(() => setCraftMsg(null), 2000);
    }
  }, [engine]);

  if (!visible || !engine) return null;

  return (
    <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-50 pointer-events-auto flex flex-col items-center gap-1.5">
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border backdrop-blur-md"
        style={{
          background: 'rgba(12, 18, 12, 0.92)',
          borderColor: 'rgba(74, 222, 128, 0.35)',
        }}
      >
        <Flag className="w-3.5 h-3.5 text-emerald-400" />
        <span className="text-emerald-300 text-[11px] font-bold tracking-wide font-cinzel">
          Owned Camp
        </span>
        <span className="text-white/35 text-[10px]">
          {unitCount} unit{unitCount === 1 ? '' : 's'}
        </span>
        {defenceLine && (
          <span className="text-emerald-200/70 text-[10px]">{defenceLine}</span>
        )}
        {professions.length > 0 && (
          <button
            type="button"
            onClick={craft}
            className="ml-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25"
            title="Craft at camp bench — profession XP"
          >
            Craft @ Bench
          </button>
        )}
        {craftMsg && (
          <span className="text-amber-200/80 text-[10px]">{craftMsg}</span>
        )}
      </div>

      <div
        className="flex gap-1 p-1.5 rounded-2xl border backdrop-blur-md"
        style={{
          background: 'rgba(8, 12, 10, 0.94)',
          borderColor: 'rgba(74, 222, 128, 0.3)',
        }}
      >
        {CAMP_UNIT_ORDERS.map((order) => {
          const Icon = ICONS[order.id];
          const active = activeOrder === order.id;
          return (
            <button
              key={order.id}
              type="button"
              onClick={() => issue(order.id)}
              title={`${order.label} [${order.hotkey}] — ${order.description}`}
              className={`flex flex-col items-center gap-0.5 min-w-[64px] px-2 py-1.5 rounded-xl transition-all border ${
                active
                  ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-100 shadow-[0_0_12px_rgba(52,211,153,0.25)]'
                  : 'border-transparent text-white/45 hover:text-white/80 hover:bg-white/5'
              }`}
            >
              <span className="text-[9px] font-mono text-emerald-400/70">{order.hotkey}</span>
              <Icon className="w-4 h-4" />
              <span className="text-[9px] font-bold uppercase tracking-wide">
                {order.shortLabel}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-[9px] text-white/25 text-center max-w-md">
        Claim Flag spawns unarmed race recruits · towers train T0 weapons & skills · benches raise
        profession level · auto-defend on raid
      </p>
    </div>
  );
}

export default CampCommandBar;
