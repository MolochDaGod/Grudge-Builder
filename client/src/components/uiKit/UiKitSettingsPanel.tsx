/**
 * UiKitSettingsPanel — craftpix Game Menu / Slider / Toggle chrome for play settings.
 * Assets: ui.grudge-studio.com craftpix (Game Menu, Slider, Window, Toggles).
 */
import type { CSSProperties, ReactNode } from 'react';
import { UI_MENU, UI_CONTROLS, UI_FRAMES } from '@/lib/uiKit/craftpixAssets';

export type GraphicsQuality = 'low' | 'medium' | 'high';
export type OceanQuality = 'off' | 'low' | 'high';

export interface PlayGraphicsSettings {
  graphics: GraphicsQuality;
  ocean: OceanQuality;
  shadows: boolean;
  postFx: boolean;
}

export const DEFAULT_PLAY_GRAPHICS: PlayGraphicsSettings = {
  graphics: 'medium',
  ocean: 'high',
  shadows: true,
  postFx: true,
};

export interface UiKitSettingsPanelProps {
  open: boolean;
  onClose: () => void;
  value: PlayGraphicsSettings;
  onChange: (next: PlayGraphicsSettings) => void;
  title?: string;
  className?: string;
  footer?: ReactNode;
}

export function UiKitSettingsPanel({
  open,
  onClose,
  value,
  onChange,
  title = 'Settings',
  className = '',
  footer,
}: UiKitSettingsPanelProps) {
  if (!open) return null;

  const panelStyle = {
    '--uikit-panel-bg': `url(${UI_MENU.gameMenuBg})`,
    '--uikit-window-bg': `url(${UI_FRAMES.windowBackground})`,
  } as CSSProperties;

  const patch = (p: Partial<PlayGraphicsSettings>) => onChange({ ...value, ...p });

  return (
    <div className={`uikit-settings-root pointer-events-auto ${className}`} style={panelStyle}>
      <button type="button" className="uikit-settings-backdrop" aria-label="Close settings" onClick={onClose} />
      <div className="uikit-settings-panel" role="dialog" aria-label={title}>
        <header className="uikit-settings-header">
          <img src={UI_MENU.settingsIcon} alt="" width={28} height={28} className="uikit-settings-icon" />
          <h2>{title}</h2>
          <button type="button" className="uikit-settings-close" onClick={onClose} title="Close">
            ✕
          </button>
        </header>

        <section className="uikit-settings-section">
          <h3>Graphics</h3>
          <div className="uikit-settings-row">
            <span>Quality</span>
            <div className="uikit-settings-pills">
              {(['low', 'medium', 'high'] as GraphicsQuality[]).map((q) => (
                <button
                  key={q}
                  type="button"
                  className={`uikit-pill ${value.graphics === q ? 'is-active' : ''}`}
                  onClick={() => patch({ graphics: q })}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
          <div className="uikit-settings-row">
            <span>Ocean polish</span>
            <div className="uikit-settings-pills">
              {(['off', 'low', 'high'] as OceanQuality[]).map((q) => (
                <button
                  key={q}
                  type="button"
                  className={`uikit-pill ${value.ocean === q ? 'is-active' : ''}`}
                  onClick={() => patch({ ocean: q })}
                  title={
                    q === 'off'
                      ? 'Gerstner only'
                      : q === 'low'
                        ? 'No dual-pass reflect'
                        : 'Reflect + refract + maps'
                  }
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
          <ToggleRow
            label="Shadows"
            checked={value.shadows}
            onChange={(shadows) => patch({ shadows })}
          />
          <ToggleRow
            label="Post FX"
            checked={value.postFx}
            onChange={(postFx) => patch({ postFx })}
          />
        </section>

        <p className="uikit-settings-hint">
          Ocean high = reflection/refraction RTs · low = waves only · craftpix chrome from
          ui.grudge-studio.com
        </p>
        {footer}
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="uikit-settings-row">
      <span>{label}</span>
      <button
        type="button"
        className={`uikit-toggle ${checked ? 'is-on' : ''}`}
        style={
          {
            '--uikit-toggle-bg': `url(${UI_CONTROLS.toggleBg})`,
            '--uikit-toggle-knob': `url(${UI_CONTROLS.toggleOn})`,
          } as CSSProperties
        }
        onClick={() => onChange(!checked)}
        aria-pressed={checked}
      >
        <i />
      </button>
    </div>
  );
}

export default UiKitSettingsPanel;
