export type AnimationState = 
  | 'idle'
  | 'attack1'
  | 'attack2'
  | 'cast'
  | 'victory'
  | 'death'
  | 'walk'
  | 'hurt'
  | 'buffed'
  | 'poisoned'
  | 'stealth'
  | 'shielded'
  | 'combo';

export interface AnimationConfig {
  name: AnimationState;
  displayName: string;
  frameCount: number;
  frameDuration: number;
  loop: boolean;
  transformations: FrameTransformation[];
  overlay?: OverlayEffect;
  tint?: string;
  blendMode?: GlobalCompositeOperation;
}

export interface FrameTransformation {
  frameIndex: number;
  translateX: number;
  translateY: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  opacity: number;
  skewX?: number;
  skewY?: number;
}

export interface OverlayEffect {
  type: 'glow' | 'particles' | 'aura' | 'slash' | 'shield' | 'poison' | 'sparkle' | 'smoke' | 'energy';
  color: string;
  intensity: number;
  animated: boolean;
}

export interface GeneratedSprite {
  id: string;
  name: string;
  sourceImage: string;
  animations: Record<AnimationState, AnimationData>;
  width: number;
  height: number;
}

export interface AnimationData {
  frames: string[];
  config: AnimationConfig;
}

const DEFAULT_FRAME_COUNT = 6;
const DEFAULT_DURATION = 100;

function generateEaseInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function generateBounce(t: number): number {
  return Math.abs(Math.sin(t * Math.PI * 2) * (1 - t));
}

function createIdleTransformations(frameCount: number): FrameTransformation[] {
  const transforms: FrameTransformation[] = [];
  for (let i = 0; i < frameCount; i++) {
    const progress = i / (frameCount - 1);
    const breathe = Math.sin(progress * Math.PI * 2) * 0.02;
    const bob = Math.sin(progress * Math.PI) * 2;
    transforms.push({
      frameIndex: i,
      translateX: 0,
      translateY: bob,
      scaleX: 1 + breathe,
      scaleY: 1 - breathe * 0.5,
      rotation: 0,
      opacity: 1
    });
  }
  return transforms;
}

function createAttack1Transformations(frameCount: number): FrameTransformation[] {
  const transforms: FrameTransformation[] = [];
  for (let i = 0; i < frameCount; i++) {
    const progress = i / (frameCount - 1);
    const lunge = progress < 0.5 
      ? generateEaseInOut(progress * 2) * 20 
      : generateEaseInOut((1 - progress) * 2) * 20;
    const squeeze = progress < 0.5
      ? 1 + generateEaseInOut(progress * 2) * 0.1
      : 1 + generateEaseInOut((1 - progress) * 2) * 0.1;
    transforms.push({
      frameIndex: i,
      translateX: lunge,
      translateY: progress < 0.3 ? -5 : 0,
      scaleX: squeeze,
      scaleY: 2 - squeeze,
      rotation: progress < 0.5 ? progress * 10 : (1 - progress) * 10,
      opacity: 1
    });
  }
  return transforms;
}

function createAttack2Transformations(frameCount: number): FrameTransformation[] {
  const transforms: FrameTransformation[] = [];
  for (let i = 0; i < frameCount; i++) {
    const progress = i / (frameCount - 1);
    const spin = progress < 0.6 ? progress * 360 : 360;
    const lunge = progress < 0.7 
      ? generateEaseInOut(progress / 0.7) * 30
      : generateEaseInOut((1 - progress) / 0.3) * 30;
    transforms.push({
      frameIndex: i,
      translateX: lunge,
      translateY: -Math.abs(Math.sin(progress * Math.PI)) * 15,
      scaleX: 1,
      scaleY: 1,
      rotation: spin,
      opacity: 1
    });
  }
  return transforms;
}

function createCastTransformations(frameCount: number): FrameTransformation[] {
  const transforms: FrameTransformation[] = [];
  for (let i = 0; i < frameCount; i++) {
    const progress = i / (frameCount - 1);
    const rise = progress < 0.5 ? progress * 2 : 1;
    const pulse = Math.sin(progress * Math.PI * 3) * 0.05;
    transforms.push({
      frameIndex: i,
      translateX: 0,
      translateY: -rise * 10,
      scaleX: 1 + pulse,
      scaleY: 1 + pulse,
      rotation: 0,
      opacity: 1
    });
  }
  return transforms;
}

