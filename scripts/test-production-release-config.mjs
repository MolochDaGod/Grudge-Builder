import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');

test('vercel config includes the grudge.studio production aliases', () => {
  const vercelConfigText = fs.readFileSync(path.join(root, 'vercel.json'), 'utf8');
  const vercelConfig = JSON.parse(
    vercelConfigText,
  );
  assert.ok(vercelConfig.alias.includes('grudge.studio'));
  assert.ok(vercelConfig.alias.includes('www.grudge.studio'));
  assert.equal(vercelConfigText.includes('"source": "/api/:path*"'), false);
  assert.ok(
    vercelConfigText.indexOf('"source": "/api/multiplayer/:path*"') <
      vercelConfigText.indexOf('"source": "/api/(.*)"'),
  );
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
  assert.match(workflow, /vercel deploy --prebuilt --prod --skip-domain --yes/);
  assert.match(workflow, /vercel promote "\$RELEASE_URL" --yes/);
});

function jobBody(workflow, name) {
  const marker = `\n  ${name}:\n`;
  const start = workflow.indexOf(marker);
  assert.ok(start >= 0, `missing job ${name}`);
  const rest = workflow.slice(start + 1);
  const next = rest.slice(1).search(/\n {2}[a-z0-9-]+:\n/);
  return next === -1 ? rest : rest.slice(0, next + 1);
}

test('production deploys are manual, confirmed, and the test realm does not upload Railway', () => {
  const workflow = fs.readFileSync(
    path.join(root, '.github/workflows/production-release.yml'),
    'utf8',
  );
  const testRealm = fs.readFileSync(
    path.join(root, '.github/workflows/vercel-test.yml'),
    'utf8',
  );
  const onBlock = workflow.slice(workflow.indexOf('\non:\n'), workflow.indexOf('\nconcurrency:'));
  const triggerKeys = [...onBlock.matchAll(/^ {2}([A-Za-z0-9_]+):/gm)].map((match) => match[1]);
  assert.deepEqual(triggerKeys, ['workflow_dispatch']);

  const confirm = jobBody(workflow, 'confirm');
  assert.match(confirm, /git fetch --no-tags origin main/);
  assert.match(confirm, /git merge-base --is-ancestor "\$sha" origin\/main/);

  for (const name of ['deploy-api', 'deploy-client']) {
    const body = jobBody(workflow, name);
    assert.match(body, /inputs\.confirm == 'deploy-production'/);
    assert.match(body, /environment:\n {6}name: production\n/);
  }

  assert.equal(testRealm.includes('railway up'), false);
});
