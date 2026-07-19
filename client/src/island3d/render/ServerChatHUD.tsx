/**
 * ServerChatHUD — authoritative Colyseus chat feed (multiplayer).
 */
import { useEffect, useRef, useState } from 'react';
import type { ServerChatEvent } from '@shared/network/syncProtocol';
import { getNetworkManager } from '@/lib/network/NetworkManager';

export function ServerChatHUD({ enabled = true }: { enabled?: boolean }) {
  const [lines, setLines] = useState<ServerChatEvent[]>([]);
  const [draft, setDraft] = useState('');
  const [open, setOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled) return;
    const nm = getNetworkManager();
    const off = nm.on('chat', (msg) => {
      setLines((prev) => [...prev.slice(-40), msg]);
      setOpen(true);
    });
    return off;
  }, [enabled]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        const t = document.activeElement?.tagName;
        if (t === 'INPUT' || t === 'TEXTAREA') return;
        setOpen(true);
        // focus handled by click-to-type; Enter alone opens
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled]);

  if (!enabled) return null;

  const send = () => {
    const t = draft.trim();
    if (!t) return;
    getNetworkManager().sendChat(t);
    setDraft('');
  };

  return (
    <div className="absolute bottom-28 left-3 z-40 w-80 max-w-[90vw] pointer-events-auto">
      <div
        className={`rounded-xl border border-white/10 bg-black/75 backdrop-blur text-[11px] text-slate-200 overflow-hidden transition-all ${
          open ? 'opacity-100' : 'opacity-70'
        }`}
      >
        <div className="px-2 py-1 border-b border-white/10 flex justify-between items-center">
          <span className="text-[10px] uppercase tracking-widest text-cyan-400/80">Server chat</span>
          <button
            type="button"
            className="text-slate-500 hover:text-white text-[10px]"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? '−' : '+'}
          </button>
        </div>
        {open && (
          <>
            <div className="max-h-36 overflow-y-auto px-2 py-1 space-y-0.5 font-mono">
              {lines.length === 0 && (
                <p className="text-slate-600 text-[10px]">No messages yet. Type below.</p>
              )}
              {lines.map((l, i) => (
                <div key={`${l.timestamp}-${i}`}>
                  <span className="text-amber-400/90">{l.senderName}</span>
                  <span className="text-slate-500">: </span>
                  <span className="text-slate-200">{l.text}</span>
                </div>
              ))}
              <div ref={endRef} />
            </div>
            <div className="flex border-t border-white/10">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    send();
                  }
                }}
                maxLength={200}
                placeholder="Message room…"
                className="flex-1 bg-transparent px-2 py-1.5 text-[11px] outline-none text-white placeholder:text-slate-600"
              />
              <button
                type="button"
                onClick={send}
                className="px-3 text-[10px] text-cyan-300 hover:text-cyan-100"
              >
                Send
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