function createVictoryTransformations(frameCount: number): FrameTransformation[] {
  const transforms: FrameTransformation[] = [];
  for (let i = 0; i < frameCount; i++) {
    const progress = i / (frameCount - 1);
    const bounce = generateBounce(progress) * 20;
    transforms.push({
      frameIndex: i,
      translateX: 0,
      translateY: -bounce,
      scaleX: 1 + Math.sin(progress * Math.PI) * 0.1,
      scaleY: 1 + Math.sin(progress * Math.PI) * 0.1,
      rotation: Math.sin(progress * Math.PI * 2) * 5,
      opacity: 1
    });
  }
  return transforms;
}

function createDeathTransformations(frameCount: number): FrameTransformation[] {
  const transforms: FrameTransformation[] = [];
  for (let i = 0; i < frameCount; i++) {
    const progress = i / (frameCount - 1);
    const fall = generateEaseInOut(progress);
    transforms.push({
      frameIndex: i,
      translateX: progress * 5,
      translateY: progress * 30,
      scaleX: 1,
      scaleY: 1 - progress * 0.3,
      rotation: progress * 90,
      opacity: 1 - progress * 0.5
    });
  }
  return transforms;
}

function createWalkTransformations(frameCount: number): FrameTransformation[] {
  const transforms: FrameTransformation[] = [];
  for (let i = 0; i < frameCount; i++) {
    const progress = i / (frameCount - 1);
    const stepBob = Math.abs(Math.sin(progress * Math.PI * 2)) * 3;
    const lean = Math.sin(progress * Math.PI * 2) * 3;
    transforms.push({
      frameIndex: i,
      translateX: 0,
      translateY: stepBob,
      scaleX: 1,
      scaleY: 1,
      rotation: lean,
      opacity: 1
    });
  }
  return transforms;
}

function createHurtTransformations(frameCount: number): FrameTransformation[] {
  const transforms: FrameTransformation[] = [];
  for (let i = 0; i < frameCount; i++) {
    const progress = i / (frameCount - 1);
    const shake = Math.sin(progress * Math.PI * 6) * (1 - progress) * 10;
    const recoil = progress < 0.3 ? -15 : -15 + (progress - 0.3) * 21.4;
    transforms.push({
      frameIndex: i,
      translateX: recoil + shake,
      translateY: shake * 0.5,
      scaleX: 1,
      scaleY: 1,
      rotation: shake,
      opacity: progress < 0.5 ? (Math.floor(progress * 10) % 2 === 0 ? 1 : 0.5) : 1
    });
  }
  return transforms;
}

function createBuffedTransformations(frameCount: number): FrameTransformation[] {
  const transforms: FrameTransformation[] = [];
  for (let i = 0; i < frameCount; i++) {
    const progress = i / (frameCount - 1);
    const pulse = Math.sin(progress * Math.PI * 2) * 0.05;
    const glow = Math.sin(progress * Math.PI) * 0.1;
    transforms.push({
      frameIndex: i,
      translateX: 0,
      translateY: -Math.sin(progress * Math.PI) * 3,
      scaleX: 1 + pulse + glow,
      scaleY: 1 + pulse + glow,
      rotation: 0,
      opacity: 1
    });
  }
  return transforms;
}

function createPoisonedTransformations(frameCount: number): FrameTransformation[] {
  const transforms: FrameTransformation[] = [];
  for (let i = 0; i < frameCount; i++) {
    const progress = i / (frameCount - 1);
    const wobble = Math.sin(progress * Math.PI * 3) * 5;
    const droop = Math.sin(progress * Math.PI) * 3;
    transforms.push({
      frameIndex: i,
      translateX: wobble,
      translateY: droop,
      scaleX: 1 - Math.sin(progress * Math.PI) * 0.03,
      scaleY: 1 - Math.sin(progress * Math.PI) * 0.05,
      rotation: wobble * 0.5,
      opacity: 0.8 + Math.sin(progress * Math.PI * 2) * 0.2,
      skewX: wobble * 0.5
    });
  }
  return transforms;
}

