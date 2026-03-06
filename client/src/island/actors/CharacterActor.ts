import Matter from 'matter-js';
import { SpriteAnimator, AnimationConfig } from '../render/SpriteAnimator';

export type CharacterState = 'idle' | 'walking' | 'harvesting' | 'sleeping';
export type Direction = 'down' | 'up' | 'left' | 'right';

export interface CharacterSpriteConfig {
  spriteSheet: string;
  frameWidth: number;
  frameHeight: number;
  animations: Record<string, AnimationConfig>;
  scale?: number;
}

export interface CharacterEvents {
  onStateChange?: (state: CharacterState) => void;
}

export class CharacterActor {
  public id: string;
  public body: Matter.Body;
  public spriteConfig: CharacterSpriteConfig;
  public animator: SpriteAnimator;
  
  public state: CharacterState = 'idle';
  public direction: Direction = 'down';
  public stamina: number = 100;
  public maxStamina: number = 100;
  
  private targetX: number | null = null;
  private targetY: number | null = null;
  private moveSpeed: number = 2;
  private events: CharacterEvents;

  constructor(
    id: string,
    x: number,
    y: number,
    spriteConfig: CharacterSpriteConfig,
    events: CharacterEvents = {}
  ) {
    this.id = id;
    this.spriteConfig = spriteConfig;
    this.events = events;
    
    this.body = Matter.Bodies.circle(x, y, 16, {
      label: id,
      friction: 0.1,
      frictionAir: 0.05,
      restitution: 0,
      inertia: Infinity,
    });
    
    this.animator = new SpriteAnimator(spriteConfig.animations);
    this.animator.play('idle_down');
  }

  get x(): number {
    return this.body.position.x;
  }

  get y(): number {
    return this.body.position.y;
  }

  setState(newState: CharacterState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.updateAnimation();
      this.events.onStateChange?.(newState);
    }
  }

  setDirection(newDirection: Direction): void {
    if (this.direction !== newDirection) {
      this.direction = newDirection;
      this.updateAnimation();
    }
  }

  private updateAnimation(): void {
    const animKey = `${this.state}_${this.direction}`;
    if (this.animator.hasAnimation(animKey)) {
      this.animator.play(animKey);
    } else {
      const fallback = `${this.state}_down`;
      if (this.animator.hasAnimation(fallback)) {
        this.animator.play(fallback);
      }
    }
  }

  moveTo(targetX: number, targetY: number): void {
    if (this.state === 'sleeping') return;
    
    this.targetX = targetX;
    this.targetY = targetY;
    this.setState('walking');
  }

  stopMoving(): void {
    this.targetX = null;
    this.targetY = null;
    Matter.Body.setVelocity(this.body, { x: 0, y: 0 });
    if (this.state === 'walking') {
      this.setState('idle');
    }
  }

  startHarvesting(): void {
    this.stopMoving();
    this.setState('harvesting');
  }

  stopHarvesting(): void {
    if (this.state === 'harvesting') {
      this.setState('idle');
    }
  }

  sleep(): void {
    this.stopMoving();
    this.setState('sleeping');
  }

  wake(): void {
    if (this.state === 'sleeping' && this.stamina >= this.maxStamina * 0.9) {
      this.setState('idle');
    }
  }

  consumeStamina(amount: number): void {
    this.stamina = Math.max(0, this.stamina - amount);
  }

  recoverStamina(amount: number): void {
    this.stamina = Math.min(this.maxStamina, this.stamina + amount);
    if (this.state === 'sleeping' && this.stamina >= this.maxStamina * 0.9) {
      this.wake();
    }
  }

  update(deltaTime: number): void {
    this.animator.update(deltaTime);
    
    if (this.state === 'sleeping') {
      this.recoverStamina(deltaTime * 0.01);
      return;
    }
    
    if (this.targetX !== null && this.targetY !== null) {
      const dx = this.targetX - this.x;
      const dy = this.targetY - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 5) {
        this.stopMoving();
      } else {
        const vx = (dx / distance) * this.moveSpeed;
        const vy = (dy / distance) * this.moveSpeed;
        Matter.Body.setVelocity(this.body, { x: vx, y: vy });
        
        if (Math.abs(dx) > Math.abs(dy)) {
          this.setDirection(dx > 0 ? 'right' : 'left');
        } else {
          this.setDirection(dy > 0 ? 'down' : 'up');
        }
      }
    }
  }

  getCurrentFrame(): { x: number; y: number; width: number; height: number } {
    const frameIndex = this.animator.getCurrentFrame();
    const cols = Math.floor(1024 / this.spriteConfig.frameWidth);
    const col = frameIndex % cols;
    const row = Math.floor(frameIndex / cols);
    
    return {
      x: col * this.spriteConfig.frameWidth,
      y: row * this.spriteConfig.frameHeight,
      width: this.spriteConfig.frameWidth,
      height: this.spriteConfig.frameHeight,
    };
  }
}
