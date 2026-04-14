import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CharacterAnimator, CharacterPreview, CharacterCategory, Direction } from '@/components/CharacterAnimator';
import { ORC_ANIMATIONS, VAMPIRE_ANIMATIONS, SKELETON_CRUSADER_ANIMATIONS, GRASS_DECORATIONS } from '@shared/definitions/characterAnimations';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';
import { useAuthGuard } from '@/hooks/use-auth-guard';

export default function CharacterGallery() {
  const authReady = useAuthGuard();
  if (!authReady) return null;

  const [selectedCategory, setSelectedCategory] = useState<CharacterCategory>('orcs');
  const [selectedCharacter, setSelectedCharacter] = useState<string>('orc1');
  const [selectedAnimation, setSelectedAnimation] = useState<string>('idle');
  const [direction, setDirection] = useState<Direction>('down');
  const [scale, setScale] = useState(2);

  const getCharacters = (category: CharacterCategory) => {
    switch (category) {
      case 'orcs': return Object.entries(ORC_ANIMATIONS);
      case 'vampires': return Object.entries(VAMPIRE_ANIMATIONS);
      case 'skeletons': return Object.entries(SKELETON_CRUSADER_ANIMATIONS);
    }
  };

  const getAnimations = (category: CharacterCategory, characterId: string) => {
    switch (category) {
      case 'orcs': return Object.keys(ORC_ANIMATIONS[characterId]?.animations || {});
      case 'vampires': return Object.keys(VAMPIRE_ANIMATIONS[characterId]?.animations || {});
      case 'skeletons': return Object.keys(SKELETON_CRUSADER_ANIMATIONS[characterId]?.animations || {});
    }
  };

  const characters = getCharacters(selectedCategory);
  const animations = getAnimations(selectedCategory, selectedCharacter);

  const handleCategoryChange = (cat: string) => {
    const category = cat as CharacterCategory;
    setSelectedCategory(category);
    const chars = getCharacters(category);
    if (chars.length > 0) {
      setSelectedCharacter(chars[0][0]);
      const anims = getAnimations(category, chars[0][0]);
      setSelectedAnimation(anims[0] || 'idle');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="btn-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Character Animation Gallery</h1>
        </div>

        <Tabs value={selectedCategory} onValueChange={handleCategoryChange}>
          <TabsList className="mb-6">
            <TabsTrigger value="orcs" data-testid="tab-orcs">Orcs (Top-Down)</TabsTrigger>
            <TabsTrigger value="vampires" data-testid="tab-vampires">Vampires (4-Dir)</TabsTrigger>
            <TabsTrigger value="skeletons" data-testid="tab-skeletons">Skeleton Crusaders</TabsTrigger>
          </TabsList>

          <TabsContent value={selectedCategory} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-amber-400">Characters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {characters.map(([id, char]) => (
                  <button
                    key={id}
                    onClick={() => {
                      setSelectedCharacter(id);
                      const anims = getAnimations(selectedCategory, id);
                      setSelectedAnimation(anims[0] || 'idle');
                    }}
                    className={`w-full text-left px-4 py-2 rounded transition-colors ${
                      selectedCharacter === id
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-700/50 hover:bg-slate-600/50'
                    }`}
                    data-testid={`btn-char-${id}`}
                  >
                    <div className="font-medium">{char.name}</div>
                    <div className="text-xs text-slate-400">{char.description}</div>
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-amber-400">Animations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {animations.map((anim) => (
                    <button
                      key={anim}
                      onClick={() => setSelectedAnimation(anim)}
                      className={`px-3 py-1 rounded text-sm transition-colors ${
                        selectedAnimation === anim
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700/50 hover:bg-slate-600/50'
                      }`}
                      data-testid={`btn-anim-${anim}`}
                    >
                      {anim}
                    </button>
                  ))}
                </div>

                {selectedCategory !== 'skeletons' && (
                  <div className="mt-4">
                    <div className="text-sm text-slate-400 mb-2">Direction</div>
                    <div className="flex gap-2">
                      {(['down', 'left', 'right', 'up'] as Direction[]).map((dir) => (
                        <button
                          key={dir}
                          onClick={() => setDirection(dir)}
                          className={`px-3 py-1 rounded text-sm capitalize transition-colors ${
                            direction === dir
                              ? 'bg-green-600 text-white'
                              : 'bg-slate-700/50 hover:bg-slate-600/50'
                          }`}
                          data-testid={`btn-dir-${dir}`}
                        >
                          {dir}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4">
                  <div className="text-sm text-slate-400 mb-2">Scale: {scale}x</div>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4].map((s) => (
                      <button
                        key={s}
                        onClick={() => setScale(s)}
                        className={`px-3 py-1 rounded text-sm transition-colors ${
                          scale === s
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-700/50 hover:bg-slate-600/50'
                        }`}
                        data-testid={`btn-scale-${s}`}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-amber-400">Preview</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center min-h-[300px] bg-slate-900/50 rounded-lg">
                <CharacterAnimator
                  category={selectedCategory}
                  characterId={selectedCharacter}
                  animation={selectedAnimation}
                  direction={direction}
                  scale={scale}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card className="mt-6 bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-amber-400">Grass Decorations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 flex-wrap items-end">
              {GRASS_DECORATIONS.map((grass) => (
                <div key={grass.id} className="flex flex-col items-center">
                  <img
                    src={grass.path}
                    alt={grass.name}
                    style={{
                      width: grass.width * 4,
                      height: grass.height * 4,
                      imageRendering: 'pixelated'
                    }}
                    data-testid={`grass-${grass.id}`}
                  />
                  <div className="text-xs text-slate-400 mt-1">{grass.width}x{grass.height}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6 bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-amber-400">Animation Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div>
                <h3 className="text-lg font-semibold text-green-400 mb-2">Orcs (3 variants)</h3>
                <ul className="space-y-1 text-slate-300">
                  <li>idle: 4 frames @ 8fps</li>
                  <li>walk: 6 frames @ 10fps</li>
                  <li>run: 8 frames @ 12fps</li>
                  <li>attack: 8 frames @ 12fps</li>
                  <li>death: 8 frames @ 10fps</li>
                  <li>hurt: 6 frames @ 12fps</li>
                  <li>walk_attack: 6 frames @ 10fps</li>
                  <li>run_attack: 8 frames @ 12fps</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-red-400 mb-2">Vampires (3 variants)</h3>
                <ul className="space-y-1 text-slate-300">
                  <li>idle: 4 frames @ 8fps</li>
                  <li>walk: 6 frames @ 10fps</li>
                  <li>run: 8 frames @ 12fps</li>
                  <li>attack: 12 frames @ 14fps</li>
                  <li>death: 11 frames @ 10fps</li>
                  <li>hurt: 4 frames @ 12fps</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-purple-400 mb-2">Skeleton Crusaders (3 variants)</h3>
                <ul className="space-y-1 text-slate-300">
                  <li>idle: 18 frames @ 12fps</li>
                  <li>walking: 24 frames @ 16fps</li>
                  <li>running: 12 frames @ 14fps</li>
                  <li>slashing: 12 frames @ 14fps</li>
                  <li>kicking: 12 frames @ 14fps</li>
                  <li>throwing: 12 frames @ 14fps</li>
                  <li>hurt: 12 frames @ 12fps</li>
                  <li>dying: 15 frames @ 10fps</li>
                  <li>+ 9 more animations</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
