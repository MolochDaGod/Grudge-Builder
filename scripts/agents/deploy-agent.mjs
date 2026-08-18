#!/usr/bin/env node
/**
 * Deployment Agent — orchestrates production ship across surfaces.
 *
 *   node scripts/agents/deploy-agent.mjs plan
 *   node scripts/agents/deploy-agent.mjs ship --yes [--api] [--client] [--content] [--full]
 *   node scripts/agents/deploy-agent.mjs verify
 *
 * Default ship: --api (grudge-api Railway) so multiplayer REST lands.
 * --full runs content publish + api + client.
 *
 * Human gates: --yes required outside CI. Never force-push / drop DB.
 */
import {
  ROOT,
  URLS,
  run,
  probe,
  writeReport,
  log,
  argFlag,
} from './lib.mjs';

const AGENT = 'deploy-agent';
const cmd = process.argv[2] || 'plan';

const PLAN = [
  {
    id: 'content',
    title: 'Publish sector production content + dossiers',
    npm: ['run', 'production:publish-sectors'],
    optionalNpm: [['run', 'production:publish-dossiers']],
    flag: '--content',
  },
  {
    id: 'api',
    title: 'Railway grudge-api deploy',
    agent: ['node', 'scripts/agents/railway-agent.mjs', 'deploy', '--yes', '--detach'],
    flag: '--api',
    defaultOn: true,
  },
  {
    id: 'client',
    title: 'Vercel production client',
    shell: 'node scripts/vercel-prod-guard.mjs && npx vercel deploy --prod --yes',
    flag: '--client',
  },
  {
    id: 'verify',
    title: 'Post-deploy probe gate',
    agent: ['node', 'scripts/agents/railway-agent.mjs', 'probe'],
    always: true,
  },
];

function selectedSurfaces() {
  const full = argFlag('--full');
  const anyExplicit =
    argFlag('--api') || argFlag('--client') || argFlag('--content') || argFlag('--workers');
  return {
    content: full || argFlag('--content'),
    api: full || argFlag('--api') || !anyExplicit,
    client: full || argFlag('--client'),
    workers: full || argFlag('--workers'),
  };
}

function printPlan() {
  const sel = selectedSurfaces();
  log(AGENT, 'Production deploy plan (Warlords)');
  log(AGENT, `cwd=${ROOT}`);
  console.log(`
Surfaces selected: ${JSON.stringify(sel)}

Order:
  1. [preflight]  live-ops probe (critical URLs)
  2. [content]    production:publish-sectors (+ dossiers)   ${sel.content ? 'ON' : 'off'}
  3. [api]        railway-agent deploy grudge-api           ${sel.api ? 'ON' : 'off'}
  4. [client]     vercel --prod                             ${sel.client ? 'ON' : 'off'}
  5. [verify]     health + colyseus + multiplayer/status

Safety:
  - Requires --yes outside CI
  - No DB drops, no secret print, no force-push
  - Multiplayer /status 404 is WARN until API ship succeeds

Commands:
  npm run agent:deploy -- plan
  npm run agent:deploy -- ship --yes --api
  npm run agent:deploy -- ship --yes --full
  npm run agent:deploy -- verify
`);
}

async function preflight() {
  log(AGENT, 'preflight probes…');
  const r = run('node', ['scripts/agents/live-ops-agent.mjs', 'probe', '--quiet'], {
    silent: false,
  });
  return r.status === 0 || r.status === 0;
}

async function verify() {
  const checks = [
    { id: 'health', url: URLS.health, hard: true },
    { id: 'colyseus', url: URLS.colyseus, hard: true },
    { id: 'mp-status', url: URLS.mpStatus, hard: false },
    { id: 'client', url: URLS.client, hard: false },
  ];
  const out = [];
  let hardOk = true;
  for (const c of checks) {
    const p = await probe(c.url);
    const level = p.ok ? 'ok' : c.hard ? 'fail' : 'warn';
    if (level === 'fail') hardOk = false;
    out.push({ ...c, ...p, level });
    log(AGENT, `${level.toUpperCase()} ${c.id} → ${p.status} ${p.ms}ms`);
  }
  return { hardOk, checks: out };
}

async function ship() {
  const yes = argFlag('--yes') || process.env.CI === 'true' || process.env.CI === '1';
  if (!yes) {
    log(AGENT, 'Refusing ship without --yes (production). Use: npm run agent:deploy -- ship --yes --api');
    process.exit(2);
  }
  const sel = selectedSurfaces();
  const steps = [];

  await preflight();

  if (sel.content) {
    log(AGENT, 'Publishing sector production content…');
    let r = run('npm', ['run', 'production:publish-sectors']);
    steps.push({ id: 'publish-sectors', status: r.status });
    r = run('npm', ['run', 'production:publish-dossiers'], { silent: false });
    steps.push({ id: 'publish-dossiers', status: r.status });
  }

  if (sel.api) {
    log(AGENT, 'Railway API deploy…');
    const r = run('node', ['scripts/agents/railway-agent.mjs', 'deploy', '--yes', '--detach']);
    steps.push({ id: 'railway-deploy', status: r.status });
    if (r.status !== 0) {
      log(AGENT, 'API deploy failed — aborting further ship steps');
      return { steps, aborted: true };
    }
    const wait = run('node', [
      'scripts/agents/railway-agent.mjs',
      'wait-healthy',
      '--timeout',
      '360',
    ]);
    steps.push({ id: 'wait-healthy', status: wait.status });
  }

  if (sel.client) {
    log(AGENT, 'Vercel client deploy…');
    const r = run('npx', ['vercel', 'deploy', '--prod', '--yes'], { timeout: 900_000 });
    steps.push({ id: 'vercel-client', status: r.status });
  }

  if (sel.workers) {
    log(AGENT, 'Workers deploy (deploy:workers)…');
    const r = run('npm', ['run', 'deploy:workers'], { timeout: 600_000 });
    steps.push({ id: 'workers', status: r.status });
  }

  const v = await verify();
  steps.push({ id: 'verify', status: v.hardOk ? 0 : 1, detail: v.checks });
  return { steps, verify: v, aborted: false, surfaces: sel };
}

async function main() {
  log(AGENT, `command=${cmd}`);
  let report = { agent: AGENT, cmd, ts: new Date().toISOString() };

  switch (cmd) {
    case 'plan':
      printPlan();
      report.plan = selectedSurfaces();
      break;
    case 'ship':
      report.result = await ship();
      report.ok = !report.result.aborted && report.result.verify?.hardOk !== false;
      if (!report.ok) process.exitCode = 1;
      break;
    case 'verify':
      report.verify = await verify();
      report.ok = report.verify.hardOk;
      if (!report.ok) process.exitCode = 1;
      break;
    default:
      console.error('Usage: deploy-agent.mjs plan|ship|verify');
      process.exit(1);
  }

  const paths = writeReport('deploy', report);
  log(AGENT, `report → ${paths.latest}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
