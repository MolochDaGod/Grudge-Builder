/**
 * Warlords-era account / connections hub — product surface for grudge.studio
 */
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { WarlordsShell } from '@/components/WarlordsShell';
import { useAccount } from '@/hooks/use-account';
import { useAuth } from '@/contexts/AuthContext';
import { getCurrentUser, getSession, authHeaders, logout } from '@/lib/grudgeBackend';
import { CharacterManager, type Character } from '@/lib/characterManager';
import {
  WARLORDS_CONNECTIONS,
  gcsCreateHeroUrl,
  warlordsLoginUrl,
} from '@/lib/warlordsProduct';
import {
  fetchPlayReadiness,
  resolvePlayDestination,
  playDestinationLabel,
  type PlayReadiness,
} from '@/lib/playHub';
import {
  CheckCircle2,
  XCircle,
  Copy,
  Swords,
  Leaf,
  User,
  ExternalLink,
  Loader2,
} from 'lucide-react';

interface ConnProbe {
  id: string;
  label: string;
  url: string;
  ok: boolean | null;
  detail?: string;
}

export default function WarlordsAccountPage() {
  const [, setLocation] = useLocation();
  const { account, loading } = useAccount();
  const { isAuthenticated, openLogin } = useAuth();
  const user = getCurrentUser();
  const session = getSession();
  const [chars, setChars] = useState<Character[]>([]);
  const [playReady, setPlayReady] = useState<PlayReadiness | null>(null);
  const [playLabel, setPlayLabel] = useState('Play Warlords');
  const [probes, setProbes] = useState<ConnProbe[]>([]);
  const [islandOk, setIslandOk] = useState<boolean | null>(null);

  useEffect(() => {
    CharacterManager.getAll()
      .then(setChars)
      .catch(() => setChars([]));

    fetchPlayReadiness().then(async (r) => {
      setPlayReady(r);
      const dest = await resolvePlayDestination();
      setPlayLabel(playDestinationLabel(dest));
    });

    fetch('/api/island/status', { headers: authHeaders() })
      .then((r) => {
        setIslandOk(r.ok);
        return r.ok ? r.json() : null;
      })
      .catch(() => setIslandOk(false));

    // Connection probes (same-origin + public fleet)
    const list: ConnProbe[] = [
      { id: 'auth', label: 'Grudge ID', url: WARLORDS_CONNECTIONS.auth, ok: null },
      { id: 'api', label: 'Game data API', url: `${WARLORDS_CONNECTIONS.gameData}/api/health`, ok: null },
      { id: 'assets', label: 'Assets CDN', url: `${WARLORDS_CONNECTIONS.assets}/manifest.json`, ok: null },
      { id: 'local', label: 'This client /api/health', url: '/api/health', ok: null },
    ];
    setProbes(list);
    list.forEach(async (p, i) => {
      try {
        const r = await fetch(p.url, { method: 'GET', mode: 'cors' });
        setProbes((prev) => {
          const next = [...prev];
          const idx = next.findIndex((x) => x.id === p.id);
          if (idx >= 0) next[idx] = { ...next[idx], ok: r.ok, detail: `HTTP ${r.status}` };
          return next;
        });
      } catch (e) {
        setProbes((prev) => {
          const next = [...prev];
          const idx = next.findIndex((x) => x.id === p.id);
          if (idx >= 0)
            next[idx] = {
              ...next[idx],
              ok: false,
              detail: e instanceof Error ? e.message : 'failed',
            };
          return next;
        });
      }
    });
  }, []);

  const copy = (t: string) => {
    void navigator.clipboard.writeText(t);
  };

  const grudgeId = user?.grudgeId || account?.grudgeId || '';

  return (
    <WarlordsShell>
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-amber-500/70 mb-1">Warlords era</p>
            <h1
              className="text-3xl font-bold text-amber-400 flex items-center gap-2"
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              <User className="w-7 h-7" />
              Account
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Grudge ID identity · era <code className="text-amber-500/80">warlords</code> only on this product
            </p>
          </div>
          <button
            type="button"
            disabled={!isAuthenticated && !playReady?.signedIn}
            onClick={async () => {
              const dest = await resolvePlayDestination();
              setLocation(dest.path);
            }}
            className="px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 border-0 cursor-pointer disabled:opacity-50"
            style={{
              fontFamily: "'Cinzel', serif",
              background: 'linear-gradient(180deg,#10b981,#059669)',
              color: '#fff',
            }}
          >
            <Swords className="w-4 h-4" />
            {playLabel}
          </button>
        </div>

        {!isAuthenticated && !session && (
          <div className="mb-6 rounded-xl border border-amber-900/40 bg-amber-950/20 p-5">
            <p className="text-sm text-slate-300 mb-3">Sign in with Grudge ID to manage heroes and home island.</p>
            <button
              type="button"
              onClick={() => {
                try {
                  openLogin();
                } catch {
                  window.location.href = warlordsLoginUrl('/account');
                }
              }}
              className="px-4 py-2 rounded-lg text-xs font-bold cursor-pointer border-0"
              style={{ background: 'linear-gradient(180deg,#f6c945,#d8a819)', color: '#20180a' }}
            >
              Sign in
            </button>
          </div>
        )}

        {/* Profile */}
        <section className="rounded-2xl border border-white/10 bg-[#0b0f1e] p-5 mb-5">
          <h2 className="text-sm font-semibold text-amber-400/90 mb-4 tracking-wide">Profile</h2>
          {loading ? (
            <div className="text-slate-500 text-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500 to-red-800 flex items-center justify-center text-xl font-bold text-white">
                  {(account?.displayName || user?.username || 'W')[0].toUpperCase()}
                </div>
                <div>
                  <div className="text-lg font-bold text-white" style={{ fontFamily: "'Cinzel', serif" }}>
                    {account?.displayName || user?.username || 'Warlord'}
                  </div>
                  <div className="text-xs text-slate-500">{session?.type || 'session'} · Warlords era</div>
                </div>
              </div>
              <div className="flex items-center justify-between bg-black/40 rounded-lg px-3 py-2 border border-white/[.06]">
                <div>
                  <div className="text-[10px] text-slate-600 uppercase">Grudge ID</div>
                  <div className="font-mono text-sm text-amber-300">{grudgeId || '—'}</div>
                </div>
                {grudgeId && (
                  <button
                    type="button"
                    className="p-2 text-slate-500 hover:text-amber-400 bg-transparent border-0 cursor-pointer"
                    onClick={() => copy(grudgeId)}
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Warlords roster */}
        <section className="rounded-2xl border border-white/10 bg-[#0b0f1e] p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-amber-400/90 tracking-wide">
              Warlords heroes ({chars.length})
            </h2>
            <button
              type="button"
              onClick={() => {
                window.location.href = gcsCreateHeroUrl();
              }}
              className="text-xs text-amber-400 border border-amber-800/50 px-3 py-1 rounded-md bg-amber-950/30 cursor-pointer"
            >
              Create hero
            </button>
          </div>
          {chars.length === 0 ? (
            <p className="text-sm text-slate-500">No Warlords-era characters yet. Create one in Character Studio.</p>
          ) : (
            <ul className="space-y-2">
              {chars.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between bg-black/30 rounded-lg px-3 py-2 border border-white/[.05]"
                >
                  <div>
                    <div className="text-sm text-white font-medium">{c.name}</div>
                    <div className="text-[11px] text-slate-500">
                      {c.raceId} · {c.classId || '—'} · Lv {c.level ?? 1}
                    </div>
                  </div>
                  <Link href="/home-island">
                    <a className="text-[11px] text-emerald-400 no-underline">Island</a>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {playReady && (
              <>
                <span className={playReady.signedIn ? 'text-emerald-400' : 'text-slate-600'}>
                  {playReady.signedIn ? '● Signed in' : '○ Guest'}
                </span>
                <span className={playReady.hasCharacter ? 'text-amber-400' : 'text-slate-600'}>
                  {playReady.hasCharacter ? '● Hero' : '○ No hero'}
                </span>
                <span className={playReady.hasHomeIsland ? 'text-cyan-400' : 'text-slate-600'}>
                  {playReady.hasHomeIsland ? '● Home island' : '○ No island'}
                </span>
              </>
            )}
          </div>
        </section>

        {/* Home island */}
        <section className="rounded-2xl border border-white/10 bg-[#0b0f1e] p-5 mb-5">
          <h2 className="text-sm font-semibold text-amber-400/90 mb-3 flex items-center gap-2 tracking-wide">
            <Leaf className="w-4 h-4" /> Home island
          </h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setLocation('/home-island')}
              className="px-3 py-1.5 rounded-md text-xs border border-emerald-800/50 text-emerald-400 bg-emerald-950/20 cursor-pointer"
            >
              Open 3D home island
            </button>
            <button
              type="button"
              onClick={() => setLocation('/tutorial')}
              className="px-3 py-1.5 rounded-md text-xs border border-white/10 text-slate-400 bg-transparent cursor-pointer"
            >
              Tutorial
            </button>
            <span className="text-[11px] text-slate-600 self-center">
              Island API {islandOk === null ? '…' : islandOk ? 'ok' : 'unavailable'}
            </span>
          </div>
        </section>

        {/* Connections */}
        <section className="rounded-2xl border border-white/10 bg-[#0b0f1e] p-5 mb-5">
          <h2 className="text-sm font-semibold text-amber-400/90 mb-4 tracking-wide">
            Fleet connections (grudge.studio)
          </h2>
          <ul className="space-y-2">
            {probes.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 text-xs bg-black/30 rounded-lg px-3 py-2 border border-white/[.05]"
              >
                <div className="min-w-0">
                  <div className="text-slate-300 font-medium">{p.label}</div>
                  <div className="text-slate-600 font-mono truncate">{p.url}</div>
                </div>
                <div className="shrink-0 flex items-center gap-1.5">
                  {p.ok === null && <Loader2 className="w-3.5 h-3.5 text-slate-500 animate-spin" />}
                  {p.ok === true && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                  {p.ok === false && <XCircle className="w-4 h-4 text-red-500" />}
                  <span className="text-slate-600 hidden sm:inline">{p.detail}</span>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 grid sm:grid-cols-2 gap-2 text-[11px] text-slate-500">
            <div>
              Characters studio{' '}
              <a
                href={`${WARLORDS_CONNECTIONS.characters}?era=warlords`}
                className="text-amber-500/80 no-underline inline-flex items-center gap-0.5"
                target="_blank"
                rel="noreferrer"
              >
                character.grudge-studio.com <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div>
              Play alias{' '}
              <a
                href={WARLORDS_CONNECTIONS.play}
                className="text-amber-500/80 no-underline"
                target="_blank"
                rel="noreferrer"
              >
                grudgewarlords.com
              </a>
            </div>
          </div>
        </section>

        <div className="flex flex-wrap gap-3">
          <Link href="/lore">
            <a className="text-xs text-slate-400 no-underline hover:text-amber-400">Lore encyclopedia</a>
          </Link>
          <Link href="/hero-codex">
            <a className="text-xs text-slate-400 no-underline hover:text-amber-400">Hero codex</a>
          </Link>
          {(isAuthenticated || session) && (
            <button
              type="button"
              onClick={() => {
                logout();
                window.location.href = '/';
              }}
              className="text-xs text-red-400/80 bg-transparent border-0 cursor-pointer"
            >
              Sign out
            </button>
          )}
        </div>
      </div>
    </WarlordsShell>
  );
}
