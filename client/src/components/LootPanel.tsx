import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ITEMS, resolveItemImage } from "@/lib/grudaDB";
import { resolveItemIconUrl } from "@shared/inventory/itemIcons";
import { motion, AnimatePresence } from "framer-motion";

export interface LootItem {
  itemId: string;
  quantity: number;
  isNew?: boolean;
  iconUrl?: string;
  name?: string;
}

interface LootPanelProps {
  isOpen: boolean;
  onClose: () => void;
  loot: LootItem[];
  onCollect: (items: LootItem[]) => void;
  title?: string;
}

export default function LootPanel({ isOpen, onClose, loot, onCollect, title = "Loot" }: LootPanelProps) {
  const [collected, setCollected] = useState(false);

  const handleCollectAll = () => {
    onCollect(loot);
    setCollected(true);
    setTimeout(() => {
      onClose();
      setCollected(false);
    }, 500);
  };

  const slots = Array(6).fill(null).map((_, i) => loot[i] || null);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="relative"
            onClick={e => e.stopPropagation()}
            data-testid="loot-panel"
          >
            {/* Panel container with pixel art style */}
            <div className="relative w-[240px] bg-[#e8d9a0] border-4 border-[#5a4a3a] rounded shadow-xl">
              {/* Top bar - teal header */}
              <div className="bg-[#4a9e8c] h-6 border-b-2 border-[#5a4a3a] flex items-center justify-between px-2">
                <span className="text-xs font-bold text-white uppercase tracking-wide">{title}</span>
                <button 
                  onClick={onClose}
                  className="w-5 h-5 bg-[#3a2a2a] border border-[#2a1a1a] flex items-center justify-center hover:bg-[#4a3a3a] transition-colors"
                  data-testid="btn-close-loot"
                >
                  <X className="w-3 h-3 text-[#c0b080]" />
                </button>
              </div>

              {/* Panel body */}
              <div className="p-4">
                {collected || loot.length === 0 ? (
                  /* Empty state */
                  <div className="h-[160px] flex items-center justify-center">
                    <span className="text-[#8a7a5a] text-sm italic">
                      {collected ? "Collected!" : "No loot"}
                    </span>
                  </div>
                ) : (
                  /* Loot grid - 3x2 */
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {slots.map((item, i) => {
                      const itemDef = item ? ITEMS.find(it => it.id === item.itemId) : null;
                      const iconSrc = item
                        ? item.iconUrl ||
                          (itemDef ? resolveItemImage(itemDef) : null) ||
                          resolveItemIconUrl({
                            itemId: item.itemId,
                            name: item.name || itemDef?.name,
                          })
                        : null;
                      const label = itemDef?.name || item?.name || item?.itemId || "";

                      return (
                        <div 
                          key={i}
                          className={cn(
                            "w-14 h-14 bg-[#c8b880] border-2 border-[#9a8a5a] rounded flex items-center justify-center relative",
                            item && "hover:border-amber-500 cursor-pointer"
                          )}
                          data-testid={`loot-slot-${i}`}
                        >
                          {item && iconSrc && (
                            <>
                              <img 
                                src={iconSrc} 
                                alt={label}
                                className="w-10 h-10 object-contain pixelated"
                                onError={(e) => {
                                  const el = e.currentTarget;
                                  if (!el.dataset.fb) {
                                    el.dataset.fb = "1";
                                    el.src = resolveItemIconUrl({ itemId: "default" });
                                  }
                                }}
                              />
                              {item.quantity > 1 && (
                                <span className="absolute bottom-0 right-0 bg-black/70 text-white text-[10px] px-1 rounded-tl font-bold">
                                  x{item.quantity}
                                </span>
                              )}
                              {item.isNew && (
                                <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Collect button */}
                {loot.length > 0 && !collected && (
                  <button
                    onClick={handleCollectAll}
                    className="w-full py-2 bg-[#4a9e8c] hover:bg-[#5aae9c] text-white font-bold text-sm uppercase tracking-wide border-2 border-[#3a8e7c] rounded transition-colors"
                    data-testid="btn-collect-loot"
                  >
                    Collect All
                  </button>
                )}
              </div>

              {/* Decorative corner details */}
              <div className="absolute top-6 left-0 w-2 h-2 bg-[#4a3a2a]" />
              <div className="absolute top-6 right-0 w-2 h-2 bg-[#4a3a2a]" />
              <div className="absolute bottom-0 left-0 w-2 h-2 bg-[#4a3a2a]" />
              <div className="absolute bottom-0 right-0 w-2 h-2 bg-[#4a3a2a]" />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
