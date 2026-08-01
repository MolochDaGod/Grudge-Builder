/**
 * Craftpix UI assets hosted on ui.grudge-studio.com (Game UI Kit).
 * Use for frames, action slots, equipment slots, inventory, skill icons.
 */
import { UI_STUDIO_ORIGIN } from './uiStudioConfig';

const CPX = `${UI_STUDIO_ORIGIN}/assets/craftpix`;

function enc(path: string): string {
  return path
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/');
}

export function craftpixUrl(...parts: string[]): string {
  return `${CPX}/${parts.map(enc).join('/')}`;
}

/** Unit frames (player / target) */
export const UI_FRAMES = {
  unitBackground: craftpixUrl('Unit Frames', 'Main', 'UnitFrame_Background.png'),
  unitElite: craftpixUrl('Unit Frames', 'Main', 'UnitFrame_Elite.png'),
  unitRedBorder: craftpixUrl('Unit Frames', 'Main', 'UnitFrame_Red_Border.png'),
  windowBackground: craftpixUrl('Window', 'Window_Background.png'),
  windowHeader: craftpixUrl('Window', 'Window_Header_Background.png'),
  modalBackground: craftpixUrl('Modal Box', 'ModalBox_Background.png'),
  tooltipBackground: craftpixUrl('Tooltip', 'Tooltip_Background.png'),
  notification: craftpixUrl('Notifications', 'Notification_Background.png'),
  minimap: craftpixUrl('Minimap', 'Minimap_Background.png'),
  actionBarBg: craftpixUrl('Action Bar', 'ActionBar_Main_Background.png'),
} as const;

/** Action / inventory / equipment slots */
export const UI_SLOTS = {
  actionBg: craftpixUrl('Action Bar', 'Slots', 'ActionBar_Slot_Background.png'),
  actionHover: craftpixUrl('Action Bar', 'Slots', 'ActionBar_Slot_Hover.png'),
  actionPress: craftpixUrl('Action Bar', 'Slots', 'ActionBar_Slot_Press.png'),
  actionEmpty: craftpixUrl('Action Bar', 'Slots', 'ActionBar_Slot_Background.png'),
  actionOverlay: craftpixUrl('Action Bar', 'Slots', 'ActionBar_Slot_Overlay.png'),
  inventoryBg: craftpixUrl('Inventory', 'Inventory_Slot_Background.png'),
  dialogBlue: craftpixUrl('Dialog', 'Dialog_Rewards_ItemSlot_Blue.png'),
  dialogGreen: craftpixUrl('Dialog', 'Dialog_Rewards_ItemSlot_Green.png'),
  dialogPurple: craftpixUrl('Dialog', 'Dialog_Rewards_ItemSlot_Purple.png'),
  dialogOrange: craftpixUrl('Dialog', 'Dialog_Rewards_ItemSlot_Orange.png'),
  equipHead: craftpixUrl('Character Window', 'Slots', 'CharacterWindow_Slot_Head.png'),
  equipChest: craftpixUrl('Character Window', 'Slots', 'CharacterWindow_Slot_Chest.png'),
  equipWeapon: craftpixUrl('Character Window', 'Slots', 'CharacterWindow_Slot_Weapon.png'),
  equipShield: craftpixUrl('Character Window', 'Slots', 'CharacterWindow_Slot_Shield.png'),
  equipBoots: craftpixUrl('Character Window', 'Slots', 'CharacterWindow_Slot_Boots.png'),
  equipGloves: craftpixUrl('Character Window', 'Slots', 'CharacterWindow_Slot_Gloves.png'),
  equipHover: craftpixUrl('Character Window', 'Slots', 'CharacterWindow_Slot_Hover.png'),
  castIconFrame: craftpixUrl('Cast Bars', 'CastBar_Icon_Frame.png'),
} as const;

