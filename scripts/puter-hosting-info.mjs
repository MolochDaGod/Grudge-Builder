import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const env = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '..', '.env'), 'utf-8');
for (const key of ['PUTER_API_KEY', 'PUTER_AUTH_TOKEN']) {
  const m = env.match(new RegExp(`^${key}=(.+)$`, 'm'));
  if (!m) continue;
  const token = m[1].replace(/^["']|["']$/g, '').trim();
  const res = await fetch('https://api.puter.com/drivers/call', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;actually=json' },
    body: JSON.stringify({
      interface: 'puter-subdomains',
      method: 'read',
      args: { id: { subdomain: 'grudge-crafting' } },
      auth_token: token,
    }),
  });
  const text = await res.text();
  console.log(`\n${key} (${res.status}):`, text.slice(0, 600));
}