/**
 * Hero Codex — public static codex (no login required).
 * Serves client/public/hero-codex/index.html + heroes-canonical.json.
 */
export default function HeroCodexPage() {
  // Prefer hard navigation so static assets resolve under /hero-codex/
  // (SPA iframe can 404 portrait keys before public files ship).
  if (typeof window !== 'undefined') {
    const path = window.location.pathname.replace(/\/$/, '');
    if (path === '/hero-codex') {
      window.location.replace('/hero-codex/index.html');
      return null;
    }
  }

  return (
    <iframe
      src="/hero-codex/index.html"
      title="Hero Codex"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        border: 'none',
        margin: 0,
        padding: 0,
        overflow: 'hidden',
        zIndex: 9999,
      }}
      allowFullScreen
    />
  );
}
