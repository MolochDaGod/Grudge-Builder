import { HeroSpriteGallery, HeroSpriteAnimator } from '@/components/HeroSpriteAnimator';
import { HERO_SPRITES, HERO_RACE_LIST, type HeroRace, type AnimationType } from '@/lib/heroSprites';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';

export default function HeroSpritesPage() {
  const [selectedRace, setSelectedRace] = useState<HeroRace>('elf');
  const [selectedAnimation, setSelectedAnimation] = useState<AnimationType>('walk');
  const [scale, setScale] = useState(1.5);

  const animations: AnimationType[] = ['walk', 'attack', 'magic', 'death'];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white">
      <header className="p-4 border-b border-gray-700 bg-gray-900/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" data-testid="btn-back">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-amber-400">Hero Sprites</h1>
          </div>
          <p className="text-sm text-gray-400">All 6 races with animated sprite sheets</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-amber-300">Sprite Preview</h2>
          
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Race:</span>
              {HERO_RACE_LIST.map(race => (
                <button
                  key={race}
                  onClick={() => setSelectedRace(race)}
                  className={`px-3 py-1 text-sm rounded capitalize ${
                    selectedRace === race
                      ? 'bg-amber-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                  data-testid={`btn-race-${race}`}
                >
                  {race}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Animation:</span>
              {animations.map(anim => (
                <button
                  key={anim}
                  onClick={() => setSelectedAnimation(anim)}
                  className={`px-3 py-1 text-sm rounded capitalize ${
                    selectedAnimation === anim
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                  data-testid={`btn-anim-${anim}`}
                >
                  {anim}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Scale:</span>
              {[0.5, 1, 1.5, 2].map(s => (
                <button
                  key={s}
                  onClick={() => setScale(s)}
                  className={`px-3 py-1 text-sm rounded ${
                    scale === s
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                  data-testid={`btn-scale-${s}`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-center p-8 bg-gray-800/50 rounded-lg border border-gray-700">
            <div className="flex flex-col items-center gap-4">
              <HeroSpriteAnimator
                race={selectedRace}
                animation={selectedAnimation}
                scale={scale}
                playing={true}
                onAnimationEnd={() => {
                  if (selectedAnimation === 'death') {
                    setTimeout(() => setSelectedAnimation('walk'), 1000);
                  }
                }}
              />
              <div className="text-center">
                <p className="text-lg font-semibold capitalize text-amber-400">{selectedRace}</p>
                <p className="text-sm text-gray-400 capitalize">{selectedAnimation} Animation</p>
                <p className="text-xs text-gray-500">
                  Faction: {HERO_SPRITES[selectedRace].faction}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-amber-300">All Heroes Gallery</h2>
          <HeroSpriteGallery />
        </section>

        <section className="p-4 bg-gray-800/30 rounded-lg border border-gray-700">
          <h2 className="text-lg font-semibold mb-3 text-amber-300">Sprite System Info</h2>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-medium text-gray-300 mb-2">Available Animations:</h3>
              <ul className="list-disc list-inside text-gray-400 space-y-1">
                <li><strong>Walk</strong> - 15 frames, 12 FPS, looping</li>
                <li><strong>Attack</strong> - 15 frames, 14 FPS, one-shot</li>
                <li><strong>Magic</strong> - 15 frames, 12 FPS, one-shot</li>
                <li><strong>Death</strong> - 14 frames, 10 FPS, one-shot</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-300 mb-2">Race Factions:</h3>
              <ul className="list-disc list-inside text-gray-400 space-y-1">
                <li><span className="text-red-400">Crusade:</span> Human, Dwarf</li>
                <li><span className="text-green-400">Legion:</span> Orc, Barbarian, Undead</li>
                <li><span className="text-blue-400">Fabled:</span> Elf</li>
              </ul>
            </div>
          </div>
          <p className="mt-4 text-xs text-gray-500">
            Currently using Elf sprite sheet as template for all races. 
            AI-generated race-specific sprites coming soon.
          </p>
        </section>
      </main>
    </div>
  );
}
