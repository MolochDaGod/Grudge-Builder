/**
 * AnimatedAvatar — Renders an AI avatar with sprite-sheet animation.
 *
 * Plays faction-branded character animations from sprite sheets on a canvas.
 * Used for tutorial tips, grudgeDot editor assistant, and in-app guides.
 *
 * Usage:
 *   <AnimatedAvatar avatarId="crusade-ninja" mood="greeting" size={120} />
 *   <AvatarWithBubble avatarId="fabled-mage" text="Welcome!" />
 */
import { useRef, useEffect, useState, useCallback } from 'react';
import {
  type AvatarId,
  type AvatarMood,
  type AvatarAnim,
  AI_AVATARS,
  getMoodAnim,
  getAnimData,
  getAnimSpriteUrl,
  getAvatarForContext,
  getTipsForContext,
} from '@/lib/aiAvatars';

// ── Core Sprite Animator ────────────────────────────────────────────────────

interface AnimatedAvatarProps {
  avatarId: AvatarId;
  mood?: AvatarMood;
  anim?: AvatarAnim;
  size?: number;
  fps?: number;
  className?: string;
  onClick?: () => void;
}

export function AnimatedAvatar({
  avatarId,
  mood = 'idle',
  anim,
  size = 96,
  fps = 12,
  className = '',
  onClick,
}: AnimatedAvatarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const frameRef = useRef(0);
  const rafRef = useRef<number>(0);
  const lastFrameTime = useRef(0);

  const currentAnim = anim || getMoodAnim(mood);
  const animData = getAnimData(avatarId, currentAnim);
  const spriteUrl = getAnimSpriteUrl(avatarId, currentAnim);

  // Load sprite sheet
  useEffect(() => {
    const img = new Image();
    img.src = spriteUrl;
    img.onload = () => {
      imageRef.current = img;
      frameRef.current = 0;
    };
    return () => { imageRef.current = null; };
  }, [spriteUrl]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const frameDuration = 1000 / fps;

    const draw = (time: number) => {
      if (time - lastFrameTime.current >= frameDuration) {
        lastFrameTime.current = time;
        frameRef.current = (frameRef.current + 1) % animData.frameCount;

        const img = imageRef.current;
        if (img && img.complete) {
          const col = frameRef.current % animData.cols;
          const row = Math.floor(frameRef.current / animData.cols);
          const sx = col * animData.frameWidth;
          const sy = row * animData.frameHeight;

          ctx.clearRect(0, 0, size, size);
          ctx.drawImage(
            img,
            sx, sy, animData.frameWidth, animData.frameHeight,
            0, 0, size, size,
          );
        }
      }
      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [animData, size, fps]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={`${className} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
      style={{ imageRendering: 'auto' }}
      title={AI_AVATARS[avatarId].name}
    />
  );
}

// ── Avatar with Speech Bubble ───────────────────────────────────────────────

interface AvatarWithBubbleProps {
  avatarId: AvatarId;
  text: string;
  mood?: AvatarMood;
  size?: number;
  onClose?: () => void;
  className?: string;
  position?: 'left' | 'right';
}

export function AvatarWithBubble({
  avatarId,
  text,
  mood = 'talking',
  size = 80,
  onClose,
  className = '',
  position = 'left',
}: AvatarWithBubbleProps) {
  const avatar = AI_AVATARS[avatarId];

  return (
    <div className={`flex items-end gap-2 ${position === 'right' ? 'flex-row-reverse' : ''} ${className}`}>
      <div className="flex-shrink-0">
        <AnimatedAvatar avatarId={avatarId} mood={mood} size={size} />
        <div
          className="text-center text-[10px] font-bold mt-0.5 rounded px-1"
          style={{ color: avatar.color }}
        >
          {avatar.name}
        </div>
      </div>
      <div className="relative max-w-xs bg-stone-800/95 border border-stone-600 rounded-lg p-3 shadow-lg">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-stone-700 text-stone-400 hover:text-white text-xs flex items-center justify-center"
          >
            ×
          </button>
        )}
        <p className="text-xs text-stone-200 leading-relaxed">{text}</p>
        <div className="text-[10px] text-stone-500 mt-1 italic">{avatar.title}</div>
      </div>
    </div>
  );
}

// ── Auto-cycling Context Tips ───────────────────────────────────────────────

interface AvatarTipsProps {
  context: string;
  /** Position on screen */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  /** Seconds between tip changes */
  interval?: number;
  onClose?: () => void;
  className?: string;
}

export function AvatarTips({
  context,
  position = 'bottom-right',
  interval = 10,
  onClose,
  className = '',
}: AvatarTipsProps) {
  const tips = getTipsForContext(context);
  const [tipIndex, setTipIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (tips.length <= 1) return;
    const timer = setInterval(() => {
      setTipIndex(prev => (prev + 1) % tips.length);
    }, interval * 1000);
    return () => clearInterval(timer);
  }, [tips.length, interval]);

  if (!visible || tips.length === 0) return null;

  const tip = tips[tipIndex];
  const posClasses = {
    'bottom-right': 'fixed bottom-4 right-4',
    'bottom-left': 'fixed bottom-4 left-4',
    'top-right': 'fixed top-4 right-4',
    'top-left': 'fixed top-4 left-4',
  };

  return (
    <div className={`${posClasses[position]} z-50 ${className}`}>
      <AvatarWithBubble
        avatarId={tip.avatarId}
        text={tip.text}
        mood={tip.mood}
        size={72}
        onClose={() => {
          setVisible(false);
          onClose?.();
        }}
      />
    </div>
  );
}

// ── Avatar Selector (for settings / preferences) ────────────────────────────

interface AvatarSelectorProps {
  selected: AvatarId;
  onSelect: (id: AvatarId) => void;
  className?: string;
}

export function AvatarSelector({ selected, onSelect, className = '' }: AvatarSelectorProps) {
  const avatars = Object.values(AI_AVATARS);

  return (
    <div className={`flex gap-3 ${className}`}>
      {avatars.map(avatar => (
        <button
          key={avatar.id}
          onClick={() => onSelect(avatar.id)}
          className={`flex flex-col items-center p-2 rounded-lg border-2 transition-all ${
            selected === avatar.id
              ? 'border-amber-500 bg-stone-800 scale-105'
              : 'border-stone-700 bg-stone-900 hover:border-stone-500'
          }`}
          title={`${avatar.name} — ${avatar.title}`}
        >
          <AnimatedAvatar avatarId={avatar.id} mood="idle" size={64} />
          <span className="text-xs font-bold mt-1" style={{ color: avatar.color }}>
            {avatar.name}
          </span>
          <span className="text-[10px] text-stone-500">{avatar.title}</span>
        </button>
      ))}
    </div>
  );
}
