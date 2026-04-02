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
import NotFound from "@/pages/not-found";
import CharacterBuilder from "@/pages/character-builder";
import ProfessionsPage from "@/pages/professions";
import DatabasePage from "@/pages/database";
import IntroPage from "@/pages/intro";
import LoginPage from "@/pages/login";
import HomePage from "@/pages/home";
import IslandPage from "@/pages/island";
import CombatPage from "@/pages/combat";
import SkillTreePage from "@/pages/skill-tree";
import AdminPage from "@/pages/admin";
import DungeonTiledPage from "@/pages/dungeon-tiled";
import SpriteEnginePage from "@/pages/sprite-engine";
import SpriteEditorPage from "@/pages/sprite-editor";
import HeroSpritesPage from "@/pages/hero-sprites";
import SpriteAdminPage from "@/pages/sprite-admin";
import MinerPage from "@/pages/profession/Miner";
import ForesterPage from "@/pages/profession/Forester";
import MysticPage from "@/pages/profession/Mystic";
import ChefPage from "@/pages/profession/Chef";
import EngineerPage from "@/pages/profession/Engineer";
import RPGBattlePage from "@/pages/rpg-battle";
import SpriteViewerPage from "@/pages/sprite-viewer";
import SpriteGeneratorPage from "@/pages/sprite-generator";
import TemplateViewerPage from "@/pages/template-viewer";
import SpriteLibraryPage from "@/pages/sprite-library";
import ArsenalPage from "@/pages/ArsenalPage";
import WorldMapPage from "@/pages/world-map";
import MissionBoardPage from "@/pages/mission-board";
import WalletPage from "@/pages/WalletPage";
import AccountPage from "@/pages/AccountPage";
import AIHelperGenerator from "@/pages/ai-helper-generator";
import AdminMapPage from "@/pages/admin-map";
import IslandGridTestPage from "@/pages/island-grid-test";
import IslandPhaserPage from "@/pages/island-phaser";
import RaceSpriteGeneratorPage from "@/pages/race-sprite-generator";
import CharacterGalleryPage from "@/pages/character-gallery";
import AdminCombatPage from "@/pages/admin-combat";
import IslandV2Page from "@/pages/island-v2";
import AdminIslandV2Page from "@/pages/admin-island-v2";
import LauncherPage from "@/pages/launcher";
import TowerWarsPage from "@/pages/tower-wars";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LoginPage} />
      <Route path="/intro" component={IntroPage} />
      <Route path="/home" component={HomePage} />
      <Route path="/character" component={CharacterBuilder} />
      <Route path="/professions" component={ProfessionsPage} />
      <Route path="/database" component={DatabasePage} />
      <Route path="/island" component={IslandPage} />
      <Route path="/combat" component={CombatPage} />
      <Route path="/skills" component={SkillTreePage} />
      <Route path="/skill-tree" component={SkillTreePage} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/dungeon" component={DungeonTiledPage} />
      <Route path="/dungeon-tiled" component={DungeonTiledPage} />
      <Route path="/sprites" component={SpriteEnginePage} />
      <Route path="/sprite-editor" component={SpriteEditorPage} />
      <Route path="/hero-sprites" component={HeroSpritesPage} />
      <Route path="/sprite-admin" component={SpriteAdminPage} />
      <Route path="/profession/miner" component={MinerPage} />
      <Route path="/profession/forester" component={ForesterPage} />
      <Route path="/profession/mystic" component={MysticPage} />
      <Route path="/profession/chef" component={ChefPage} />
      <Route path="/profession/engineer" component={EngineerPage} />
      <Route path="/rpg-battle" component={RPGBattlePage} />
      <Route path="/sprite-viewer" component={SpriteViewerPage} />
      <Route path="/sprite-generator" component={SpriteGeneratorPage} />
      <Route path="/template-viewer" component={TemplateViewerPage} />
      <Route path="/sprite-library" component={SpriteLibraryPage} />
      <Route path="/arsenal" component={ArsenalPage} />
      <Route path="/world-map" component={WorldMapPage} />
      <Route path="/missions" component={MissionBoardPage} />
      <Route path="/wallet" component={WalletPage} />
      <Route path="/account" component={AccountPage} />
      <Route path="/ai-helper" component={AIHelperGenerator} />
      <Route path="/admin-map" component={AdminMapPage} />
      <Route path="/island-grid-test" component={IslandGridTestPage} />
      <Route path="/island-phaser" component={IslandPhaserPage} />
      <Route path="/race-sprites" component={RaceSpriteGeneratorPage} />
      <Route path="/character-gallery" component={CharacterGalleryPage} />
      <Route path="/admin-combat" component={AdminCombatPage} />
      <Route path="/island-v2" component={IslandV2Page} />
      <Route path="/admin-island-v2" component={AdminIslandV2Page} />
      <Route path="/launcher" component={LauncherPage} />
      <Route path="/tower-wars" component={TowerWarsPage} />
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { isTransitioning, isAdmin } = useAdmin();

  useEffect(() => {
    // Warm ObjectStore data cache on app init
    prefetchCoreData().then(() => {
      console.debug('[ObjectStore] Core data prefetched');
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
