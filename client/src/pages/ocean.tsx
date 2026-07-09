/**
 * OceanPage — Tactical Infinity wind-sailing open ocean.
 * Sail between 9 Warlords sectors, then deploy into live 3D zones.
 */
import { useState } from 'react';
import { useLocation } from 'wouter';
import { TacticalOceanScene } from '@/tactical-ocean/TacticalOceanScene';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  buildOceanDeployUrl,
  buildTownUrl,
  resolveDeploySectorId,
  sectorLabel,
} from '@/lib/oceanNavigation';
import { getSectorById } from '@shared/definitions/worldMapSectors';
import { Anchor, ExternalLink, Globe, MapPin, Ship, Swords } from 'lucide-react';
import { getTacticalInfinityUrl } from '@/lib/gameNav';

interface LandedSector {
  id: string;
  name: string;
}

export default function OceanPage() {
  const [, setLocation] = useLocation();
  const [landed, setLanded] = useState<LandedSector | null>(null);
  const worldSeed = new URLSearchParams(window.location.search).get('worldSeed') || 'grudge-world-1';

  const zone = landed ? getSectorById(resolveDeploySectorId(landed.id)) : null;
  const townUrl = landed ? buildTownUrl(landed.id) : null;

  if (landed) {
    return (
      <div className="fixed inset-0 bg-slate-950 text-white flex flex-col">
        <div className="border-b border-amber-900/40 bg-black/80 backdrop-blur px-4 py-3 flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Anchor className="w-5 h-5 text-amber-400" />
              <h1 className="font-cinzel font-bold text-lg">{landed.name}</h1>
            </div>
            {zone && (
              <p className="text-sm text-slate-400 mt-0.5">
                Lv {zone.difficultyMin}–{zone.difficultyMax} · {zone.biome}
                {zone.isSafeZone && (
                  <Badge className="ml-2 bg-cyan-900/60 text-cyan-200 text-[10px]">Safe Harbor</Badge>
                )}
              </p>
            )}
          </div>
          <Button
            variant="outline"
            className="border-slate-600"
            onClick={() => setLanded(null)}
          >
            <Ship className="w-4 h-4 mr-2" />
            Return to Sea
          </Button>
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-lg w-full rounded-2xl border border-amber-700/40 bg-black/70 backdrop-blur p-6 space-y-4">
            <p className="text-slate-300 text-sm leading-relaxed">
              {zone?.description ?? 'Deploy your warband into the live Grudge Warlords sector.'}
            </p>

            <div className="grid gap-2">
              <Button
                className="w-full bg-purple-700 hover:bg-purple-600 font-cinzel"
                onClick={() => setLocation(buildOceanDeployUrl(landed.id, 'play', worldSeed))}
              >
                <Swords className="w-4 h-4 mr-2" />
                Enter Open World (PvP Sector)
              </Button>
              <Button
                variant="outline"
                className="w-full border-emerald-700/50 text-emerald-300 hover:bg-emerald-950/40"
                onClick={() => setLocation(buildOceanDeployUrl(landed.id, 'zone', worldSeed))}
              >
                <Globe className="w-4 h-4 mr-2" />
                Explore 3D Zone (Solo)
              </Button>
              {townUrl && (
                <Button
                  variant="outline"
                  className="w-full border-amber-700/50 text-amber-300 hover:bg-amber-950/40"
                  onClick={() => setLocation(townUrl)}
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  Enter Faction Town
                </Button>
              )}
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <Button
                variant="outline"
                className="w-full border-cyan-700/50 text-cyan-200 hover:bg-cyan-950/40"
                onClick={() => { window.location.href = getTacticalInfinityUrl('/'); }}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Full Tactical Infinity (water.grudge-studio.com)
              </Button>
              <p className="text-[11px] text-slate-500 text-center">
                Warlords ocean · world <span className="text-slate-400">{worldSeed}</span>
                {' · '}deploy into live Colyseus sectors
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <TacticalOceanScene
      onBackToMenu={() => setLocation('/world-map')}
      onLandOnIsland={(sectorId, islandName) => {
        setLanded({ id: sectorId, name: islandName || sectorLabel(sectorId) });
      }}
    />
  );
}