/** Skill / combat icons (128) */
export const UI_ICONS = {
  sword: craftpixUrl('Icons 128x128', 'Icon_Sword_128.png'),
  shield: craftpixUrl('Icons 128x128', 'Icon_Shield_128.png'),
  fireball: craftpixUrl('Icons 128x128', 'Icon_Fireball_128.png'),
  leafs: craftpixUrl('Icons 128x128', 'Icon_Leafs_128.png'),
  arrows: craftpixUrl('Icons 128x128', 'Icon_Arrows_128.png'),
  deathkiss: craftpixUrl('Icons 128x128', 'Icon_Deathkiss_128.png'),
} as const;

/** Bars */
export const UI_BARS = {
  castBg: craftpixUrl('Cast Bars', 'CastBar_Background.png'),
  castFill: craftpixUrl('Cast Bars', 'CastBar_Bar_Fill.png'),
  castBarBg: craftpixUrl('Cast Bars', 'CastBar_Bar_Background.png'),
  xpBg: craftpixUrl('Action Bar', 'XP Bar', 'ActionBar_XP_Background.png'),
  sliderFill: craftpixUrl('Slider', 'Slider_Horizontal_Bar_Fill_Green.png'),
  /** Unit frame fills — better than pure CSS gradients when available */
  hpFill: craftpixUrl('Unit Frames', 'Main', 'Bars', 'UnitFrame_HP_Fill_Red.png'),
  mpFill: craftpixUrl('Unit Frames', 'Main', 'Bars', 'UnitFrame_MP_Fill_Green.png'),
  hpFillGray: craftpixUrl('Unit Frames', 'Main', 'Bars', 'UnitFrame_HP_Fill_Grayscale.png'),
} as const;

/** Game menu / settings chrome */
export const UI_MENU = {
  gameMenuBg: craftpixUrl('Game Menu', 'GameMenu_Background.png'),
  btnBrown: craftpixUrl('Game Menu', 'GameMenu_Button_Foreground_Brown.png'),
  btnYellow: craftpixUrl('Game Menu', 'GameMenu_Button_Foreground_Yellow.png'),
  btnBrownHover: craftpixUrl('Game Menu', 'GameMenu_Button_Hover_Brown.png'),
  btnYellowHover: craftpixUrl('Game Menu', 'GameMenu_Button_Hover_Yellow.png'),
  settingsIcon: craftpixUrl('Action Bar', 'Buttons', 'ActionBar_Buttons_Icon_Settings.png'),
  bookIcon: craftpixUrl('Action Bar', 'Buttons', 'ActionBar_Buttons_Icon_Book.png'),
  profileIcon: craftpixUrl('Action Bar', 'Buttons', 'ActionBar_Buttons_Icon_Profile.png'),
  flameIcon: craftpixUrl('Action Bar', 'Buttons', 'ActionBar_Buttons_Icon_Flame.png'),
  actionBtnBg: craftpixUrl('Action Bar', 'Buttons', 'ActionBar_Buttons_Background.png'),
  actionBtnHover: craftpixUrl('Action Bar', 'Buttons', 'ActionBar_Buttons_Hover.png'),
  actionBtnPress: craftpixUrl('Action Bar', 'Buttons', 'ActionBar_Buttons_Press.png'),
} as const;

/** Sliders / toggles / inputs for settings panels */
export const UI_CONTROLS = {
  sliderBg: craftpixUrl('Slider', 'Slider_Horizontal_Background.png'),
  sliderBarBg: craftpixUrl('Slider', 'Slider_Horizontal_Bar_Background.png'),
  sliderFill: craftpixUrl('Slider', 'Slider_Horizontal_Bar_Fill_Green.png'),
  sliderHandle: craftpixUrl('Slider', 'Slider_Horizontal_Handle.png'),
  sliderHandleHover: craftpixUrl('Slider', 'Slider_Horizontal_Handle_Hover.png'),
  toggleBg: craftpixUrl('Toggles', 'Toggle_Background.png'),
  toggleOn: craftpixUrl('Toggles', 'OnOff', 'Toggle_OnOff_Foreground.png'),
  toggleHover: craftpixUrl('Toggles', 'OnOff', 'Toggle_OnOff_Hover.png'),
  checkboxBg: craftpixUrl('Toggles', 'Checkbox', 'Checkbox_Background.png'),
  checkboxMark: craftpixUrl('Toggles', 'Checkbox', 'Checkbox_Checkmark.png'),
  inputBg: craftpixUrl('Inputs', 'Input_Background.png'),
  inputFocus: craftpixUrl('Inputs', 'Input_Focus.png'),
  btnGreen: craftpixUrl('Buttons', 'Rectangular', 'Large', 'Button_RL_Background_Green.png'),
  btnYellow: craftpixUrl('Buttons', 'Rectangular', 'Large', 'Button_RL_Background_Yellow.png'),
  btnHoverGreen: craftpixUrl('Buttons', 'Rectangular', 'Large', 'Button_RL_Hover_Green.png'),
} as const;

