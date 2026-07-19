#!/usr/bin/env node
/**
 * Railway Agent — autonomous grudge-api production ops.
 *
 *   node scripts/agents/railway-agent.mjs status
 *   node scripts/agents/railway-agent.mjs probe
 *   node scripts/agents/railway-agent.mjs deploy [--detach]
 *   node scripts/agents/railway-agent.mjs wait-healthy [--timeout 300]
 *   node scripts/agents/railway-agent.mjs logs [--lines 80]
 *
 * Safety: never drops DB, never rotates secrets, never force-redeploys without --yes for destructive.
 */
import {
  ROOT,
  RAILWAY,
  URLS,
  run,
  probe,
  writeReport,
  log,
  argFlag,
  argValue,
} from './lib.mjs';

const AGENT = 'railway-agent';
const cmd = process.argv[2] || 'probe';

async function probeStack() {
  const targets = [
    { id: 'health', url: URLS.health },
    { id: 'colyseus', url: URLS.colyseus },
    { id: 'multiplayer-status', url: URLS.mpStatus, soft: true },
    { id: 'multiplayer-session', url: URLS.mpSession, soft: true },
  ];
  const results = [];
  for (const t of targets) {
    const r = await probe(t.url);
    const softFail = t.soft && (r.status === 404 || r.status === 0);
    const level = r.ok ? 'ok' : softFail ? 'warn' : 'fail';
    results.push({ ...t, ...r, level });
    log(AGENT, `${level.toUpperCase()} ${t.id} ${r.status} ${r.ms}ms ${r.error || ''}`);
    if (r.json && t.id === 'colyseus') {
      const rooms = r.json.definedRooms || r.json.rooms;
      if (rooms) log(AGENT, `  rooms: ${Array.isArray(rooms) ? rooms.join(', ') : JSON.stringify(rooms)}`);
    }
  }
  return results;
}

function railwayStatus() {
  log(AGENT, `cwd=${ROOT}`);
  log(AGENT, `project=${RAILWAY.projectId} service=${RAILWAY.serviceId}`);
  log(AGENT, `public=${RAILWAY.publicUrl}`);
  const st = run('railway', ['status'], { silent: true });
  if (st.stdout) process.stdout.write(st.stdout);
  if (st.stderr) process.stderr.write(st.stderr);
  if (st.status !== 0) {
    log(AGENT, 'railway status failed — ensure `railway link` in grudge-builder or RAILWAY_TOKEN set');
  }
  return st.status === 0;
}

function railwayDeploy() {
  // Default detach (async ship); pass --wait for blocking up.
  const detach = !argFlag('--wait');
  const yes = argFlag('--yes') || process.env.CI === 'true' || process.env.CI === '1';
  if (!yes) {
    log(AGENT, 'Deploy requires --yes (or CI=1) to prevent accidental production ship.');
    log(AGENT, 'Example: npm run agent:railway -- deploy --yes --detach');
    process.exit(2);
  }
  log(AGENT, 'Deploying grudge-api via railway up…');
  const args = ['up', '--ci'];
  if (detach) args.push('--detach');
  // Prefer service id when available
  if (RAILWAY.serviceId) {
    args.push('--service', RAILWAY.serviceId);
  }
  const r = run('railway', args, { timeout: 600_000 });
  if (r.status !== 0) {
    log(AGENT, `railway up failed (exit ${r.status})`);
    process.exit(r.status || 1);
  }
  log(AGENT, 'railway up submitted. Polling health…');
  return true;
}

async function waitHealthy() {
  const timeoutSec = Number(argValue('--timeout', '300'));
  const deadline = Date.now() + timeoutSec * 1000;
  let attempt = 0;
  while (Date.now() < deadline) {
    attempt += 1;
    const h = await probe(URLS.health);
    const c = await probe(URLS.colyseus);
    log(AGENT, `wait #${attempt} health=${h.status} colyseus=${c.status}`);
    if (h.ok && c.ok) {
      // multiplayer soft
      const m = await probe(URLS.mpStatus);
      log(AGENT, `multiplayer/status=${m.status}${m.ok ? '' : ' (soft until routes deployed)'}`);
      return { ok: true, health: h, colyseus: c, multiplayer: m };
    }
    await new Promise((r) => setTimeout(r, 8000));
  }
  return { ok: false, error: `timeout after ${timeoutSec}s` };
}

function logs() {
  const lines = argValue('--lines', '80');
  const r = run('railway', ['logs', '--lines', String(lines)], { silent: false });
  return r.status === 0;
}

async function main() {
  log(AGENT, `command=${cmd}`);
  let report = { agent: AGENT, cmd, ts: new Date().toISOString(), railway: RAILWAY };

  switch (cmd) {
    case 'status': {
      report.linked = railwayStatus();
      report.probes = await probeStack();
      break;
    }
    case 'probe': {
      report.probes = await probeStack();
      break;
    }
    case 'deploy': {
      railwayDeploy();
      report.wait = await waitHealthy();
      report.probes = await probeStack();
      break;
    }
    case 'wait-healthy': {
      report.wait = await waitHealthy();
      if (!report.wait.ok) process.exitCode = 1;
      break;
    }
    case 'logs': {
      report.logsOk = logs();
      break;
    }
    default:
      console.error(`Unknown command: ${cmd}
Usage: railway-agent.mjs status|probe|deploy|wait-healthy|logs`);
      process.exit(1);
  }

  const hardFail = (report.probes || []).some((p) => p.level === 'fail');
  report.ok = !hardFail && (report.wait ? report.wait.ok !== false : true);
  const paths = writeReport('railway', report);
  log(AGENT, `report → ${paths.latest}`);
  if (!report.ok) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
