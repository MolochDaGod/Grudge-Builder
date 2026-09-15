import { useEffect, useLayoutEffect, lazy, Suspense } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PuterFooter } from "@/components/PuterFooter";
import { AdminTransitionScreen } from "@/components/AdminTransitionScreen";
import { AdminProvider, useAdmin } from "@/contexts/AdminContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { LoginModal } from "@/components/LoginModal";
import { preloadMigratedSprites } from "@/hooks/use-sprite-url";
import { prefetchCoreData } from "@/lib/objectStoreApi";
import { syncGameDataFromObjectStore } from "@/lib/gameData";
import { syncItemsFromObjectStore } from "@/lib/grudaDB";
import NotFound from "@/pages/not-found";
import { Grudge6Redirect } from "@/components/Grudge6Redirect";
import CharacterRedirect from "@/pages/character-redirect";
import ProfessionsPage from "@/pages/professions";
import DatabasePage from "@/pages/database";
import IntroPage from "@/pages/intro";
import WarlordsLandingPage from "@/pages/warlords-landing";
import WarlordsAccountPage from "@/pages/warlords-account";
import LoreIndexPage from "@/pages/lore/index";
import LoreGodsPage from "@/pages/lore/gods";
import LoreFactionsPage from "@/pages/lore/factions";
import LoreHeroesPage from "@/pages/lore/heroes";
import LoreWorldPage from "@/pages/lore/world";
import LoreSectorsPage from "@/pages/lore/sectors";
import LoreSectorDetailPage from "@/pages/lore/sector-detail";
import HomePage from "@/pages/home";
import SkillTreePage from "@/pages/skill-tree";
import AdminPage from "@/pages/admin";
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
import MissionBoardPage from "@/pages/mission-board";
import WalletPage from "@/pages/WalletPage";
import AccountPage from "@/pages/AccountPage";
import TreatyPage from "@/pages/TreatyPage";
import AIHelperGenerator from "@/pages/ai-helper-generator";
import AdminMapPage from "@/pages/admin-map";
import RaceSpriteGeneratorPage from "@/pages/race-sprite-generator";
import CharacterGalleryPage from "@/pages/character-gallery";
import AdminCombatPage from "@/pages/admin-combat";
import LauncherPage from "@/pages/launcher";
import HarvestPage from "@/pages/Harvest";
import HeroCodexPage from "@/pages/hero-codex";
import CraftingPage from "@/pages/crafting";
import AuthCallbackPage from "@/pages/auth-callback";
import GrudgeAI from "@/components/GrudgeAI";
import { GrudgeTruthBadge } from "@/components/GrudgeTruthBadge";
import { GrudgeTokenWidget } from "@/components/grudge-token/GrudgeTokenWidget";
import CreateCharacterRedirect from "@/pages/create-character-redirect";
import CharacterCreatorRedirect from "@/pages/character-creator-redirect";
import HeroesPage from "@/pages/heroes";
import BossWalkupPage from "@/pages/boss-walkup";
import GrudaWarsPage from "@/pages/grudawars";
import WarlordsStartPage from "@/pages/warlords-start";
import IslandsPage from "@/pages/islands";
import { RtsDomainBootstrap } from "@/components/RtsDomainBootstrap";
import { hydrateVideoCatalog } from "@/lib/fleetVideo";
import { loadFleetCdnFonts } from "@/lib/fleetFonts";
import GameCharacterPage from "@/pages/game-character";
import SystemsPage from "@/pages/systems";
import MainPanelPage from "@/pages/main-panel";
import { consumeGcsReturnHandoff } from "@/lib/gcsRedirect";
import { CharacterManager } from "@/lib/characterManager";
import WarerarewardPage from "@/pages/warerareward";