function createStealthTransformations(frameCount: number): FrameTransformation[] {
  const transforms: FrameTransformation[] = [];
  for (let i = 0; i < frameCount; i++) {
    const progress = i / (frameCount - 1);
    const fadeIn = progress < 0.3 ? 1 - progress * 2 : 0.4;
    const flicker = Math.sin(progress * Math.PI * 8) * 0.1;
    transforms.push({
      frameIndex: i,
      translateX: 0,
      translateY: 0,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      opacity: fadeIn + flicker
    });
  }
  return transforms;
}

function createShieldedTransformations(frameCount: number): FrameTransformation[] {
  const transforms: FrameTransformation[] = [];
  for (let i = 0; i < frameCount; i++) {
    const progress = i / (frameCount - 1);
    const pulse = Math.sin(progress * Math.PI * 2) * 0.03;
    transforms.push({
      frameIndex: i,
      translateX: 0,
      translateY: 0,
      scaleX: 1 + pulse,
      scaleY: 1 + pulse,
      rotation: 0,
      opacity: 1
    });
  }
  return transforms;
}

function createComboTransformations(frameCount: number): FrameTransformation[] {
  const transforms: FrameTransformation[] = [];
  const phases = 3;
  for (let i = 0; i < frameCount; i++) {
    const progress = i / (frameCount - 1);
    const phase = Math.floor(progress * phases);
    const phaseProgress = (progress * phases) % 1;
    
    let translateX = 0, rotation = 0;
    
    if (phase === 0) {
      translateX = generateEaseInOut(phaseProgress) * 25;
      rotation = phaseProgress * 15;
    } else if (phase === 1) {
      translateX = 25 - generateEaseInOut(phaseProgress) * 50;
      rotation = 15 - phaseProgress * 30;
    } else {
      translateX = -25 + generateEaseInOut(phaseProgress) * 40;
      rotation = -15 + phaseProgress * 20;
    }
    
    transforms.push({
      frameIndex: i,
      translateX,
      translateY: -Math.abs(Math.sin(progress * Math.PI * 3)) * 10,
      scaleX: 1 + Math.sin(progress * Math.PI * 3) * 0.1,
      scaleY: 1,
      rotation,
      opacity: 1
    });
  }
  return transforms;
}

