/**
 * Production autonomous agents — SSOT for Railway, deploy, and live-ops.
 * Consumed by scripts/agents/* and Grok skills under .grok/skills/grudge-*.
 *
 * Production stack (only): Vercel + Railway + Colyseus + Cloudflare.
 * Not SSOT: Supabase, MySQL VPS, D1 heroes.
 * Pattern: docs/STACK_PATTERN.md
 *
 * Lifecycle:
 *   ship → production → maintenance → live users / game experience
 */

export type AgentId = 'railway' | 'deploy' | 'live-ops' | 'orchestrator';

export type DeploySurface =
  | 'grudge-api'
  | 'vercel-client'
  | 'cdn-worker'
  | 'objectstore'
  | 'production-content'
  | 'puter-crafting';

export type OpsPhase = 'preflight' | 'ship' | 'verify' | 'maintenance' | 'incident';

/** Canonical Railway project for Warlords game-data + Colyseus. */
export const RAILWAY_CANONICAL = {
  projectName: 'grudge-warlords-rpg',
  projectId: '92f039ec-2cce-4e1e-b06a-dd0ac6256d70',
  environmentName: 'production',
  environmentId: '3c33203b-c01e-44f2-b4a5-943526e96981',
  /** Linked service under grudge-builder cwd */
  serviceId: '7a31d77f-e10e-403b-94ff-894a0feb5608',
  serviceName: 'grudge-api',
  publicUrl: 'https://grudge-api-production-0d46.up.railway.app',
  startCommand: 'npm run start:production',
  workflow: '.github/workflows/railway-deploy.yml',
} as const;

export const PRODUCTION_URLS = {
  gameData: RAILWAY_CANONICAL.publicUrl,
  health: `${RAILWAY_CANONICAL.publicUrl}/api/health`,
  colyseusHealth: `${RAILWAY_CANONICAL.publicUrl}/api/colyseus/health`,
  multiplayerStatus: `${RAILWAY_CANONICAL.publicUrl}/api/multiplayer/status`,
  multiplayerSession: `${RAILWAY_CANONICAL.publicUrl}/api/multiplayer/session`,
  client: 'https://grudge.studio',
  clientAlt: 'https://client.grudge-studio.com',
  warlords: 'https://grudgewarlords.com',
  assets: 'https://assets.grudge-studio.com',
  id: 'https://id.grudge-studio.com',
  fleetManifest: 'https://client.grudge-studio.com/api/fleet/manifest',
} as const;

/** Critical probes for live maintenance (hard-fail on red). */
export const LIVE_OPS_CRITICAL_PROBES = [
  { id: 'api-health', url: PRODUCTION_URLS.health, expectStatus: [200], group: 'backend' },
  {
    id: 'colyseus-health',
    url: PRODUCTION_URLS.colyseusHealth,
    expectStatus: [200],
    group: 'multiplayer',
    jsonOk: true,
  },
  {
    id: 'multiplayer-status',
    url: PRODUCTION_URLS.multiplayerStatus,
    expectStatus: [200],
    group: 'multiplayer',
    jsonOk: true,
    /** Until grudge-api redeploy lands multiplayer routes, agents mark WARN not hard-fail when 404. */
    softUntilDeployed: true,
  },
  { id: 'client', url: PRODUCTION_URLS.client, expectStatus: [200, 301, 302], group: 'frontend' },
  { id: 'assets-root', url: PRODUCTION_URLS.assets, expectStatus: [200, 301, 302, 403], group: 'cdn' },
  { id: 'id-hub', url: PRODUCTION_URLS.id, expectStatus: [200, 301, 302], group: 'auth' },
] as const;

export const AGENT_DEFINITIONS: Record<
  AgentId,
  {
    id: AgentId;
    title: string;
    mission: string;
    npmScript: string;
    skill: string;
    canDeploy: boolean;
    requiresHumanFor: string[];
    surfaces: DeploySurface[];
  }
