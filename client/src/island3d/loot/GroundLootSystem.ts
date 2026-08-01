/**
 * GroundLootSystem — world loot piles using item icons as slow-rotating sprites.
 *
 * Sources: creature skin loot, boss/chest rewards, craft overflow, random drops.
 * Pickup: press E within radius (wired via Island3DEngine.handleInteractKey).
 */
import * as THREE from 'three';
import {
  resolveItemIconUrl,
  itemIconFallbackUrl,
  withItemIcon,
} from '@shared/inventory/itemIcons';

export interface GroundLootItem {
  itemId: string;
  name: string;
  quantity: number;
  iconUrl?: string;
  rarity?: string;
  category?: string;
}

export interface GroundLootPile {
  id: string;
  position: THREE.Vector3;
  items: GroundLootItem[];
  source?: string;
  createdAt: number;
  /** Seconds until auto-despawn (default 120) */
  ttlSec?: number;
}

export type GroundLootPickupHandler = (pile: GroundLootPile, items: GroundLootItem[]) => void;

const PICKUP_RADIUS_M = 2.4;
const SPRITE_SIZE = 0.55;
const ROT_SPEED = 0.55; // rad/s
const BOB_AMP = 0.08;
const BOB_SPEED = 2.2;

const texLoader = new THREE.TextureLoader();
const texCache = new Map<string, THREE.Texture>();

function loadIconTexture(url: string): THREE.Texture {
  const key = url || itemIconFallbackUrl();
  const hit = texCache.get(key);
  if (hit) return hit;
  const tex = texLoader.load(
    key,
    undefined,
    undefined,
    () => {
      // swap to fallback if primary fails
      const fb = itemIconFallbackUrl();
      if (key !== fb) {
        const t2 = texLoader.load(fb);
        t2.colorSpace = THREE.SRGBColorSpace;
        texCache.set(key, t2);
      }
    },
  );
  tex.colorSpace = THREE.SRGBColorSpace;
  texCache.set(key, tex);
  return tex;
}

function rarityColor(r?: string): number {
  switch ((r || 'common').toLowerCase()) {
    case 'uncommon':
      return 0x22c55e;
    case 'rare':
      return 0x3b82f6;
    case 'epic':
      return 0xa855f7;
    case 'legendary':
      return 0xf59e0b;
    default:
      return 0xd4a843;
  }
}

export class GroundLootSystem {
  readonly root = new THREE.Group();
  private piles = new Map<
    string,
    {
      pile: GroundLootPile;
      group: THREE.Group;
      sprite: THREE.Sprite;
      ring: THREE.Mesh;
      baseY: number;
    }
  >();
  private groundY: (x: number, z: number) => number;
  private onPickup: GroundLootPickupHandler | null = null;
  private nearestId: string | null = null;
  private promptEl: HTMLDivElement | null = null;

  constructor(
    scene: THREE.Scene,
    groundY: (x: number, z: number) => number,
    opts?: { onPickup?: GroundLootPickupHandler; parentEl?: HTMLElement },
  ) {
    this.groundY = groundY;
    this.onPickup = opts?.onPickup ?? null;
    this.root.name = 'ground_loot_system';
    scene.add(this.root);
    if (typeof document !== 'undefined') {
      const el = document.createElement('div');
      el.id = 'ground-loot-prompt';
      el.style.cssText =
        'position:fixed;left:50%;bottom:18%;transform:translateX(-50%);z-index:90;' +
        'padding:8px 14px;border-radius:8px;border:1px solid rgba(212,168,67,0.45);' +
        'background:rgba(10,10,16,0.88);color:#f0c040;font:600 12px/1.3 system-ui,sans-serif;' +
        'pointer-events:none;display:none;letter-spacing:0.04em';
      (opts?.parentEl || document.body).appendChild(el);
      this.promptEl = el;
    }
  }

  setPickupHandler(fn: GroundLootPickupHandler | null) {
    this.onPickup = fn;
  }

