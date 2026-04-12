export interface PageEntry {
  id: string;
  number: string;
  title: string;
  path: string;
  icon?: string;
  showInNav?: boolean;
  parent?: string;
}

export const PAGE_REGISTRY: PageEntry[] = [
  { id: 'home', number: '1', title: 'Home', path: '/home', icon: 'home', showInNav: true },
  { id: 'character', number: '2', title: 'Character', path: '/character', icon: 'user', showInNav: true },
  { id: 'characters', number: '2', title: 'Character', path: '/characters', showInNav: false },
  { id: 'dungeon', number: '3', title: 'Dungeon', path: '/dungeon', icon: 'sword', showInNav: true },
  { id: 'combat', number: '4', title: 'Combat', path: '/combat', icon: 'swords', showInNav: true },
  { id: 'island', number: '5', title: 'Island', path: '/island', icon: 'map', showInNav: true },
  { id: 'professions', number: '6', title: 'Professions', path: '/professions', icon: 'hammer', showInNav: true },
  { id: 'skills', number: '7', title: 'Skills', path: '/skill-tree', icon: 'sparkles', showInNav: true },
  { id: 'database', number: '8', title: 'Database', path: '/database', icon: 'database', showInNav: true },
  { id: 'admin', number: '9', title: 'Admin', path: '/admin', icon: 'settings', showInNav: true },
  
  { id: 'miner', number: '6.1', title: 'Miner', path: '/profession/miner', parent: 'professions' },
  { id: 'forester', number: '6.2', title: 'Forester', path: '/profession/forester', parent: 'professions' },
  { id: 'mystic', number: '6.3', title: 'Mystic', path: '/profession/mystic', parent: 'professions' },
  { id: 'chef', number: '6.4', title: 'Chef', path: '/profession/chef', parent: 'professions' },
  { id: 'engineer', number: '6.5', title: 'Engineer', path: '/profession/engineer', parent: 'professions' },
  
  { id: 'login', number: '0', title: 'Login', path: '/', showInNav: false },
  { id: 'intro', number: '0.1', title: 'Intro', path: '/intro', showInNav: false },
  { id: 'rpg-battle', number: '4.1', title: 'RPG Battle', path: '/rpg-battle', parent: 'combat' },
  { id: 'dungeon-tiled', number: '3.1', title: 'Dungeon Tiled', path: '/dungeon-tiled', parent: 'dungeon' },
  { id: 'sprites', number: '9.1', title: 'Sprites', path: '/sprites', parent: 'admin' },
  { id: 'sprite-editor', number: '9.2', title: 'Sprite Editor', path: '/sprite-editor', parent: 'admin' },
  { id: 'sprite-viewer', number: '9.3', title: 'Sprite Viewer', path: '/sprite-viewer', parent: 'admin' },
  { id: 'sprite-generator', number: '9.4', title: 'Sprite Generator', path: '/sprite-generator', parent: 'admin' },
  { id: 'hero-sprites', number: '9.5', title: 'Hero Sprites', path: '/hero-sprites', parent: 'admin' },
  { id: 'sprite-admin', number: '9.6', title: 'Sprite Admin', path: '/sprite-admin', parent: 'admin' },
];

export function getPageByPath(path: string): PageEntry | undefined {
  return PAGE_REGISTRY.find(p => p.path === path);
}

export function getPageNumber(path: string): string {
  const page = getPageByPath(path);
  return page?.number || '';
}

export function getMainNavPages(): PageEntry[] {
  return PAGE_REGISTRY.filter(p => p.showInNav);
}

export function getSubPages(parentId: string): PageEntry[] {
  return PAGE_REGISTRY.filter(p => p.parent === parentId);
}