> = {
  railway: {
    id: 'railway',
    title: 'Railway Agent',
    mission:
      'Deploy, health-check, log-tail, and roll-forward grudge-api (Postgres SSOT + Colyseus) on Railway production.',
    npmScript: 'agent:railway',
    skill: 'grudge-railway-agent',
    canDeploy: true,
    requiresHumanFor: ['secret rotation', 'database drop', 'replica scale >1 without Redis check'],
    surfaces: ['grudge-api'],
  },
  deploy: {
    id: 'deploy',
    title: 'Deployment Agent',
    mission:
      'Orchestrate production ship: publish content → optional R2 → Railway API → Vercel client → probe gate.',
    npmScript: 'agent:deploy',
    skill: 'grudge-deploy-agent',
    canDeploy: true,
    requiresHumanFor: ['force-push', 'prod DB migrations that rewrite rows', 'domain DNS changes'],
    surfaces: [
      'production-content',
      'grudge-api',
      'vercel-client',
      'cdn-worker',
      'objectstore',
      'puter-crafting',
    ],
  },
  'live-ops': {
    id: 'live-ops',
    title: 'Live Ops Agent',
    mission:
      'Post-production maintenance: fleet health, multiplayer readiness, disconnect/lag signals, improvement backlog from live experience.',
    npmScript: 'agent:live-ops',
    skill: 'grudge-live-ops',
    canDeploy: false,
    requiresHumanFor: ['player ban', 'refunds', 'PII export'],
    surfaces: ['grudge-api', 'vercel-client'],
  },
  orchestrator: {
    id: 'orchestrator',
    title: 'Production Orchestrator',
    mission: 'Run railway + deploy + live-ops in safe order; write machine-readable report.',
    npmScript: 'agent:run',
    skill: 'grudge-deploy-agent',
    canDeploy: true,
    requiresHumanFor: ['any destructive flag', 'incident comms'],
    surfaces: ['grudge-api', 'vercel-client', 'production-content'],
  },
};

/** Improvement backlog priorities once live users exist. */
export const LIVE_IMPROVEMENT_BACKLOG = [
  {
    id: 'reconnect',
    title: 'Colyseus allowReconnection + connection HUD',
    phase: 'maintenance' as OpsPhase,
    impact: 'high',
  },
  {
    id: 'net-debug',
    title: '?net=1 FPS/RTT strip for support',
    phase: 'maintenance' as OpsPhase,
    impact: 'medium',
  },
  {
    id: 'mp-smoke',
    title: 'Automated 2-client sector move+chat smoke',
    phase: 'verify' as OpsPhase,
    impact: 'high',
  },
  {
    id: 'stack-docs',
    title: 'Keep STACK_PATTERN.md as four-platform law (no Supabase SSOT)',
    phase: 'maintenance' as OpsPhase,
    impact: 'medium',
  },
  {
    id: 'graceful-drain',
    title: 'Railway deploy drain + reconnect window ≥ deploy time',
    phase: 'ship' as OpsPhase,
    impact: 'high',
  },
  {
    id: 'sentry-tags',
    title: 'Sentry room/sector/session/disconnect tags',
    phase: 'maintenance' as OpsPhase,
    impact: 'medium',
  },
] as const;

export const DEPLOY_PHASES: { phase: OpsPhase; agent: AgentId; steps: string[] }[] = [
  {
    phase: 'preflight',
    agent: 'live-ops',
    steps: ['probe critical URLs', 'note soft 404 multiplayer status', 'git clean check'],
  },
  {
    phase: 'ship',
    agent: 'deploy',
    steps: [
      'publish sectors/dossiers if content dirty',
      'railway up grudge-api',
      'vercel client if UI dirty',
    ],
  },
  {
    phase: 'verify',
    agent: 'railway',
    steps: ['poll /api/health', 'poll /api/colyseus/health', 'poll /api/multiplayer/status'],
  },
  {
    phase: 'maintenance',
    agent: 'live-ops',
    steps: ['write live-ops report', 'rank improvement backlog', 'schedule next probe'],
  },
];
