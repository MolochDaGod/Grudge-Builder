/**
 * Deck crew AI — Yuka-style wander + goal stack (idle / animate / wait / goto).
 *
 * Mirrors Dive/Yuka Goal + Vehicle patterns from grudge-fps-combat skill without
 * requiring the `yuka` package (can swap to real Yuka Vehicle later).
 *
 * Flow per agent:
 *   Think → pick GoTo random location → Follow path nodes →
 *   Arrive → WorkAnimate / Idle → Wait → loop.
 */
import * as THREE from "three";
import {
  type DeckLocId,
  type DeckLocation,
  getDeckLocation,
  pathBetween,
  randomDeckLocation,
  SLOT_HOME,
} from "./DeckLocations";
import { clampToDeck, sampleDeckHeight } from "./DeckPhysics";

export type CrewAnimHint = "idle" | "walk" | "wheel" | "cannon" | "rope";

export interface CrewAgentConfig {
  slotIndex: number;
  homeId: DeckLocId;
  walkSpeed: number;
  /** Personal seed for staggered decisions. */
  seed: number;
}

type GoalKind = "goto" | "wait" | "animate" | "idle";

interface Goal {
  kind: GoalKind;
  targetId?: DeckLocId;
  /** Seconds remaining for wait/animate/idle. */
  timeLeft?: number;
  anim?: CrewAnimHint;
}

export interface CrewAgentState {
  slotIndex: number;
  position: THREE.Vector3;
  yaw: number;
  /** Current path of location ids. */
  path: DeckLocId[];
  pathIndex: number;
  currentLoc: DeckLocId;
  goal: Goal | null;
  anim: CrewAnimHint;
  /** When true, cinema selected — freeze AI, face camera. */
  locked: boolean;
  faceCamera: boolean;
  homeId: DeckLocId;
  walkSpeed: number;
  seed: number;
  thinkCooldown: number;
  /** Seconds of idle wait queued after work animate. */
  pendingWait: number;
}

