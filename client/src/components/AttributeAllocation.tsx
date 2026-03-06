import { useState, useMemo } from "react";
import { ATTRIBUTE_DEFINITIONS, STAT_LABELS, calculateAttributeBonuses } from "@/lib/attributeDefinitions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Plus, Minus, RotateCcw, Save, ChevronDown, ChevronUp, Check, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AttributeAllocationProps {
  currentAttributes: Record<string, number>;
  availablePoints: number;
  onSave?: (newAttributes: Record<string, number>) => void | Promise<void>;
  compact?: boolean;
}

export function AttributeAllocation({
  currentAttributes,
  availablePoints,
  onSave,
  compact = false,
}: AttributeAllocationProps) {
  const [pendingChanges, setPendingChanges] = useState<Record<string, number>>({});
  const [expandedAttr, setExpandedAttr] = useState<string | null>(null);
  const [showAllStats, setShowAllStats] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle");

  const pointsSpent = Object.values(pendingChanges).reduce((a, b) => a + b, 0);
  const pointsRemaining = availablePoints - pointsSpent;

  const handleIncrement = (attrId: string) => {
    if (pointsRemaining <= 0) return;
    setPendingChanges((prev) => ({
      ...prev,
      [attrId]: (prev[attrId] || 0) + 1,
    }));
  };

  const handleDecrement = (attrId: string) => {
    if ((pendingChanges[attrId] || 0) <= 0) return;
    setPendingChanges((prev) => ({
      ...prev,
      [attrId]: (prev[attrId] || 0) - 1,
    }));
  };

  const handleReset = () => {
    setPendingChanges({});
  };

  const handleSave = async () => {
    if (!onSave || pointsSpent === 0) return;
    setSaveStatus("saving");
    const newAttributes = { ...currentAttributes };
    for (const [key, val] of Object.entries(pendingChanges)) {
      newAttributes[key] = (newAttributes[key] || 0) + val;
    }
    try {
      await onSave(newAttributes);
      setSaveStatus("success");
      setPendingChanges({});
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (error) {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  const totalAttributes = useMemo(() => {
    const result: Record<string, number> = {};
    for (const [key, val] of Object.entries(currentAttributes)) {
      result[key] = val + (pendingChanges[key] || 0);
    }
    return result;
  }, [currentAttributes, pendingChanges]);

  const derivedBonuses = useMemo(() => {
    return calculateAttributeBonuses(totalAttributes, { health: 100, mana: 50, stamina: 50, damage: 20, defense: 10 });
  }, [totalAttributes]);

  const attrOrder = ["Strength", "Vitality", "Endurance", "Intellect", "Wisdom", "Dexterity", "Agility", "Tactics"];

  const getColorClasses = (color: string) => {
    const colorMap: Record<string, { bg: string; border: string; text: string }> = {
      red: { bg: "bg-red-900/30", border: "border-red-600/50", text: "text-red-400" },
      green: { bg: "bg-green-900/30", border: "border-green-600/50", text: "text-green-400" },
      amber: { bg: "bg-amber-900/30", border: "border-amber-600/50", text: "text-amber-400" },
      blue: { bg: "bg-blue-900/30", border: "border-blue-600/50", text: "text-blue-400" },
      purple: { bg: "bg-purple-900/30", border: "border-purple-600/50", text: "text-purple-400" },
      orange: { bg: "bg-orange-900/30", border: "border-orange-600/50", text: "text-orange-400" },
      cyan: { bg: "bg-cyan-900/30", border: "border-cyan-600/50", text: "text-cyan-400" },
      slate: { bg: "bg-slate-800/50", border: "border-slate-600/50", text: "text-slate-400" },
    };
    return colorMap[color] || colorMap.slate;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-cinzel text-amber-400">Attribute Allocation</h3>
          <p className="text-slate-500 text-xs">Distribute points to shape your hero's strengths</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-slate-500">Available Points</div>
            <div className={cn("text-2xl font-bold", pointsRemaining > 0 ? "text-amber-400" : "text-slate-500")}>
              {pointsRemaining}
            </div>
          </div>
          {(pointsSpent > 0 || saveStatus !== "idle") && (
            <div className="flex gap-1 items-center">
              {saveStatus === "success" && (
                <span className="text-green-400 text-xs flex items-center gap-1">
                  <Check className="w-3 h-3" /> Saved!
                </span>
              )}
              {saveStatus === "error" && (
                <span className="text-red-400 text-xs flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Failed
                </span>
              )}
              {pointsSpent > 0 && (
                <>
                  <Button size="sm" variant="outline" onClick={handleReset} className="border-slate-600" data-testid="btn-reset-points" disabled={saveStatus === "saving"}>
                    <RotateCcw className="w-3 h-3" />
                  </Button>
                  <Button size="sm" onClick={handleSave} className="bg-amber-600 hover:bg-amber-500" data-testid="btn-save-points" disabled={saveStatus === "saving"}>
                    {saveStatus === "saving" ? (
                      <>Saving...</>
                    ) : (
                      <><Save className="w-3 h-3 mr-1" /> Apply</>
                    )}
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className={cn("grid gap-2", compact ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-1 md:grid-cols-2")}>
        {attrOrder.map((attrId) => {
          const def = ATTRIBUTE_DEFINITIONS[attrId];
          if (!def) return null;
          const colors = getColorClasses(def.color);
          const current = currentAttributes[attrId] || 0;
          const pending = pendingChanges[attrId] || 0;
          const total = current + pending;
          const isExpanded = expandedAttr === attrId;

          return (
            <div
              key={attrId}
              className={cn(
                "rounded-lg border transition-all",
                colors.bg,
                colors.border,
                isExpanded && "col-span-full"
              )}
            >
              <div className="flex items-center justify-between p-2">
                <button
                  onClick={() => setExpandedAttr(isExpanded ? null : attrId)}
                  className="flex items-center gap-2 flex-1 text-left"
                  data-testid={`btn-expand-${attrId.toLowerCase()}`}
                >
                  <span className="text-xl">{def.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className={cn("font-bold text-sm", colors.text)}>{def.name}</div>
                    {!compact && <div className="text-[10px] text-slate-500 truncate">{def.primaryRole}</div>}
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  )}
                </button>

                <div className="flex items-center gap-1 ml-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-slate-400 hover:text-red-400"
                    onClick={() => handleDecrement(attrId)}
                    disabled={pending <= 0}
                    data-testid={`btn-dec-${attrId.toLowerCase()}`}
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                  <div className="w-12 text-center">
                    <span className="text-white font-bold">{total}</span>
                    {pending > 0 && <span className="text-amber-400 text-xs ml-0.5">(+{pending})</span>}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-slate-400 hover:text-green-400"
                    onClick={() => handleIncrement(attrId)}
                    disabled={pointsRemaining <= 0}
                    data-testid={`btn-inc-${attrId.toLowerCase()}`}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-3 border-t border-slate-700/50 pt-2">
                      <p className="text-xs text-slate-400 mb-2">{def.focus}</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1 text-[10px]">
                        {Object.entries(def.stats).map(([statKey, bonus]) => {
                          if (!bonus) return null;
                          const statInfo = STAT_LABELS[statKey];
                          const flatSign = bonus.flat >= 0 ? "+" : "";
                          const pctSign = bonus.percent >= 0 ? "+" : "";
                          return (
                            <div
                              key={statKey}
                              className="bg-black/30 p-1.5 rounded flex items-center justify-between gap-1"
                            >
                              <span className="text-slate-400">{statInfo?.shortLabel || statKey}</span>
                              <span className="text-slate-200">
                                {flatSign}{bonus.flat}
                                {bonus.percent !== 0 && (
                                  <span className="text-slate-500 ml-0.5">({pctSign}{bonus.percent}%)</span>
                                )}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <div className="border-t border-slate-700 pt-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-cinzel text-slate-300">Derived Stats Preview</h4>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs text-slate-500"
            onClick={() => setShowAllStats(!showAllStats)}
            data-testid="btn-toggle-stats"
          >
            {showAllStats ? "Show Less" : "Show All"}
          </Button>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1">
          {Object.entries(derivedBonuses)
            .filter(([key]) => showAllStats || ["health", "mana", "stamina", "damage", "defense", "criticalChance"].includes(key))
            .map(([statKey, value]) => {
              const statInfo = STAT_LABELS[statKey];
              if (!statInfo) return null;
              const colorClasses = getColorClasses(statInfo.color);
              return (
                <div
                  key={statKey}
                  className={cn("p-1.5 rounded text-center text-xs", colorClasses.bg, colorClasses.border, "border")}
                >
                  <div className="text-slate-500 text-[9px]">{statInfo.shortLabel}</div>
                  <div className={cn("font-bold", colorClasses.text)}>
                    {value >= 0 ? "+" : ""}{value.toFixed(1)}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
