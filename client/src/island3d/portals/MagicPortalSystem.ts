/**
 * MagicPortalSystem — animated_magic_portal.glb network.
 *
 * Places portals on faction islands, ethereal waterfall hub, and player builds.
 * E near portal: cycle destinations (town / owned camps / linked portals) + teleport.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  MAGIC_PORTAL_GLB,
  MAGIC_PORTAL_BUILD,
  WATERFALL_ISLAND_PORTAL,
  factionIslandPortalId,
  defaultFactionPortalDestinations,
  buildPlayerPortalDestinations,
  type MagicPortalDef,
  type PortalDestination,
} from '@shared/definitions/magicPortalNetwork';
import { assetUrl } from '@/lib/assetConfig';
import type { CharacterController3D } from '../player/CharacterController3D';
import type { FactionIslandRuntime } from '../lobby/FactionIslandGenerator';

const loader = new GLTFLoader();
let template: THREE.Group | null = null;

async function loadPortalTemplate(): Promise<THREE.Group> {
  if (template) return template.clone(true) as THREE.Group;
  const urls = [
    MAGIC_PORTAL_GLB.localPath,
    assetUrl(MAGIC_PORTAL_GLB.cdnKey),
    assetUrl(MAGIC_PORTAL_GLB.localPath.replace(/^\//, '')),
  ];
  let lastErr: unknown;
  for (const url of urls) {
    try {
      const gltf = await loader.loadAsync(url);
      const g = gltf.scene as THREE.Group;
      g.traverse((c) => {
        if ((c as THREE.Mesh).isMesh) {
          const m = c as THREE.Mesh;
          m.castShadow = true;
          m.receiveShadow = true;
          m.frustumCulled = false;
        }
      });
      // Play embedded animations if any
      if (gltf.animations?.length) {
        g.userData.clips = gltf.animations;
      }
      template = g;
      return g.clone(true) as THREE.Group;
    } catch (e) {
      lastErr = e;
    }
  }
  console.warn('[MagicPortal] GLB load failed, using placeholder', lastErr);
  const ph = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.2, 0.15, 12, 32),
    new THREE.MeshStandardMaterial({
      color: 0x8844ff,
      emissive: 0x6622aa,
      emissiveIntensity: 0.8,
      roughness: 0.35,
    }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 1.5;
  ph.add(ring);
  return ph;
}

export interface RuntimePortal {
  def: MagicPortalDef;
  group: THREE.Group;
  mixer: THREE.AnimationMixer | null;
  destIndex: number;
}

export class MagicPortalSystem {
  private scene: THREE.Scene;
  private character: CharacterController3D | null = null;
  private portals = new Map<string, RuntimePortal>();
  private root: THREE.Group;
  private ownedCampGetter: (() => Array<{ id: string; label: string; position: [number, number, number] }>) | null =
    null;
  private playerOwnerId: string | null = null;
  private nearId: string | null = null;
  private onTeleport: ((dest: PortalDestination, from: MagicPortalDef) => void) | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.root = new THREE.Group();
    this.root.name = 'MagicPortalNetwork';
    scene.add(this.root);
  }

  setCharacter(c: CharacterController3D | null): void {
    this.character = c;
  }

  setPlayerOwnerId(id: string | null): void {
    this.playerOwnerId = id;
  }

  setOwnedCampGetter(
    fn: () => Array<{ id: string; label: string; position: [number, number, number] }>,
  ): void {
    this.ownedCampGetter = fn;
  }

  setOnTeleport(fn: (dest: PortalDestination, from: MagicPortalDef) => void): void {
    this.onTeleport = fn;
  }

  get portalCount(): number {
    return this.portals.size;
  }

  get nearHint(): string | null {
    if (!this.nearId) return null;
    const p = this.portals.get(this.nearId);
    if (!p) return null;
    const dests = this.destinationsFor(p.def);
    if (dests.length === 0) return `${p.def.name} · no links [E]`;
    const d = dests[p.destIndex % dests.length];
    return `${p.def.name} → ${d.label}  [E] travel · [R] cycle`;
  }

  get canInteract(): boolean {
    return this.nearId != null;
  }

  /** List all network portals for destination building */
  listNetworkPortals(): Array<{
    id: string;
    label: string;
    position: [number, number, number];
    ownerId?: string | null;
  }> {
    const out: Array<{
      id: string;
      label: string;
      position: [number, number, number];
      ownerId?: string | null;
    }> = [];
    for (const p of this.portals.values()) {
      out.push({
        id: p.def.id,
        label: p.def.name,
        position: p.def.worldPos,
        ownerId: p.def.ownerId ?? null,
      });
    }
    return out;
  }

  private destinationsFor(def: MagicPortalDef): PortalDestination[] {
    if (def.playerBuilt || def.systemKind === 'faction_island') {
      const camps = this.ownedCampGetter?.() ?? [];
      const network = this.listNetworkPortals();
      const town = def.destinations.find((d) => d.kind === 'faction_town') ?? null;
      const waterfall = def.destinations.find((d) => d.kind === 'waterfall_hub');
      const merged = buildPlayerPortalDestinations({
        factionTown: town,
        ownedCamps: camps,
        networkPortals: network,
        excludePortalId: def.id,
      });
      if (waterfall && !merged.some((d) => d.id === waterfall.id)) {
        merged.push(waterfall);
      }
      // Keep any custom destinations
      for (const d of def.destinations) {
        if (!merged.some((m) => m.id === d.id)) merged.push(d);
      }
      return merged;
    }
    return def.destinations;
  }

  async placePortal(def: MagicPortalDef): Promise<RuntimePortal | null> {
    if (this.portals.has(def.id)) {
      this.removePortal(def.id);
    }
    const mesh = await loadPortalTemplate();
    mesh.scale.setScalar(MAGIC_PORTAL_GLB.scale);
    mesh.position.set(def.worldPos[0], def.worldPos[1], def.worldPos[2]);
    if (def.yaw != null) mesh.rotation.y = def.yaw;
    mesh.name = `magic_portal_${def.id}`;
    mesh.userData.magicPortalId = def.id;
    mesh.userData.isMagicPortal = true;

    let mixer: THREE.AnimationMixer | null = null;
    const clips = mesh.userData.clips as THREE.AnimationClip[] | undefined;
    if (clips?.length) {
      mixer = new THREE.AnimationMixer(mesh);
      for (const clip of clips) {
        const action = mixer.clipAction(clip);
        action.play();
      }
    }

    this.root.add(mesh);
    const runtime: RuntimePortal = { def, group: mesh, mixer, destIndex: 0 };
    this.portals.set(def.id, runtime);
    return runtime;
  }

  removePortal(id: string): void {
    const p = this.portals.get(id);
    if (!p) return;
    this.root.remove(p.group);
    p.mixer?.stopAllAction();
    this.portals.delete(id);
  }

  /**
   * One portal per faction island near respawn / traveler (teleport network).
   */
  async placeFactionIslandPortals(
    faction: FactionIslandRuntime,
    waterfallPos?: THREE.Vector3 | null,
  ): Promise<void> {
    const wf: [number, number, number] | null = waterfallPos
      ? [waterfallPos.x, waterfallPos.y, waterfallPos.z]
      : null;

    for (const island of faction.islands) {
      const respawn = faction.respawnPoints.get(island.id);
      if (!respawn) continue;
      // Offset slightly from respawn so player does not spawn inside ring
      const pos: [number, number, number] = [
        respawn.x + 6,
        respawn.y + 0.1,
        respawn.z + 4,
      ];
      const raceId = island.raceId ?? island.id;
      const dests = defaultFactionPortalDestinations({
        raceId,
        factionLabel: island.name || raceId,
        townPos: [respawn.x, respawn.y + 0.5, respawn.z],
        waterfallPos: wf,
      });
      // Cross-link other faction towns
      for (const other of faction.islands) {
        if (other.id === island.id) continue;
        const or = faction.respawnPoints.get(other.id);
        if (!or) continue;
        dests.push({
          id: `town_${other.raceId ?? other.id}`,
          kind: 'faction_town',
          label: other.name || other.id,
          position: [or.x, or.y + 0.5, or.z],
          raceId: other.raceId ?? other.id,
        });
      }
      await this.placePortal({
        id: factionIslandPortalId(raceId),
        name: `${island.name} Portal`,
        worldPos: pos,
        destinations: dests,
        playerBuilt: false,
        factionIslandId: island.id,
        systemKind: 'faction_island',
      });
    }
    console.info(`[MagicPortal] faction island portals ×${faction.islands.length}`);
  }

  /**
   * Main waterfall island (Ethereal Falls sector) hub portal.
   */
  async placeWaterfallHubPortal(
    worldPos: THREE.Vector3,
    extraDests: PortalDestination[] = [],
  ): Promise<void> {
    const pos: [number, number, number] = [
      worldPos.x + WATERFALL_ISLAND_PORTAL.localOffset[0],
      worldPos.y + WATERFALL_ISLAND_PORTAL.localOffset[1],
      worldPos.z + WATERFALL_ISLAND_PORTAL.localOffset[2],
    ];
    await this.placePortal({
      id: WATERFALL_ISLAND_PORTAL.id,
      name: WATERFALL_ISLAND_PORTAL.name,
      worldPos: pos,
      destinations: [
        {
          id: 'falls_center',
          kind: 'waterfall_hub',
          label: 'Falls Plaza',
          position: [worldPos.x, worldPos.y + 1, worldPos.z],
          sectorId: WATERFALL_ISLAND_PORTAL.sectorId,
        },
        ...extraDests,
      ],
      playerBuilt: false,
      systemKind: 'waterfall',
    });
    console.info('[MagicPortal] waterfall hub placed', pos);
  }

  /**
   * Player-built portal from build hammer / RTS place.
   */
  async placePlayerPortal(
    worldPos: THREE.Vector3,
    opts?: { id?: string; name?: string; yaw?: number },
  ): Promise<string> {
    const id = opts?.id ?? `player_portal_${Date.now().toString(36)}`;
    const camps = this.ownedCampGetter?.() ?? [];
    const dests = buildPlayerPortalDestinations({
      ownedCamps: camps,
      networkPortals: this.listNetworkPortals(),
      excludePortalId: id,
    });
    await this.placePortal({
      id,
      name: opts?.name ?? MAGIC_PORTAL_BUILD.name,
      worldPos: [worldPos.x, worldPos.y, worldPos.z],
      yaw: opts?.yaw,
      destinations: dests,
      playerBuilt: true,
      ownerId: this.playerOwnerId,
      systemKind: 'player',
    });
    return id;
  }

  update(dt: number, playerPos: THREE.Vector3): void {
    this.nearId = null;
    let best = Infinity;
    const range = MAGIC_PORTAL_GLB.interactionRangeM;
    for (const [id, p] of this.portals) {
      p.mixer?.update(dt);
      // Gentle idle spin if no anim
      if (!p.mixer) p.group.rotation.y += dt * 0.35;
      const d = playerPos.distanceTo(p.group.position);
      if (d < range && d < best) {
        best = d;
        this.nearId = id;
      }
    }
  }

  /** Cycle destination while near portal */
  cycleDestination(dir = 1): boolean {
    if (!this.nearId) return false;
    const p = this.portals.get(this.nearId);
    if (!p) return false;
    const dests = this.destinationsFor(p.def);
    if (dests.length === 0) return false;
    p.destIndex = (p.destIndex + dir + dests.length) % dests.length;
    return true;
  }

  /** Travel to selected destination */
  tryInteract(): boolean {
    if (!this.nearId || !this.character) return false;
    const p = this.portals.get(this.nearId);
    if (!p) return false;
    const dests = this.destinationsFor(p.def);
    if (dests.length === 0) return false;
    const dest = dests[p.destIndex % dests.length];
    const target = new THREE.Vector3(dest.position[0], dest.position[1], dest.position[2]);
    this.character.teleportTo?.(target);
    this.onTeleport?.(dest, p.def);
    console.info(`[MagicPortal] ${p.def.id} → ${dest.label}`, dest.position);
    return true;
  }

  dispose(): void {
    for (const id of [...this.portals.keys()]) this.removePortal(id);
    this.scene.remove(this.root);
  }
}

export { MAGIC_PORTAL_BUILD };
