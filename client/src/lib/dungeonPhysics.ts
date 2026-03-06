export interface Vector2D {
  x: number;
  y: number;
}

export interface PhysicsEntity {
  id: string;
  position: Vector2D;
  velocity: Vector2D;
  acceleration: Vector2D;
  radius: number;
  mass: number;
  friction: number;
  maxSpeed: number;
  isStatic: boolean;
}

export interface PhysicsWorld {
  entities: Map<string, PhysicsEntity>;
  walls: { x: number; y: number; width: number; height: number }[];
  tileSize: number;
  collisionMap: boolean[][];
}

export function createPhysicsEntity(
  id: string,
  x: number,
  y: number,
  options: Partial<PhysicsEntity> = {}
): PhysicsEntity {
  return {
    id,
    position: { x, y },
    velocity: { x: 0, y: 0 },
    acceleration: { x: 0, y: 0 },
    radius: options.radius ?? 0.4,
    mass: options.mass ?? 1,
    friction: options.friction ?? 0.85,
    maxSpeed: options.maxSpeed ?? 5,
    isStatic: options.isStatic ?? false,
    ...options,
  };
}

export function createPhysicsWorld(
  collisionMap: boolean[][],
  tileSize: number = 32
): PhysicsWorld {
  return {
    entities: new Map(),
    walls: [],
    tileSize,
    collisionMap,
  };
}

export function vectorLength(v: Vector2D): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

