import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, AlertTriangle, WifiOff } from 'lucide-react';

interface WorldLoadingProps {
  progress: number;
  connecting: boolean;
  connected: boolean;
  error?: string | null;
  reducedMotion: boolean;
}

export function WorldLoading({ progress, connecting, connected, error, reducedMotion }: WorldLoadingProps) {
  const title = 'ENTERING WORLD';
  const subtitle = connecting
    ? 'Connecting to server...'
    : connected
      ? 'Joined world · Loading sector...'
      : 'Initializing...';

  return (
    <div className="absolute inset-0 z-[100] bg-[#05060c] flex flex-col items-center justify-center">
      <motion.h1
        className="text-4xl font-cinzel font-black tracking-[6px] mb-4"
        style={{
          background: 'linear-gradient(180deg, #f6c945, #fff3c2 50%, #f6c945)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
        initial={reducedMotion ? false : { opacity: 0, y: 8 }}
        animate={reducedMotion ? {} : { opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {title}
      </motion.h1>

      <div className="w-64 h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{
            background: 'linear-gradient(90deg, #f6c945, #fff3c2)',
          }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
          transition={reducedMotion ? { duration: 0 } : { duration: 0.15 }}
        />
      </div>

      <p className="text-white/40 text-sm mt-3 tracking-wider">{subtitle}</p>

      <AnimatePresence>
        {error && (
          <motion.p
            className="text-red-400 text-sm mt-2 flex items-center gap-2"
            initial={reducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <AlertTriangle className="w-3.5 h-3.5" /> {error}
          </motion.p>
        )}
      </AnimatePresence>

      {!connected && !connecting && !error && (
        <div className="mt-4 flex items-center gap-2 text-white/30 text-xs">
          <WifiOff className="w-3 h-3" /> Waiting for connection
        </div>
      )}
    </div>
  );
}

export function WorldErrorOverlay({ message, onRetry, reducedMotion }: { message: string; onRetry?: () => void; reducedMotion: boolean }) {
  return (
    <div className="absolute inset-0 z-[110] bg-black/80 flex items-center justify-center">
      <motion.div
        className="bg-stone-950 border border-red-900/40 rounded-2xl p-8 max-w-sm text-center"
        initial={reducedMotion ? false : { scale: 0.98, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: reducedMotion ? 0 : 0.2 }}
      >
        <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-3" />
        <div className="text-white font-bold mb-1">World connection issue</div>
        <p className="text-stone-400 text-sm mb-4">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 rounded-lg bg-red-600/90 hover:bg-red-600 text-sm text-white font-medium"
          >
            Retry
          </button>
        )}
      </motion.div>
    </div>
  );
}
