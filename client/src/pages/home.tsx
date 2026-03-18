import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Sword, Shield, Pickaxe, Leaf, Hammer, Gem, Book, Map, Sparkles, LogOut, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Layout from "@/components/Layout";
import { CharacterManager, Character } from "@/lib/characterManager";
import { isAuthenticated, getCurrentUser, logout as doLogout, verifyToken, getSession, type GrudgeUser } from "@/lib/grudgeBackend";

interface QuickAction {
  label: string;
  path: string;
  icon: React.ReactNode;
  description: string;
  color: string;
  bgImage: string;
}

const quickActions: QuickAction[] = [
  { label: "Character", path: "/character", icon: <Shield className="w-6 h-6" />, description: "Manage heroes & equipment", color: "from-amber-900/80 to-amber-800/60", bgImage: "/assets/backgrounds/general.png" },
  { label: "Combat", path: "/combat", icon: <Sword className="w-6 h-6" />, description: "Battle enemies", color: "from-red-900/80 to-red-800/60", bgImage: "/assets/events/faction-war.png" },
  { label: "Dungeon", path: "/dungeon", icon: <Pickaxe className="w-6 h-6" />, description: "Explore & loot", color: "from-purple-900/80 to-purple-800/60", bgImage: "/assets/events/dungeon-raid-1.png" },
  { label: "Island", path: "/island", icon: <Leaf className="w-6 h-6" />, description: "Build your base", color: "from-green-900/80 to-green-800/60", bgImage: "/assets/backgrounds/island-map.png" },
  { label: "Professions", path: "/professions", icon: <Hammer className="w-6 h-6" />, description: "Craft & gather", color: "from-orange-900/80 to-orange-800/60", bgImage: "/assets/events/shop-coming-soon.png" },
  { label: "Skills", path: "/skill-tree", icon: <Gem className="w-6 h-6" />, description: "Unlock abilities", color: "from-blue-900/80 to-blue-800/60", bgImage: "/assets/events/weekly-tournament.png" },
  { label: "World Map", path: "/world-map", icon: <Map className="w-6 h-6" />, description: "Explore the world", color: "from-teal-900/80 to-teal-800/60", bgImage: "/assets/backgrounds/island-terrain.png" },
  { label: "Database", path: "/database", icon: <Book className="w-6 h-6" />, description: "Browse game data", color: "from-slate-900/80 to-slate-800/60", bgImage: "/assets/events/dungeon-raid-2.png" },
];

export default function HomePage() {
  const [, setLocation] = useLocation();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [activeCharacter, setActiveCharacter] = useState<Character | null>(null);
  const [user, setUser] = useState<GrudgeUser | null>(getCurrentUser());

  useEffect(() => {
    if (!isAuthenticated()) {
      setLocation("/");
      return;
    }
    // Verify token is still valid
    verifyToken().then((result) => {
      if (!result.valid) {
        doLogout();
        setLocation("/");
        return;
      }
      setUser(getCurrentUser());
    });
    // Load characters
    CharacterManager.getAll().then((chars) => {
      setCharacters(chars);
      CharacterManager.getActiveCharacter().then(setActiveCharacter);
    }).catch(() => {});
  }, [setLocation]);

  const handleLogout = () => {
    doLogout();
    setLocation("/");
  };

  const currentUser = user || ({} as GrudgeUser);

  return (
    <Layout>
      <div
        className="flex-1 overflow-y-auto p-4 md:p-8 max-w-7xl mx-auto w-full relative"
        style={{
          backgroundImage: "url('/assets/backgrounds/tavern-home.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }}
      >
        {/* Dark overlay for readability */}
        <div className="fixed inset-0 bg-black/60 pointer-events-none" style={{ zIndex: 0 }} />
        {/* Header */}
        <div className="flex items-center justify-between mb-8 relative" style={{ zIndex: 1 }}>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl md:text-4xl font-cinzel font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500">
              Welcome, {currentUser.displayName || currentUser.username || "Warlord"}
            </h1>
            <p className="text-slate-400 mt-1">Choose your next adventure</p>
          </motion.div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-slate-400 hover:text-red-400"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        {/* Active Character Card */}
        {activeCharacter && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mb-8 relative"
            style={{ zIndex: 1 }}
          >
            <Card className="bg-gradient-to-r from-slate-900/80 to-slate-800/60 border-amber-900/30">
              <CardContent className="p-6 flex items-center gap-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-red-700 flex items-center justify-center shadow-lg">
                  <User className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-cinzel font-bold text-amber-300">{activeCharacter.name}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <Badge variant="outline" className="text-xs border-amber-700/50 text-amber-400">
                      {activeCharacter.raceId}
                    </Badge>
                    <Badge variant="outline" className="text-xs border-red-700/50 text-red-400">
                      {activeCharacter.classId}
                    </Badge>
                    <span className="text-sm text-slate-400">Level {activeCharacter.level}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-slate-500">XP</span>
                    <Progress value={((activeCharacter.xp || 0) % 100)} className="flex-1 h-2" />
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation("/character")}
                  className="border-amber-700/50 text-amber-400 hover:bg-amber-900/20"
                >
                  View Character
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* No Character Prompt */}
        {characters.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mb-8 relative"
            style={{ zIndex: 1 }}
          >
            <Card className="bg-gradient-to-r from-amber-950/40 to-red-950/30 border-amber-700/40">
              <CardContent className="p-8 text-center">
                <Sparkles className="w-12 h-12 text-amber-400 mx-auto mb-4" />
                <h3 className="text-2xl font-cinzel font-bold text-amber-300 mb-2">Begin Your Journey</h3>
                <p className="text-slate-400 mb-6">Create your first character to unlock all game features</p>
                <Button
                  size="lg"
                  onClick={() => setLocation("/character")}
                  className="bg-gradient-to-r from-amber-700 to-red-800 hover:from-amber-600 hover:to-red-700 text-white font-cinzel tracking-wider"
                >
                  Create Character
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative" style={{ zIndex: 1 }}>
          {quickActions.map((action, i) => (
            <motion.div
              key={action.path}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 * i }}
            >
              <Card
                className="relative overflow-hidden border-slate-700/50 hover:border-amber-700/50 cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-amber-900/20"
                onClick={() => setLocation(action.path)}
              >
                {/* Card background image */}
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url('${action.bgImage}')` }}
                />
                {/* Gradient overlay for readability */}
                <div className={`absolute inset-0 bg-gradient-to-br ${action.color}`} />
                <CardContent className="relative p-5 text-center">
                  <div className="text-amber-400 mb-3 flex justify-center drop-shadow-lg">{action.icon}</div>
                  <h3 className="font-cinzel font-bold text-sm text-white mb-1 drop-shadow-md">{action.label}</h3>
                  <p className="text-xs text-slate-200 drop-shadow-sm">{action.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Account Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="mt-8 relative"
          style={{ zIndex: 1 }}
        >
          <Card className="bg-slate-900/50 border-slate-800/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-cinzel text-slate-400">Account Overview</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-400">{characters.length}</p>
                <p className="text-xs text-slate-500">Characters</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-400">{currentUser.gold ?? 0}</p>
                <p className="text-xs text-slate-500">Gold</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-300">{currentUser.grudgeId?.slice(0, 8) || "—"}</p>
                <p className="text-xs text-slate-500">Grudge ID</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </Layout>
  );
}
