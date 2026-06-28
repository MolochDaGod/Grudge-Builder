/**
 * PirateKingTransition — Full-screen loading overlay with the Pirate King
 * banner video. Use between game mode transitions, page loads, and
 * any async operation that needs a branded loading state.
 *
 * Usage:
 *   <PirateKingTransition visible={isLoading} label="Charting the seas..." />
 */

import { useEffect, useRef } from "react";
import { useFleetVideo } from "@/hooks/use-fleet-video";

interface Props {
  /** Show/hide the overlay */
  visible: boolean;
  /** Text displayed below the video (e.g. "Loading island...", "Entering open sea...") */
  label?: string;
  /** Opacity of the dark backdrop behind the video (0-1, default 0.92) */
  backdropOpacity?: number;
  /** Callback when the video finishes one loop (optional — for auto-dismiss) */
  onLoopComplete?: () => void;
}

export default function PirateKingTransition({
  visible,
  label = "Loading...",
  backdropOpacity = 0.92,
  onLoopComplete,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const loadscreenSrc = useFleetVideo('warlordsPvpLoadscreen');

  useEffect(() => {
    if (visible && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  }, [visible, loadscreenSrc]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: `rgba(5,6,12,${backdropOpacity})`,
        fontFamily: "'Cinzel', serif",
      }}
    >
      {/* Warlords era loadscreen */}
      {loadscreenSrc && (
      <video
        ref={videoRef}
        src={loadscreenSrc}
        autoPlay
        muted
        playsInline
        loop
        onEnded={onLoopComplete}
        style={{
          maxWidth: "min(640px, 90vw)",
          maxHeight: "40vh",
          borderRadius: 12,
          boxShadow: "0 20px 80px -20px rgba(246,201,69,.3)",
          border: "1px solid rgba(246,201,69,.15)",
        }}
      />
      )}

      {/* Label */}
      <div
        style={{
          marginTop: 24,
          color: "#f6c945",
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: "3px",
          textTransform: "uppercase",
          textShadow: "0 2px 12px rgba(246,201,69,.3)",
        }}
      >
        {label}
      </div>

      {/* Pulse dots */}
      <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#f6c945",
              opacity: 0.4,
              animation: `pulse 1s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          bottom: 24,
          fontSize: 9,
          color: "rgba(246,201,69,.2)",
          letterSpacing: "4px",
          textTransform: "uppercase",
        }}
      >
        Grudge Warlords
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:.3;transform:scale(1)}50%{opacity:1;transform:scale(1.4)}}`}</style>
    </div>
  );
}
