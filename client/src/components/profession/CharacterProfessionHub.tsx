import { Link } from 'wouter';
import { Package, Shield, Hammer, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import CharacterSelectorPanel from '@/components/CharacterSelectorPanel';
import { useAccount, useAccountInventory, useAccountResources } from '@/hooks/use-account';
import type { Character } from '@/lib/characterManager';
import { ITEMS } from '@/lib/grudaDB';

const EQUIP_SLOTS = ['Head', 'Chest', 'Hands', 'Feet', 'Weapon', 'Offhand', 'Ring'] as const;

interface CharacterProfessionHubProps {
  activeCharacter: Character | null;
  onCharacterSelected?: () => void;
}

export default function CharacterProfessionHub({
  activeCharacter,
  onCharacterSelected,
}: CharacterProfessionHubProps) {
  const { account } = useAccount();
  const { inventory, getCharacterItems, getSharedItems } = useAccountInventory();
  const { resources } = useAccountResources();

  const boundCount = activeCharacter
    ? getCharacterItems(activeCharacter.id).length
    : 0;
  const sharedCount = getSharedItems().length;
  const resourceKinds = Object.keys(resources).length;

  const itemName = (id: string | null | undefined) => {
    if (!id) return '—';
    return ITEMS.find(i => i.id === id)?.name || id;
  };

  return (
    <div className="space-y-3 shrink-0">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-2">
        <div className="text-xs text-slate-400">
          Account: <span className="text-amber-300 font-medium">{account?.displayName || account?.grudgeId || 'Signed in'}</span>
          {activeCharacter && (
            <span className="ml-3 text-blue-300">Active: {activeCharacter.name} (Lv.{activeCharacter.level})</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-slate-700 text-slate-300 text-[10px]">
            <Package className="w-3 h-3 mr-1" />
            {inventory.length} items · {resourceKinds} resources
          </Badge>
          <Link href="/crafting">
            <Button size="sm" variant="outline" className="h-7 text-xs border-slate-700">
              <Hammer className="w-3 h-3 mr-1" /> ObjectStore Crafting
            </Button>
          </Link>
          <Link href="/character">
            <Button size="sm" variant="outline" className="h-7 text-xs border-slate-700">
              <Shield className="w-3 h-3 mr-1" /> Equipment
              <ExternalLink className="w-3 h-3 ml-1 opacity-60" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
        <CharacterSelectorPanel
          selectLabel="Work as"
          columns={4}
          compact
          onSelected={() => onCharacterSelected?.()}
        />
      </div>

      {activeCharacter && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Equipped (this character)</div>
            <div className="flex flex-wrap gap-1.5">
              {EQUIP_SLOTS.map(slot => {
                const itemId = activeCharacter.equipment?.[slot] ?? null;
                return (
                  <Badge
                    key={slot}
                    variant="outline"
                    className={itemId ? 'border-amber-700/50 text-amber-200 text-[10px]' : 'border-slate-800 text-slate-600 text-[10px]'}
                  >
                    {slot}: {itemName(itemId)}
                  </Badge>
                );
              })}
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Account stash (crafting pool)</div>
            <p className="text-xs text-slate-400">
              <span className="text-green-400 font-medium">{sharedCount}</span> shared items and{' '}
              <span className="text-blue-400 font-medium">{boundCount}</span> bound to {activeCharacter.name}.
              Crafting consumes shared + account resources first.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}