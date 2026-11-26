/**
 * Simple redirect component for route aliases.
 * Preserves query parameters during redirect.
 */
import { useEffect } from 'react';
import { useLocation } from 'wouter';

interface RouteRedirectProps {
  to: string;
}

export function RouteRedirect({ to }: RouteRedirectProps) {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Preserve query parameters and hash
    const search = window.location.search;
    const hash = window.location.hash;
    setLocation(to + search + hash, { replace: true });
  }, [to, setLocation]);

  return null;
}