// Play / 3D / Rapier pages stay off the landing graph. Eager HomeIslandPage
// (and island/play/tutorial) pulled Island3DEngine → PhysicsWorld → Rapier
// WASM into index, so grudgewarlords.com/#root never mounted.
const CombatPage = lazy(() => import("@/pages/combat"));
const DungeonTiledPage = lazy(() => import("@/pages/dungeon-tiled"));
const WorldMapPage = lazy(() => import("@/pages/world-map"));
const IslandPage = lazy(() => import("@/pages/island"));
const IslandV2Page = lazy(() => import("@/pages/island-v2"));
const AdminIslandV2Page = lazy(() => import("@/pages/admin-island-v2"));
const AdminIsland3DPage = lazy(() => import("@/pages/admin-island-3d"));
const RtsGrudgePage = lazy(() => import("@/pages/rts-grudge"));
const TowerWarsPage = lazy(() => import("@/pages/tower-wars"));
const AirshipZonePage = lazy(() => import("@/pages/AirshipZonePage"));
const Island3DPage = lazy(() => import("@/pages/island-3d"));
const LavaCaesarLabPage = lazy(() => import("@/pages/lava-caesar-lab"));
const DockRaftLabPage = lazy(() => import("@/pages/dock-raft-lab"));
const LeviathanCinemaPage = lazy(() => import("@/pages/shipwreck-cinema"));
const LegacyShipwreckCinemaRedirect = lazy(
  () => import("@/pages/legacy-shipwreck-cinema-redirect"),
);
const OpenWorldEntryPage = lazy(() => import("@/pages/open-world"));
const WarScenePage = lazy(() => import("@/pages/war-scene"));
const EditorPage = lazy(() => import("@/pages/editor"));
const ForgePage = lazy(() => import("@/pages/forge"));
const ScenePage = lazy(() => import("@/pages/scene"));
const Grudge6ViewerPage = lazy(() => import("@/pages/grudge6-viewer"));
const OrganizerPage = lazy(() => import("@/pages/organizer"));
const PlayPage = lazy(() => import("@/pages/play"));
const OceanPage = lazy(() => import("@/pages/ocean"));
const TutorialPage = lazy(() => import("@/pages/tutorial"));
const WorldNativePage = lazy(() => import("@/pages/world-native"));
const IslandRevealPage = lazy(() => import("@/pages/island-reveal"));
const HomeIslandPage = lazy(() => import("@/pages/home-island"));
const HomeIslandEntryPage = lazy(() => import("@/pages/homeisland"));
const AirshipHandoffPage = lazy(() => import("@/pages/airship-handoff"));
const WeaponModelAdminPage = lazy(() => import("@/pages/weapon-model-admin"));
const WeaponSkillsPage = lazy(() => import("@/pages/weapon-skills"));
const CastingMasterPage = lazy(() => import("@/pages/casting-master"));
const VideoMocapPage = lazy(() => import("@/pages/video-mocap"));
const WeaponMasteryPage = lazy(() => import("@/pages/weapon-mastery"));
const CombatLabPage = lazy(() => import("@/pages/combat-lab"));
const TownPage = lazy(() => import("@/pages/town"));
const AssetShowcasePage = lazy(() => import("@/pages/asset-showcase"));
const AssassinationGroundsPage = lazy(() => import("@/pages/assassination-grounds"));

