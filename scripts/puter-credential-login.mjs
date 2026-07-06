#!/usr/bin/env node
/** @deprecated Use: npm run puter:login  or  node scripts/grudge-puter.mjs login */
import { credentialLogin } from './lib/puter-auth.mjs';

const user = process.env.PUTER_USER || process.argv[2];
const pass = process.env.PUTER_PASS || process.argv[3];
if (!user || !pass) {
  console.error('Usage: PUTER_USER=... PUTER_PASS=... npm run puter:login');
  process.exit(1);
}
const r = await credentialLogin(user, pass);
console.log(`✓ Logged in as ${r.username}`);
console.log(`✓ Token saved to ${r.configPath}`);