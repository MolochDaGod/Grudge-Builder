/**
 * Rapier physics agent context + deploy checklist for grudgewarlords.com.
 * Physics runs in browser WASM — this worker only serves AI tooling prompts.
 *
 * Official API: https://rapier.rs/docs/api/javascript/JavaScript3D
 * Skill: grudge-rapier
 */
import { Hono } from 'hono';
import type { Env } from '../types';

const RAPIER_SYSTEM = `You are the Grudge Studio Rapier physics deploy agent.
Official Rapier JS 3D API: https://rapier.rs/docs/api/javascript/JavaScript3D
Fleet skill: grudge-rapier. Surfaces: grudgewarlords.com Island3D PhysicsWorld, Mine-Loader WorldPhysics.

HARD RULES:
1. SI meters only — human ~1.8m (capsule r=0.32, halfH=0.55). Never pixel physics.
2. Fixed timestep 1/60 — never variable frame dt alone.
3. Dynamic bodies need density>0 (zero mass = infinite mass).
4. CCT = kinematic position-based; gravity in desired movement; setNextKinematicTranslation.
5. Trimesh colliders on FIXED bodies only — not dynamic.
6. Same create order + same @dimforge/rapier3d-compat version for determinism/snapshots.
7. Package: "@dimforge/rapier3d-compat": "^0.19.3"

Code SSOT:
- GrudgeBuilder: client/src/island3d/physics/PhysicsWorld.ts + fleet/*
- Mine-Loader: artifacts/voxelcraft/src/lib/physics/*
- Docs: GrudgeBuilder/docs/RAPIER_FLEET.md

Deploy grudgewarlords.com: Vercel alias from GrudgeBuilder main (vercel.json).
AI gateway CORS already includes https://grudgewarlords.com.
Do not invent Cannon-ES APIs on Rapier projects. Prefer fleet presets over ad-hoc ColliderDesc.`;

const app = new Hono<{ Bindings: Env }>();

/** Public deploy checklist for agents / CI smoke */
app.get('/v1/rapier/checklist', (c) => {
  return c.json({
    ok: true,
    service: 'grudge-ai-gateway',
    topic: 'rapier-fleet',
    apiDocs: 'https://rapier.rs/docs/api/javascript/JavaScript3D',
    package: { name: '@dimforge/rapier3d-compat', version: '^0.19.3' },
    domains: ['grudgewarlords.com', 'client.grudge-studio.com'],
    code: {
      island3d: 'client/src/island3d/physics/PhysicsWorld.ts',
      fleet: 'client/src/island3d/physics/fleet/',
      skill: 'grudge-rapier',
    },
    checklist: [
      'dep @dimforge/rapier3d-compat@^0.19.3',
      'fixed step 1/60',
      'SI meters + human 1.8m CCT',
      'density>0 on dynamics',
      'trimesh fixed-only',
      'physics debug gated (?physicsDebug=1)',
      'Vercel main → grudgewarlords.com',
    ],
    systemPromptChars: RAPIER_SYSTEM.length,
  });
});

/** System prompt blob for Legion / agent orchestration */
app.get('/v1/rapier/system', (c) => {
  return c.json({
    ok: true,
    role: 'rapier-deploy',
    system: RAPIER_SYSTEM,
  });
});

export { RAPIER_SYSTEM };
export default app;
