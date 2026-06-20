/**
 * WeaponSkillsPage ΓÇö the canonical weapon skills reference.
 *
 * Source of truth: shared/definitions/weaponDatabase.ts
 * Icons: assets.grudge-studio.com/icons/pack/weapons/
 * Style: medieval theme matching grudge-objectstore.pages.dev/WEAPON_SKILLS
 *
 * Route: /weapon-skills (also intended for info.grudge-studio.com/weaponskills)
 */
import { useState, useMemo } from 'react';
import { WEAPON_TYPES, type WeaponType, type Weapon } from '@shared/definitions/weaponDatabase';
import { ASSET_CDN_BASE } from '@/lib/assetConfig';

// ΓöÇΓöÇ Icon mapping ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

const WEAPON_ICONS: Record<string, string> = {
  SWORD:    `${ASSET_CDN_BASE}/icons/pack/weapons/sword_01.png`,
  AXE:      `${ASSET_CDN_BASE}/icons/pack/weapons/axe_01.png`,
  BOW:      `${ASSET_CDN_BASE}/icons/pack/weapons/bow_01.png`,
  CROSSBOW: `${ASSET_CDN_BASE}/icons/pack/weapons/crossbow_01.png`,
  DAGGER:   `${ASSET_CDN_BASE}/icons/pack/weapons/dagger_01.png`,
  GUN:      `${ASSET_CDN_BASE}/icons/pack/weapons/crossbow_01.png`, // fallback until gun icon uploaded
  STAFF:    `${ASSET_CDN_BASE}/icons/pack/weapons/spear_01.png`,    // fallback
  SHIELD:   `${ASSET_CDN_BASE}/icons/pack/weapons/shield_01.png`,
  SPEAR:    `${ASSET_CDN_BASE}/icons/pack/weapons/spear_01.png`,
  LANCE:    `${ASSET_CDN_BASE}/icons/pack/weapons/spear_01.png`,
  HAMMER:   `${ASSET_CDN_BASE}/icons/pack/weapons/hammer_01.png`,
  MACE:     `${ASSET_CDN_BASE}/icons/pack/weapons/hammer_01.png`,   // fallback
  SCYTHE:   `${ASSET_CDN_BASE}/icons/pack/weapons/scythe_01.png`,
};

const WEAPON_EMOJI: Record<string, string> = {
  SWORD: 'ΓÜö∩╕Å', AXE: '≡ƒ¬ô', BOW: '≡ƒÅ╣', CROSSBOW: '≡ƒÄ»', DAGGER: '≡ƒùí∩╕Å',
  GUN: '≡ƒö½', STAFF: '≡ƒ¬ä', SHIELD: '≡ƒ¢í∩╕Å', SPEAR: '≡ƒö▒', LANCE: '≡ƒö▒',
  HAMMER: '≡ƒö¿', MACE: '≡ƒö¿', SCYTHE: 'ΓÜö∩╕Å', WAND: 'Γ£¿', TOME: '≡ƒôû',
  WHIP: 'Γ¢ô∩╕Å', FIST: '≡ƒæè', GREATSWORD: 'ΓÜö∩╕Å',
};

const SLOT_COLORS: Record<string, string> = {
  hotkey1: '#f6c945', // gold ΓÇö primary
  hotkey2: '#6aa9ff', // blue ΓÇö secondary
  hotkey3: '#6bdc8b', // green ΓÇö ability
  hotkey4: '#c792ff', // purple ΓÇö ultimate
  passive: '#ff6b57', // red ΓÇö passive
};

const SLOT_LABELS: Record<string, string> = {
  hotkey1: '1 PRIMARY',
  hotkey2: '2 SECONDARY',
  hotkey3: '3 ABILITY',
  hotkey4: '4 ULTIMATE',
  passive: 'PASSIVE',
};

