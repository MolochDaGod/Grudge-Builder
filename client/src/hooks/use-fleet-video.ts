import { useEffect, useState } from 'react';
import { resolveFleetVideo, type FleetVideoKey } from '@/lib/fleetVideo';

/** Resolve a fleet catalog video URL (R2 CDN with API override). */
export function useFleetVideo(catalogKey: FleetVideoKey): string | null {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void resolveFleetVideo(catalogKey).then((url) => {
      if (!cancelled) setSrc(url);
    });
    return () => {
      cancelled = true;
    };
  }, [catalogKey]);

  return src;
}