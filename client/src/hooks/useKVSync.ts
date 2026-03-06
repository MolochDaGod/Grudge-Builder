import { useState, useCallback, useEffect } from 'react';
import { kvSync, type SyncResult } from '@/lib/kvSync';
import { isPuterAvailable } from '@/lib/puterIntegration';

export function useKVSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const [stats, setStats] = useState<{
    localCount: number;
    puterCount: number;
    lastSync: number;
    puterAvailable: boolean;
  } | null>(null);

  const refreshStats = useCallback(async () => {
    const newStats = await kvSync.getStats();
    setStats(newStats);
  }, []);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  const syncAll = useCallback(async () => {
    setIsSyncing(true);
    try {
      const result = await kvSync.syncAll();
      setLastResult(result);
      await refreshStats();
      return result;
    } finally {
      setIsSyncing(false);
    }
  }, [refreshStats]);

  const pushAll = useCallback(async () => {
    setIsSyncing(true);
    try {
      const result = await kvSync.pushAll();
      setLastResult(result);
      await refreshStats();
      return result;
    } finally {
      setIsSyncing(false);
    }
  }, [refreshStats]);

  const pullAll = useCallback(async () => {
    setIsSyncing(true);
    try {
      const result = await kvSync.pullAll();
      setLastResult(result);
      await refreshStats();
      return result;
    } finally {
      setIsSyncing(false);
    }
  }, [refreshStats]);

  const set = useCallback(async (key: string, value: any) => {
    await kvSync.setLocal(key, value);
    await refreshStats();
  }, [refreshStats]);

  const get = useCallback(async (key: string) => {
    return await kvSync.getLocal(key);
  }, []);

  const remove = useCallback(async (key: string) => {
    await kvSync.deleteLocal(key);
    await refreshStats();
  }, [refreshStats]);

  const clearLocal = useCallback(async () => {
    await kvSync.clearLocal();
    await refreshStats();
  }, [refreshStats]);

  const clearPuter = useCallback(async () => {
    const success = await kvSync.clearPuter();
    await refreshStats();
    return success;
  }, [refreshStats]);

  return {
    set,
    get,
    remove,
    syncAll,
    pushAll,
    pullAll,
    clearLocal,
    clearPuter,
    refreshStats,
    isSyncing,
    lastResult,
    stats,
    isPuterAvailable: isPuterAvailable()
  };
}
