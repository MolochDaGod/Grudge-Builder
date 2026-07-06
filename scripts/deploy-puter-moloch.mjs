#!/usr/bin/env node
/** Deploy grudge-crafting.puter.site — MolochDaDev account. */
import { ensureAuth } from './lib/puter-auth.mjs';
import { deployCraftingSite } from './lib/puter-deploy.mjs';

const auth = await ensureAuth();
console.log(`✓ Auth: ${auth.username}`);
const result = await deployCraftingSite(auth.token, auth.username);
for (const u of result.uploads) {
  console.log(u.ok ? `✓ ${u.dir}` : `✗ ${u.dir} — ${u.error?.slice(0, 80)}`);
}
if (result.bound) console.log(`✓ hosting → ${result.bound}`);
console.log(`\n✅ ${result.url}\n`);