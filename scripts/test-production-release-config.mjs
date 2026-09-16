import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');

test('vercel config includes the grudge.studio production aliases', () => {
  const vercelConfig = JSON.parse(
    fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'),
  );
  assert.ok(vercelConfig.alias.includes('grudge.studio'));
  assert.ok(vercelConfig.alias.includes('www.grudge.studio'));
});

test('production release workflow verifies and probes apex production domains', () => {
  const workflow = fs.readFileSync(
    path.join(root, '.github/workflows/production-release.yml'),
    'utf8',
  );
  const deploymentProbe = fs.readFileSync(
    path.join(root, 'scripts/probe-deployments.mjs'),
    'utf8',
  );

  for (const domain of [
    'grudge.studio',
    'www.grudge.studio',
    'grudgewarlords.com',
    'client.grudge-studio.com',
  ]) {
    assert.match(workflow, new RegExp(domain.replace(/\./g, '\\.')));
  }

  assert.match(deploymentProbe, /https:\/\/grudge\.studio/);
  assert.match(deploymentProbe, /https:\/\/www\.grudge\.studio/);
  assert.match(workflow, /vercel promote "\$RELEASE_URL" --yes/);
});
