import { motion } from "framer-motion";
import { TreeNode, NodeType } from "@/lib/craftingTypes";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import { Lock, CheckCircle2, Diamond, Star, ScrollText, ZoomIn, ZoomOut, Home, Plus } from "lucide-react";

interface UnlockedSkill {
  id: number;
  characterId: string;
  profession: string;
  nodeId: number;
  unlockedAt: Date;
}

interface Character {
  id: string;
  level: number;
  skillPoints: number;
}

interface TreeVisualizerProps {
  nodes: TreeNode[];
  color: string;
  bgImage?: string;
  profession?: string;
  fullscreen?: boolean;
  character?: Character | null;
  onRefreshCharacter?: () => Promise<void>;
}

const NODE_TYPE_COLORS: Record<NodeType, { border: string; bg: string; glow: string; icon: string; svgStroke: string; svgFill: string }> = {
  stat: { border: 'border-green-400', bg: 'bg-green-500/30', glow: 'shadow-green-400/50', icon: 'text-green-400', svgStroke: '#4ade80', svgFill: 'rgba(74,222,128,0.15)' },
  effect: { border: 'border-purple-400', bg: 'bg-purple-500/30', glow: 'shadow-purple-400/50', icon: 'text-purple-400', svgStroke: '#c084fc', svgFill: 'rgba(192,132,252,0.15)' },
  combat: { border: 'border-yellow-400', bg: 'bg-yellow-500/30', glow: 'shadow-yellow-400/50', icon: 'text-yellow-400', svgStroke: '#facc15', svgFill: 'rgba(250,204,21,0.15)' },
  recipe: { border: 'border-amber-400', bg: 'bg-amber-500/30', glow: 'shadow-amber-400/50', icon: 'text-amber-400', svgStroke: '#fbbf24', svgFill: 'rgba(251,191,36,0.15)' },
};

const BRANCH_COLORS: Record<string, { stroke: string; fill: string; glow: string }> = {
  // Chef branches
  Butchery: { stroke: '#ef4444', fill: 'rgba(239,68,68,0.2)', glow: '#ef4444' },
  Baking: { stroke: '#3b82f6', fill: 'rgba(59,130,246,0.2)', glow: '#3b82f6' },
  Alchemy: { stroke: '#22c55e', fill: 'rgba(34,197,94,0.2)', glow: '#22c55e' },
  Core: { stroke: '#f97316', fill: 'rgba(249,115,22,0.2)', glow: '#f97316' },
  // Miner branches
  Mining: { stroke: '#f59e0b', fill: 'rgba(245,158,11,0.2)', glow: '#f59e0b' },
  Smelting: { stroke: '#ef4444', fill: 'rgba(239,68,68,0.2)', glow: '#ef4444' },
  Weaponsmithing: { stroke: '#6366f1', fill: 'rgba(99,102,241,0.2)', glow: '#6366f1' },
  // Forester branches
  Forestry: { stroke: '#22c55e', fill: 'rgba(34,197,94,0.2)', glow: '#22c55e' },
  Leatherworking: { stroke: '#a16207', fill: 'rgba(161,98,7,0.2)', glow: '#a16207' },
  Bowcraft: { stroke: '#10b981', fill: 'rgba(16,185,129,0.2)', glow: '#10b981' },
  // Mystic branches - bright colors for visibility on dark backgrounds
  Nexus: { stroke: '#fbbf24', fill: 'rgba(251,191,36,0.3)', glow: '#fbbf24' },
  Enchanter: { stroke: '#f472b6', fill: 'rgba(244,114,182,0.25)', glow: '#f472b6' },
  Spellwright: { stroke: '#60a5fa', fill: 'rgba(96,165,250,0.25)', glow: '#60a5fa' },
  'Arcanist Forge': { stroke: '#fb7185', fill: 'rgba(251,113,133,0.25)', glow: '#fb7185' },
  Soulbinder: { stroke: '#2dd4bf', fill: 'rgba(45,212,191,0.25)', glow: '#2dd4bf' },
  Chronoweaver: { stroke: '#c084fc', fill: 'rgba(192,132,252,0.25)', glow: '#c084fc' },
  // Engineer branches
  Weaponry: { stroke: '#f97316', fill: 'rgba(249,115,22,0.2)', glow: '#f97316' },
  Automata: { stroke: '#64748b', fill: 'rgba(100,116,139,0.2)', glow: '#64748b' },
  Siege: { stroke: '#dc2626', fill: 'rgba(220,38,38,0.2)', glow: '#dc2626' },
};

