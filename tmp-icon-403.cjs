const https = require('https');

function fetch(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        method: 'GET',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
          ...headers,
        },
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () =>
          resolve({
            status: res.statusCode,
            ct: res.headers['content-type'],
            len: Buffer.concat(chunks).length,
            corp: res.headers['cross-origin-resource-policy'],
            acao: res.headers['access-control-allow-origin'],
          }),
        );
      },
    );
    req.on('error', reject);
    req.end();
  });
}

const url = 'https://assets.grudge-studio.com/icons/pack/weapons/Sword_01.png';
const cases = [
  ['no-extra', {}],
  ['referer-puter', { Referer: 'https://grudge-crafting.puter.site/' }],
  ['origin-puter', { Origin: 'https://grudge-crafting.puter.site' }],
  [
    'both-puter',
    {
      Origin: 'https://grudge-crafting.puter.site',
      Referer: 'https://grudge-crafting.puter.site/',
    },
  ],
  ['referer-warlords', { Referer: 'https://grudgewarlords.com/' }],
  ['referer-client', { Referer: 'https://client.grudge-studio.com/' }],
  ['referer-empty', { Referer: '' }],
];

(async () => {
  for (const [name, h] of cases) {
    try {
      const r = await fetch(url, h);
      console.log(name, r.status, r.ct, 'len=' + r.len, 'corp=' + r.corp, 'acao=' + r.acao);
    } catch (e) {
      console.log(name, 'ERR', e.message);
    }
  }
  // info
  const info = 'https://info.grudge-studio.com/icons/pack/weapons/Sword_01.png';
  for (const [name, h] of [
    ['info-no', {}],
    ['info-puter-ref', { Referer: 'https://grudge-crafting.puter.site/' }],
  ]) {
    const r = await fetch(info, h);
    console.log(name, r.status, r.ct, 'len=' + r.len);
  }
})();
