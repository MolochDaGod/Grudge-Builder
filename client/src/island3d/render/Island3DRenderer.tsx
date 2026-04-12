/**
 * Island3DRenderer — React component that mounts the 3D island engine.
 *
 * Manages canvas lifecycle, resize handling, and click-to-harvest interaction.
 */
import { useRef, useEffect, useState, useCallback } from 'react';
import { Island3DEngine } from '../engine/Island3DEngine';

interface Island3DRendererProps {
  seed: string;
  className?: string;
}

export function Island3DRenderer({ seed, className = '' }: Island3DRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Island3DEngine | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Init engine
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const engine = new Island3DEngine({ seed, canvas, width, height });
    engineRef.current = engine;

    engine.init()
      .then(() => {
        setLoading(false);
        engine.start();
      })
      .catch((err) => {
        console.error('Island3D init failed:', err);
        setError(err.message || 'Failed to initialize 3D island');
        setLoading(false);
      });

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [seed]);

  // Resize handler
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          engineRef.current?.resize(width, height);
        }
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Click handler
  const handleClick = useCallback((e: React.MouseEvent) => {
    engineRef.current?.handleClick(e.clientX, e.clientY);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full ${className}`}
      style={{ minHeight: '400px' }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        onClick={handleClick}
      />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mx-auto mb-4" />
            <p className="text-emerald-400 font-medium">Generating island terrain...</p>
            <p className="text-gray-400 text-sm mt-1">Seed: {seed}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-900/50 z-10">
          <p className="text-red-300">{error}</p>
        </div>
      )}

      {/* HUD overlay */}
      {!loading && !error && (
        <div className="absolute top-4 left-4 z-10 bg-black/50 text-white text-xs px-3 py-2 rounded">
          <p className="font-bold text-emerald-400">3D Island — {seed}</p>
          <p className="text-gray-300 mt-1">Click trees/rocks to harvest</p>
          <p className="text-gray-400">Scroll to zoom · Drag to orbit</p>
        </div>
      )}
    </div>
  );
}
