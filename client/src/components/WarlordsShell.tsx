/**
 * Warlords product chrome — landing, lore, account (grudge.studio + grudgewarlords.com).
 */
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { WARLORDS_NAV, warlordsLoginUrl, WARLORDS_CONNECTIONS } from '@/lib/warlordsProduct';
import { LogIn, LogOut, Swords } from 'lucide-react';

export function WarlordsShell({
  children,
  bare = false,
}: {
  children: React.ReactNode;
  bare?: boolean;
}) {
  const [loc] = useLocation();
  const { isAuthenticated, user, openLogin, handleLogout } = useAuth();

  if (bare) return <>{children}</>;

  const path = loc.split('?')[0] || '/';

  return (
    <div
      className="min-h-screen text-[#eef2ff] relative"
      style={{ background: '#05060c', fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* Subtle page grain / void wash so empty sections never feel flat black */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(246,201,69,.07), transparent 50%), radial-gradient(ellipse 60% 40% at 100% 50%, rgba(80,60,140,.06), transparent), radial-gradient(ellipse 50% 30% at 0% 80%, rgba(40,80,120,.05), transparent)',
        }}
      />
      <div className="relative z-10">
      <header
        className="sticky top-0 z-50 border-b border-white/[.06]"
        style={{ background: 'rgba(5,6,12,.92)', backdropFilter: 'blur(16px)' }}
      >
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Link asChild href="/">
            <a className="flex items-center gap-2.5 no-underline group">
              <img
                src="/grudge-logo.png"
                alt=""
                className="w-8 h-8 rounded"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <div>
                <div
                  className="font-bold tracking-[0.2em] text-sm"
                  style={{
                    fontFamily: "'Cinzel', serif",
                    background: 'linear-gradient(90deg,#f6c945,#fff3c2 50%,#f6c945)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  GRUDGE WARLORDS
                </div>
                <div className="text-[9px] text-slate-500 tracking-widest uppercase">
                  Era · grudge.studio
                </div>
              </div>
            </a>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {WARLORDS_NAV.map((item) => {
              const active =
                item.href === '/'
                  ? path === '/' || path === '/intro'
                  : path === item.href || path.startsWith(item.href + '/');
              if (item.primary) {
                return (
                  <Link asChild key={item.id} href={item.href}>
                    <a
                      className="ml-2 flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold tracking-wider no-underline"
                      style={{
                        fontFamily: "'Cinzel', serif",
                        background: 'linear-gradient(180deg,#f6c945,#d8a819)',
                        color: '#20180a',
                      }}
                    >
                      <Swords className="w-3.5 h-3.5" />
                      {item.label}
                    </a>
                  </Link>
                );
              }
              return (
                <Link asChild key={item.id} href={item.href}>
                  <a
                    className="px-3 py-2 rounded-md text-xs font-medium tracking-wide no-underline transition-colors"
                    style={{
                      color: active ? '#f6c945' : '#9aa3c7',
                      background: active ? 'rgba(246,201,69,.08)' : 'transparent',
                    }}
                  >
                    {item.label}
                  </a>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <Link asChild href="/account">
                  <a className="text-xs text-amber-400/90 hidden sm:inline no-underline hover:text-amber-300">
                    {user?.username || 'Warlord'}
                  </a>
                </Link>
                <button
                  type="button"
                  onClick={() => handleLogout()}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] text-slate-400 border border-white/10 hover:border-white/20 hover:text-white bg-transparent cursor-pointer"
                >
                  <LogOut className="w-3 h-3" />
                  Out
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  // Canonical Grudge ID SSO (id.grudge-studio.com) — not in-app modal
                  try {
                    openLogin(typeof window !== 'undefined' ? window.location.pathname || '/home' : '/home');
                  } catch {
                    window.location.href = warlordsLoginUrl('/account');
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-[#cfd5f5] border border-white/12 bg-white/[.04] hover:bg-white/[.08] cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign in
              </button>
            )}
          </div>
        </div>

        {/* Mobile nav */}
        <div className="md:hidden flex gap-1 px-3 pb-2 overflow-x-auto">
          {WARLORDS_NAV.map((item) => (
            <Link asChild key={item.id} href={item.href}>
              <a
                className="shrink-0 px-3 py-1.5 rounded-full text-[11px] no-underline border border-white/10 text-slate-300"
                style={
                  item.primary
                    ? { background: 'rgba(246,201,69,.15)', color: '#f6c945', borderColor: 'rgba(246,201,69,.35)' }
                    : undefined
                }
              >
                {item.label}
              </a>
            </Link>
          ))}
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-white/[.06] mt-16">
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row gap-4 justify-between text-[11px] text-slate-500">
          <div>
            <div className="font-cinzel tracking-widest text-amber-500/80 mb-1">GRUDGE WARLORDS</div>
            <div>By Racalvin the Pirate King · Grudge Studio</div>
            <div className="mt-1 text-slate-600">
              Auth {WARLORDS_CONNECTIONS.auth.replace('https://', '')} · Assets CDN · Railway game data
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link asChild href="/heroes"><a className="text-slate-400 hover:text-amber-400 no-underline">Characters</a></Link>
            <Link asChild href="/arsenal"><a className="text-slate-400 hover:text-amber-400 no-underline">Arsenal</a></Link>
            <Link asChild href="/professions"><a className="text-slate-400 hover:text-amber-400 no-underline">Professions</a></Link>
            <Link asChild href="/skill-tree"><a className="text-slate-400 hover:text-amber-400 no-underline">Skills</a></Link>
            <Link asChild href="/lore"><a className="text-slate-400 hover:text-amber-400 no-underline">Lore</a></Link>
            <Link asChild href="/account"><a className="text-slate-400 hover:text-amber-400 no-underline">Account</a></Link>
            <a
              href="/lore/tome-of-seasons-and-gods.html"
              className="text-slate-400 hover:text-amber-400 no-underline"
            >
              Black Tome
            </a>
            <a
              href={WARLORDS_CONNECTIONS.engineGallery}
              className="text-slate-500 hover:text-slate-300 no-underline"
              target="_blank"
              rel="noreferrer"
            >
              Engine gallery
            </a>
          </div>
        </div>
      </footer>
      </div>
    </div>
  );
}
