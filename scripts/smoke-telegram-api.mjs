import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^"|"$/g, '');
  }
}

loadEnv();

const base = process.argv[2] || 'http://127.0.0.1:5000';
const key = process.env.TELEGRAM_BOT_ADMIN_KEY || '';

async function check(path, opts = {}) {
  const res = await fetch(`${base}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  console.log(`${opts.method || 'GET'} ${path} → ${res.status}`);
  console.log(text.slice(0, 300));
}

await check('/api/telegram/account/000000000', { method: 'GET' });
await check('/api/telegram/link', {
  method: 'POST',
  body: JSON.stringify({ telegramUserId: '0', identifier: 'invalid' }),
});