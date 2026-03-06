import { TreeNode, CraftingBonus, CraftingBonusType } from "@/lib/craftingTypes";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const bonusLabels: Record<CraftingBonusType, string> = {
  qualityBoost: "Quality Boost",
  successChance: "Success Rate",
  materialReduction: "Material Cost",
  speedBoost: "Crafting Speed",
  tierUnlock: "Tier Unlock",
  doubleYield: "Double Yield",
  socketChance: "Socket Chance",
  enchantPower: "Enchant Power",
  essenceEfficiency: "Essence Efficiency",
  gemQuality: "Gem Quality"
};

const bonusIcons: Record<CraftingBonusType, string> = {
  qualityBoost: "✨",
  successChance: "🎯",
  materialReduction: "📦",
  speedBoost: "⚡",
  tierUnlock: "🔓",
  doubleYield: "×2",
  socketChance: "💎",
  enchantPower: "🔮",
  essenceEfficiency: "💫",
  gemQuality: "💠"
};

function formatBonus(bonus: CraftingBonus): string {
  const prefix = bonus.type === 'materialReduction' ? '-' : '+';
  const suffix = bonus.type === 'tierUnlock' ? '' : '%';
  const target = bonus.target ? ` (${bonus.target})` : '';
  return `${prefix}${bonus.value}${suffix}${target}`;
}

interface SkillTreeProps {
  nodes: TreeNode[];
  currentLevel: number;
  colorClass?: string;
}

export function SkillTree({ nodes, currentLevel, colorClass = "text-amber-500" }: SkillTreeProps) {
  const isUnlocked = (req: number) => currentLevel >= req;
  
  return (
    <div className="relative w-full h-[800px] bg-slate-900/50 rounded-3xl border border-white/5 overflow-hidden shadow-inner shadow-black/50">
      <div className="absolute inset-0 opacity-10 pointer-events-none" 
        style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} 
      />

      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {nodes.map((node) => {
          if (!node.p) return null;
          const parent = nodes.find(n => n.id === node.p);
          if (!parent) return null;

          const isPathActive = isUnlocked(node.req);
          
          return (
            <motion.line
              key={`line-${node.id}`}
              x1={`${parent.x}%`}
              y1={`${parent.y}%`}
              x2={`${node.x}%`}
              y2={`${node.y}%`}
              stroke="currentColor"
              strokeWidth="2"
              className={cn(
                "transition-colors duration-500",
                isPathActive ? colorClass : "text-slate-800"
              )}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1, delay: 0.5 }}
            />
          );
        })}
      </svg>

      {nodes.map((node) => {
        const unlocked = isUnlocked(node.req);
        
        return (
          <div
            key={node.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 z-10 group"
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
            data-testid={`skill-node-${node.id}`}
          >
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 bg-slate-950/95 border border-white/20 rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-2xl z-50 backdrop-blur-sm">
              {node.branch && (
                <div className="text-[9px] uppercase tracking-widest text-slate-500 mb-1">
                  {node.branch} Constellation
                </div>
              )}
              <div className={cn("text-sm font-bold mb-1", unlocked ? colorClass : "text-slate-400")}>
                {node.n}
              </div>
              {node.desc && (
                <div className="text-[11px] text-slate-300 mb-2 leading-relaxed">
                  {node.desc}
                </div>
              )}
              <div className="text-[10px] text-slate-500 mb-2">
                Requires Level {node.req}
              </div>
              
              {node.bonuses && node.bonuses.length > 0 && (
                <div className="border-t border-white/10 pt-2 mt-2">
                  <div className="text-[9px] uppercase tracking-wider text-emerald-500 mb-1">Crafting Bonuses</div>
                  {node.bonuses.map((bonus, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[10px] text-emerald-400">
                      <span>{bonusIcons[bonus.type]}</span>
                      <span className="text-slate-300">{bonusLabels[bonus.type]}:</span>
                      <span className="font-bold">{formatBonus(bonus)}</span>
                    </div>
                  ))}
                </div>
              )}
              
              {node.unlocks && node.unlocks.length > 0 && (
                <div className="border-t border-white/10 pt-2 mt-2">
                  <div className="text-[9px] uppercase tracking-wider text-amber-500 mb-1">Unlocks</div>
                  <div className="flex flex-wrap gap-1">
                    {node.unlocks.map((item, i) => (
                      <span key={i} className="text-[9px] bg-amber-900/30 text-amber-300 px-1.5 py-0.5 rounded">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {!unlocked && (
                <div className="text-[10px] text-red-500 mt-2 font-bold">🔒 LOCKED</div>
              )}
            </div>

            {/* Node Icon */}
            <motion.div
              className={cn(
                "w-12 h-12 flex items-center justify-center border-2 transition-all duration-300 relative cursor-pointer",
                // Shape variants could be added here, sticking to a generic cool shape for now (rotated square)
                "rotate-45 rounded-lg", 
                unlocked 
                  ? `bg-slate-900 ${colorClass} border-current shadow-[0_0_15px_currentColor]` 
                  : "bg-slate-950 border-slate-800 text-slate-700 grayscale"
              )}
              whileHover={{ scale: 1.1 }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20, delay: Math.random() * 0.5 }}
            >
              {/* Inner content (un-rotated) */}
              <div className="-rotate-45 text-[10px] font-bold">
                {node.req}
              </div>
            </motion.div>
            
            {/* Label below node */}
            <div className={cn(
              "absolute top-10 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-black/50 backdrop-blur-sm border border-white/5",
              unlocked ? "text-white" : "text-slate-600"
            )}>
              {node.n}
            </div>
          </div>
        );
      })}
    </div>
  );
}
