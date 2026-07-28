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

/** Harvest tool → icon */
export function iconForHarvestTool(toolId: string): string {
  switch (toolId) {
    case 'pickaxe':
      return UI_ICONS.deathkiss;
    case 'skinning_knife':
      return UI_ICONS.arrows;
    case 'fishing_rod':
      return UI_ICONS.leafs;
    case 'toolkit':
      return UI_ICONS.shield;
    case 'hatchet':
    default:
      return UI_ICONS.sword;
  }
}