  /** Spawn one pile (multi-item stacks into one rotating icon — first item art). */
  spawn(
    position: THREE.Vector3,
    items: Array<{ itemId: string; name?: string; quantity?: number; iconUrl?: string; rarity?: string }>,
    source = 'drop',
  ): string {
    const enriched: GroundLootItem[] = items
      .filter((i) => i.itemId)
      .map((i) =>
        withItemIcon({
          itemId: i.itemId,
          name: i.name || i.itemId,
          quantity: Math.max(1, i.quantity ?? 1),
          iconUrl: i.iconUrl,
          rarity: i.rarity,
        }),
      );
    if (!enriched.length) return '';

    const id = `loot_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    const y = this.groundY(position.x, position.z) + 0.35;
    const pos = new THREE.Vector3(position.x, y, position.z);

    const group = new THREE.Group();
    group.name = id;
    group.position.copy(pos);

    const iconUrl = enriched[0].iconUrl || resolveItemIconUrl(enriched[0]);
    const map = loadIconTexture(iconUrl);
    const mat = new THREE.SpriteMaterial({
      map,
      transparent: true,
      depthWrite: false,
      sizeAttenuation: true,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(SPRITE_SIZE, SPRITE_SIZE, 1);
    group.add(sprite);

    // Soft glow ring on ground
    const ringGeo = new THREE.RingGeometry(0.28, 0.42, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: rarityColor(enriched[0].rarity),
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.28;
    group.add(ring);

    // Qty badge via second small sprite is heavy — store in userData for HUD
    group.userData.qty = enriched.reduce((s, i) => s + i.quantity, 0);
    group.userData.label = enriched.map((i) => `${i.name}×${i.quantity}`).join(', ');

    this.root.add(group);
    const pile: GroundLootPile = {
      id,
      position: pos.clone(),
      items: enriched,
      source,
      createdAt: performance.now(),
      ttlSec: 120,
    };
    this.piles.set(id, { pile, group, sprite, ring, baseY: y });
    return id;
  }

  /** Convenience: spawn from CreatureLootEvent-shaped data. */
  spawnFromCreatureLoot(
    position: THREE.Vector3,
    loot: Array<{ itemId: string; name: string; quantity: number }>,
    creatureName?: string,
  ) {
    return this.spawn(position, loot, creatureName ? `creature:${creatureName}` : 'creature');
  }

  /** Chest / random table drop. */
  spawnChestLoot(
    position: THREE.Vector3,
    loot: Array<{ itemId: string; name?: string; quantity?: number; rarity?: string }>,
  ) {
    return this.spawn(position, loot, 'chest');
  }

  update(dt: number, playerPos: THREE.Vector3 | null) {
    const now = performance.now();
    let nearest: string | null = null;
    let nearestD = PICKUP_RADIUS_M;

    for (const [id, rec] of this.piles) {
      const age = (now - rec.pile.createdAt) / 1000;
      if (rec.pile.ttlSec && age > rec.pile.ttlSec) {
        this.remove(id);
        continue;
      }
      // Slow Y rotation of the whole group (icon + ring)
      rec.group.rotation.y += ROT_SPEED * dt;
      // Bob
      rec.group.position.y = rec.baseY + Math.sin(now * 0.001 * BOB_SPEED + rec.baseY) * BOB_AMP;
      // Face-up sprite stays billboard (Sprite does); keep ring flat
      rec.ring.rotation.x = -Math.PI / 2;

      if (playerPos) {
        const d = playerPos.distanceTo(rec.group.position);
        if (d < nearestD) {
          nearestD = d;
          nearest = id;
        }
      }
    }

    this.nearestId = nearest;
    if (this.promptEl) {
      if (nearest) {
        const rec = this.piles.get(nearest)!;
        this.promptEl.style.display = 'block';
        this.promptEl.textContent = `E  Pick up · ${rec.group.userData.label || 'Loot'}`;
      } else {
        this.promptEl.style.display = 'none';
      }
    }
  }

  /** Try pickup nearest pile. Returns true if picked. */
  tryPickup(playerPos: THREE.Vector3): boolean {
    let bestId: string | null = null;
    let bestD = PICKUP_RADIUS_M;
    for (const [id, rec] of this.piles) {
      const d = playerPos.distanceTo(rec.group.position);
      if (d < bestD) {
        bestD = d;
        bestId = id;
      }
    }
    if (!bestId) return false;
    const rec = this.piles.get(bestId);
    if (!rec) return false;
    const items = rec.pile.items.slice();
    this.onPickup?.(rec.pile, items);
    this.remove(bestId);
    return true;
  }

  getNearestPrompt(): string | null {
    if (!this.nearestId) return null;
    return this.piles.get(this.nearestId)?.group.userData.label ?? null;
  }

  remove(id: string) {
    const rec = this.piles.get(id);
    if (!rec) return;
    this.root.remove(rec.group);
    rec.sprite.material.map = null;
    rec.sprite.material.dispose();
    (rec.ring.geometry as THREE.BufferGeometry).dispose();
    (rec.ring.material as THREE.Material).dispose();
    this.piles.delete(id);
    if (this.nearestId === id) this.nearestId = null;
  }

  dispose() {
    for (const id of [...this.piles.keys()]) this.remove(id);
    this.root.parent?.remove(this.root);
    if (this.promptEl?.parentNode) this.promptEl.parentNode.removeChild(this.promptEl);
    this.promptEl = null;
  }
}
