import fs from 'fs';

const j = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
j.redirects = (j.redirects || []).filter(
  (r) => !(r.has && r.has.some((h) => h.value === 'craft.grudgewarlords.com')),
);
j.redirects.unshift(
  {
    source: '/',
    has: [{ type: 'host', value: 'craft.grudgewarlords.com' }],
    destination: 'https://grudgewarlords.com/craft/',
    permanent: false,
  },
  {
    source: '/((?!api/).*)',
    has: [{ type: 'host', value: 'craft.grudgewarlords.com' }],
    destination: 'https://grudgewarlords.com/craft/$1',
    permanent: false,
  },
);
// Drop non-working host rewrites (SPA index wins on /)
j.rewrites = (j.rewrites || []).filter(
  (r) => !(r.has && r.has.some((h) => h.value === 'craft.grudgewarlords.com')),
);
fs.writeFileSync('vercel.json', JSON.stringify(j, null, 2) + '\n');
console.log('craft redirects:', JSON.stringify(j.redirects.slice(0, 2), null, 2));