function Router() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
    <Switch>
      <Route path="/" component={WarlordsLandingPage} />
      <Route path="/auth/callback" component={AuthCallbackPage} />
      <Route path="/intro" component={IntroPage} />
      <Route path="/landing" component={WarlordsLandingPage} />
      <Route path="/lore" component={LoreIndexPage} />
      <Route path="/lore/gods" component={LoreGodsPage} />
      <Route path="/lore/factions" component={LoreFactionsPage} />
      <Route path="/lore/heroes" component={LoreHeroesPage} />
      <Route path="/lore/world" component={LoreWorldPage} />
      <Route path="/lore/sectors" component={LoreSectorsPage} />
      <Route path="/lore/sectors/:sectorId" component={LoreSectorDetailPage} />
      <Route path="/home" component={HomePage} />
      <Route path="/main-panel" component={MainPanelPage} />
      <Route path="/equipment" component={MainPanelPage} />
      {/* /character create → GCS; /heroes roster; /home = WCS hub; /airship = era select */}
      <Route path="/character" component={CharacterRedirect} />
      <Route path="/characters" component={HeroesPage} />
      <Route path="/create-character" component={CreateCharacterRedirect} />
      <Route path="/character-creator" component={CharacterCreatorRedirect} />
      <Route path="/heroes" component={HeroesPage} />
      <Route path="/select-character" component={HeroesPage} />
      <Route path="/crew" component={HeroesPage} />
      <Route path="/boss-walkup" component={BossWalkupPage} />
      <Route path="/professions" component={ProfessionsPage} />
      <Route path="/database" component={DatabasePage} />
      <Route path="/combat" component={CombatPage} />
      <Route path="/skills" component={SkillTreePage} />
      <Route path="/skill-tree" component={SkillTreePage} />
      <Route path="/skill-trees" component={SkillTreePage} />
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
      <Route path="/account" component={WarlordsAccountPage} />
      <Route path="/account/legacy" component={AccountPage} />
      <Route path="/treaty" component={TreatyPage} />
      <Route path="/ai-helper" component={AIHelperGenerator} />
      <Route path="/admin-map" component={AdminMapPage} />
      <Route path="/race-sprites" component={RaceSpriteGeneratorPage} />
      <Route path="/character-gallery" component={CharacterGalleryPage} />
      <Route path="/admin-combat" component={AdminCombatPage} />
      <Route path="/island" component={IslandPage} />
      <Route path="/island-v2" component={IslandV2Page} />
      <Route path="/admin-island-v2" component={AdminIslandV2Page} />
      <Route path="/admin-island-3d" component={AdminIsland3DPage} />
      <Route path="/lobby" component={HomePage} />
      <Route path="/launcher" component={LauncherPage} />
      <Route path="/rts-grudge" component={RtsGrudgePage} />
      <Route path="/open-world" component={OpenWorldEntryPage} />
      <Route path="/openworld" component={OpenWorldEntryPage} />
      <Route path="/sailing" component={OceanPage} />
      <Route path="/ocean" component={OceanPage} />
      <Route path="/tower-wars">{() => <Suspense fallback={null}><TowerWarsPage /></Suspense>}</Route>
      <Route path="/harvest" component={HarvestPage} />
      {/* Airship solo opener zone (merged PR #44) */}
      <Route path="/airship-zone" component={AirshipZonePage} />
      {/* Foundry / era handoff bridge → home-island when no solo zone query */}
      <Route path="/airship" component={AirshipHandoffPage} />
      <Route path="/airship-handoff" component={AirshipHandoffPage} />
      <Route path="/hero-codex" component={HeroCodexPage} />
      <Route path="/crafting" component={CraftingPage} />
      <Route path="/crafting-suite" component={CraftingPage} />
      <Route path="/island-3d" component={Island3DPage} />
      <Route path="/lava-caesar-lab" component={LavaCaesarLabPage} />
      <Route path="/dock-raft-lab" component={DockRaftLabPage} />
      {/* First voyage — LeviathanOceanCinema (canonical) */}
      <Route path="/leviathan-cinema" component={LeviathanCinemaPage} />
      {/* Legacy bookmark — soft-redirect to /leviathan-cinema (keeps characterId) */}
      <Route path="/shipwreck-cinema">
        {() => (
          <Suspense fallback={null}>
            <LegacyShipwreckCinemaRedirect />
          </Suspense>
        )}
      </Route>
      <Route path="/war-scene" component={WarScenePage} />
      <Route path="/medieval-battle" component={WarScenePage} />
      <Route path="/editor" component={EditorPage} />
      <Route path="/forge" component={ForgePage} />
      <Route path="/scene" component={ScenePage} />
      <Route path="/viewer" component={Grudge6ViewerPage} />
      <Route path="/organizer">{() => <Suspense fallback={null}><OrganizerPage /></Suspense>}</Route>
      <Route path="/grudawars" component={GrudaWarsPage} />
      <Route path="/play" component={PlayPage} />
      <Route path="/test-play" component={PlayPage} />
      <Route path="/game/world" component={PlayPage} />
      <Route path="/world">{() => <Suspense fallback={null}><WorldNativePage /></Suspense>}</Route>
      <Route path="/cloudfix">{() => <Suspense fallback={null}><WorldNativePage /></Suspense>}</Route>
      {/* /warlords = production flow router (was dead: WorldNativePage claimed bare /warlords first) */}
      <Route path="/warlords" component={WarlordsStartPage} />
      <Route path="/warlords/start" component={WarlordsStartPage} />
      <Route path="/tutorial" component={TutorialPage} />
      <Route path="/island-reveal" component={IslandRevealPage} />
      <Route path="/islands" component={IslandsPage} />
      <Route path="/home-island" component={HomeIslandPage} />
      <Route path="/homeisland" component={HomeIslandEntryPage} />
      <Route path="/homeIsland" component={HomeIslandEntryPage} />
      <Route path="/weapon-admin" component={WeaponModelAdminPage} />
      <Route path="/weapon-skills" component={WeaponSkillsPage} />
      <Route path="/casting-master" component={CastingMasterPage} />
      <Route path="/casting" component={CastingMasterPage} />
      <Route path="/video-mocap" component={VideoMocapPage} />
      <Route path="/mocap" component={VideoMocapPage} />
      <Route path="/weapon-mastery" component={WeaponMasteryPage} />
      <Route path="/combat-lab" component={CombatLabPage} />
      <Route path="/equipment-lab" component={CombatLabPage} />
      <Route path="/editor/combat" component={CombatLabPage} />
      <Route path="/town" component={TownPage} />
      <Route path="/weaponskills" component={WeaponSkillsPage} />
      <Route path="/game/character" component={GameCharacterPage} />
      <Route path="/game">{() => <Grudge6Redirect route="home" />}</Route>
      <Route path="/game/panel">{() => <Grudge6Redirect route="panel" />}</Route>
      <Route path="/game/spellbook">{() => <Grudge6Redirect route="spellbook" />}</Route>
      <Route path="/game/hud">{() => <Grudge6Redirect route="hud" />}</Route>
      <Route path="/game/inventory">{() => <Grudge6Redirect route="inventory" />}</Route>
      <Route path="/game/foundry">{() => <Grudge6Redirect route="foundry" />}</Route>
      <Route path="/systems" component={SystemsPage} />
      <Route path="/asset-showcase" component={AssetShowcasePage} />
      <Route path="/assets" component={AssetShowcasePage} />
      <Route path="/showcase/assets" component={AssetShowcasePage} />
      {/* Assassination Grounds — full navmesh map + Danger Room portals */}
      <Route path="/assassination-grounds">{() => (
        <Suspense fallback={<div className="min-h-screen bg-black" />}>
          <AssassinationGroundsPage />
        </Suspense>
      )}</Route>
      <Route path="/maps/assassination-grounds">{() => (
        <Suspense fallback={<div className="min-h-screen bg-black" />}>
          <AssassinationGroundsPage />
        </Suspense>
      )}</Route>
      <Route path="/danger-grounds">{() => (
        <Suspense fallback={<div className="min-h-screen bg-black" />}>
          <AssassinationGroundsPage />
        </Suspense>
      )}</Route>
      {/* Warerareward — Keel launch offer page (case-insensitive routes) */}
      <Route path="/Warerareward" component={WarerarewardPage} />
      <Route path="/warerareward" component={WarerarewardPage} />
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
    </Suspense>
  );
}

function AppContent() {
  const { isTransitioning, isAdmin } = useAdmin();

  useEffect(() => {
    void hydrateVideoCatalog();
    loadFleetCdnFonts();

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

  // Activate grudge6 hero from GCS before /test-play child effects run.
  useLayoutEffect(() => {
    consumeGcsReturnHandoff((id) => CharacterManager.setActive(id));
  }, []);

  return (
    <>
      <AdminTransitionScreen isVisible={isTransitioning} isAdmin={isAdmin} />
      <RtsDomainBootstrap />
      <TooltipProvider>
        <Toaster />
        <Router />
        <GrudgeAI />
        <GrudgeTruthBadge />
        <GrudgeTokenWidget />
        <PuterFooter />
      </TooltipProvider>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AdminProvider>
          <LoginModal />
          <AppContent />
        </AdminProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
