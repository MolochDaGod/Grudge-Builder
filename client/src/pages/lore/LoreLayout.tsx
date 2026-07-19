import { Link, useLocation } from 'wouter';
import { WarlordsShell } from '@/components/WarlordsShell';

const LORE_TABS = [
  { href: '/lore', label: 'Overview', exact: true },
  { href: '/lore/gods', label: 'Gods' },
  { href: '/lore/factions', label: 'Factions' },
  { href: '/lore/heroes', label: 'Heroes' },
  { href: '/lore/world', label: 'World' },
  { href: '/lore/sectors', label: 'Sectors' },
];

export function LoreLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const [loc] = useLocation();
  const path = loc.split('?')[0];

  return (
    <WarlordsShell>
      <div className="max-w-6xl mx-auto px-4 py-10">
        <p className="text-[10px] tracking-[0.3em] uppercase text-amber-500/70 mb-2">Warlords lore</p>
        <h1
          className="text-3xl md:text-4xl font-bold text-amber-400 mb-2"
          style={{ fontFamily: "'Cinzel', serif" }}
        >
          {title}
        </h1>
        {subtitle && <p className="text-slate-400 text-sm max-w-2xl mb-6">{subtitle}</p>}

        <div className="flex flex-wrap gap-2 mb-8 border-b border-white/[.06] pb-3">
          {LORE_TABS.map((t) => {
            const active = t.exact ? path === t.href : path === t.href || path.startsWith(t.href + '/');
            return (
              <Link key={t.href} href={t.href}>
                <a
                  className="px-3 py-1.5 rounded-full text-xs no-underline border transition-colors"
                  style={{
                    borderColor: active ? 'rgba(246,201,69,.4)' : 'rgba(255,255,255,.08)',
                    color: active ? '#f6c945' : '#9aa3c7',
                    background: active ? 'rgba(246,201,69,.08)' : 'transparent',
                  }}
                >
                  {t.label}
                </a>
              </Link>
            );
          })}
          <Link href="/hero-codex">
            <a className="px-3 py-1.5 rounded-full text-xs no-underline border border-white/10 text-slate-500">
              Full codex →
            </a>
          </Link>
        </div>

        {children}
      </div>
    </WarlordsShell>
  );
}
