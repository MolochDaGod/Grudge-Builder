/**
 * useCharacters — Grudge Backend Character Hook
 *
 * Fetches ALL characters owned by the authenticated user from
 * Railway /api/characters (same-origin via Vercel rewrite), mirrors active-character selection in localStorage,
 * and polls the backend every 60 s so the list stays fresh when crafted
 * items / level-ups come in from other Grudge apps.
 *
 * Usage:
 *   const { characters, loading, activeId, setActive, refetch } = useCharacters();
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { CharacterManager, type Character } from '@/lib/characterManager';
import {
  getToken,
  isAuthenticated,
  ensureFleetSessionClaim,
  waitForAuthReady,
} from '@/lib/grudgeBackend';

const POLL_INTERVAL_MS = 60_000; // live-sync every 60 s

export interface UseCharactersReturn {
  characters:      Character[];
  loading:         boolean;
  error:           string | null;
  activeId:        string | null;
  activeCharacter: Character | null;
  setActive:       (id: string) => void;
  refetch:         () => Promise<void>;
}

export function useCharacters(): UseCharactersReturn {
  const [characters, setCharacters]   = useState<Character[]>([]);
  const [loading,    setLoading]      = useState(true);
  const [error,      setError]        = useState<string | null>(null);
  const [activeId,   setActiveIdState] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch Warlords heroes (= characters, era=warlords) ───────────────
  // Same SSOT as /home: claim cookie/session first, then Railway envelope.
  const fetchCharacters = useCallback(async () => {
    try {
      await ensureFleetSessionClaim();
      await waitForAuthReady(8000);
    } catch {
      /* claim best-effort */
    }

    // Guest / no JWT — do not hit /api/characters (avoids Network 401 spam)
    if (!getToken() || !isAuthenticated()) {
      setCharacters([]);
      setActiveIdState(null);
      setError(null);
      setLoading(false);
      return;
    }
    try {
      // Explicit warlords era — heroes and characters are the same roster
      const chars = await CharacterManager.getAll('warlords');
      setCharacters(chars);
      setError(null);

      // Sync active ID from storage
      const stored = CharacterManager.getActiveId();
      if (stored && chars.some(c => c.id === stored)) {
        setActiveIdState(stored);
      } else if (chars.length > 0 && !stored) {
        // Auto-select first character if nothing stored
        CharacterManager.setActive(chars[0].id);
        setActiveIdState(chars[0].id);
      } else {
        setActiveIdState(stored);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load characters';
      setError(msg);
      setCharacters([]);
      setActiveIdState(null);
      // Soft: stale JWT is common on public pages
      if (!/401|403|Unauthorized/i.test(msg)) {
        console.warn('[useCharacters]', msg);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Set active character (persists to localStorage + backend) ────────
  const setActive = useCallback((id: string) => {
    CharacterManager.setActive(id);
    setActiveIdState(id);
  }, []);

  // ── Mount + poll ─────────────────────────────────────────────────────
  useEffect(() => {
    fetchCharacters();

    // Poll for backend updates (level-ups, crafting results, etc.)
    pollRef.current = setInterval(fetchCharacters, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchCharacters]);

  // ── Also re-fetch when auth token changes (cross-app SSO login) ──────
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'grudge_auth_token' || e.key === 'grudge_account_id') {
        fetchCharacters();
      }
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('grudge:auth:ready', fetchCharacters);
    window.addEventListener('grudge:auth:rejected', fetchCharacters);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('grudge:auth:ready', fetchCharacters);
      window.removeEventListener('grudge:auth:rejected', fetchCharacters);
    };
  }, [fetchCharacters]);

  const activeCharacter = characters.find(c => c.id === activeId) ?? null;

  return {
    characters,
    loading,
    error,
    activeId,
    activeCharacter,
    setActive,
    refetch: fetchCharacters,
  };
}

// ── Standalone (non-hook) character fetch for non-React contexts ──────

export async function fetchCharactersOnce(): Promise<Character[]> {
  try {
    return await CharacterManager.getAll();
  } catch {
    return [];
  }
}