export function vectorNormalize(v: Vector2D): Vector2D {
  const len = vectorLength(v);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

export function vectorAdd(a: Vector2D, b: Vector2D): Vector2D {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function vectorSubtract(a: Vector2D, b: Vector2D): Vector2D {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function vectorScale(v: Vector2D, s: number): Vector2D {
  return { x: v.x * s, y: v.y * s };
}

export function vectorDot(a: Vector2D, b: Vector2D): number {
  return a.x * b.x + a.y * b.y;
}

export function vectorDistance(a: Vector2D, b: Vector2D): number {
  return vectorLength(vectorSubtract(a, b));
}

export function checkTileCollision(
  world: PhysicsWorld,
  x: number,
  y: number,
  radius: number
): boolean {
  const minTileX = Math.floor(x - radius);
  const maxTileX = Math.ceil(x + radius);
  const minTileY = Math.floor(y - radius);
  const maxTileY = Math.ceil(y + radius);

  for (let ty = minTileY; ty <= maxTileY; ty++) {
    for (let tx = minTileX; tx <= maxTileX; tx++) {
      if (ty < 0 || ty >= world.collisionMap.length) return true;
      if (tx < 0 || tx >= (world.collisionMap[0]?.length ?? 0)) return true;
      if (world.collisionMap[ty][tx]) {
        const closestX = Math.max(tx, Math.min(x, tx + 1));
        const closestY = Math.max(ty, Math.min(y, ty + 1));
        const distX = x - closestX;
        const distY = y - closestY;
        if (distX * distX + distY * distY < radius * radius) {
          return true;
        }
      }
    }
  }
  return false;
}

export function resolveWallCollision(
  world: PhysicsWorld,
  entity: PhysicsEntity,
  newPos: Vector2D
): Vector2D {
  const resolved = { ...newPos };
  
  if (!checkTileCollision(world, resolved.x, entity.position.y, entity.radius)) {
    if (checkTileCollision(world, resolved.x, resolved.y, entity.radius)) {
      resolved.y = entity.position.y;
    }
  } else if (!checkTileCollision(world, entity.position.x, resolved.y, entity.radius)) {
    resolved.x = entity.position.x;
  } else {
    resolved.x = entity.position.x;
    resolved.y = entity.position.y;
  }
  
  return resolved;
}

export function checkEntityCollision(
  a: PhysicsEntity,
  b: PhysicsEntity
): boolean {
  const dist = vectorDistance(a.position, b.position);
  return dist < a.radius + b.radius;
}

export function resolveEntityCollision(
  a: PhysicsEntity,
  b: PhysicsEntity
): void {
  if (a.isStatic && b.isStatic) return;
  
  const diff = vectorSubtract(b.position, a.position);
  const dist = vectorLength(diff);
  const minDist = a.radius + b.radius;
  
  if (dist === 0 || dist >= minDist) return;
  
  const overlap = minDist - dist;
  const normal = vectorNormalize(diff);
  
  const totalMass = a.mass + b.mass;
  const aRatio = b.isStatic ? 1 : b.mass / totalMass;
  const bRatio = a.isStatic ? 1 : a.mass / totalMass;
  
  if (!a.isStatic) {
    a.position = vectorAdd(a.position, vectorScale(normal, -overlap * aRatio));
  }
  if (!b.isStatic) {
    b.position = vectorAdd(b.position, vectorScale(normal, overlap * bRatio));
  }
  
  const relVel = vectorSubtract(a.velocity, b.velocity);
  const velAlongNormal = vectorDot(relVel, normal);
  
  if (velAlongNormal > 0) return;
  
  const restitution = 0.3;
  const impulse = (-(1 + restitution) * velAlongNormal) / totalMass;
  
  if (!a.isStatic) {
    a.velocity = vectorSubtract(a.velocity, vectorScale(normal, impulse * b.mass));
  }
  if (!b.isStatic) {
    b.velocity = vectorAdd(b.velocity, vectorScale(normal, impulse * a.mass));
  }
}

export function updatePhysicsEntity(
  world: PhysicsWorld,
  entity: PhysicsEntity,
  deltaTime: number
): void {
  if (entity.isStatic) return;
  
  entity.velocity = vectorAdd(entity.velocity, vectorScale(entity.acceleration, deltaTime));
  
  const speed = vectorLength(entity.velocity);
  if (speed > entity.maxSpeed) {
    entity.velocity = vectorScale(vectorNormalize(entity.velocity), entity.maxSpeed);
  }
  
  entity.velocity = vectorScale(entity.velocity, entity.friction);
  
  if (vectorLength(entity.velocity) < 0.01) {
    entity.velocity = { x: 0, y: 0 };
  }
  
  const newPos = vectorAdd(entity.position, vectorScale(entity.velocity, deltaTime));
  entity.position = resolveWallCollision(world, entity, newPos);
  
  entity.acceleration = { x: 0, y: 0 };
}

export function applyForce(entity: PhysicsEntity, force: Vector2D): void {
  const acceleration = vectorScale(force, 1 / entity.mass);
  entity.acceleration = vectorAdd(entity.acceleration, acceleration);
}

export function moveToward(entity: PhysicsEntity, target: Vector2D, speed: number): void {
  const direction = vectorNormalize(vectorSubtract(target, entity.position));
  applyForce(entity, vectorScale(direction, speed * entity.mass));
}

export function updatePhysicsWorld(
  world: PhysicsWorld,
  deltaTime: number
): void {
  const entities = Array.from(world.entities.values());
  
  for (const entity of entities) {
    updatePhysicsEntity(world, entity, deltaTime);
  }
  
  for (let i = 0; i < entities.length; i++) {
    for (let j = i + 1; j < entities.length; j++) {
      if (checkEntityCollision(entities[i], entities[j])) {
        resolveEntityCollision(entities[i], entities[j]);
      }
    }
  }
}

export function getDirectionFromVelocity(velocity: Vector2D): "up" | "down" | "left" | "right" {
  if (Math.abs(velocity.x) > Math.abs(velocity.y)) {
    return velocity.x > 0 ? "right" : "left";
  }
  return velocity.y > 0 ? "down" : "up";
}

export function getAngleFromVelocity(velocity: Vector2D): number {
  return Math.atan2(velocity.y, velocity.x) * (180 / Math.PI);
}
