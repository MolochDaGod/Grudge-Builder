import { useAuthGuard } from '@/hooks/use-auth-guard';

export default function HeroCodexPage() {
  const authReady = useAuthGuard();
  if (!authReady) return null;

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
