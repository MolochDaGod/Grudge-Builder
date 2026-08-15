import { useState, useEffect, useCallback } from 'react';
import type { Account, AccountInventoryItem } from '@shared/schema';
import {
  authHeaders,
  ensureFleetSessionClaim,
  getToken,
  markAuthRejected,
  waitForAuthReady,
} from '@/lib/grudgeBackend';

/** Railway often returns 200 guest instead of 401 — never paint as real account. */
function isGuestAccountPayload(data: unknown): boolean {
  if (!data || typeof data !== 'object') return true;
  const d = data as Record<string, unknown>;
  const gid = String(d.grudgeId || d.grudge_id || '').trim();
  const uid = String(d.userId || d.user_id || '').trim();
  if (!gid && !uid) return true;
  if (/^GRUDGE_GUEST$/i.test(gid)) return true;
  if (/^guest/i.test(gid) || uid === 'guest') return true;
  return false;
}

export function useAccount() {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAccount = useCallback(async () => {
    setLoading(true);
    try {
      await ensureFleetSessionClaim().catch(() => false);
      await waitForAuthReady(4000).catch(() => false);

      if (!getToken()) {
        setAccount(null);
        setError(null);
        return;
      }

      const headers = authHeaders();
      if (!headers.Authorization) {
        setAccount(null);
        setError(null);
        return;
      }

      // Prefer /api/auth/me — invalid JWT → 401. /api/account returns guest 200 with bad Bearer.
      try {
        const meRes = await fetch('/api/auth/me', { headers, credentials: 'include' });
        if (meRes.status === 401 || meRes.status === 403) {
          markAuthRejected();
          setAccount(null);
          setError(null);
          return;
        }
        if (meRes.ok) {
          const me = (await meRes.json()) as Record<string, unknown>;
          if (isGuestAccountPayload(me) || isGuestAccountPayload(me.user)) {
            setAccount(null);
            setError(null);
            return;
          }
        }
      } catch {
        /* fall through */
      }

      const response = await fetch('/api/account', { headers, credentials: 'include' });
      if (response.status === 401 || response.status === 403) {
        markAuthRejected();
        setAccount(null);
        setError(null);
        return;
      }
      if (!response.ok) throw new Error('Failed to fetch account');
      const data = await response.json();
      if (isGuestAccountPayload(data)) {
        setAccount(null);
        setError('Session not accepted. Sign in again with Grudge ID.');
        return;
      }
      setAccount(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load account');
      setAccount(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAccount();
    const onAuth = () => {
      void fetchAccount();
    };
    window.addEventListener('grudge:auth:ready', onAuth);
    window.addEventListener('grudge:auth:success', onAuth);
    return () => {
      window.removeEventListener('grudge:auth:ready', onAuth);
      window.removeEventListener('grudge:auth:success', onAuth);
    };
  }, [fetchAccount]);

  const updateAccount = async (updates: Partial<Account>) => {
    const response = await fetch('/api/account', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      credentials: 'include',
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error('Failed to update account');
    const data = await response.json();
    if (isGuestAccountPayload(data)) {
      throw new Error('Cannot update guest account — sign in first');
    }
    setAccount(data);
    return data;
  };

  return { account, loading, error, refetch: fetchAccount, updateAccount };
}

export function useAccountInventory() {
  const [inventory, setInventory] = useState<AccountInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInventory = useCallback(async () => {
    try {
      if (!getToken()) {
        setInventory([]);
        setError(null);
        return;
      }
      const response = await fetch('/api/account/inventory', {
        headers: authHeaders(),
        credentials: 'include',
      });
      if (response.status === 401 || response.status === 403) {
        setInventory([]);
        setError(null);
        return;
      }
      if (!response.ok) throw new Error('Failed to fetch inventory');
      const data = await response.json();
      setInventory(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchInventory();
  }, [fetchInventory]);

  const addItem = async (item: {
    itemId: string;
    quantity?: number;
    tier?: number;
    quality?: string;
    metadata?: object;
  }) => {
    const response = await fetch('/api/account/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      credentials: 'include',
      body: JSON.stringify(item),
    });
    if (!response.ok) throw new Error('Failed to add item');
    const data = await response.json();
    setInventory((prev) => [...prev, data]);
    return data;
  };

  const updateItem = async (id: string, updates: Partial<AccountInventoryItem>) => {
    const response = await fetch(`/api/account/inventory/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      credentials: 'include',
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error('Failed to update item');
    const data = await response.json();
    setInventory((prev) => prev.map((item) => (item.id === id ? data : item)));
    return data;
  };

  const removeItem = async (id: string) => {
    const response = await fetch(`/api/account/inventory/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to remove item');
    setInventory((prev) => prev.filter((item) => item.id !== id));
  };

  const transferToCharacter = async (itemId: string, characterId: string | null) => {
    const response = await fetch(`/api/account/inventory/${itemId}/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      credentials: 'include',
      body: JSON.stringify({ characterId }),
    });
    if (!response.ok) throw new Error('Failed to transfer item');
    const data = await response.json();
    setInventory((prev) => prev.map((item) => (item.id === itemId ? data : item)));
    return data;
  };

  const getCharacterItems = (characterId: string | null) => {
    return inventory.filter((item) => item.boundToCharacterId === characterId);
  };

  const getSharedItems = () => {
    return inventory.filter((item) => item.boundToCharacterId === null);
  };

  return {
    inventory,
    loading,
    error,
    refetch: fetchInventory,
    addItem,
    updateItem,
    removeItem,
    transferToCharacter,
    getCharacterItems,
    getSharedItems,
  };
}

export function useAccountResources() {
  const [resources, setResources] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchResources = useCallback(async () => {
    try {
      if (!getToken()) {
        setResources({});
        setError(null);
        return;
      }
      const response = await fetch('/api/account/resources', {
        headers: authHeaders(),
        credentials: 'include',
      });
      if (response.status === 401 || response.status === 403) {
        setResources({});
        setError(null);
        return;
      }
      if (!response.ok) throw new Error('Failed to fetch resources');
      const data = await response.json();
      setResources(data.resources || {});
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load resources');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchResources();
  }, [fetchResources]);

  const updateResources = async (newResources: Record<string, number>) => {
    const response = await fetch('/api/account/resources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      credentials: 'include',
      body: JSON.stringify({ resources: newResources }),
    });
    if (!response.ok) throw new Error('Failed to update resources');
    const data = await response.json();
    setResources(data.resources || {});
    return data;
  };

  const addResource = async (resourceId: string, amount: number) => {
    const response = await fetch('/api/account/resources/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      credentials: 'include',
      body: JSON.stringify({ resourceId, amount }),
    });
    if (!response.ok) throw new Error('Failed to add resource');
    const data = await response.json();
    setResources(data.resources || {});
    return data;
  };

  const batchAddResources = async (
    items: Array<{ resourceId: string; amount: number }>,
  ) => {
    if (items.length === 0) return null;
    const response = await fetch('/api/account/resources/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      credentials: 'include',
      body: JSON.stringify({ items }),
    });
    if (!response.ok) throw new Error('Failed to batch add resources');
    const data = await response.json();
    setResources(data.resources || {});
    return data;
  };

  const getResource = (resourceId: string) => resources[resourceId] || 0;

  return {
    resources,
    loading,
    error,
    refetch: fetchResources,
    updateResources,
    addResource,
    batchAddResources,
    getResource,
  };
}
