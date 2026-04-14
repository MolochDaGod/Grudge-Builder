/**
 * FactionEmblems — SVG faction icons for Crusade, Legion, and Fabled.
 *
 * Colors match ObjectStore factions.json:
 *   Crusade = #fbbf24 (gold/amber)
 *   Legion  = #ef4444 (red)
 *   Fabled  = #22d3ee (cyan)
 */

interface EmblemProps {
  size?: number;
  className?: string;
}

export function CrusadeEmblem({ size = 32, className = '' }: EmblemProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} xmlns="http://www.w3.org/2000/svg">
      <title>The Crusade — Odin's Warriors</title>
      {/* Shield */}
      <path d="M24 4 L40 12 L40 28 Q40 40 24 46 Q8 40 8 28 L8 12 Z" fill="#fbbf2418" stroke="#fbbf24" strokeWidth="2" />
      {/* Sword cross */}
      <line x1="24" y1="10" x2="24" y2="40" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="16" y1="20" x2="32" y2="20" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" />
      {/* Sword pommel */}
      <circle cx="24" cy="42" r="2" fill="#fbbf24" />
      {/* Blade tip */}
      <path d="M24 8 L22 12 L26 12 Z" fill="#fbbf24" />
    </svg>
  );
}

export function LegionEmblem({ size = 32, className = '' }: EmblemProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} xmlns="http://www.w3.org/2000/svg">
      <title>The Legion — Madra's Dark Army</title>
      {/* Skull outline */}
      <path d="M24 6 Q36 6 38 18 Q39 26 36 30 L32 34 L28 32 L26 38 L24 40 L22 38 L20 32 L16 34 L12 30 Q9 26 10 18 Q12 6 24 6Z" fill="#ef444418" stroke="#ef4444" strokeWidth="2" />
      {/* Eye sockets */}
      <ellipse cx="18" cy="20" rx="3.5" ry="4" fill="#ef4444" opacity="0.8" />
      <ellipse cx="30" cy="20" rx="3.5" ry="4" fill="#ef4444" opacity="0.8" />
      {/* Nose */}
      <path d="M24 24 L22 28 L26 28 Z" fill="none" stroke="#ef4444" strokeWidth="1.5" />
      {/* Teeth */}
      <line x1="20" y1="32" x2="20" y2="35" stroke="#ef4444" strokeWidth="1.5" />
      <line x1="24" y1="33" x2="24" y2="37" stroke="#ef4444" strokeWidth="1.5" />
      <line x1="28" y1="32" x2="28" y2="35" stroke="#ef4444" strokeWidth="1.5" />
    </svg>
  );
}

export function FabledEmblem({ size = 32, className = '' }: EmblemProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} xmlns="http://www.w3.org/2000/svg">
      <title>The Fabled — The Omni's Alliance</title>
      {/* Leaf/Nature circle */}
      <circle cx="24" cy="24" r="16" fill="#22d3ee08" stroke="#22d3ee" strokeWidth="1.5" />
      {/* Inner eye - Omni */}
      <ellipse cx="24" cy="24" rx="10" ry="6" fill="none" stroke="#22d3ee" strokeWidth="2" />
      <circle cx="24" cy="24" r="3" fill="#22d3ee" opacity="0.9" />
      {/* Nature tendrils */}
      <path d="M8 24 Q12 18 18 22" fill="none" stroke="#22d3ee" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M40 24 Q36 18 30 22" fill="none" stroke="#22d3ee" strokeWidth="1.5" strokeLinecap="round" />
      {/* Top leaf */}
      <path d="M24 8 Q28 12 24 16 Q20 12 24 8Z" fill="#22d3ee" opacity="0.6" />
      {/* Bottom root */}
      <path d="M24 40 Q28 36 24 32 Q20 36 24 40Z" fill="#22d3ee" opacity="0.6" />
    </svg>
  );
}

/** All three emblems in a row — used on login page, character builder, etc. */
export function FactionEmblemRow({
  size = 40,
  className = '',
  gap = 3,
}: {
  size?: number;
  className?: string;
  gap?: number;
}) {
  const emblems = [
    { Component: CrusadeEmblem, name: 'Crusade', color: '#fbbf24', border: 'border-amber-500/30 hover:border-amber-400/60' },
    { Component: FabledEmblem, name: 'Fabled', color: '#22d3ee', border: 'border-cyan-500/30 hover:border-cyan-400/60' },
    { Component: LegionEmblem, name: 'Legion', color: '#ef4444', border: 'border-red-500/30 hover:border-red-400/60' },
  ];

  return (
    <div className={`flex justify-center gap-${gap} ${className}`}>
      {emblems.map(({ Component, name, border }) => (
        <div
          key={name}
          className={`w-12 h-12 rounded-lg bg-stone-800/50 border ${border} hover:scale-110 transition-all cursor-pointer flex items-center justify-center`}
          title={`${name} Faction`}
        >
          <Component size={size} />
        </div>
      ))}
    </div>
  );
}
