/**
 * useAuthGuard — verifies auth state for protected pages.
 *
 * Drop this into any page component to protect it:
 *   const ready = useAuthGuard();
 *   if (!ready) return null; // or a loading spinner
 *
 * No longer redirects to a login page — auth is handled via the
 * Grudge auth modal (grudge-auth-modal.js) or the Grudge ID SSO.
 */
import { useEffect, useState } from 'react';
import { isAuthenticated, verifyToken, logout } from '@/lib/grudgeBackend';

/**
 * @returns `true` once auth is confirmed or guest access is detected,
 *          `false` while the token is still being verified.
 */
export function useAuthGuard(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      // No token — allow access; auth modal will prompt when needed
      setReady(true);
      return;
    }

    verifyToken().then((r) => {
      if (!r.valid) {
        logout();
      }
      setReady(true);
    }).catch(() => {
      // Network error — allow offline access if token exists locally
      setReady(true);
    });
  }, []);

  return ready;
}