const NODE_TYPE_LABELS: Record<NodeType, string> = {
  stat: 'Stat Boost',
  effect: 'Effect',
  combat: 'Combat',
  recipe: 'Recipe',
};

function NodeShapeIcon({ nodeType, className }: { nodeType: NodeType; className?: string }) {
  switch (nodeType) {
    case 'stat':
      return <Plus className={cn("w-5 h-5", className)} />;
    case 'effect':
      return <Diamond className={cn("w-5 h-5", className)} />;
    case 'combat':
      return <Star className={cn("w-5 h-5", className)} />;
    case 'recipe':
      return <ScrollText className={cn("w-5 h-5", className)} />;
    default:
      return <Plus className={cn("w-5 h-5", className)} />;
  }
}

function ShapedNodeBorder({ 
  nodeType, 
  size = 56, 
  strokeColor, 
  fillColor,
  unlocked,
  canUnlock,
  children 
}: { 
  nodeType: NodeType; 
  size?: number; 
  strokeColor: string;
  fillColor: string;
  unlocked: boolean;
  canUnlock: boolean;
  children: React.ReactNode;
}) {
  const half = size / 2;
  const strokeWidth = unlocked ? 3 : 2;
  const opacity = unlocked ? 1 : canUnlock ? 0.8 : 0.5;
  
  const getShapePath = () => {
    switch (nodeType) {
      case 'stat': // Circle
        return null; // Use circle element instead
      case 'effect': // Diamond
        return `M ${half} 2 L ${size - 2} ${half} L ${half} ${size - 2} L 2 ${half} Z`;
      case 'combat': // 5-pointed star
        const outerRadius = half - 2;
        const innerRadius = outerRadius * 0.4;
        let starPath = '';
        for (let i = 0; i < 5; i++) {
          const outerAngle = (i * 72 - 90) * Math.PI / 180;
          const innerAngle = ((i * 72) + 36 - 90) * Math.PI / 180;
          const ox = half + outerRadius * Math.cos(outerAngle);
          const oy = half + outerRadius * Math.sin(outerAngle);
          const ix = half + innerRadius * Math.cos(innerAngle);
          const iy = half + innerRadius * Math.sin(innerAngle);
          starPath += (i === 0 ? 'M' : 'L') + ` ${ox} ${oy} L ${ix} ${iy} `;
        }
        return starPath + 'Z';
      case 'recipe': // Rounded rectangle (scroll-like)
      default:
        return null; // Use rect element
    }
  };

  const path = getShapePath();

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg 
        width={size} 
        height={size} 
        className="absolute inset-0"
        style={{ filter: unlocked ? `drop-shadow(0 0 8px ${strokeColor})` : undefined }}
      >
        <defs>
          <filter id={`glow-node-${nodeType}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        {(nodeType === 'stat' || nodeType === 'recipe') ? (
          <circle
            cx={half}
            cy={half}
            r={half - 3}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            opacity={opacity}
          />
        ) : path ? (
          <path
            d={path}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
            opacity={opacity}
          />
        ) : null}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}


export function TreeVisualizer({ nodes, color, bgImage, profession = "default", fullscreen = false, character = null, onRefreshCharacter }: TreeVisualizerProps) {
  const refreshCharacter = onRefreshCharacter || (async () => {});
  const [unlockedSkills, setUnlockedSkills] = useState<string[]>([]);
  const [unlocking, setUnlocking] = useState<string | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [initialPanSet, setInitialPanSet] = useState(false);

  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 3;

  useEffect(() => {
    if (nodes.length > 0 && containerRef.current && !initialPanSet) {
      const startNode = nodes.find(n => n.p === null) || nodes[0];
      const container = containerRef.current;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      
      const nodeX = (startNode.x / 100) * containerWidth;
      const nodeY = (startNode.y / 100) * containerHeight;
      
      const centerX = containerWidth / 2;
      const centerY = containerHeight / 2;
      
      setPan({
        x: centerX - nodeX,
        y: centerY - nodeY
      });
      setZoom(1.2);
      setInitialPanSet(true);
    }
  }, [nodes, initialPanSet]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    const container = containerRef.current;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * zoomFactor));
    
    const zoomChange = newZoom / zoom;
    const newPanX = mouseX - (mouseX - pan.x) * zoomChange;
    const newPanY = mouseY - (mouseY - pan.y) * zoomChange;
    
    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  }, [zoom, pan]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    }
  }, [isPanning, panStart]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsPanning(false);
  }, []);

  const resetView = useCallback(() => {
    if (nodes.length > 0 && containerRef.current) {
      const startNode = nodes.find(n => n.p === null) || nodes[0];
      const container = containerRef.current;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      
      const nodeX = (startNode.x / 100) * containerWidth;
      const nodeY = (startNode.y / 100) * containerHeight;
      
      const centerX = containerWidth / 2;
      const centerY = containerHeight / 2;
      
      setPan({
        x: centerX - nodeX,
        y: centerY - nodeY
      });
      setZoom(1.2);
    }
  }, [nodes]);

  const zoomIn = useCallback(() => {
    setZoom(prev => Math.min(MAX_ZOOM, prev * 1.2));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom(prev => Math.max(MIN_ZOOM, prev / 1.2));
  }, []);

  useEffect(() => {
    if (character && profession) {
      fetchUnlockedSkills();
    }
  }, [character?.id, profession]);

  const fetchUnlockedSkills = async () => {
    if (!character || !profession || profession === "default") return;
    
    try {
      const res = await fetch(`/api/skills/${character.id}/${encodeURIComponent(profession)}`);
      const skills: UnlockedSkill[] = await res.json();
      setUnlockedSkills(skills.map(s => String(s.nodeId)));
    } catch (error) {
      console.error("Failed to fetch unlocked skills:", error);
    }
  };

  const handleNodeClick = async (node: TreeNode, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!character) {
      toast({ title: "Error", description: "No character selected", variant: "destructive" });
      return;
    }

    if (unlockedSkills.includes(String(node.id))) {
      toast({ title: "Already Unlocked", description: `${node.n} is already unlocked` });
      return;
    }

    if (character.level < node.req) {
      toast({ 
        title: "Level Too Low", 
        description: `Requires level ${node.req}. You are level ${character.level}`, 
        variant: "destructive" 
      });
      return;
    }

    if (node.p !== null && !unlockedSkills.includes(String(node.p))) {
      toast({ 
        title: "Missing Prerequisite", 
        description: `You must unlock Node ${node.p} first`, 
        variant: "destructive" 
      });
      return;
    }

    if (character.skillPoints < 1) {
      toast({ 
        title: "No Skill Points", 
        description: "You don't have enough skill points", 
        variant: "destructive" 
      });
      return;
    }

    setUnlocking(String(node.id));

    try {
      const res = await fetch("/api/skills/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId: character.id,
          nodeId: String(node.id),
          profession,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to unlock skill");
      }

      await refreshCharacter();
      await fetchUnlockedSkills();
      
      toast({ 
        title: "Skill Unlocked!", 
        description: `${node.n} has been unlocked!`,
        variant: "default"
      });
    } catch (error) {
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to unlock skill", 
        variant: "destructive" 
      });
    } finally {
      setUnlocking(null);
    }
  };

  const isNodeUnlocked = (nodeId: number) => unlockedSkills.includes(String(nodeId));
  const canUnlockNode = (node: TreeNode) => {
    if (!character) return false;
    if (isNodeUnlocked(node.id)) return false;
    if (character.level < node.req) return false;
    if (node.p !== null && !unlockedSkills.includes(String(node.p))) return false;
    if (character.skillPoints < 1) return false;
    return true;
  };

  const lines = nodes
    .filter((n) => n.p !== null)
    .map((n) => {
      const parent = nodes.find((p) => p.id === n.p);
      if (!parent) return null;
      const branchColors = n.branch ? BRANCH_COLORS[n.branch] : null;
      return {
        x1: parent.x,
        y1: parent.y,
        x2: n.x,
        y2: n.y,
        id: `line-${parent.id}-${n.id}`,
        unlocked: isNodeUnlocked(parent.id) && isNodeUnlocked(n.id),
        branchStroke: branchColors?.stroke || '#94a3b8',
        branchGlow: branchColors?.glow || '#64748b',
      };
    })
    .filter(Boolean);

  const unlockedNodes = nodes.filter(n => isNodeUnlocked(n.id));
  const totalBonuses = unlockedNodes.reduce((acc, node) => {
    if (node.bonuses) {
      node.bonuses.forEach(bonus => {
        const key = `${bonus.type}${bonus.target ? `-${bonus.target}` : ''}`;
        acc[key] = (acc[key] || 0) + bonus.value;
      });
    }
    return acc;
  }, {} as Record<string, number>);

  const bonusLabels: Record<string, string> = {
    successChance: "Success Rate",
    qualityBoost: "Quality Bonus",
    materialReduction: "Material Savings",
    speedBoost: "Craft Speed",
    enchantPower: "Enchant Power",
    tierUnlock: "Max Tier",
    socketChance: "Socket Chance",
    gemQuality: "Gem Quality",
    doubleYield: "Double Yield",
    essenceEfficiency: "Essence Efficiency",
  };

  return (
    <div className={cn(
      "flex flex-col",
      fullscreen ? "h-full" : "h-[calc(100vh-220px)] min-h-[500px]"
    )}>
      <div 
        ref={containerRef}
        className={cn(
          "relative w-full flex-1 bg-black/20 overflow-hidden shadow-inner group",
          fullscreen ? "rounded-none" : "rounded-t-xl border border-white/10",
          isPanning && "cursor-grabbing"
        )}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
        data-testid="skill-tree-canvas"
      >
        <div className="absolute top-4 left-4 z-40 flex flex-col gap-2">
          <button
            onClick={zoomIn}
            className="p-2 bg-black/70 hover:bg-black/90 border border-white/20 rounded-lg text-white/80 hover:text-white transition-all"
            data-testid="zoom-in-btn"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <button
            onClick={zoomOut}
            className="p-2 bg-black/70 hover:bg-black/90 border border-white/20 rounded-lg text-white/80 hover:text-white transition-all"
            data-testid="zoom-out-btn"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <button
            onClick={resetView}
            className="p-2 bg-black/70 hover:bg-black/90 border border-white/20 rounded-lg text-white/80 hover:text-white transition-all"
            data-testid="reset-view-btn"
          >
            <Home className="w-5 h-5" />
          </button>
          <div className="px-2 py-1 bg-black/70 border border-white/20 rounded-lg text-white/60 text-xs text-center">
            {Math.round(zoom * 100)}%
          </div>
        </div>

        <div className="absolute top-4 right-4 z-30 flex flex-wrap gap-2 bg-black/60 p-2 rounded-lg border border-white/10 backdrop-blur-sm">
          <div className="flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-green-400" />
            <span className="text-[10px] text-green-300 font-medium">Stat</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Diamond className="w-4 h-4 text-purple-400" />
            <span className="text-[10px] text-purple-300 font-medium">Effect</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Star className="w-4 h-4 text-yellow-400" />
            <span className="text-[10px] text-yellow-300 font-medium">Combat</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ScrollText className="w-4 h-4 text-amber-400" />
            <span className="text-[10px] text-amber-300 font-medium">Recipe</span>
          </div>
        </div>

        <div
          className="absolute origin-top-left transition-transform duration-75"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            width: '300%',
            height: '300%',
            left: '-100%',
            top: '-100%',
          }}
        >
          {bgImage && (
            <div 
              className="absolute inset-0 bg-cover bg-center opacity-50 pointer-events-none"
              style={{ 
                backgroundImage: `url(${bgImage})`,
                backgroundSize: '50% 50%',
                backgroundRepeat: 'repeat',
              }}
            />
          )}
          
          <div className="absolute inset-0 pointer-events-none" style={{
            background: 'radial-gradient(ellipse at center, transparent 20%, rgba(15,23,42,0.7) 60%, rgba(15,23,42,0.95) 100%)'
          }} />

          <svg className="absolute pointer-events-none z-10" style={{ left: '33.33%', top: '33.33%', width: '33.33%', height: '33.33%' }}>
          <defs>
            <filter id="glow-strong" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <filter id="glow-soft" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          {lines.map((line: any) => (
            <g key={line.id}>
              {line.unlocked ? (
                <>
                  <line
                    x1={`${line.x1}%`}
                    y1={`${line.y1}%`}
                    x2={`${line.x2}%`}
                    y2={`${line.y2}%`}
                    stroke="#22c55e"
                    strokeWidth="8"
                    strokeLinecap="round"
                    opacity={0.4}
                    filter="url(#glow-strong)"
                  />
                  <line
                    x1={`${line.x1}%`}
                    y1={`${line.y1}%`}
                    x2={`${line.x2}%`}
                    y2={`${line.y2}%`}
                    stroke="#4ade80"
                    strokeWidth="4"
                    strokeLinecap="round"
                    filter="url(#glow-strong)"
                  />
                </>
              ) : (
                <>
                  <line
                    x1={`${line.x1}%`}
                    y1={`${line.y1}%`}
                    x2={`${line.x2}%`}
                    y2={`${line.y2}%`}
                    stroke={line.branchGlow}
                    strokeWidth="6"
                    strokeLinecap="round"
                    opacity={0.3}
                    filter="url(#glow-soft)"
                  />
                  <line
                    x1={`${line.x1}%`}
                    y1={`${line.y1}%`}
                    x2={`${line.x2}%`}
                    y2={`${line.y2}%`}
                    stroke={line.branchStroke}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray="8,6"
                    opacity={0.7}
                  />
                </>
              )}
            </g>
          ))}
        </svg>

        <div className="absolute" style={{ left: '33.33%', top: '33.33%', width: '33.33%', height: '33.33%' }}>
        {nodes.map((node) => {
          const unlocked = isNodeUnlocked(node.id);
          const canUnlock = canUnlockNode(node);
          const isUnlocking = unlocking === String(node.id);
          const nodeType = node.nodeType || 'stat';
          const typeColors = NODE_TYPE_COLORS[nodeType];
          const branchColors = node.branch ? BRANCH_COLORS[node.branch] : null;
          const strokeColor = branchColors?.stroke || typeColors.svgStroke;
          const fillColor = branchColors?.fill || typeColors.svgFill;

          return (
            <Tooltip key={node.id} delayDuration={0} disableHoverableContent>
              <TooltipTrigger asChild>
                <motion.div
                  data-testid={`node-${profession.toLowerCase()}-${node.id}`}
                  onClick={(e) => handleNodeClick(node, e)}
                  className="absolute -ml-7 -mt-7 cursor-pointer z-20"
                  style={{ 
                    left: `${node.x}%`, 
                    top: `${node.y}%`,
                  }}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: node.id * 0.03 }}
                  whileHover={{ scale: canUnlock || !unlocked ? 1.15 : 1.05 }}
                >
                  <ShapedNodeBorder
                    nodeType={nodeType}
                    size={56}
                    strokeColor={strokeColor}
                    fillColor={fillColor}
                    unlocked={unlocked}
                    canUnlock={canUnlock}
                  >
                    {node.icon ? (
                      <img 
                        src={node.icon} 
                        alt={node.n} 
                        className="w-8 h-8 object-contain"
                        style={{ filter: !unlocked && !canUnlock ? 'grayscale(1) opacity(0.5)' : undefined }}
                      />
                    ) : (
                      <NodeShapeIcon 
                        nodeType={nodeType} 
                        className={cn(
                          "w-6 h-6",
                          typeColors.icon,
                          !unlocked && !canUnlock && "opacity-40"
                        )} 
                      />
                    )}
                  </ShapedNodeBorder>
                  {unlocked && (
                    <div className="absolute -top-1 -right-1">
                      <CheckCircle2 className={cn("w-5 h-5", typeColors.icon)} />
                    </div>
                  )}
                  {!unlocked && !canUnlock && (
                    <div className="absolute -top-1 -right-1">
                      <Lock className="w-4 h-4 text-slate-500" />
                    </div>
                  )}
                </motion.div>
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900/95 border-slate-600 backdrop-blur-xl p-4 max-w-xs shadow-2xl">
                <div className="space-y-2">
                  <div className={cn("font-bold text-lg font-heading flex items-center gap-2", unlocked ? typeColors.icon : "text-slate-300")}>
                    <NodeShapeIcon nodeType={nodeType} className="w-5 h-5" />
                    {node.n}
                    {unlocked && <CheckCircle2 className="w-5 h-5" />}
                  </div>
                  <div className={cn("text-xs font-semibold px-2 py-0.5 rounded inline-block", typeColors.bg, typeColors.icon)}>
                    {NODE_TYPE_LABELS[nodeType]}
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-slate-300">
                      <span className="text-slate-400 uppercase text-[10px] tracking-wider font-bold">Requirement:</span> Level {node.req}
                    </div>
                    {node.p && (
                      <div className="text-xs text-slate-300">
                        <span className="text-slate-400 uppercase text-[10px] tracking-wider font-bold">Prerequisite:</span> Node {node.p}
                        {!unlockedSkills.includes(String(node.p)) && (
                          <span className="ml-2 text-red-400">(Locked)</span>
                        )}
                      </div>
                    )}
                    {node.desc && (
                      <div className="text-xs text-slate-400 mt-2 italic leading-relaxed">
                        {node.desc}
                      </div>
                    )}
                    {!node.desc && (
                      <div className="text-xs text-slate-400 mt-2 italic leading-relaxed">
                        Unlocks specialized abilities and bonuses for this tier.
                      </div>
                    )}
                    {unlocked && (
                      <div className="mt-3 px-3 py-2 bg-green-500/20 border border-green-500/30 rounded text-green-400 text-xs font-bold">
                        ✓ UNLOCKED
                      </div>
                    )}
                    {!unlocked && canUnlock && (
                      <div className="mt-3 px-3 py-2 bg-white/10 border border-white/30 rounded text-white text-xs font-bold">
                        Click to unlock (1 Skill Point)
                      </div>
                    )}
                    {!unlocked && !canUnlock && character && (
                      <div className="mt-3 px-3 py-2 bg-slate-700/20 border border-slate-700/30 rounded text-slate-400 text-xs">
                        Requirements not met
                      </div>
                    )}
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
        </div>
        </div>
      </div>
      <div className={cn(
        "bg-slate-900/95 border-t border-white/10 p-3 flex-shrink-0",
        fullscreen ? "rounded-none" : "border border-t-0 rounded-b-xl"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[hsl(43_60%_50%)] font-heading font-bold uppercase tracking-wider">
              Unlocked Bonuses
            </span>
            <span className="text-xs text-slate-500">({unlockedNodes.length}/{nodes.length} nodes)</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {Object.keys(totalBonuses).length === 0 ? (
              <span className="text-xs text-slate-500 italic">No bonuses yet - unlock nodes to gain benefits</span>
            ) : (
              Object.entries(totalBonuses).map(([key, value]) => {
                const [bonusType, target] = key.split('-');
                const label = bonusLabels[bonusType] || bonusType;
                return (
                  <div key={key} className="flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded border border-white/10">
                    <span className="text-green-400 font-bold text-xs">+{value}%</span>
                    <span className="text-slate-300 text-xs">{label}</span>
                    {target && <span className="text-slate-500 text-[10px]">({target})</span>}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
