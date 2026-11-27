/**
 * Compact organizer that stays on grudgewarlords.com beside a Spawn game window.
 * Spawn's frame-ancestors policy blocks an iframe, so this is not a frame around the game.
 * Account reads are the existing Grudge session. Nothing here is a second bag.
 */
import { useEffect, useState } from 'react';
import { WarlordsShell } from '@/components/WarlordsShell';
import { useAuth } from '@/contexts/AuthContext';
import { characterAPI } from '@/lib/api';
import type { Character } from '@/lib/characterManager';
import { authHeaders } from '@/lib/grudgeBackend';
import { gcsCreateHeroUrl } from '@/lib/warlordsProduct';
import { SPAWN_PLAY_WINDOW, SPAWN_WORLDS, spawnWorldById, type SpawnWorld } from '@/lib/spawnWorlds';

type AccountMe = {
  grudgeId?: string;
  spawnUsername?: string | null;
};

function worldFromLocation(): SpawnWorld {
  const id = new URLSearchParams(window.location.search).get('world') || 'warlords';
  return spawnWorldById(id) ?? SPAWN_WORLDS[0];
}

export default function WorldsOverlayPage() {
  const { isAuthenticated, openLogin } = useAuth();
  const [selected, setSelected] = useState<SpawnWorld>(worldFromLocation);
  const [me, setMe] = useState<AccountMe | null>(null);
  const [heroes, setHeroes] = useState<Character[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setMe(null);
      setHeroes([]);
      setActiveId(null);
      return;
    }
    let cancelled = false;
    setBusy(true);
    (async () => {
      try {
        const headers = authHeaders();
        const meRes = await fetch('/api/auth/me', { headers, credentials: 'include' });
        if (meRes.status === 401) {
          if (!cancelled) setStatus('Sign in again. This window saves heroes on your Grudge account.');
          return;
        }
        const meBody = meRes.ok ? ((await meRes.json()) as AccountMe) : null;
        const roster = await characterAPI.getAll('warlords');
        if (cancelled) return;
        setMe(meBody);
        setHeroes(roster.slice(0, 4));
        const marked = roster.find((hero) => (hero as Character & { activeForEra?: boolean }).activeForEra);
        setActiveId(marked?.id || roster[0]?.id || null);
        setStatus(
          meBody?.spawnUsername
            ? `Spawn @${meBody.spawnUsername} is linked to this Grudge account.`
            : 'Heroes stay on this Grudge account. Spawn reads that link as a mirror.',
        );
      } catch {
        if (!cancelled) setStatus('The account could not be read. Your heroes were not changed.');
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  function focusWorld(world: SpawnWorld) {
    const game = window.open(world.playUrl, SPAWN_PLAY_WINDOW);
    const next = `/worlds/overlay?world=${world.id}`;
    window.history.replaceState({}, '', next);
    setSelected(world);
    setStatus(
      game
        ? `${world.title} is in the game window. This window stays on grudgewarlords.com.`
        : 'The game window was blocked. Allow popups for grudgewarlords.com, then switch again.',
    );
  }

  async function chooseHero(id: string) {
    setBusy(true);
    try {
      await characterAPI.activate(id, 'warlords');
      setActiveId(id);
      setStatus('That hero is the active Warlords character on your account.');
    } catch {
      setStatus('The hero could not be saved as active. Nothing else was written.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <WarlordsShell bare>
      <main className="min-h-screen text-[#eef2ff] px-4 py-4" style={{ background: '#05060c' }}>
        <p className="text-[11px] tracking-[0.22em] uppercase text-amber-500/80">grudgewarlords.com</p>
        <h1 className="mt-1 text-2xl text-amber-300" style={{ fontFamily: "'Cinzel', serif" }}>
          Organizer
        </h1>
        <p className="mt-2 text-sm text-slate-400 leading-relaxed">
          The game window uses Spawn's address. Spawn will not run inside this domain.
          This window is the account: worlds, the active hero, and the Grudge id.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {SPAWN_WORLDS.map((world) => {
            const on = selected.id === world.id;
            return (
              <button
                key={world.id}
                type="button"
                onClick={() => focusWorld(world)}
                className="rounded-xl border px-3 py-3 text-left cursor-pointer bg-transparent"
                style={{
                  borderColor: on ? 'rgba(246,201,69,.7)' : 'rgba(255,255,255,.12)',
                  background: on ? 'rgba(246,201,69,.08)' : 'transparent',
                }}
              >
                <div className="text-sm text-white" style={{ fontFamily: "'Cinzel', serif" }}>{world.title}</div>
                <div className="text-[10px] text-slate-500 mt-1">{world.detail}</div>
              </button>
            );
          })}
        </div>

        {status && <p className="mt-3 text-sm text-slate-300">{status}</p>}
        {me?.grudgeId && (
          <p className="mt-1 text-xs text-slate-500">
            Account {me.grudgeId}
            {me.spawnUsername ? ` · Spawn @${me.spawnUsername}` : ' · Spawn link not on this account yet'}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          {isAuthenticated ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => window.location.reload()}
              className="px-3 py-2 rounded-lg border border-white/15 text-slate-200 bg-transparent cursor-pointer"
            >
              Refresh
            </button>
          ) : (
            <button
              type="button"
              onClick={() => openLogin(`/worlds/overlay?world=${selected.id}`)}
              className="px-3 py-2 rounded-lg font-bold cursor-pointer border-0"
              style={{ background: 'linear-gradient(180deg,#f6c945,#d8a819)', color: '#20180a' }}
            >
              Sign in
            </button>
          )}
          <a
            href={`/worlds/${selected.id}`}
            target="grudgeDesk"
            className="px-3 py-2 rounded-lg border border-white/15 text-slate-200 no-underline"
          >
            Full desk
          </a>
        </div>

        {selected.id === 'warlords' && (
          <section className="mt-5">
            <div className="text-xs uppercase tracking-widest text-slate-500 mb-2">Saved Warlords heroes</div>
            {!isAuthenticated && <p className="text-sm text-slate-400">Sign in to see the heroes on your account.</p>}
            {isAuthenticated && heroes.length === 0 && !busy && (
              <a href={gcsCreateHeroUrl('/worlds/warlords')} className="text-sm text-amber-300">
                Create a Warlords hero
              </a>
            )}
            <ul className="grid gap-2">
              {heroes.map((hero) => (
                <li key={hero.id}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => chooseHero(hero.id)}
                    className="w-full text-left rounded-xl border px-3 py-2 cursor-pointer bg-transparent"
                    style={{
                      borderColor: activeId === hero.id ? 'rgba(246,201,69,.7)' : 'rgba(255,255,255,.12)',
                      color: '#eef2ff',
                    }}
                  >
                    <div className="font-semibold">{hero.name}</div>
                    <div className="text-[11px] text-slate-400">
                      Level {hero.level}
                      {hero.grudgeCode ? ` · ${hero.grudgeCode}` : ''}
                      {activeId === hero.id ? ' · active' : ''}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {selected.id === 'social' && (
          <p className="mt-5 text-sm text-slate-300">
            <a href="/treaty" target="grudgeDesk" className="text-amber-300">Treaty</a>
            {' '}is the Grudge account social. It stays on this domain. Links play is the other window, with its own ledger.
          </p>
        )}
      </main>
    </WarlordsShell>
  );
}
