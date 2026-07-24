import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Backpack, Sword, Shield, FlaskConical, Scroll, Coins, Package, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Character } from '@shared/schema';
import MainPanelHost from '@/components/MainPanelHost';

interface InventoryItem {
  itemId: string;
  quantity: number;
  tier?: number;
}

interface InventoryModalProps {
  character: Character;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

const ITEM_CATEGORIES = [
  { id: 'all', label: 'All', icon: Package },
  { id: 'weapons', label: 'Weapons', icon: Sword },
  { id: 'armor', label: 'Armor', icon: Shield },
  { id: 'consumables', label: 'Consumables', icon: FlaskConical },
  { id: 'misc', label: 'Misc', icon: Scroll },
];

function getItemCategory(itemId: string): string {
  const id = itemId.toLowerCase();
  if (id.includes('sword') || id.includes('axe') || id.includes('dagger') || id.includes('staff') || id.includes('bow')) {
    return 'weapons';
  }
  if (id.includes('helm') || id.includes('chest') || id.includes('boots') || id.includes('armor') || id.includes('pants')) {
    return 'armor';
  }
  if (id.includes('potion') || id.includes('food') || id.includes('elixir')) {
    return 'consumables';
  }
  return 'misc';
}

function ItemSlot({ item, onClick }: { item?: InventoryItem; onClick?: () => void }) {
  if (!item) {
    return (
      <div className="w-12 h-12 bg-slate-900/80 border border-dashed border-slate-700 rounded-lg flex items-center justify-center">
        <div className="w-6 h-6 border border-dashed border-slate-600 rounded" />
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className="w-12 h-12 bg-slate-900/80 border-2 border-slate-700 rounded-lg flex items-center justify-center relative hover:border-amber-500/50 transition-all cursor-pointer"
      data-testid={`inv-item-${item.itemId}`}
    >
      <div className="w-8 h-8 bg-slate-700 rounded flex items-center justify-center text-xs text-slate-400">
        {item.itemId.substring(0, 2).toUpperCase()}
      </div>
      {item.quantity > 1 && (
        <span className="absolute bottom-0 right-0 bg-black/80 text-amber-400 text-[10px] font-bold px-1 rounded-tl">
          {item.quantity}
        </span>
      )}
      {item.tier && (
        <span className="absolute top-0 left-0 bg-purple-600/80 text-white text-[8px] font-bold px-1 rounded-br">
          T{item.tier}
        </span>
      )}
    </button>
  );
}

export default function InventoryModal({ 
  character, 
  isOpen, 
  onOpenChange,
  trigger 
}: InventoryModalProps) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  /** Tactical paperdoll main panel (ui.grudge-studio.com) replaces old equipment-only tab. */
  const [paperdollOpen, setPaperdollOpen] = useState(false);
  
  const inventory = (Array.isArray(character.inventory) ? character.inventory : []) as InventoryItem[];
  
  const filteredItems = selectedCategory === 'all' 
    ? inventory 
    : inventory.filter(item => getItemCategory(item.itemId) === selectedCategory);

  const defaultTrigger = (
    <Button
      variant="ghost"
      size="icon"
      className="h-12 w-12 bg-slate-800/90 border-2 border-slate-700 hover:border-amber-500/50 hover:bg-slate-700/90 rounded-lg"
      data-testid="btn-open-inventory"
    >
      <Backpack className="w-6 h-6 text-amber-400" />
    </Button>
  );

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-400">
            <Backpack className="w-5 h-5" />
            {character.name}'s Inventory
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 mb-2">
          <Button
            size="sm"
            className="text-xs gap-1 bg-amber-700 hover:bg-amber-600"
            onClick={() => setPaperdollOpen(true)}
            data-testid="btn-open-equipment-paperdoll"
          >
            <User className="w-3.5 h-3.5" />
            Equipment paperdoll
          </Button>
          <span className="text-[10px] text-slate-500 self-center">
            Warlords · ui.grudge-studio.com main panel
          </span>
        </div>
        
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="flex gap-1 mb-3 overflow-x-auto pb-1">
              {ITEM_CATEGORIES.map(cat => (
                <Button
                  key={cat.id}
                  variant={selectedCategory === cat.id ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    "text-xs gap-1",
                    selectedCategory === cat.id 
                      ? "bg-amber-600 hover:bg-amber-500" 
                      : "hover:bg-slate-800"
                  )}
                  data-testid={`tab-${cat.id}`}
                >
                  <cat.icon className="w-3 h-3" />
                  {cat.label}
                </Button>
              ))}
            </div>
            
            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700 min-h-[300px]">
              {filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[280px] text-slate-500">
                  <Package className="w-12 h-12 mb-2 opacity-30" />
                  <p className="text-sm">No items in this category</p>
                </div>
              ) : (
                <div className="grid grid-cols-6 gap-2">
                  {filteredItems.map((item, index) => (
                    <ItemSlot 
                      key={`${item.itemId}-${index}`} 
                      item={item}
                      onClick={() => setSelectedItem(item)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className="w-48 bg-slate-800/50 rounded-lg p-3 border border-slate-700">
            <div className="text-xs font-bold text-slate-400 mb-2">ITEM DETAILS</div>
            {selectedItem ? (
              <div className="space-y-2">
                <div className="text-sm font-bold text-amber-400">{selectedItem.itemId}</div>
                <div className="text-xs text-slate-400">Quantity: {selectedItem.quantity}</div>
                {selectedItem.tier && (
                  <div className="text-xs text-purple-400">Tier: {selectedItem.tier}</div>
                )}
                <div className="pt-2 flex flex-col gap-1">
                  <Button size="sm" className="w-full text-xs" data-testid="btn-use-item">
                    Use
                  </Button>
                  <Button size="sm" variant="destructive" className="w-full text-xs" data-testid="btn-drop-item">
                    Drop
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 italic">
                Select an item to view details
              </div>
            )}
            
            <div className="mt-4 pt-3 border-t border-slate-700">
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <Coins className="w-3 h-3 text-amber-400" />
                <span>Gold: </span>
                <span className="text-amber-400 font-bold">0</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {inventory.length} / 50 slots used
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    <MainPanelHost
      open={paperdollOpen}
      onClose={() => setPaperdollOpen(false)}
      characterId={character.id}
      tab="equipment"
      era="warlords"
    />
    </>
  );
}

export function BackpackButton({ character, className }: { character: Character; className?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className={cn("fixed", className)}>
      <InventoryModal 
        character={character} 
        isOpen={isOpen} 
        onOpenChange={setIsOpen}
      />
    </div>
  );
}
