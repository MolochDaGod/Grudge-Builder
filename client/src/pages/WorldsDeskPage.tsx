/**
 * Account desk for Grudge Warlords and Grudge Social.
 * Routes stay on grudgewarlords.com. Play opens in a named window.
 */
import { useEffect, useState } from 'react';
import { Link, useRoute } from 'wouter';
import { WarlordsShell } from '@/components/WarlordsShell';
import { useAuth } from '@/contexts/AuthContext';
import { characterAPI } from '@/lib/api';
import type { Character } from '@/lib/characterManager';
import { authHeaders } from '@/lib/grudgeBackend';
import { gcsCreateHeroUrl } from '@/lib/warlordsProduct';
import { SPAWN_OVERLAY_WINDOW, SPAWN_PLAY_WINDOW, SPAWN_WORLDS, spawnOverlayPath, spawnWorldById, type SpawnWorld } from '@/lib/spawnWorlds';

type AccountMe = {
  grudgeId?: string;
  username?: string;
  spawnUsername?: string | null;
  spawnUserId?: string | null;
};

export default function WorldsDeskPage() {
  const [, params] = useRoute('/worlds/:worldId');
  const selected = spawnWorldById(params?.worldId);
  const unknownWorld = Boolean(params?.worldId) && !selected;
  const { isAuthenticated, openLogin } = useAuth();
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
      setStatus('');
      return;
    }
    let cancelled = false;
    setBusy(true);
    setStatus('Reading your Grudge account…');
    (async () => {
      try {
        const headers = authHeaders();
        const meRes = await fetch('/api/auth/me', { headers, credentials: 'include' });
        if (meRes.status === 401) {
          if (!cancelled) {
            setMe(null);
            setStatus('Sign in again. This desk saves heroes on your Grudge account.');
          }
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
            ? `Spawn player @${meBody.spawnUsername} is linked. Heroes stay on this Grudge account.`
            : 'Heroes are saved on this Grudge account. Spawn play uses that link as a mirror.',
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

  function openOrganizer(world: SpawnWorld) {
    const overlay = window.open(
      spawnOverlayPath(world.id),
      SPAWN_OVERLAY_WINDOW,
      'popup=yes,width=400,height=720',
    );
    if (!overlay) {
      setStatus('The organizer window was blocked. This tab still holds the account. Allow popups for grudgewarlords.com.');
    }
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
    <WarlordsShell>
      <section className="max-w-6xl mx-auto px-4 py-10">
        <p className="text-[11px] tracking-[0.28em] uppercase text-amber-500/80 mb-2">
          grudgewarlords.com
        </p>
        <h1 className="text-3xl md:text-5xl font-black tracking-wide text-amber-300" style={{ fontFamily: "'Cinzel', serif" }}>
          Your worlds
        </h1>
        <p className="text-slate-400 max-w-2xl mt-3 text-sm leading-relaxed">
          Move between Grudge Warlords and Grudge Social here. Spawn will not run inside this site,
          so the game window uses Spawn's address. Enter also opens a small organizer on
          grudgewarlords.com for the account and the active hero.
        </p>

        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          {isAuthenticated ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg border border-white/15 text-slate-200 bg-transparent cursor-pointer"
            >
              Refresh saved account
            </button>
          ) : (
            <button
              type="button"
              onClick={() => openLogin('/worlds')}
              className="px-4 py-2 rounded-lg font-bold cursor-pointer border-0"
              style={{ background: 'linear-gradient(180deg,#f6c945,#d8a819)', color: '#20180a' }}
            >
              Sign in
            </button>
          )}
          <Link href="/treaty">
            <a className="px-4 py-2 rounded-lg border border-white/15 text-slate-200 no-underline">
              Account social
            </a>
          </Link>
          <Link href="/account">
            <a className="px-4 py-2 rounded-lg border border-white/15 text-slate-200 no-underline">
              Account
            </a>
          </Link>
        </div>

        {status && <p className="mt-4 text-sm text-slate-300">{status}</p>}
        {me?.grudgeId && (
          <p className="mt-1 text-xs text-slate-500">
            Account {me.grudgeId}
            {me.spawnUsername ? ` · Spawn @${me.spawnUsername}` : ' · Spawn link not on this account yet'}
          </p>
        )}

        <div className="grid md:grid-cols-2 gap-4 mt-8">
          {SPAWN_WORLDS.map((world) => {
            const on = selected?.id === world.id;
            return (
              <Link key={world.id} href={`/worlds/${world.id}`}>
                <a
                  className="block rounded-2xl border p-5 no-underline min-h-[150px]"
                  style={{
                    borderColor: on ? 'rgba(246,201,69,.7)' : 'rgba(255,255,255,.1)',
                    background: on ? 'rgba(246,201,69,.08)' : 'rgba(255,255,255,.03)',
                  }}
                >
                  <div className="text-[10px] uppercase tracking-widest text-amber-500/80">{world.detail}</div>
                  <div className="mt-2 text-xl text-white" style={{ fontFamily: "'Cinzel', serif" }}>
                    {world.title}
                  </div>
                  <p className="mt-2 text-sm text-slate-400">
                    {world.id === 'warlords'
                      ? 'Warlords heroes on this account. The world reads the fleet bag mirror.'
                      : 'Links is its own world. Friends on this site stay on Treaty, not a second roster.'}
                  </p>
                </a>
              </Link>
            );
          })}
        </div>

        {unknownWorld && (
          <p className="mt-6 text-sm text-amber-200">That world is not on this desk.</p>
        )}

        {selected && (
          <div className="mt-8 rounded-2xl border border-white/10 p-5">
            <h2 className="text-2xl text-amber-300" style={{ fontFamily: "'Cinzel', serif" }}>
              {selected.title}
            </h2>
            <p className="text-sm text-slate-400 mt-2">
              This tab stays on grudgewarlords.com. The game window goes to {selected.detail}.
              The organizer window is this domain beside the game.
            </p>
            <a
              href={selected.playUrl}
              target={SPAWN_PLAY_WINDOW}
              onClick={() => openOrganizer(selected)}
              className="inline-block mt-4 px-6 py-3 rounded-xl font-bold no-underline"
              style={{ background: 'linear-gradient(180deg,#f6c945,#d8a819)', color: '#20180a' }}
            >
              Enter {selected.title}
            </a>

            {selected.id === 'warlords' && (
              <div className="mt-6">
                <div className="text-xs uppercase tracking-widest text-slate-500 mb-2">Saved Warlords heroes</div>
                {!isAuthenticated && <p className="text-sm text-slate-400">Sign in to see the heroes on your account.</p>}
                {isAuthenticated && heroes.length === 0 && !busy && (
                  <a href={gcsCreateHeroUrl('/worlds/warlords')} className="text-sm text-amber-300">
                    Create a Warlords hero
                  </a>
                )}
                <ul className="grid sm:grid-cols-2 gap-2">
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
              </div>
            )}

            {selected.id === 'social' && (
              <p className="mt-4 text-sm text-slate-300">
                <Link href="/treaty">
                  <a className="text-amber-300">Treaty</a>
                </Link>
                {' '}is the Grudge account social for friends, messages, and groups. It stays on this domain.
                Grudge Social play is the Links world, with its own ledger.
              </p>
            )}
          </div>
        )}
      </section>
    </WarlordsShell>
  );
}
