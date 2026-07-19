#!/usr/bin/env node
/**
 * Live Ops Agent — maintenance after production, live users, game experience.
 *
 *   node scripts/agents/live-ops-agent.mjs probe
 *   node scripts/agents/live-ops-agent.mjs report
 *   node scripts/agents/live-ops-agent.mjs backlog
 *   node scripts/agents/live-ops-agent.mjs watch [--interval 60]
 *
 * Does NOT deploy. Surfaces improvement priorities from health + known gaps.
 */
import {
  URLS,
  probe,
  writeReport,
  log,
  argFlag,
  argValue,
} from './lib.mjs';

const AGENT = 'live-ops-agent';
const cmd = process.argv[2] || 'report';
const quiet = argFlag('--quiet');

/** Static improvement backlog (code gaps known post-launch). */
const BACKLOG = [
  {
    id: 'reconnect',
    title: 'allowReconnection + client reconnect loop + connection HUD',
    impact: 'high',
    agent: 'code',
    action: 'Implement SectorRoom/HomeIslandRoom onLeave + NetworkManager',
  },
  {
    id: 'net-hud',
    title: '?net=1 FPS/RTT/reconnectState strip for support tickets',
    impact: 'medium',
    agent: 'code',
    action: 'Wire NetworkManager + AssetLoadQueue.getStats',
  },
  {
    id: 'mp-smoke',
    title: 'Two-client Colyseus smoke (join sector, move, chat)',
    impact: 'high',
    agent: 'scripts',
    action: 'Add scripts/agents/mp-smoke.mjs',
  },
  {
    id: 'graceful-drain',
    title: 'Deploy drain seconds >= reconnect window for live combat',
    impact: 'high',
    agent: 'railway',
    action: 'Tune Railway deploy / room allowReconnection(60+)',
  },
  {
    id: 'sentry-live',
    title: 'Sentry tags: room, sectorId, sessionId, disconnect code',
    impact: 'medium',
    agent: 'code',
    action: 'Breadcrumb disconnects in NetworkManager',
  },
  {
    id: 'live-telemetry',
    title: 'Sample room counts + RTT histogram for weekly experience review',
    impact: 'medium',
    agent: 'live-ops',
    action: 'Extend this agent report with colyseus activeRooms',
  },
];

const PROBES = [
  { id: 'api-health', url: URLS.health, hard: true, group: 'backend' },
  { id: 'colyseus', url: URLS.colyseus, hard: true, group: 'multiplayer' },
  { id: 'mp-status', url: URLS.mpStatus, hard: true, group: 'multiplayer' },
  {
    id: 'supabase-probe',
    url: `${URLS.health.replace(/\/api\/health$/, '')}/api/supabase/health`,
    hard: false,
    group: 'legacy',
    /** configured:false is the correct production posture */
    expectUnconfiguredOk: true,
  },
  { id: 'client', url: URLS.client, hard: false, group: 'frontend' },
  { id: 'warlords', url: URLS.warlords, hard: false, group: 'frontend' },
  { id: 'id', url: URLS.id, hard: false, group: 'auth' },
  { id: 'assets', url: URLS.assets, hard: false, group: 'cdn' },
];

async function runProbes() {
  const results = [];
  for (const p of PROBES) {
    const r = await probe(p.url);
    let level = 'ok';
    if (p.expectUnconfiguredOk && r.json) {
      // Unconfigured Supabase = correct stack (Railway Postgres SSOT)
      if (r.json.configured === false && r.json.required === false) {
        level = 'ok';
      } else if (r.json.configured === true) {
        level = 'warn'; // optional project enabled — not SSOT
      } else if (!r.ok) {
        level = 'warn';
      }
    } else if (!r.ok) {
      if (p.soft404 && r.status === 404) level = 'warn';
      else if (p.hard) level = 'fail';
      else level = 'warn';
    }
    const row = { ...p, ...r, level };
    results.push(row);
    if (!quiet) {
      log(AGENT, `${level.toUpperCase().padEnd(4)} [${p.group}] ${p.id} ${r.status} ${r.ms}ms`);
      if (r.json && p.id === 'colyseus') {
        if (r.json.matchMakerReady != null) log(AGENT, `     matchMakerReady=${r.json.matchMakerReady}`);
      }
      if (r.json && p.id === 'mp-status' && r.ok) {
        log(AGENT, `     protocol=${r.json.protocolVersion} activeRooms=${r.json.activeRooms}`);
      }
      if (r.json && p.id === 'supabase-probe') {
        log(
          AGENT,
          `     configured=${r.json.configured} required=${r.json.required} (unset=correct)`,
        );
      }
    }
  }
  return results;
}

