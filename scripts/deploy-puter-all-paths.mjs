#!/usr/bin/env node
/** Shotgun deploy crafting bundle to all known FS paths. */
import { ensureAuth } from './lib/puter-auth.mjs';
import { deployPathsForUser, deployCraftingToPaths } from './lib/puter-deploy.mjs';

const auth = await ensureAuth();
const paths = deployPathsForUser(auth.username);
console.log(`Shotgun deploy as ${auth.username} (${paths.length} paths)...\n`);
const results = await deployCraftingToPaths(auth.token, paths);
for (const u of results) {
  console.log(u.ok ? `✓ ${u.dir}` : `✗ ${u.dir} — ${u.error?.slice(0, 80)}`);
}
console.log('\nDone. Verify: npm run puter:whoami && npm run deploy:puter:crafting\n');