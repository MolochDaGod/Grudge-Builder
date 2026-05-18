import type { HomeIslandDto } from '@/lib/homeIslandApi';

const ZONE_COLORS: Record<string, string> = {
  mountain: '#6b7280',
  forest: '#166534',
  field: '#65a30d',
  shore: '#d6b66a',
  water: '#1d4ed8',
  clearing: '#b45309',
};

const NODE_COLORS: Record<string, string> = {
  ore: '#94a3b8',
  stone: '#64748b',
  gem: '#a855f7',
  crystal: '#7c3aed',
  wood: '#92400e',
  hemp: '#84cc16',
  herb: '#22c55e',
  fish: '#06b6d4',
  shell: '#f5d0a9',
  oil: '#111827',
  leather: '#a16207',
};

function nodeColor(type: string): string {
  return NODE_COLORS[type] || '#f59e0b';
}

export default function HomeIslandPreview({
  island,
  className = '',
}: {
  island: HomeIslandDto;
  className?: string;
}) {
  const state = island.state;

  return (
    <div className={`relative overflow-hidden rounded-xl border border-slate-700 bg-slate-950 ${className}`}>
      {state.mapImageUrl ? (
        <img
          src={state.mapImageUrl}
          alt={state.name}
          className="block w-full h-full object-cover"
        />
      ) : (
        <svg viewBox="0 0 100 100" className="block w-full h-full bg-slate-900">
          <rect x="0" y="0" width="100" height="100" fill="#0f172a" />
          {state.terrainZones.map((zone) => (
            <rect
              key={`${zone.zone}-${zone.x}-${zone.y}`}
              x={zone.x}
              y={zone.y}
              width={zone.width}
              height={zone.height}
              fill={ZONE_COLORS[zone.zone] || '#475569'}
              fillOpacity="0.72"
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="0.35"
            />
          ))}
          {state.clearings.map((clearing, idx) => (
            <rect
              key={`clearing-${idx}`}
              x={clearing.x}
              y={clearing.y}
              width={clearing.width}
              height={clearing.height}
              fill="rgba(245, 158, 11, 0.18)"
              stroke="rgba(251, 191, 36, 0.9)"
              strokeWidth="0.4"
              rx="1"
            />
          ))}
          {state.nodes.map((node) => (
            <circle
              key={node.id}
              cx={node.x}
              cy={node.y}
              r={node.rarity === 'legendary' ? 1.3 : node.rarity === 'epic' ? 1.1 : 0.95}
              fill={nodeColor(node.type)}
              stroke="rgba(255,255,255,0.65)"
              strokeWidth="0.2"
            />
          ))}
          {state.animals.map((animal) => (
            <circle
              key={animal.id}
              cx={animal.x}
              cy={animal.y}
              r="0.65"
              fill="#f8fafc"
              fillOpacity="0.9"
            />
          ))}
          {state.campPosition && (
            <>
              <circle
                cx={state.campPosition.x}
                cy={state.campPosition.y}
                r="2.3"
                fill="rgba(245, 158, 11, 0.18)"
                stroke="#f59e0b"
                strokeWidth="0.4"
              />
              <path
                d={`M ${state.campPosition.x} ${state.campPosition.y - 1.8} L ${state.campPosition.x - 1.2} ${state.campPosition.y + 1.2} L ${state.campPosition.x + 1.2} ${state.campPosition.y + 1.2} Z`}
                fill="#fde68a"
                stroke="#f59e0b"
                strokeWidth="0.25"
              />
            </>
          )}
        </svg>
      )}

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 py-3">
        <div className="font-cinzel text-sm font-bold text-amber-300">{island.name}</div>
        <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-slate-300">
          <span>{state.nodes.length} nodes</span>
          <span>{state.animals.length} animals</span>
          <span>{state.terrainZones.length} zones</span>
          <span className="capitalize">{island.mapStyle}</span>
        </div>
      </div>
    </div>
  );
}
