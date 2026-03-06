import { ICON_SHEET_PATH, ICON_SIZE, ICONS_PER_ROW, SpriteIcon, getIconByName, mapItemToIcon } from '@/lib/iconSheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SpriteIconProps {
  icon?: SpriteIcon;
  iconName?: string;
  itemName?: string;
  itemType?: string;
  size?: number;
  className?: string;
}

export default function SpriteIconDisplay({ 
  icon, 
  iconName, 
  itemName, 
  itemType = 'Resource',
  size = 32,
  className = ''
}: SpriteIconProps) {
  let resolvedIcon = icon;
  
  if (!resolvedIcon && iconName) {
    resolvedIcon = getIconByName(iconName);
  }
  
  if (!resolvedIcon && itemName) {
    resolvedIcon = mapItemToIcon(itemName, itemType);
  }
  
  if (!resolvedIcon) {
    return (
      <div 
        className={`bg-slate-800 border border-slate-700 rounded flex items-center justify-center text-slate-600 text-xs ${className}`}
        style={{ width: size, height: size }}
        data-testid="sprite-icon-empty"
      >
        ?
      </div>
    );
  }
  
  const scale = size / ICON_SIZE;
  
  return (
    <div
      className={`shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        backgroundImage: `url(${ICON_SHEET_PATH})`,
        backgroundPosition: `-${resolvedIcon.col * size}px -${resolvedIcon.row * size}px`,
        backgroundSize: `${ICONS_PER_ROW * size}px auto`,
        imageRendering: 'pixelated',
      }}
      title={resolvedIcon.name}
      data-testid={`sprite-icon-${resolvedIcon.name}`}
    />
  );
}

export function InventorySlot({ 
  itemName, 
  itemType, 
  quantity,
  onClick,
  selected = false,
  tooltipText,
  rarity = "Common",
  imageUrl,
  tier,
  ...rest
}: { 
  itemName?: string; 
  itemType?: string;
  quantity?: number;
  onClick?: () => void;
  selected?: boolean;
  tooltipText?: string;
  rarity?: "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary";
  imageUrl?: string;
  tier?: number;
  "data-testid"?: string;
}) {
  const rarityColors: Record<string, string> = {
    Common: "text-slate-300",
    Uncommon: "text-green-400",
    Rare: "text-blue-400",
    Epic: "text-purple-400",
    Legendary: "text-amber-400"
  };
  
  const tierBorderColors: Record<number, string> = {
    0: "border-gray-600",
    1: "border-gray-500",
    2: "border-green-600",
    3: "border-blue-600",
    4: "border-purple-600",
    5: "border-orange-600",
    6: "border-red-600",
    7: "border-pink-600",
    8: "border-amber-500",
  };
  
  const borderColor = tier !== undefined ? tierBorderColors[tier] || "border-slate-700" : "border-slate-700";

  const slotContent = (
    <div 
      className={`relative w-12 h-12 bg-slate-900/80 border-2 rounded-lg flex items-center justify-center cursor-pointer transition-all hover:border-amber-500/50 ${selected ? 'border-amber-500 shadow-lg shadow-amber-500/30' : borderColor}`}
      onClick={onClick}
      data-testid={rest["data-testid"] || `inventory-slot-${itemName || 'empty'}`}
    >
      {itemName ? (
        <>
          {imageUrl ? (
            <img src={imageUrl} alt={itemName} className="w-8 h-8 object-contain" />
          ) : (
            <SpriteIconDisplay itemName={itemName} itemType={itemType} size={32} />
          )}
          {quantity && quantity > 1 && (
            <span className="absolute bottom-0 right-0 bg-black/80 text-amber-400 text-xs font-bold px-1 rounded-tl">
              {quantity}
            </span>
          )}
          {tier !== undefined && tier > 0 && (
            <span className="absolute top-0 left-0 bg-black/80 text-amber-400 text-[8px] font-bold px-0.5 rounded-br">
              T{tier}
            </span>
          )}
        </>
      ) : (
        <div className="w-8 h-8 border border-dashed border-slate-700 rounded" />
      )}
    </div>
  );

  if (!itemName) return slotContent;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          {slotContent}
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          className="bg-slate-900 border-slate-700 p-3 max-w-[200px]"
        >
          <div className="space-y-1">
            <p className={`font-bold ${rarityColors[rarity]}`}>{itemName}</p>
            {itemType && <p className="text-slate-400 text-xs">{itemType}</p>}
            {tier !== undefined && <p className="text-amber-400 text-xs">Tier {tier}</p>}
            {tooltipText && <p className="text-slate-300 text-xs">{tooltipText}</p>}
            {quantity && quantity > 1 && (
              <p className="text-amber-400 text-xs">Quantity: {quantity}</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function EquipmentSlot({
  slotName,
  slotLabel,
  itemId,
  itemName,
  itemStats,
  onClick
}: {
  slotName: string;
  slotLabel: string;
  itemId?: string;
  itemName?: string;
  itemStats?: Record<string, number>;
  onClick?: () => void;
}) {
  const slotContent = (
    <div 
      className="group relative w-14 h-14 bg-slate-900/80 border-2 border-slate-700 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all hover:border-amber-500/50 hover:bg-slate-800/50"
      onClick={onClick}
      data-testid={`equip-slot-${slotName.toLowerCase()}`}
    >
      {itemName ? (
        <SpriteIconDisplay itemName={itemName} size={36} />
      ) : (
        <div className="w-8 h-8 border border-dashed border-slate-600 rounded opacity-50" />
      )}
      <span className="absolute -bottom-5 text-[10px] text-slate-500 font-bold uppercase tracking-wide">
        {slotLabel}
      </span>
    </div>
  );

  if (!itemName) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            {slotContent}
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-slate-900 border-slate-700 p-2">
            <p className="text-slate-400 text-xs">Empty {slotLabel} slot</p>
            <p className="text-slate-500 text-xs">Click to equip an item</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          {slotContent}
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          className="bg-slate-900 border-slate-700 p-3 max-w-[220px]"
        >
          <div className="space-y-2">
            <p className="font-bold text-amber-400">{itemName}</p>
            <p className="text-slate-400 text-xs">{slotLabel} Equipment</p>
            {itemStats && Object.keys(itemStats).length > 0 && (
              <div className="border-t border-slate-700 pt-2 space-y-1">
                {Object.entries(itemStats).map(([stat, value]) => (
                  <div key={stat} className="flex justify-between text-xs">
                    <span className="text-slate-400">{stat}</span>
                    <span className={value > 0 ? "text-green-400" : "text-red-400"}>
                      {value > 0 ? `+${value}` : value}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <p className="text-slate-500 text-xs italic">Click to change equipment</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function ActionButton({
  label,
  tooltipText,
  icon,
  onClick,
  disabled = false,
  variant = "default"
}: {
  label: string;
  tooltipText: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "default" | "primary" | "danger";
}) {
  const variantClasses = {
    default: "bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-200",
    primary: "bg-amber-600 hover:bg-amber-500 border-amber-500 text-black",
    danger: "bg-red-900 hover:bg-red-800 border-red-700 text-red-200"
  };

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            disabled={disabled}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${variantClasses[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            data-testid={`btn-${label.toLowerCase().replace(/\s+/g, '-')}`}
          >
            {icon}
            <span className="text-sm font-medium">{label}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-slate-900 border-slate-700 p-2 max-w-[200px]">
          <p className="text-slate-300 text-xs">{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
