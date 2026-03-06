import { puterKV, isPuterAvailable, PUTER_CONFIG } from './puterIntegration';

export interface SyncableData {
  key: string;
  value: any;
  timestamp: number;
  source: 'local' | 'puter';
}

export interface SyncResult {
  success: boolean;
  synced: number;
  conflicts: number;
  errors: string[];
}

const SYNC_PREFIX = `${PUTER_CONFIG.savePrefix}sync_`;
const LAST_SYNC_KEY = `${PUTER_CONFIG.savePrefix}last_sync`;

class KVSyncService {
  private localCache: Map<string, SyncableData> = new Map();

  async getLastSyncTime(): Promise<number> {
    if (!isPuterAvailable()) return 0;
    const data = await puterKV.get<{ timestamp: number }>(LAST_SYNC_KEY);
    return data?.timestamp || 0;
  }

  async setLastSyncTime(timestamp: number): Promise<void> {
    if (!isPuterAvailable()) return;
    await puterKV.set(LAST_SYNC_KEY, { timestamp });
  }

  async setLocal(key: string, value: any): Promise<void> {
    const syncKey = SYNC_PREFIX + key;
    const data: SyncableData = {
      key,
      value,
      timestamp: Date.now(),
      source: 'local'
    };
    this.localCache.set(syncKey, data);
    localStorage.setItem(syncKey, JSON.stringify(data));
  }

  async getLocal(key: string): Promise<any | null> {
    const syncKey = SYNC_PREFIX + key;
    
    if (this.localCache.has(syncKey)) {
      return this.localCache.get(syncKey)?.value || null;
    }
    
    const stored = localStorage.getItem(syncKey);
    if (stored) {
      try {
        const data: SyncableData = JSON.parse(stored);
        this.localCache.set(syncKey, data);
        return data.value;
      } catch {
        return null;
      }
    }
    return null;
  }

  async deleteLocal(key: string): Promise<void> {
    const syncKey = SYNC_PREFIX + key;
    this.localCache.delete(syncKey);
    localStorage.removeItem(syncKey);
  }

