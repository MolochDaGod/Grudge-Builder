export interface AnimationConfig {
  frames: number[];
  frameDuration: number;
  loop?: boolean;
}

export class SpriteAnimator {
  private animations: Record<string, AnimationConfig>;
  private currentAnimation: string = '';
  private currentFrameIndex: number = 0;
  private elapsedTime: number = 0;
  private isPlaying: boolean = false;

  constructor(animations: Record<string, AnimationConfig>) {
    this.animations = animations;
  }

  play(animationName: string): void {
    if (!this.animations[animationName]) {
      console.warn(`Animation "${animationName}" not found`);
      return;
    }
    
    if (this.currentAnimation === animationName && this.isPlaying) {
      return;
    }
    
    this.currentAnimation = animationName;
    this.currentFrameIndex = 0;
    this.elapsedTime = 0;
    this.isPlaying = true;
  }

  stop(): void {
    this.isPlaying = false;
  }

  pause(): void {
    this.isPlaying = false;
  }

  resume(): void {
    this.isPlaying = true;
  }

  update(deltaTime: number): void {
    if (!this.isPlaying || !this.currentAnimation) return;
    
    const anim = this.animations[this.currentAnimation];
    if (!anim) return;
    
    this.elapsedTime += deltaTime;
    
    if (this.elapsedTime >= anim.frameDuration) {
      this.elapsedTime = 0;
      this.currentFrameIndex++;
      
      if (this.currentFrameIndex >= anim.frames.length) {
        if (anim.loop !== false) {
          this.currentFrameIndex = 0;
        } else {
          this.currentFrameIndex = anim.frames.length - 1;
          this.isPlaying = false;
        }
      }
    }
  }

  getCurrentFrame(): number {
    const anim = this.animations[this.currentAnimation];
    if (!anim || anim.frames.length === 0) return 0;
    return anim.frames[this.currentFrameIndex];
  }

  getCurrentAnimationName(): string {
    return this.currentAnimation;
  }

  hasAnimation(name: string): boolean {
    return name in this.animations;
  }

  getProgress(): number {
    const anim = this.animations[this.currentAnimation];
    if (!anim || anim.frames.length === 0) return 0;
    return this.currentFrameIndex / anim.frames.length;
  }

  isAnimationComplete(): boolean {
    const anim = this.animations[this.currentAnimation];
    if (!anim) return true;
    return !this.isPlaying && this.currentFrameIndex === anim.frames.length - 1;
  }
}

export function createCharacterAnimations(
  idleFrames: number[] = [0],
  walkFrames: number[] = [0, 1, 2, 3],
  harvestFrames: number[] = [0, 1, 2],
  sleepFrames: number[] = [0]
): Record<string, AnimationConfig> {
  return {
    idle_down: { frames: idleFrames, frameDuration: 200, loop: true },
    idle_up: { frames: idleFrames, frameDuration: 200, loop: true },
    idle_left: { frames: idleFrames, frameDuration: 200, loop: true },
    idle_right: { frames: idleFrames, frameDuration: 200, loop: true },
    
    walking_down: { frames: walkFrames, frameDuration: 100, loop: true },
    walking_up: { frames: walkFrames, frameDuration: 100, loop: true },
    walking_left: { frames: walkFrames, frameDuration: 100, loop: true },
    walking_right: { frames: walkFrames, frameDuration: 100, loop: true },
    
    harvesting_down: { frames: harvestFrames, frameDuration: 300, loop: true },
    harvesting_up: { frames: harvestFrames, frameDuration: 300, loop: true },
    harvesting_left: { frames: harvestFrames, frameDuration: 300, loop: true },
    harvesting_right: { frames: harvestFrames, frameDuration: 300, loop: true },
    
    sleeping_down: { frames: sleepFrames, frameDuration: 500, loop: true },
    sleeping_up: { frames: sleepFrames, frameDuration: 500, loop: true },
    sleeping_left: { frames: sleepFrames, frameDuration: 500, loop: true },
    sleeping_right: { frames: sleepFrames, frameDuration: 500, loop: true },
  };
}