function experienceHints(probes) {
  const hints = [];
  const mp = probes.find((p) => p.id === 'mp-status');
  const col = probes.find((p) => p.id === 'colyseus');
  const api = probes.find((p) => p.id === 'api-health');

  if (api && !api.ok) {
    hints.push({
      severity: 'critical',
      playerImpact: 'Cannot load characters, islands, inventory',
      fix: 'railway-agent deploy / check Railway dashboard',
    });
  }
  if (col && !col.ok) {
    hints.push({
      severity: 'critical',
      playerImpact: 'No matchmake — tutorial/lobby/sector join fails',
      fix: 'Inspect Colyseus boot logs; ensure single process Express+Colyseus',
    });
  }
  if (mp && mp.status === 404) {
    hints.push({
      severity: 'high',
      playerImpact:
        'NetworkManager REST bootstrap incomplete; clients fall back without session preload hints',
      fix: 'Ship grudge-api with multiplayerRoutes (npm run agent:deploy -- ship --yes --api)',
    });
  }
  const sb = probes.find((p) => p.id === 'supabase-probe');
  if (sb?.json?.configured === true) {
    hints.push({
      severity: 'low',
      playerImpact: 'None if unused — but SUPABASE_URL is set (not Warlords SSOT)',
      fix: 'Prefer leave Supabase unset; player data is Railway Postgres only (docs/STACK_PATTERN.md)',
    });
  }
  if (col?.ok && col.ms > 2000) {
    hints.push({
      severity: 'medium',
      playerImpact: 'Slow join / perceived lag on enter zone',
      fix: 'Check Railway region, cold start, DB pool',
    });
  }
  return hints;
}

function printBacklog() {
  console.log('\nLive improvement backlog (post-production → maintenance)\n');
  for (const b of BACKLOG) {
    console.log(`  [${b.impact.padEnd(6)}] ${b.id}`);
    console.log(`           ${b.title}`);
    console.log(`           → ${b.action}`);
    console.log(`           owner agent: ${b.agent}\n`);
  }
}

async function buildReport() {
  const probes = await runProbes();
  const experience = experienceHints(probes);
  const hardFails = probes.filter((p) => p.level === 'fail');
  const warns = probes.filter((p) => p.level === 'warn');
  return {
    agent: AGENT,
    ts: new Date().toISOString(),
    phase: hardFails.length ? 'incident' : 'maintenance',
    summary: {
      hardFails: hardFails.length,
      warns: warns.length,
      ok: probes.filter((p) => p.level === 'ok').length,
      total: probes.length,
    },
    probes,
    experience,
    backlog: BACKLOG,
    nextActions: [
      ...(mpNeedsDeploy(probes)
        ? ['npm run agent:deploy -- ship --yes --api']
        : []),
      'npm run agent:live-ops -- report',
      'Implement reconnect + connection HUD (see INDUSTRY_BEST_PRACTICES_MP_PERF.md)',
    ],
    ok: hardFails.length === 0,
  };
}

function mpNeedsDeploy(probes) {
  const mp = probes.find((p) => p.id === 'mp-status');
  return mp && mp.status === 404;
}

async function watch() {
  const interval = Number(argValue('--interval', '60')) * 1000;
  log(AGENT, `watch interval=${interval / 1000}s (Ctrl+C to stop)`);
  for (;;) {
    const report = await buildReport();
    const paths = writeReport('live-ops', report);
    log(AGENT, `phase=${report.phase} fails=${report.summary.hardFails} warns=${report.summary.warns} → ${paths.latest}`);
    await new Promise((r) => setTimeout(r, interval));
  }
}

async function main() {
  if (!quiet) log(AGENT, `command=${cmd}`);

  switch (cmd) {
    case 'probe': {
      const probes = await runProbes();
      const hardFails = probes.filter((p) => p.level === 'fail');
      const report = { agent: AGENT, cmd, ts: new Date().toISOString(), probes, ok: hardFails.length === 0 };
      writeReport('live-ops', report);
      if (!report.ok) process.exitCode = 1;
      break;
    }
    case 'report': {
      const report = await buildReport();
      const paths = writeReport('live-ops', report);
      if (!quiet) {
        console.log('\n── Experience impact ──');
        for (const h of report.experience) {
          console.log(`  [${h.severity}] ${h.playerImpact}`);
          console.log(`    fix: ${h.fix}`);
        }
        if (!report.experience.length) console.log('  (no critical experience gaps detected from probes)');
        console.log('\n── Next actions ──');
        for (const a of report.nextActions) console.log(`  • ${a}`);
        log(AGENT, `report → ${paths.latest}`);
      }
      if (!report.ok) process.exitCode = 1;
      break;
    }
    case 'backlog':
      printBacklog();
      writeReport('live-ops-backlog', { agent: AGENT, backlog: BACKLOG, ts: new Date().toISOString() });
      break;
    case 'watch':
      await watch();
      break;
    default:
      console.error('Usage: live-ops-agent.mjs probe|report|backlog|watch');
      process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
