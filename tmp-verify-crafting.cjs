const https = require('https');
function get(u) {
  return new Promise((res, rej) => {
    https
      .get(u, { headers: { 'Cache-Control': 'no-cache' } }, (r) => {
        let d = '';
        r.on('data', (c) => (d += c));
        r.on('end', () => res(d));
      })
      .on('error', rej);
  });
}
(async () => {
  const t = Date.now();
  const html = await get('https://grudge-crafting.puter.site/?nocache=' + t);
  const fleet = await get('https://grudge-crafting.puter.site/grudge-fleet.js?nocache=' + t);
  console.log('VERSION', (html.match(/VERSION:\s*'([^']+)'/) || [])[1]);
  console.log('topCharSelect', html.includes('topCharSelect'));
  console.log('buildCraftingLoginUrl', html.includes('buildCraftingLoginUrl'));
  console.log('syncTopBar', html.includes('function syncTopBar'));
  console.log('earlySso', html.includes('earlySsoCapture'));
  console.log('assetsPack', (html.match(/assets\.grudge-studio\.com\/icons\/pack\//g) || []).length);
  console.log('infoPack', (html.match(/info\.grudge-studio\.com\/icons\/pack\//g) || []).length);
  console.log('infoSkills', (html.match(/info\.grudge-studio\.com\/icons\/skills\//g) || []).length);
  console.log('fleetVer', (fleet.match(/version:\s*'([^']+)'/) || [])[1]);
  console.log('forceRemote', fleet.includes('forceRemote'));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