// ΓöÇΓöÇ Component ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export default function WeaponSkillsPage() {
  const weaponTypeList = useMemo(() => Object.values(WEAPON_TYPES), []);
  const [selectedType, setSelectedType] = useState<string>(weaponTypeList[0]?.id || 'SWORD');
  const [selectedWeaponIdx, setSelectedWeaponIdx] = useState(0);

  const activeType = WEAPON_TYPES[selectedType];
  const activeWeapon = activeType?.weapons[selectedWeaponIdx];

  return (
    <div className="min-h-screen text-white" style={{
      background: 'linear-gradient(180deg, #0a0a0f 0%, #12101a 40%, #0d0b14 100%)',
      fontFamily: "'Cinzel', 'Inter', serif",
    }}>
      {/* Header */}
      <header className="border-b border-amber-900/30 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-[6px] bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500 bg-clip-text text-transparent">
              WEAPON SKILLS
            </h1>
            <p className="text-white/30 text-xs tracking-wider mt-1">Grudge Warlords ΓÇö Combat Reference</p>
          </div>
          <a href="/arsenal" className="text-white/30 hover:text-amber-400 text-sm transition-colors">
            ΓåÉ Arsenal
          </a>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Weapon type selector */}
        <div className="flex flex-wrap gap-2 mb-8">
          {weaponTypeList.map(wt => (
            <button
              key={wt.id}
              onClick={() => { setSelectedType(wt.id); setSelectedWeaponIdx(0); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${
                selectedType === wt.id
                  ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 shadow-lg shadow-amber-500/10'
                  : 'border-white/10 text-white/50 hover:border-white/20 hover:text-white/80'
              }`}
            >
              <img
                src={WEAPON_ICONS[wt.id]}
                alt={wt.name}
                className="w-6 h-6 object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <span className="text-sm font-bold tracking-wider">{wt.name}</span>
              <span className="text-xs opacity-40">{wt.icon}</span>
            </button>
          ))}
        </div>

        {activeType && (
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
            {/* Left: weapon variants */}
            <div className="space-y-2">
              <h2 className="text-amber-400/60 text-xs font-bold tracking-[3px] mb-3">
                {activeType.name.toUpperCase()} VARIANTS
              </h2>
              {activeType.weapons.map((weapon, idx) => (
                <button
                  key={weapon.id}
                  onClick={() => setSelectedWeaponIdx(idx)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                    selectedWeaponIdx === idx
                      ? 'bg-amber-500/10 border-amber-500/40 text-white'
                      : 'border-white/5 text-white/50 hover:border-white/15 hover:text-white/80'
                  }`}
                >
                  <div className="font-bold text-sm">{weapon.name}</div>
                  <div className="text-[10px] text-white/30 mt-0.5 italic">{weapon.lore}</div>
                </button>
              ))}
            </div>

            {/* Right: selected weapon detail */}
            {activeWeapon && (
              <div>
                {/* Weapon header */}
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-16 h-16 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                    <img
                      src={WEAPON_ICONS[activeType.id]}
                      alt={activeType.name}
                      className="w-10 h-10 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).parentElement!.innerHTML = `<span class="text-3xl">${WEAPON_EMOJI[activeType.id] || 'ΓÜö∩╕Å'}</span>`;
                      }}
                    />
                  </div>
                  <div>
                    <h2 className="text-xl font-black tracking-wider">{activeWeapon.name}</h2>
                    <p className="text-white/40 text-sm italic mt-0.5">{activeWeapon.lore}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-white/40 uppercase tracking-wider">
                        {activeType.category}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stats bar */}
                <div className="grid grid-cols-6 gap-2 mb-6">
                  {Object.entries(activeWeapon.stats).map(([stat, val]) => (
                    <div key={stat} className="bg-white/[0.03] rounded-lg p-2.5 border border-white/5 text-center">
                      <div className="text-amber-400 text-lg font-bold">{val.base}</div>
                      <div className="text-[9px] text-white/30 uppercase tracking-wider">{stat}</div>
                      <div className="text-[8px] text-green-400/50">+{val.perTier}/tier</div>
                    </div>
                  ))}
                </div>

                {/* Skill slots */}
                <div className="space-y-4">
                  {/* Hotkey 1 ΓÇö Primary (single skill) */}
                  <SkillSlot
                    slotKey="hotkey1"
                    skills={[activeWeapon.skills.hotkey1]}
                    weaponIcon={WEAPON_ICONS[activeType.id]}
                  />

                  {/* Hotkey 2 ΓÇö Secondary (choose 1 of 3) */}
                  <SkillSlot
                    slotKey="hotkey2"
                    skills={activeWeapon.skills.hotkey2}
                    weaponIcon={WEAPON_ICONS[activeType.id]}
                  />

                  {/* Hotkey 3 ΓÇö Ability (choose 1 of 3-4) */}
                  <SkillSlot
                    slotKey="hotkey3"
                    skills={activeWeapon.skills.hotkey3}
                    weaponIcon={WEAPON_ICONS[activeType.id]}
                  />

                  {/* Hotkey 4 ΓÇö Ultimate (single skill) */}
                  <SkillSlot
                    slotKey="hotkey4"
                    skills={[activeWeapon.skills.hotkey4]}
                    weaponIcon={WEAPON_ICONS[activeType.id]}
                  />

                  {/* Passives */}
                  <SkillSlot
                    slotKey="passive"
                    skills={activeWeapon.skills.passive}
                    weaponIcon={WEAPON_ICONS[activeType.id]}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ΓöÇΓöÇ Skill Slot Component ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

interface SkillSlotProps {
  slotKey: string;
  skills: Array<{ name: string; description: string }>;
  weaponIcon: string;
}

function SkillSlot({ slotKey, skills, weaponIcon }: SkillSlotProps) {
  const color = SLOT_COLORS[slotKey] || '#888';
  const label = SLOT_LABELS[slotKey] || slotKey;
  const isChoice = skills.length > 1;

  return (
    <div className="rounded-xl border border-white/5 overflow-hidden" style={{ borderLeftColor: color, borderLeftWidth: 3 }}>
      {/* Slot header */}
      <div className="flex items-center justify-between px-4 py-2 bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold tracking-[3px] uppercase" style={{ color }}>
            {label}
          </span>
          {isChoice && (
            <span className="text-[9px] text-white/20 bg-white/5 px-1.5 py-0.5 rounded">
              Choose 1 of {skills.length}
            </span>
          )}
        </div>
      </div>

      {/* Skills grid */}
      <div className={`grid gap-0 ${isChoice ? `grid-cols-${Math.min(skills.length, 4)}` : 'grid-cols-1'}`}
        style={{ gridTemplateColumns: isChoice ? `repeat(${Math.min(skills.length, 4)}, 1fr)` : '1fr' }}
      >
        {skills.map((skill, i) => (
          <div
            key={i}
            className={`px-4 py-3 ${isChoice ? 'border-r border-white/5 last:border-r-0' : ''} hover:bg-white/[0.02] transition-colors`}
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: `${color}15`, border: `1px solid ${color}30` }}
              >
                <img
                  src={weaponIcon}
                  alt=""
                  className="w-5 h-5 object-contain opacity-60"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-white/90">{skill.name}</div>
                <div className="text-[11px] text-white/40 mt-0.5 leading-relaxed">{skill.description}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