  getAllLocalKeys(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(SYNC_PREFIX)) {
        keys.push(key.replace(SYNC_PREFIX, ''));
      }
    }
    return keys;
  }

  async pushToPuter(key: string): Promise<boolean> {
    if (!isPuterAvailable()) return false;
    
    const syncKey = SYNC_PREFIX + key;
    const localData = localStorage.getItem(syncKey);
    if (!localData) return false;
    
    try {
      const parsed: SyncableData = JSON.parse(localData);
      await puterKV.set(syncKey, parsed);
      return true;
    } catch (e) {
      console.error('Push to Puter failed:', e);
      return false;
    }
  }

  async pullFromPuter(key: string): Promise<any | null> {
    if (!isPuterAvailable()) return null;
    
    const syncKey = SYNC_PREFIX + key;
    const puterData = await puterKV.get<SyncableData>(syncKey);
    
    if (puterData) {
      this.localCache.set(syncKey, puterData);
      localStorage.setItem(syncKey, JSON.stringify(puterData));
      return puterData.value;
    }
    return null;
  }

  async syncAll(): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      synced: 0,
      conflicts: 0,
      errors: []
    };

    if (!isPuterAvailable()) {
      result.success = false;
      result.errors.push('Puter not available');
      return result;
    }

    try {
      const localKeys = this.getAllLocalKeys();
      const puterKeys = await puterKV.list(SYNC_PREFIX);
      const allKeysSet = new Set([...localKeys, ...puterKeys.map(k => k.replace(SYNC_PREFIX, ''))]);
      const allKeys = Array.from(allKeysSet);

      for (const key of allKeys) {
        const syncKey = SYNC_PREFIX + key;
        
        const localStored = localStorage.getItem(syncKey);
        const localData: SyncableData | null = localStored ? JSON.parse(localStored) : null;
        const puterData = await puterKV.get<SyncableData>(syncKey);

        if (localData && puterData) {
          if (localData.timestamp > puterData.timestamp) {
            await puterKV.set(syncKey, localData);
            result.synced++;
          } else if (puterData.timestamp > localData.timestamp) {
            localStorage.setItem(syncKey, JSON.stringify(puterData));
            this.localCache.set(syncKey, puterData);
            result.synced++;
          } else {
            result.conflicts++;
          }
        } else if (localData && !puterData) {
          await puterKV.set(syncKey, localData);
          result.synced++;
        } else if (!localData && puterData) {
          localStorage.setItem(syncKey, JSON.stringify(puterData));
          this.localCache.set(syncKey, puterData);
          result.synced++;
        }
      }

      await this.setLastSyncTime(Date.now());
    } catch (e) {
      result.success = false;
      result.errors.push(e instanceof Error ? e.message : 'Unknown error');
    }

    return result;
  }

  async pushAll(): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      synced: 0,
      conflicts: 0,
      errors: []
    };

    if (!isPuterAvailable()) {
      result.success = false;
      result.errors.push('Puter not available');
      return result;
    }

    const localKeys = this.getAllLocalKeys();
    
    for (const key of localKeys) {
      const pushed = await this.pushToPuter(key);
      if (pushed) {
        result.synced++;
      } else {
        result.errors.push(`Failed to push: ${key}`);
      }
    }

    if (result.errors.length > 0) {
      result.success = false;
    }

    await this.setLastSyncTime(Date.now());
    return result;
  }

  async pullAll(): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      synced: 0,
      conflicts: 0,
      errors: []
    };

    if (!isPuterAvailable()) {
      result.success = false;
      result.errors.push('Puter not available');
      return result;
    }

    try {
      const puterKeys = await puterKV.list(SYNC_PREFIX);
      
      for (const syncKey of puterKeys) {
        const key = syncKey.replace(SYNC_PREFIX, '');
        const value = await this.pullFromPuter(key);
        if (value !== null) {
          result.synced++;
        }
      }
    } catch (e) {
      result.success = false;
      result.errors.push(e instanceof Error ? e.message : 'Unknown error');
    }

    return result;
  }

  async clearPuter(): Promise<boolean> {
    if (!isPuterAvailable()) return false;
    
    try {
      const keys = await puterKV.list(SYNC_PREFIX);
      for (const key of keys) {
        await puterKV.delete(key);
      }
      return true;
    } catch (e) {
      console.error('Clear Puter KV failed:', e);
      return false;
    }
  }

  async clearLocal(): Promise<void> {
    const keys = this.getAllLocalKeys();
    for (const key of keys) {
      await this.deleteLocal(key);
    }
    this.localCache.clear();
  }

  async getStats(): Promise<{
    localCount: number;
    puterCount: number;
    lastSync: number;
    puterAvailable: boolean;
  }> {
    const localKeys = this.getAllLocalKeys();
    const puterAvailable = isPuterAvailable();
    let puterCount = 0;
    
    if (puterAvailable) {
      const puterKeys = await puterKV.list(SYNC_PREFIX);
      puterCount = puterKeys.length;
    }
    
    const lastSync = await this.getLastSyncTime();
    
    return {
      localCount: localKeys.length,
      puterCount,
      lastSync,
      puterAvailable
    };
  }
}

export const kvSync = new KVSyncService();

export function useKVSync() {
  return {
    set: kvSync.setLocal.bind(kvSync),
    get: kvSync.getLocal.bind(kvSync),
    delete: kvSync.deleteLocal.bind(kvSync),
    sync: kvSync.syncAll.bind(kvSync),
    push: kvSync.pushAll.bind(kvSync),
    pull: kvSync.pullAll.bind(kvSync),
    stats: kvSync.getStats.bind(kvSync),
    clearLocal: kvSync.clearLocal.bind(kvSync),
    clearPuter: kvSync.clearPuter.bind(kvSync)
  };
}
