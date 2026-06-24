import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import Layout from '../components/Layout';
import { TiledDungeonGame } from '../components/TiledDungeonGame';
import { CharacterManager, type Character as LocalCharacter } from '../lib/characterManager';
import { DUNGEON_FLOORS } from '@shared/definitions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Skull, Sparkles } from 'lucide-react';
import { deriveCharacterStats } from '@shared/rulesEngine';
import { useAuthGuard } from '@/hooks/use-auth-guard';

export default function DungeonTiledPage() {
  const authReady = useAuthGuard();
  if (!authReady) return null;

  const [, setLocation] = useLocation();
  const urlParams = new URLSearchParams(window.location.search);
  const returnPath = urlParams.get('return') || '/';
  const autostart = urlParams.get('autostart') === '1';
  const floorParam = urlParams.get('floor');
  const dungeonNameParam = urlParams.get('name');

  const [characters, setCharacters] = useState<LocalCharacter[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<LocalCharacter | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<string | null>(floorParam);
  const [gameStarted, setGameStarted] = useState(false);
  const autostartAttempted = useRef(false);

  useEffect(() => {
    CharacterManager.getAll().then((chars) => {
      setCharacters(chars);
      if (!selectedCharacter && chars.length > 0) {
        const grudgeId = localStorage.getItem('grudge_account_id') || 'guest';
        const activeId =
          localStorage.getItem(`gruda_active_character_${grudgeId}`) ||
          localStorage.getItem('grudge_active_character') ||
          localStorage.getItem('gruda_active_character_guest');
        const active = activeId ? chars.find((c) => c.id === activeId) : chars[0];
        if (active) setSelectedCharacter(active);
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!autostart || autostartAttempted.current) return;
    if (!selectedCharacter || !selectedFloor) return;
    if (!DUNGEON_FLOORS[selectedFloor]) return;
    autostartAttempted.current = true;
    setGameStarted(true);
  }, [autostart, selectedCharacter, selectedFloor]);

  const handleStartDungeon = () => {
    if (selectedCharacter && selectedFloor) {
      setGameStarted(true);
    }
  };

  const handleExit = () => {
    if (returnPath && returnPath !== '/') {
      setLocation(returnPath);
      return;
    }
    setGameStarted(false);
    setSelectedFloor(floorParam);
  };

  if (gameStarted && selectedCharacter && selectedFloor) {
    const characterData = {
      id: selectedCharacter.id,
      name: selectedCharacter.name,
      level: selectedCharacter.level,
      classId: selectedCharacter.classId,
      raceId: selectedCharacter.raceId,
      attributes: selectedCharacter.attributes as Record<string, number>
    };
    const stats = deriveCharacterStats(characterData);
    
    return (
      <Layout>
        <div className="container mx-auto py-6 px-4">
          <div className="flex items-center gap-4 mb-6">
            <Button 
              variant="ghost" 
              onClick={handleExit}
              data-testid="button-exit-tiled-dungeon"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Exit Dungeon
            </Button>
            <h1 className="text-2xl font-bold text-purple-400">
              {selectedCharacter.name} — {dungeonNameParam || DUNGEON_FLOORS[selectedFloor]?.name}
            </h1>
          </div>
          
          <TiledDungeonGame
            floorId={selectedFloor}
            characterName={selectedCharacter.name}
            characterStats={{
              hp: stats.health,
              maxHp: stats.maxHealth,
              mana: stats.mana,
              maxMana: stats.maxMana,
              attack: stats.damage,
              defense: stats.defense,
              criticalChance: stats.criticalChance,
              criticalFactor: stats.criticalFactor,
              blockChance: stats.blockChance
            }}
            onExit={handleExit}
            onVictory={handleExit}
            onDefeat={handleExit}
          />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-6 px-4">
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            onClick={() => setLocation('/')}
            data-testid="button-back-home"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-purple-400 flex items-center gap-2">
            <Sparkles className="w-8 h-8" />
            {dungeonNameParam ? `${dungeonNameParam}` : 'Tiled Dungeon Crawler'}
          </h1>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-xl text-gray-200">Select Character</CardTitle>
            </CardHeader>
            <CardContent>
              {characters.length === 0 ? (
                <p className="text-gray-400">No characters found. Create one first!</p>
              ) : (
                <div className="space-y-2">
                  {characters.map(char => (
                    <button
                      key={char.id}
                      onClick={() => setSelectedCharacter(char)}
                      className={`w-full p-3 rounded-lg text-left transition-colors ${
                        selectedCharacter?.id === char.id 
                          ? 'bg-purple-900 border-2 border-purple-500' 
                          : 'bg-gray-700 hover:bg-gray-600 border-2 border-transparent'
                      }`}
                      data-testid={`select-character-${char.id}`}
                    >
                      <div className="font-bold text-gray-200">{char.name}</div>
                      <div className="text-sm text-gray-400">
                        Level {char.level} {char.classId}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-xl text-gray-200">Select Dungeon</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(DUNGEON_FLOORS).slice(0, 5).map(([id, floor]) => (
                  <button
                    key={id}
                    onClick={() => setSelectedFloor(id)}
                    className={`w-full p-3 rounded-lg text-left transition-colors ${
                      selectedFloor === id 
                        ? 'bg-purple-900 border-2 border-purple-500' 
                        : 'bg-gray-700 hover:bg-gray-600 border-2 border-transparent'
                    }`}
                    data-testid={`select-floor-${id}`}
                  >
                    <div className="flex items-center gap-2">
                      <Skull className="w-4 h-4 text-red-400" />
                      <span className="font-bold text-gray-200">{floor.name}</span>
                    </div>
                    <div className="text-sm text-gray-400 ml-6">
                      Level {floor.minLevel}-{floor.maxLevel} | {floor.width}x{floor.height}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 text-center">
          <Button
            onClick={handleStartDungeon}
            disabled={!selectedCharacter || !selectedFloor}
            className="px-8 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
            data-testid="button-start-dungeon"
          >
            Enter Dungeon
          </Button>
        </div>

        <div className="mt-8 bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-bold text-gray-200 mb-2">New Tile-Based System Features</h2>
          <ul className="text-sm text-gray-400 space-y-1">
            <li>• Proper 16x16 tile graphics from dampdungeons tileset</li>
            <li>• Animated 4-directional character sprites</li>
            <li>• Smooth tile-based movement with physics</li>
            <li>• Fog of war and exploration system</li>
            <li>• Support for hand-crafted Tiled JSON maps</li>
            <li>• Procedural dungeon generation with tile autotiling</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}
