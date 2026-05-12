import { useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PuterFooter } from "@/components/PuterFooter";
import { AdminTransitionScreen } from "@/components/AdminTransitionScreen";
import { AdminProvider, useAdmin } from "@/contexts/AdminContext";
import { preloadMigratedSprites } from "@/hooks/use-sprite-url";
import { prefetchCoreData } from "@/lib/objectStoreApi";
import { syncGameDataFromObjectStore } from "@/lib/gameData";
import { syncItemsFromObjectStore } from "@/lib/grudaDB";
import NotFound from "@/pages/not-found";
import CharacterBuilder from "@/pages/character-builder";
import ProfessionsPage from "@/pages/professions";
import DatabasePage from "@/pages/database";
import IntroPage from "@/pages/intro";
import HomePage from "@/pages/home";
import CombatPage from "@/pages/combat";
import SkillTreePage from "@/pages/skill-tree";
import AdminPage from "@/pages/admin";
import DungeonTiledPage from "@/pages/dungeon-tiled";
import SpriteEnginePage from "@/pages/sprite-engine";
import SpriteAdminPage from "@/pages/sprite-admin";
import MinerPage from "@/pages/profession/Miner";
import ForesterPage from "@/pages/profession/Forester";
import MysticPage from "@/pages/profession/Mystic";
import ChefPage from "@/pages/profession/Chef";
import EngineerPage from "@/pages/profession/Engineer";
import RPGBattlePage from "@/pages/rpg-battle";
import SpriteGeneratorPage from "@/pages/sprite-generator";
import TemplateViewerPage from "@/pages/template-viewer";
import ArsenalPage from "@/pages/ArsenalPage";
import WorldMapPage from "@/pages/world-map";
import MissionBoardPage from "@/pages/mission-board";
import WalletPage from "@/pages/WalletPage";
import AccountPage from "@/pages/AccountPage";
import AIHelperGenerator from "@/pages/ai-helper-generator";
import AdminMapPage from "@/pages/admin-map";
import RaceSpriteGeneratorPage from "@/pages/race-sprite-generator";
import CharacterGalleryPage from "@/pages/character-gallery";
import AdminCombatPage from "@/pages/admin-combat";
import IslandV2Page from "@/pages/island-v2";
import AdminIslandV2Page from "@/pages/admin-island-v2";
import LauncherPage from "@/pages/launcher";
import TowerWarsPage from "@/pages/tower-wars";
import HarvestPage from "@/pages/Harvest";
import HeroCodexPage from "@/pages/hero-codex";
import CraftingPage from "@/pages/crafting";
import Island3DPage from "@/pages/island-3d";
import AuthCallbackPage from "@/pages/auth-callback";
import EditorPage from "@/pages/editor";
import OrganizerPage from "@/pages/organizer";
import CreateCharacterPage from "@/pages/create-character";

function Router() {
  return (
    <Switch>
      <Route path="/" component={IntroPage} />
      <Route path="/auth/callback" component={AuthCallbackPage} />
      <Route path="/intro" component={IntroPage} />
      <Route path="/home" component={HomePage} />
      <Route path="/character" component={CharacterBuilder} />
      <Route path="/characters" component={CharacterBuilder} />
      <Route path="/create-character" component={CreateCharacterPage} />
      <Route path="/professions" component={ProfessionsPage} />
      <Route path="/database" component={DatabasePage} />
      <Route path="/combat" component={CombatPage} />
      <Route path="/skills" component={SkillTreePage} />
      <Route path="/skill-tree" component={SkillTreePage} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/dungeon" component={DungeonTiledPage} />
      <Route path="/dungeon-tiled" component={DungeonTiledPage} />
      <Route path="/sprites" component={SpriteEnginePage} />
      <Route path="/sprite-admin" component={SpriteAdminPage} />
      <Route path="/profession/miner" component={MinerPage} />
      <Route path="/profession/forester" component={ForesterPage} />
      <Route path="/profession/mystic" component={MysticPage} />
      <Route path="/profession/chef" component={ChefPage} />
      <Route path="/profession/engineer" component={EngineerPage} />
      <Route path="/rpg-battle" component={RPGBattlePage} />
      <Route path="/sprite-generator" component={SpriteGeneratorPage} />
      <Route path="/template-viewer" component={TemplateViewerPage} />
      <Route path="/arsenal" component={ArsenalPage} />
      <Route path="/world-map" component={WorldMapPage} />
      <Route path="/missions" component={MissionBoardPage} />
      <Route path="/wallet" component={WalletPage} />
      <Route path="/account" component={AccountPage} />
      <Route path="/ai-helper" component={AIHelperGenerator} />
      <Route path="/admin-map" component={AdminMapPage} />
      <Route path="/race-sprites" component={RaceSpriteGeneratorPage} />
      <Route path="/character-gallery" component={CharacterGalleryPage} />
      <Route path="/admin-combat" component={AdminCombatPage} />
      <Route path="/island-v2" component={IslandV2Page} />
      <Route path="/admin-island-v2" component={AdminIslandV2Page} />
      <Route path="/launcher" component={LauncherPage} />
      <Route path="/tower-wars" component={TowerWarsPage} />
      <Route path="/harvest" component={HarvestPage} />
      <Route path="/hero-codex" component={HeroCodexPage} />
      <Route path="/crafting" component={CraftingPage} />
      <Route path="/island-3d" component={Island3DPage} />
      <Route path="/editor" component={EditorPage} />
      <Route path="/organizer" component={OrganizerPage} />
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { isTransitioning, isAdmin } = useAdmin();

  useEffect(() => {
    // Warm ObjectStore data cache on app init, then sync all game data
    prefetchCoreData().then(async () => {
      console.debug('[ObjectStore] Core data prefetched');
      const [,, profData] = await Promise.all([
        syncGameDataFromObjectStore(),
        syncItemsFromObjectStore(),
        import('@/lib/professionSync').then(m => m.loadProfessions()),
      ]);
      console.debug(`[ProfessionSync] Loaded v${profData.version}: ${Object.keys(profData.gathering).length} gathering + ${Object.keys(profData.professions).length} crafting professions`);
    });

    preloadMigratedSprites().then(count => {
      if (count > 0) {
        console.debug(`Preloaded ${count} migrated sprite URLs from Object Storage`);
      }
    });
  }, []);

  return (
    <>
      <AdminTransitionScreen isVisible={isTransitioning} isAdmin={isAdmin} />
      <TooltipProvider>
        <Toaster />
        <Router />
        <PuterFooter />
      </TooltipProvider>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AdminProvider>
        <AppContent />
      </AdminProvider>
    </QueryClientProvider>
  );
}

export default App;