export const ANIMATION_CONFIGS: Record<AnimationState, AnimationConfig> = {
  idle: {
    name: 'idle',
    displayName: 'Idle',
    frameCount: 8,
    frameDuration: 150,
    loop: true,
    transformations: createIdleTransformations(8),
    overlay: { type: 'sparkle', color: 'rgba(255,255,255,0.3)', intensity: 0.2, animated: true }
  },
  attack1: {
    name: 'attack1',
    displayName: 'Attack 1',
    frameCount: 8,
    frameDuration: 80,
    loop: false,
    transformations: createAttack1Transformations(8),
    overlay: { type: 'slash', color: 'rgba(255,200,100,0.8)', intensity: 1, animated: true }
  },
  attack2: {
    name: 'attack2',
    displayName: 'Attack 2',
    frameCount: 10,
    frameDuration: 70,
    loop: false,
    transformations: createAttack2Transformations(10),
    overlay: { type: 'slash', color: 'rgba(255,100,100,0.9)', intensity: 1.2, animated: true }
  },
  cast: {
    name: 'cast',
    displayName: 'Cast',
    frameCount: 12,
    frameDuration: 100,
    loop: false,
    transformations: createCastTransformations(12),
    overlay: { type: 'energy', color: 'rgba(100,150,255,0.8)', intensity: 1.5, animated: true }
  },
  victory: {
    name: 'victory',
    displayName: 'Victory',
    frameCount: 10,
    frameDuration: 120,
    loop: true,
    transformations: createVictoryTransformations(10),
    overlay: { type: 'sparkle', color: 'rgba(255,215,0,0.9)', intensity: 2, animated: true }
  },
  death: {
    name: 'death',
    displayName: 'Death',
    frameCount: 12,
    frameDuration: 100,
    loop: false,
    transformations: createDeathTransformations(12),
    overlay: { type: 'smoke', color: 'rgba(50,50,50,0.6)', intensity: 1, animated: true }
  },
  walk: {
    name: 'walk',
    displayName: 'Walk',
    frameCount: 8,
    frameDuration: 100,
    loop: true,
    transformations: createWalkTransformations(8)
  },
  hurt: {
    name: 'hurt',
    displayName: 'Hurt',
    frameCount: 6,
    frameDuration: 80,
    loop: false,
    transformations: createHurtTransformations(6),
    tint: 'rgba(255,0,0,0.3)'
  },
  buffed: {
    name: 'buffed',
    displayName: 'Buffed',
    frameCount: 8,
    frameDuration: 120,
    loop: true,
    transformations: createBuffedTransformations(8),
    overlay: { type: 'aura', color: 'rgba(255,215,0,0.5)', intensity: 1.5, animated: true }
  },
  poisoned: {
    name: 'poisoned',
    displayName: 'Poisoned',
    frameCount: 10,
    frameDuration: 150,
    loop: true,
    transformations: createPoisonedTransformations(10),
    overlay: { type: 'poison', color: 'rgba(0,200,0,0.6)', intensity: 1, animated: true },
    tint: 'rgba(0,150,0,0.2)'
  },
  stealth: {
    name: 'stealth',
    displayName: 'Stealth',
    frameCount: 8,
    frameDuration: 100,
    loop: true,
    transformations: createStealthTransformations(8),
    overlay: { type: 'smoke', color: 'rgba(100,100,150,0.4)', intensity: 0.8, animated: true }
  },
  shielded: {
    name: 'shielded',
    displayName: 'Shielded',
    frameCount: 8,
    frameDuration: 120,
    loop: true,
    transformations: createShieldedTransformations(8),
    overlay: { type: 'shield', color: 'rgba(100,200,255,0.6)', intensity: 1.2, animated: true }
  },
  combo: {
    name: 'combo',
    displayName: 'Combo',
    frameCount: 15,
    frameDuration: 60,
    loop: false,
    transformations: createComboTransformations(15),
    overlay: { type: 'energy', color: 'rgba(255,100,50,0.9)', intensity: 2, animated: true }
  }
};

export async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function applyTransformation(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  transform: FrameTransformation,
  width: number,
  height: number,
  tint?: string
): void {
  ctx.save();
  
  ctx.translate(width / 2, height / 2);
  ctx.translate(transform.translateX, transform.translateY);
  ctx.rotate((transform.rotation * Math.PI) / 180);
  ctx.scale(transform.scaleX, transform.scaleY);
  
  if (transform.skewX || transform.skewY) {
    ctx.transform(1, transform.skewY || 0, transform.skewX || 0, 1, 0, 0);
  }
  
  ctx.globalAlpha = transform.opacity;
  
  ctx.drawImage(image, -width / 2, -height / 2, width, height);
  
  if (tint) {
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = tint;
    ctx.fillRect(-width / 2, -height / 2, width, height);
  }
  
  ctx.restore();
}

