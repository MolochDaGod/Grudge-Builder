/**
 * Danger Room combat overlay — crosshair + +/- MM readout + action bar.
 * Matches grudgecontroller/artifacts/animator HUD chrome.
 */
import type { CombatHudSnapshot } from '../player/combatHudState';
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
        <div className="dr-action-slot" title="Z: +100→−50 lunge">
          Z
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

      {/* Production Hotbar Slots 1-5 - like uMMORPG Grudge Warlords. Assign in /skill-tree, use keys 1-5 in combat. Form changes for grimoire etc. */}
      <div className="dr-hotbar">
        {[1,2,3,4,5].map(s => (
          <div key={s} className="dr-hotbar-slot" title={`Slot ${s} (key ${s}) - ${hud.actionBar?.[s] || 'empty'} (form ${hud.currentForm ?? 0})`}>
            {s}: { (hud.actionBar?.[s] || '').slice(0,8) || '---' }
          </div>
        ))}
      </div>
    </div>
  );
}