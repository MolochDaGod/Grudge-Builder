#!/usr/bin/env node
/**
 * Production Orchestrator — routes to railway / deploy / live-ops agents.
 *
 *   npm run agent:run -- status
 *   npm run agent:run -- maintenance
 *   npm run agent:run -- ship-api --yes
 *   npm run agent:run -- full --yes
 */
import { run, log, writeReport, argFlag } from './lib.mjs';

const AGENT = 'orchestrator';
const mode = process.argv[2] || 'status';

const ROUTES = {
  status: [
    ['node', 'scripts/agents/live-ops-agent.mjs', 'report'],
    ['node', 'scripts/agents/railway-agent.mjs', 'status'],
  ],
  maintenance: [
    ['node', 'scripts/agents/live-ops-agent.mjs', 'report'],
    ['node', 'scripts/agents/live-ops-agent.mjs', 'backlog'],
  ],
  probe: [['node', 'scripts/agents/live-ops-agent.mjs', 'probe']],
  'ship-api': [
    ['node', 'scripts/agents/deploy-agent.mjs', 'ship', ...(argFlag('--yes') ? ['--yes', '--api'] : [])],
  ],
  full: [
    [
      'node',
      'scripts/agents/deploy-agent.mjs',
      'ship',
      ...(argFlag('--yes') ? ['--yes', '--full'] : []),
    ],
  ],
  plan: [['node', 'scripts/agents/deploy-agent.mjs', 'plan']],
};

async function main() {
  log(AGENT, `mode=${mode}`);
  const steps = ROUTES[mode];
  if (!steps) {
    console.error(`Unknown mode: ${mode}
Modes: status | maintenance | probe | ship-api | full | plan`);
    process.exit(1);
  }

  const results = [];
  for (const [cmd, ...args] of steps) {
    log(AGENT, `$ ${cmd} ${args.join(' ')}`);
    const r = run(cmd, args);
    results.push({ cmd, args, status: r.status });
    if (r.status !== 0 && mode !== 'status' && mode !== 'maintenance') {
      log(AGENT, `step failed (${r.status}) — stopping`);
      break;
    }
  }

  const report = {
    agent: AGENT,
    mode,
    ts: new Date().toISOString(),
    results,
    ok: results.every((r) => r.status === 0),
  };
  const paths = writeReport('orchestrator', report);
  log(AGENT, `report → ${paths.latest}`);
  if (!report.ok) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
