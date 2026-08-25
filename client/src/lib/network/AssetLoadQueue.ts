/**
 * AssetLoadQueue — priority multiplayer asset loading.
 *
 * Best practices for lag-free play:
 *   1. Local player race GLB first (priority 0)
 *   2. Nearby remote players next
 *   3. Sector landmarks / buildings
 *   4. Cap concurrent GLB loads (default 4)
 *   5. Share gltfCache from modelLoader (clone on use)
 *   6. Preload sector race set via REST manifest
 */
import { loadCharacterModel, type LoadedModel } from '@/lib/modelLoader';
import { NETWORK_RATES } from '@shared/network/syncProtocol';
import { RACE_GRUDGE6, normalizeRaceId } from '@shared/fleet';
import { assetUrl } from '@/lib/assetConfig';

export type LoadPriority = 0 | 1 | 2 | 3 | 4 | 5;

export interface LoadJob {
  id: string;
  url: string;
  priority: LoadPriority;
  kind: 'character' | 'building' | 'landmark' | 'other';
  resolve: (m: LoadedModel | null) => void;
  reject: (e: unknown) => void;
}

const MAX = NETWORK_RATES.maxConcurrentAssetLoads;

class AssetLoadQueueImpl {
  private queue: LoadJob[] = [];
  private active = 0;
  private inFlight = new Map<string, Promise<LoadedModel | null>>();
  private stats = { completed: 0, failed: 0, queued: 0 };

  getStats() {
    return { ...this.stats, active: this.active, pending: this.queue.length };
  }

  /** Load race character GLB with priority (0 = local, 1 = remote near, …). */
  loadRaceModel(raceId: string, priority: LoadPriority = 2): Promise<LoadedModel | null> {
    const race = RACE_GRUDGE6[normalizeRaceId(raceId)] ?? RACE_GRUDGE6.human;
    // Play kit = Toon RTS GLB (cdnPath). Never races bake / Meshy / capsule.
    const path = race.cdnPath || `/asset-packs/toon-rts-characters/glb/characters/human.glb`;
    return this.enqueue({
      id: `race:${normalizeRaceId(raceId)}`,
      url: path.startsWith('http') ? path : assetUrl(path),
      priority,
      kind: 'character',
    });
  }

  loadGlb(
    urlOrPath: string,
    priority: LoadPriority = 3,
    id?: string,
  ): Promise<LoadedModel | null> {
    const url = urlOrPath.startsWith('http') ? urlOrPath : assetUrl(urlOrPath);
    return this.enqueue({
      id: id || url,
      url,
      priority,
      kind: 'other',
    });
  }

  /** Preload common races for a sector (non-blocking). */
  preloadSectorRaces(raceIds: string[] = ['human', 'elf', 'orc', 'dwarf', 'barbarian', 'undead']): void {
    for (const r of raceIds) {
      void this.loadRaceModel(r, 4);
    }
  }

  private enqueue(
    job: Omit<LoadJob, 'resolve' | 'reject'>,
  ): Promise<LoadedModel | null> {
    const existing = this.inFlight.get(job.id);
    if (existing) return existing;

    const promise = new Promise<LoadedModel | null>((resolve, reject) => {
      this.queue.push({ ...job, resolve, reject });
      this.stats.queued++;
      this.queue.sort((a, b) => a.priority - b.priority);
      this.pump();
    });
    this.inFlight.set(job.id, promise);
    promise.finally(() => {
      this.inFlight.delete(job.id);
    });
    return promise;
  }

  private pump(): void {
    while (this.active < MAX && this.queue.length > 0) {
      const job = this.queue.shift()!;
      this.active++;
      this.stats.queued = Math.max(0, this.stats.queued - 1);
      loadCharacterModel(job.url)
        .then((m) => {
          this.stats.completed++;
          job.resolve(m);
        })
        .catch((e) => {
          this.stats.failed++;
          console.warn('[AssetLoadQueue] fail', job.id, e);
          job.resolve(null);
        })
        .finally(() => {
          this.active--;
          this.pump();
        });
    }
  }

  clearQueue(): void {
    for (const j of this.queue) j.resolve(null);
    this.queue = [];
  }
}

export const AssetLoadQueue = new AssetLoadQueueImpl();
