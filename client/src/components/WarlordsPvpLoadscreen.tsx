/**
 * WarlordsPvpLoadscreen — branded PvP / lobby loading overlay with fleet video.
 */
import type { ReactNode } from 'react';
import { useFleetVideo } from '@/hooks/use-fleet-video';

interface Props {
  label?: string;
  progress?: number;
  className?: string;
  videoOpacity?: number;
  children?: ReactNode;
}

export function WarlordsPvpLoadscreen({
  label,
  progress,
  className = '',
  videoOpacity = 0.55,
  children,
}: Props) {
  const src = useFleetVideo('warlordsPvpLoadscreen');

  return (
    <div className={`absolute inset-0 z-[100] flex flex-col items-center justify-center bg-[#05060c] overflow-hidden ${className}`}>
      {src && (
        <video
          src={src}
          autoPlay
          muted
          playsInline
          loop
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: videoOpacity }}
        />
      )}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 20%, rgba(5,6,12,0.75) 100%), linear-gradient(to top, rgba(5,6,12,0.9) 0%, transparent 50%)',
        }}
      />
      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        {children}
        {label && (
          <p className="text-white/50 text-sm mt-3 tracking-wider font-medium">{label}</p>
        )}
        {progress !== undefined && progress >= 0 && (
          <div className="w-64 h-2 bg-white/10 rounded-full overflow-hidden mt-4">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(100, Math.max(0, progress))}%`,
                background: 'linear-gradient(90deg, #f6c945, #fff3c2)',
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}