export function drawOverlayEffect(
  ctx: CanvasRenderingContext2D,
  overlay: OverlayEffect,
  frameIndex: number,
  width: number,
  height: number,
  totalFrames: number
): void {
  const progress = frameIndex / (totalFrames - 1);
  
  ctx.save();
  ctx.globalAlpha = overlay.intensity * 0.5;
  
  switch (overlay.type) {
    case 'glow':
      const glowGradient = ctx.createRadialGradient(
        width / 2, height / 2, 0,
        width / 2, height / 2, width * 0.6
      );
      glowGradient.addColorStop(0, overlay.color);
      glowGradient.addColorStop(1, 'transparent');
      ctx.fillStyle = glowGradient;
      ctx.fillRect(0, 0, width, height);
      break;
      
    case 'aura':
      const auraSize = 1 + Math.sin(progress * Math.PI * 4) * 0.1;
      const auraGradient = ctx.createRadialGradient(
        width / 2, height / 2, width * 0.2,
        width / 2, height / 2, width * 0.5 * auraSize
      );
      auraGradient.addColorStop(0, 'transparent');
      auraGradient.addColorStop(0.5, overlay.color);
      auraGradient.addColorStop(1, 'transparent');
      ctx.fillStyle = auraGradient;
      ctx.fillRect(0, 0, width, height);
      break;
      
    case 'slash':
      ctx.strokeStyle = overlay.color;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      const slashProgress = Math.min(progress * 2, 1);
      ctx.beginPath();
      ctx.moveTo(width * 0.3, height * 0.2);
      ctx.lineTo(
        width * 0.3 + (width * 0.5) * slashProgress,
        height * 0.2 + (height * 0.6) * slashProgress
      );
      ctx.stroke();
      if (progress > 0.3) {
        ctx.beginPath();
        ctx.moveTo(width * 0.5, height * 0.1);
        ctx.lineTo(
          width * 0.5 + (width * 0.4) * Math.min((progress - 0.3) * 2, 1),
          height * 0.1 + (height * 0.7) * Math.min((progress - 0.3) * 2, 1)
        );
        ctx.stroke();
      }
      break;
      
    case 'shield':
      const shieldPulse = 1 + Math.sin(progress * Math.PI * 3) * 0.1;
      ctx.beginPath();
      ctx.ellipse(width / 2, height / 2, width * 0.45 * shieldPulse, height * 0.5 * shieldPulse, 0, 0, Math.PI * 2);
      ctx.strokeStyle = overlay.color;
      ctx.lineWidth = 4;
      ctx.stroke();
      const shieldGradient = ctx.createRadialGradient(
        width / 2, height / 2, 0,
        width / 2, height / 2, width * 0.45
      );
      shieldGradient.addColorStop(0, 'transparent');
      shieldGradient.addColorStop(0.8, overlay.color.replace('0.6', '0.1'));
      shieldGradient.addColorStop(1, overlay.color);
      ctx.fillStyle = shieldGradient;
      ctx.fill();
      break;
      
    case 'poison':
      for (let i = 0; i < 5; i++) {
        const bubbleProgress = (progress + i * 0.2) % 1;
        const bubbleX = width * (0.3 + i * 0.1);
        const bubbleY = height - bubbleProgress * height;
        const bubbleSize = 3 + Math.sin(bubbleProgress * Math.PI) * 3;
        ctx.beginPath();
        ctx.arc(bubbleX, bubbleY, bubbleSize, 0, Math.PI * 2);
        ctx.fillStyle = overlay.color;
        ctx.fill();
      }
      break;
      
    case 'sparkle':
      for (let i = 0; i < 4; i++) {
        const sparklePhase = (progress + i * 0.25) % 1;
        const sparkleX = width * (0.2 + Math.random() * 0.6);
        const sparkleY = height * (0.2 + Math.random() * 0.6);
        const sparkleSize = Math.sin(sparklePhase * Math.PI) * 4;
        ctx.fillStyle = overlay.color;
        ctx.beginPath();
        ctx.moveTo(sparkleX, sparkleY - sparkleSize);
        ctx.lineTo(sparkleX + sparkleSize * 0.3, sparkleY);
        ctx.lineTo(sparkleX, sparkleY + sparkleSize);
        ctx.lineTo(sparkleX - sparkleSize * 0.3, sparkleY);
        ctx.closePath();
        ctx.fill();
      }
      break;
      
    case 'smoke':
      for (let i = 0; i < 3; i++) {
        const smokeProgress = (progress + i * 0.33) % 1;
        const smokeX = width * (0.3 + i * 0.2);
        const smokeY = height - smokeProgress * height * 0.5;
        const smokeSize = 10 + smokeProgress * 15;
        const smokeGradient = ctx.createRadialGradient(
          smokeX, smokeY, 0,
          smokeX, smokeY, smokeSize
        );
        smokeGradient.addColorStop(0, overlay.color);
        smokeGradient.addColorStop(1, 'transparent');
        ctx.fillStyle = smokeGradient;
        ctx.fillRect(smokeX - smokeSize, smokeY - smokeSize, smokeSize * 2, smokeSize * 2);
      }
      break;
      
    case 'energy':
      const energyCount = 6;
      for (let i = 0; i < energyCount; i++) {
        const angle = (progress * Math.PI * 4 + (i / energyCount) * Math.PI * 2);
        const energyX = width / 2 + Math.cos(angle) * width * 0.35;
        const energyY = height / 2 + Math.sin(angle) * height * 0.35;
        const energyGradient = ctx.createRadialGradient(
          energyX, energyY, 0,
          energyX, energyY, 10
        );
        energyGradient.addColorStop(0, overlay.color);
        energyGradient.addColorStop(1, 'transparent');
        ctx.fillStyle = energyGradient;
        ctx.beginPath();
        ctx.arc(energyX, energyY, 8, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
      
    case 'particles':
      for (let i = 0; i < 8; i++) {
        const particleProgress = (progress + i * 0.125) % 1;
        const angle = (i / 8) * Math.PI * 2;
        const distance = particleProgress * width * 0.5;
        const particleX = width / 2 + Math.cos(angle) * distance;
        const particleY = height / 2 + Math.sin(angle) * distance;
        ctx.fillStyle = overlay.color;
        ctx.globalAlpha = (1 - particleProgress) * overlay.intensity;
        ctx.beginPath();
        ctx.arc(particleX, particleY, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
  }
  
  ctx.restore();
}

export async function generateAnimationFrames(
  sourceImage: HTMLImageElement,
  animation: AnimationState,
  outputWidth: number = 128,
  outputHeight: number = 128
): Promise<string[]> {
  const config = ANIMATION_CONFIGS[animation];
  const frames: string[] = [];
  
  for (let i = 0; i < config.frameCount; i++) {
    const canvas = document.createElement('canvas');
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const ctx = canvas.getContext('2d')!;
    
    ctx.clearRect(0, 0, outputWidth, outputHeight);
    
    const transform = config.transformations[i] || config.transformations[config.transformations.length - 1];
    
    applyTransformation(ctx, sourceImage, transform, outputWidth, outputHeight, config.tint);
    
    if (config.overlay) {
      drawOverlayEffect(ctx, config.overlay, i, outputWidth, outputHeight, config.frameCount);
    }
    
    frames.push(canvas.toDataURL('image/png'));
  }
  
  return frames;
}

export async function generateSpriteSheet(
  sourceImage: HTMLImageElement,
  animation: AnimationState,
  frameWidth: number = 128,
  frameHeight: number = 128
): Promise<string> {
  const config = ANIMATION_CONFIGS[animation];
  const frames = await generateAnimationFrames(sourceImage, animation, frameWidth, frameHeight);
  
  const canvas = document.createElement('canvas');
  canvas.width = frameWidth * config.frameCount;
  canvas.height = frameHeight;
  const ctx = canvas.getContext('2d')!;
  
  for (let i = 0; i < frames.length; i++) {
    const frameImg = await loadImage(frames[i]);
    ctx.drawImage(frameImg, i * frameWidth, 0, frameWidth, frameHeight);
  }
  
  return canvas.toDataURL('image/png');
}

export async function generateAllAnimations(
  sourceImageSrc: string,
  frameWidth: number = 128,
  frameHeight: number = 128
): Promise<Record<AnimationState, { spriteSheet: string; frames: string[] }>> {
  const sourceImage = await loadImage(sourceImageSrc);
  const result: Record<AnimationState, { spriteSheet: string; frames: string[] }> = {} as any;
  
  const animations = Object.keys(ANIMATION_CONFIGS) as AnimationState[];
  
  for (const animation of animations) {
    const frames = await generateAnimationFrames(sourceImage, animation, frameWidth, frameHeight);
    const spriteSheet = await generateSpriteSheet(sourceImage, animation, frameWidth, frameHeight);
    result[animation] = { spriteSheet, frames };
  }
  
  return result;
}

export function exportSpriteSheetAsImage(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
}
