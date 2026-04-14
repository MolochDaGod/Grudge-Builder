/**
 * useAuthGuard — redirects to login page if the user is not authenticated.
 *
 * Drop this into any page component to protect it:
 *   const ready = useAuthGuard();
 *   if (!ready) return null; // or a loading spinner
 *
 * Checks the Grudge backend token synchronously first, then verifies
 * with the server. If invalid, clears the session and navigates to "/".
 */
import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { isAuthenticated, verifyToken, logout } from '@/lib/grudgeBackend';

/**
 * @returns `true` once auth is confirmed, `false` while checking.
 *          Navigates to "/" if not authenticated.
 */
export function useAuthGuard(): boolean {
  const [, setLocation] = useLocation();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      setLocation('/');
      return;
    }

    verifyToken().then((r) => {
      if (!r.valid) {
        logout();
        setLocation('/');
      } else {
        setReady(true);
      }
    }).catch(() => {
      // Network error — allow offline access if token exists locally
      setReady(true);
    });
  }, [setLocation]);

  return ready;
}