function rand(seed: number, t: number): number {
  const x = Math.sin(seed * 12.9898 + t * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function waitDuration(loc: DeckLocation, seed: number, t: number): number {
  const u = rand(seed, t + loc.id.length);
  return loc.waitMinSec + u * (loc.waitMaxSec - loc.waitMinSec);
}

function workAnimFor(loc: DeckLocation): CrewAnimHint {
  if (loc.workAnim === "wheel") return "wheel";
  if (loc.workAnim === "cannon") return "cannon";
  if (loc.workAnim === "rope") return "rope";
  return "idle";
}

export function createCrewAgent(cfg: CrewAgentConfig): CrewAgentState {
  const home = getDeckLocation(cfg.homeId);
  return {
    slotIndex: cfg.slotIndex,
    position: home.position.clone(),
    yaw: home.facing,
    path: [],
    pathIndex: 0,
    currentLoc: cfg.homeId,
    goal: { kind: "animate", timeLeft: waitDuration(home, cfg.seed, 1), anim: workAnimFor(home) },
    anim: workAnimFor(home),
    locked: false,
    faceCamera: false,
    homeId: cfg.homeId,
    walkSpeed: cfg.walkSpeed,
    seed: cfg.seed,
    thinkCooldown: 0.5 + cfg.slotIndex * 0.35,
    pendingWait: 0,
  };
}

function startWander(agent: CrewAgentState, now: number): void {
  const dest = randomDeckLocation(agent.currentLoc);
  const path = pathBetween(agent.currentLoc, dest.id);
  agent.path = path.slice(1); // drop current
  agent.pathIndex = 0;
  agent.goal = { kind: "goto", targetId: dest.id };
  agent.anim = "walk";
  agent.thinkCooldown = 0.2;
  void now;
}

function pushArriveGoals(agent: CrewAgentState, loc: DeckLocation, now: number): void {
  const anim = workAnimFor(loc);
  const dwell = waitDuration(loc, agent.seed, now);
  // Animate (work) then idle wait — goal-based chain
  agent.goal = {
    kind: "animate",
    timeLeft: Math.min(dwell * 0.55, loc.kind === "transit" ? 0.8 : 4.5),
    anim,
  };
  agent.anim = anim;
  agent.pendingWait = dwell * 0.45;
}

/**
 * Advance one agent. Mutates agent in place.
 * `cameraPos` used when faceCamera/locked for yaw toward camera.
 */
export function updateCrewAgent(
  agent: CrewAgentState,
  dt: number,
  now: number,
  cameraPos: THREE.Vector3 | null,
): void {
  if (agent.locked) {
    if (agent.faceCamera && cameraPos) {
      const dx = cameraPos.x - agent.position.x;
      const dz = cameraPos.z - agent.position.z;
      const targetYaw = Math.atan2(dx, dz);
      agent.yaw = THREE.MathUtils.lerp(agent.yaw, targetYaw, 1 - Math.exp(-6 * dt));
    }
    agent.anim = "idle";
    return;
  }

  agent.thinkCooldown -= dt;

  // ── Execute current goal ──
  const g = agent.goal;
  if (!g) {
    startWander(agent, now);
    return;
  }

  if (g.kind === "goto") {
    const nextId = agent.path[agent.pathIndex];
    if (!nextId) {
      // arrived final
      const loc = getDeckLocation(g.targetId ?? agent.currentLoc);
      agent.currentLoc = loc.id;
      agent.position.copy(loc.position);
      pushArriveGoals(agent, loc, now);
      return;
    }
    const target = getDeckLocation(nextId).position;
    const dx = target.x - agent.position.x;
    const dz = target.z - agent.position.z;
    const dist = Math.hypot(dx, dz);
    agent.anim = "walk";
    if (dist < 0.12) {
      agent.pathIndex += 1;
      agent.currentLoc = nextId;
      agent.position.set(target.x, sampleDeckHeight(target.x, target.z), target.z);
      if (agent.pathIndex >= agent.path.length) {
        const loc = getDeckLocation(g.targetId ?? nextId);
        pushArriveGoals(agent, loc, now);
      }
      return;
    }
    const step = Math.min(agent.walkSpeed * dt, dist);
    const nx = agent.position.x + (dx / dist) * step;
    const nz = agent.position.z + (dz / dist) * step;
    const c = clampToDeck(nx, nz);
    agent.position.x = c.x;
    agent.position.z = c.z;
    agent.position.y = sampleDeckHeight(c.x, c.z);
    agent.yaw = Math.atan2(dx, dz);
    return;
  }

  if (g.kind === "animate" || g.kind === "wait" || g.kind === "idle") {
    agent.anim = g.anim ?? (g.kind === "idle" ? "idle" : agent.anim);
    // Face preferred station direction while working
    const loc = getDeckLocation(agent.currentLoc);
    agent.yaw = THREE.MathUtils.lerp(agent.yaw, loc.facing, 1 - Math.exp(-3 * dt));
    g.timeLeft = (g.timeLeft ?? 0) - dt;
    if (g.timeLeft > 0) return;

    if (g.kind === "animate" && agent.pendingWait > 0.05) {
      agent.goal = { kind: "wait", timeLeft: agent.pendingWait, anim: "idle" };
      agent.anim = "idle";
      agent.pendingWait = 0;
      return;
    }
    // Goal done — wander (Yuka-style replan)
    startWander(agent, now);
  }
}

export function lockAgentToCamera(agent: CrewAgentState, on: boolean): void {
  agent.locked = on;
  agent.faceCamera = on;
  if (on) {
    agent.goal = { kind: "idle", timeLeft: 9999, anim: "idle" };
    agent.anim = "idle";
    agent.path = [];
  } else {
    agent.goal = null;
    agent.thinkCooldown = 0.3 + agent.slotIndex * 0.2;
  }
}

export function createAgentsForSlots(filledCount: number): CrewAgentState[] {
  const n = Math.min(4, Math.max(0, filledCount));
  const agents: CrewAgentState[] = [];
  for (let i = 0; i < n; i++) {
    agents.push(
      createCrewAgent({
        slotIndex: i,
        homeId: SLOT_HOME[i] ?? "midship",
        walkSpeed: 1.15 + i * 0.08,
        seed: 17 + i * 91,
      }),
    );
  }
  return agents;
}