/** Spellbook chrome */
export const UI_SPELLBOOK = {
  background: craftpixUrl('Spell Book', 'SpellBook_Spell_Background.png'),
  slotBg: craftpixUrl('Spell Book', 'Slots', 'Spells', 'SpellBook_Spell_Slot_Background.png'),
  slotOverlay: craftpixUrl('Spell Book', 'Slots', 'Spells', 'SpellBook_Spell_Slot_Overlay.png'),
  tabBg: craftpixUrl('Spell Book', 'Tabs', 'SpellBook_Tab_Background.png'),
  tabActive: craftpixUrl('Spell Book', 'Tabs', 'SpellBook_Tab_Background_Active.png'),
  tabFlame: craftpixUrl('Spell Book', 'Tabs', 'SpellBook_Tab_Icon_Flame.png'),
  tabShield: craftpixUrl('Spell Book', 'Tabs', 'SpellBook_Tab_Icon_Shield.png'),
  tabSword: craftpixUrl('Spell Book', 'Tabs', 'SpellBook_Tab_Icon_Sword.png'),
} as const;

/** Map hotbar skill labels → craftpix icon when no ObjectStore icon */
export function iconForSkillLabel(label: string): string | undefined {
  const l = label.toLowerCase();
  if (l.includes('shield') || l.includes('block') || l.includes('parry')) return UI_ICONS.shield;
  if (l.includes('fire') || l.includes('bolt') || l.includes('magic')) return UI_ICONS.fireball;
  if (l.includes('arrow') || l.includes('bow') || l.includes('shot')) return UI_ICONS.arrows;
  if (l.includes('heal') || l.includes('nature') || l.includes('herb')) return UI_ICONS.leafs;
  if (l.includes('death') || l.includes('kill') || l.includes('execute')) return UI_ICONS.deathkiss;
  if (l.includes('slash') || l.includes('sword') || l.includes('strike') || l.includes('attack')) {
    return UI_ICONS.sword;
  }
  return undefined;
}

/**
 * Harvest tool → craftpix / CDN icon.
 * Prefer dedicated tool icons from assets CDN when present; craftpix as genre fallback.
 */
export function iconForHarvestTool(toolId: string): string {
  const CDN = 'https://assets.grudge-studio.com';
  switch (toolId) {
    case 'pickaxe':
      return `${CDN}/icons/tools/pickaxe.png`;
    case 'skinning_knife':
      return `${CDN}/icons/tools/knife.png`;
    case 'fishing_rod':
      return `${CDN}/icons/tools/fishing_rod.png`;
    case 'toolkit':
    case 'build_hammer':
      return `${CDN}/icons/tools/hammer.png`;
    case 'hatchet':
    case 'axe':
      return `${CDN}/icons/tools/hatchet.png`;
    default:
      return UI_ICONS.sword;
  }
}

/** Preload key craftpix URLs so first HUD paint is not blank. */
export function preloadCraftpixHudAssets(): void {
  if (typeof Image === 'undefined') return;
  const urls = [
    UI_FRAMES.unitBackground,
    UI_FRAMES.windowBackground,
    UI_SLOTS.actionBg,
    UI_SLOTS.actionHover,
    UI_BARS.hpFill,
    UI_BARS.mpFill,
    UI_MENU.settingsIcon,
    UI_MENU.gameMenuBg,
    UI_ICONS.sword,
    UI_ICONS.shield,
    UI_ICONS.fireball,
  ];
  for (const src of urls) {
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
  }
}
