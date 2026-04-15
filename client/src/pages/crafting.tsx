import { useRef, useEffect, useState } from 'react';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import { CharacterManager } from '@/lib/characterManager';
import { getToken } from '@/lib/grudgeBackend';

const CRAFTING_ORIGIN = 'https://grudge-crafting.puter.site';

export default function CraftingPage() {
  const authReady  = useAuthGuard();
  const iframeRef  = useRef<HTMLIFrameElement>(null);
  const [iframeSrc, setIframeSrc] = useState('');

  // Build iframe URL with auth + active character embedded as query params.
  // The crafting site reads these on load so it can hydrate the crafter
  // without needing a separate auth step.
  useEffect(() => {
    if (!authReady) return;
    const token       = getToken() ?? '';
    const characterId = CharacterManager.getActiveId() ?? '';
    const url = new URL(CRAFTING_ORIGIN + '/');
    if (token)       url.searchParams.set('token',       token);
    if (characterId) url.searchParams.set('characterId', characterId);
    setIframeSrc(url.toString());
  }, [authReady]);

  // PostMessage bridge — send auth payload once the iframe signals readiness,
  // AND re-send whenever the user switches characters on the Account page.
  useEffect(() => {
    const sendPayload = () => {
      const frame = iframeRef.current?.contentWindow;
      if (!frame) return;
      frame.postMessage(
        {
          type:        'GRUDGE_AUTH',
          token:       getToken() ?? '',
          characterId: CharacterManager.getActiveId() ?? '',
          grudgeId:    localStorage.getItem('grudge_id') ?? '',
          username:    localStorage.getItem('grudge_username') ?? '',
        },
        CRAFTING_ORIGIN,
      );
    };

    // Listen for readiness ping from crafting site
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== CRAFTING_ORIGIN) return;
      if (e.data?.type === 'GRUDGE_READY') sendPayload();
    };
    window.addEventListener('message', onMessage);

    // Re-send when user picks a different character on the Account page
    const onCharChange = (e: Event) => {
      const id = (e as CustomEvent).detail?.characterId;
      if (id) CharacterManager.setActive(id);
      sendPayload();
    };
    window.addEventListener('grudge:character:selected', onCharChange);

    return () => {
      window.removeEventListener('message', onMessage);
      window.removeEventListener('grudge:character:selected', onCharChange);
    };
  }, []);

  if (!authReady || !iframeSrc) return null;

  return (
    <iframe
      ref={iframeRef}
      src={iframeSrc}
      title="Grudge Crafting"
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
