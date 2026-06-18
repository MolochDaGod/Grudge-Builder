/**
 * Legacy → CDN path normalization.
 * Maps pre-migration /assets/* paths to ObjectStore/R2 layout.
 */

const PREFIX_MAP: ReadonlyArray<{ old: string; next: string }> = [
  { old: '/assets/backgrounds/', next: '/backgrounds/' },
  { old: '/assets/events/', next: '/images/events/' },
  { old: '/assets/misc/', next: '/images/misc/' },
  { old: '/assets/pirate/', next: '/sprites/pirate/' },
  { old: '/assets/portraits/', next: '/images/portraits/' },
  { old: '/assets/professions/', next: '/images/professions/' },
  { old: '/assets/ui/sigils/', next: '/icons/sigils/' },
  { old: '/assets/ui/', next: '/images/ui/' },
  { old: '/assets/videos/', next: '/videos/' },
  { old: '/assets/skill-icons/', next: '/images/skill-icons/' },
];

/**
 * Rewrite a legacy asset path to the canonical CDN-relative path.
 * Absolute URLs and already-migrated paths pass through unchanged.
 */
export function normalizeAssetPath(path: string): string {
  if (!path || path.startsWith('http') || path.startsWith('data:') || path.startsWith('blob:')) {
    return path;
  }

  const withSlash = path.startsWith('/') ? path : `/${path}`;

  for (const { old, next } of PREFIX_MAP) {
    if (withSlash.startsWith(old)) {
      return next + withSlash.slice(old.length);
    }
  }

  return withSlash;
}