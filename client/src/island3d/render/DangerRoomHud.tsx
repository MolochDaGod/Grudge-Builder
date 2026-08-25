/**
 * Danger Room combat overlay — crosshair + +/- MM readout + action bar.
 * Matches grudgecontroller/artifacts/animator HUD chrome.
 */
import type { CombatHudSnapshot } from '../player/combatHudState';
import { getSkillDisplay } from '@/lib/skillTreeData';
import './dangerRoomHud.css';

interface DangerRoomHudProps {
  hud: CombatHudSnapshot;
}

export function DangerRoomCrosshair({ hud }: DangerRoomHudProps) {
  if (!hud.crosshairVisible) return null;
  const gap = Math.max(0, Math.min(28, hud.spread));
  const rangeClass =
    hud.rangeState !== 'none' ? ` dr-ch-range dr-ch-range-${hud.rangeState}` : '';

  return (
    <div
      className="dr-crosshair dr-hud-root"
      style={{ ['--ch-gap' as string]: `${gap}px` }}
      aria-hidden
    >
      {hud.rangeState !== 'none' && <span className={rangeClass.trim()} />}
      <span className="dr-ch-dot" />
      <span className="dr-ch-line dr-ch-top" />
      <span className="dr-ch-line dr-ch-bottom" />
      <span className="dr-ch-line dr-ch-left" />
      <span className="dr-ch-line dr-ch-right" />
      {hud.hitMarker > 0 && (
        <span key={hud.hitMarker} className="dr-ch-hit">
          <span className="dr-ch-hit-line dr-ch-hit-tl" />
          <span className="dr-ch-hit-line dr-ch-hit-tr" />
          <span className="dr-ch-hit-line dr-ch-hit-bl" />
          <span className="dr-ch-hit-line dr-ch-hit-br" />
        </span>
      )}
    </div>
  );
}

export function DangerRoomHud({ hud }: DangerRoomHudProps) {
  if (!hud.combatMode) return null;

  return (
    <div className="dr-hud-root pointer-events-none absolute inset-0 z-30">
      {hud.focusEnabled && (
        <div className="dr-focus-badge">◎ Hard Focus — Strafe Lock</div>
      )}

      {hud.castName && (hud.castProgress ?? 0) > 0 && (hud.castProgress ?? 0) < 1 && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 w-64 pointer-events-none z-40">
          <div className="text-cyan-200/80 text-[10px] tracking-widest text-center mb-1 uppercase">
            {hud.castName}
          </div>
          <div className="h-1.5 bg-black/50 rounded-full overflow-hidden border border-cyan-400/30">
            <div
              className="h-full bg-cyan-400"
              style={{ width: `${Math.round((hud.castProgress ?? 0) * 100)}%` }}
            />
          </div>
        </div>
      )}
      {!!hud.enemyCasts?.length && (
        <div className="absolute top-24 left-4 w-52 space-y-1 pointer-events-none z-40">
          {hud.enemyCasts.slice(0, 4).map((e) => (
            <div key={e.id} className="bg-black/70 border border-red-500/40 rounded px-2 py-1">
              <div className="flex justify-between text-[10px] text-red-200">
                <span className="truncate">{e.name}</span>
                <span>{e.remainingSec.toFixed(1)}s</span>
              </div>
              <div className="h-1 bg-red-950 rounded-full overflow-hidden mt-0.5">
                <div className="h-full bg-red-500" style={{ width: `${Math.round(e.progress * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      <DangerRoomCrosshair hud={hud} />

      <div className="dr-mm-panel">
        <span>MM</span>
        <span className="dr-mm-value">{hud.motionLabel}</span>
        <span>·</span>
        <span>Hit {hud.comboStage + 1}</span>
        {hud.isDashing && <span className="dr-mm-dash">LUNGE</span>}
        {typeof hud.currentForm === 'number' && (
          <span className="dr-form-badge" title="Shift+F1/F2/F3 to switch special weapon forms (grimoire/wand/nimble/dual)">
            FORM {hud.currentForm + 1}
          </span>
        )}
      </div>

      <div className="dr-action-bar">
        <div className="dr-action-slot is-active" title="LMB combo">
          LMB
        </div>
        <div className="dr-action-slot" title="C: motion attack 2">
          C
        </div>
        <div className="dr-action-slot" title="Tab: soft-lock cycle">
          Tab
        </div>
        <div className="dr-action-slot" title="X: −50 retreat poke">
          X
        </div>
        <div className="dr-action-slot" title="F dodge">
          F
        </div>
        <div className="dr-action-slot" title="R block">
          R
        </div>
      </div>

      {hud.allyPickSkill && (
        <div className="dr-ally-pick" title="1 Self · 2–4 allies · 5 or Esc cancel">
          {hud.allyPickSkill.replace(/[_-]+/g, ' ')} — pick target
        </div>
      )}
      {hud.zonePickSkill && (
        <div className="dr-ally-pick dr-zone-pick" title="Look at ground · LMB place · Esc cancel">
          {hud.zonePickSkill.replace(/[_-]+/g, ' ')} — look at zone, click to plant
        </div>
      )}
      <div className={`dr-hotbar${hud.allyPickSkill ? ' is-ally-pick' : ''}`}>
        {[1,2,3,4,5].map(s => {
          const picking = !!hud.allyPickSkill;
          const pick = hud.allyPick?.find((p) => p.slot === s);
          const cancel = picking && s === 5;
          const emptyPick = picking && s <= 4 && !pick?.id;
          const disp = cancel
            ? { name: 'Cancel', icon: '' }
            : pick
              ? { name: pick.label, icon: '' }
              : getSkillDisplay(hud.actionBar?.[s]);
          const isActive = !picking && hud.lastUsedSlot === s;
          const cd = picking ? 0 : ((hud.cooldowns && hud.cooldowns[s]) || 0);
          const hp = pick?.hpFrac;
          return (
            <div
              key={s}
              className={[
                'dr-hotbar-slot',
                isActive ? 'dr-hotbar-slot-active' : '',
                cd > 0 ? 'on-cooldown' : '',
                picking && s <= 4 ? 'is-pick' : '',
                emptyPick ? 'is-pick-empty' : '',
                cancel ? 'is-pick-cancel' : '',
              ].filter(Boolean).join(' ')}
              title={
                picking
                  ? cancel
                    ? 'Cancel heal pick (5 / Esc)'
                    : pick?.id
                      ? `Cast on ${pick.label}`
                      : 'No ally in this slot'
                  : `Slot ${s} (key ${s}) — ${disp.name}`
              }
              onClick={() => {
                if (hud.combatMode) {
                  window.dispatchEvent(new KeyboardEvent('keydown', { key: String(s), bubbles: true }));
                }
              }}
              style={{ cursor: hud.combatMode ? 'pointer' : 'default' }}
            >
              <div className="slot-num">{s}</div>
              {disp.icon ? <div className="slot-icon">{disp.icon}</div> : null}
              <div className="slot-name">
                {disp.name.length > 9 ? disp.name.slice(0, 8) + '…' : disp.name}
              </div>
              {picking && pick?.id && hp != null && (
                <div className="slot-hp" style={{ width: `${Math.round(Math.max(0, Math.min(1, hp)) * 100)}%` }} />
              )}
              {cd > 0 && (
                <div className="slot-cd" style={{ height: `${Math.round(cd * 100)}%` }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}