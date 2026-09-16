export {
  FLEET_URLS,
  THE_ENGINE_RAILWAY,
  IDENTITY_PORTAL,
  IDENTITY_ACCOUNTS_API,
  FLEET_SERVICES,
  FLEET_VERCEL_REWRITES,
  FLEET_SPA_AUTH_REWRITES,
  FLEET_SATELLITE_VERCEL_REWRITES,
  FLEET_GAME_DATA_API_PREFIXES,
  buildFleetGameDataRewrites,
  buildFleetAuthProxyRewrites,
  buildFleetHubAuthRewrites,
  buildFleetSatelliteRewrites,
  CROSSMINT_COLLECTIONS,
  type FleetService,
  type FleetServiceRole,
  type FleetRewrite,
} from "./manifest";

export {
  isFleetAllowedReturnUrl,
  resolveFleetReturnUrl,
  isEphemeralVercelHost,
  canonicalSsoReturnOrigin,
} from "./authReturn";

/** Warlords / Nexus era hosts (grudge.studio + grudgewarlords.com) */
export {
  FLEET_AUTH_TOKEN_KEYS as WARLORDS_AUTH_TOKEN_KEYS,
  FLEET_OPEN_TOKEN_KEY,
  FLEET_AUTH_TOKEN_READ_FALLBACK,
} from "./tokenKeys";

/** Warlords era *.grudgewarlords.com product zone */
export {
  WARLORDS_APEX,
  WARLORDS_ERA_HOST,
  WARLORDS_ERA_URL,
  WARLORDS_PLAY_HOST,
  WARLORDS_PLAY_URL,
  WARLORDS_CLIENT_STUDIO,
  NEXUS_ERA_HOST,
  NEXUS_ERA_URL,
  NEXUS_HEROES_INTERIM,
  GRUDGE_STUDIO_HUB,
  WARLORDS_SUBDOMAINS,
  WARLORDS_HOST_PATH,
  WARLORDS_CRAFT_PATH,
  WARLORDS_CRAFT_URL,
  warlordsPlayOrigin,
  warlordsPlayUrl,
  nexusPlayOrigin,
  nexusHeroesUrl,
  warlordsFoundryUrl,
  warlordsDefaultReturnTo,
  warlordsAirshipUrl,
  warlordsZoneUrl,
  isWarlordsPlayHost,
  isNexusPlayHost,
  isGrudgeStudioHubHost,
  isStudioPlatformHost,
  type WarlordsSubdomainKey,
} from "./warlordsDomains";

export {
  STEAM_APP_ID,
  STEAM_DEPOT_WINDOWS,
  STEAM_URLS,
  STEAM_FLEET_NOTES,
  resolveSteamAppId,
} from "./steam";

export {
  FLEET_GAME_ORIGINS,
  PRODUCTION_DEPLOYMENT_PATH,
  HOME_GAME_MODES,
  WARLORDS_HOME_ACTIONS,
  WARLORDS_OCEAN_PATH,
  WARLORDS_LOBBY_PATH,
  WARLORDS_2D_PLAY_PATH,
  WARLORDS_DUNGEON_ORIGIN,
  warlordsDungeonPlayUrl,
  DUNGEON_PREFABS,
  DUNGEON_CLASS_IDS,
  DUNGEON_CLASS_LABEL,
  DUNGEON_FILL,
  normalizeDungeonClassId,
  dungeonFillClasses,
  dungeonAllyRaces,
  type DungeonClassId,
  type DungeonAllySlot,
  type WarlordsDungeonPlayOpts,
  deploymentUrl,
  threeHomeIslandUrl,
  threeOpenWorldUrl,
  threePlayNowPath,
  THREE_HOME_ISLAND_PATH,
  THREE_WORLD_MAP_PATH,
  THREE_OPEN_WORLD_PATH,
  THREE_EMBER_SPIRE_PATH,
  THREE_PORT_PLAY_URL,
  THREE_DEPLOY_PATH_IDS,
  type FleetGameId,
  type DeploymentStage,
  type GameDeployment,
} from "./gameDeployments";

export {
  FLEET_AUTH_GATEWAY,
  FLEET_AUTH_IMPLEMENTATION,
  FLEET_AUTH_DEPRECATED_API,
  FLEET_AUTH_TOKEN_KEYS,
  FLEET_AUTH_PROFILE_KEYS,
  clearFleetAuthTokens,
  readFleetAuthToken,
  FLEET_AUTH_RETURN_PARAMS,
  FLEET_AUTH_WIRING_GUIDE,
  FLEET_AUTH_PROXY_PATHS,
  FLEET_AUTH_RAILWAY_ROUTES,
  buildFleetLoginUrl,
  buildFleetSsoCheckUrl,
  buildFleetAuthCallback,
  buildFleetAuthLoginUrl,
  buildAuthConnectProbes,
  probeAuthConnectEndpoint,
  runAuthConnectAudit,
  FLEET_AUTH_SYMPTOM_FIXES,
  matchAuthSymptoms,
  type AuthConnectProbeSpec,
  type AuthConnectProbeResult,
  type AuthSymptomFix,
} from "./authConnect";

export { FLEET_STORAGE, FLEET_CLIENT_ENV, FLEET_SERVER_SECRET_KEYS } from "./storage";

export {
  IDENTITY_GATEWAY,
  IDENTITY_IMPLEMENTATION,
  FLEET_GAME_DATA_SERVICES,
  GAME_API_REQUIRED_ENV,
  GAME_API_RECOMMENDED_ENV,
  DEFAULT_IDENTITY_URL,
  GAME_DB_PLAYER_COLUMNS_SQL,
  type GameDataProductId,
  type GameDataServiceSpec,
  type GrudgeIdTokenClaims,
} from "./gameDataContract";

export { FLEET_VIDEO_CATALOG, type FleetVideoEntry } from "./videoCatalog";

export { GBUX_TOKEN_ICON, GBUX_TOKEN_ICON_PATH, TOME_ICON_PATHS, tomeIconCdnUrl } from "./uiIcons";

export {
  FLEET_FONTS,
  FLEET_FONT_DEFAULTS,
  KAPH_FONT_CSS_URL,
  buildKaphFontFaceCss,
  getFleetFontById,
  getFleetFontStack,
  kaphFontFileUrl,
  type FleetFontOption,
  type FleetFontFace,
  type FleetFontSource,
} from "./fonts";

export {
  GRUDGE_TRUTH_LAYERS,
  TRUTH_PROBE_SPECS,
  TRUTH_DEPRECATED_HOSTS,
  buildTruthProbes,
  probeTruthEndpoint,
  runTruthAudit,
  detectSplitBrain,
  scoreTruthProbes,
  resolveProbeUrl,
  type TruthProbe,
  type TruthProbeRole,
  type TruthProbeSpec,
  type TruthProbeMode,
} from "./truthProbes";

export {
  UI_ART_FALLBACK,
  CHARACTER_VIEWER_TOKENS,
  getUiArt,
  getUiArtRegistry,
  setUiArtRegistry,
  getRacePortraitUrl,
  WARLORDS_RACE_PORTRAIT_PATHS,
  getClassHeroUrl,
  getClassAccentColor,
  getPanelParchmentUrl,
  getCombatClassBackgroundUrl,
  getCombatClassBackgroundKey,
  type UiArtRegistry,
  type UiRaceId,
  type UiClassId,
  type UiArtViewerTokens,
} from "./uiArt";

export {
  WARLORDS_PLAY_CONTRACT_VERSION,
  RACE_GRUDGE6,
  RACE_TOON_RTS_PATHS,
  RACE_FBX_PATHS,
  normalizeRaceId,
  raceMeshPrefix,
  defaultModel3d,
  model3dFromEquipped,
  panelEquipmentToModel3d,
  grudaItemToMesh,
  tierToVariant,
  weaponTypeFromModel3d,
  splitEquippedSlots,
  resolveRaceCdnUrl,
  resolveFbxPath,
  characterToJoinOptions,
  type Model3DField,
  type Grudge6RaceConfig,
  type PanelEquipment,
  type PanelEquipmentSlot,
} from "./character";

/** Toon Soldiers (chicken_gun) — Nexus Era / Hero RTS / shooters */
export {
  TOON_SOLDIERS_CDN,
  TOON_SOLDIERS_CATALOG_URL,
  TOON_SOLDIERS,
  TOON_SOLDIER_BY_ID,
  TOON_CLASS_DEFAULT,
  FACTION_TOON_HERO,
  TOON_GUNPLAY_PACKS,
  resolveToonMesh,
  type ToonSoldierClass,
  type ToonAnimPack,
  type ToonSoldierDef,
} from "./toonSoldiers";

/** uMMORPG vehicles — mounts + catapult / bolt-thrower */
export {
  UMMORPG_VEHICLES_CATALOG_URL,
  RACE_VEHICLES,
  resolveVehicleMesh,
  listSiegeDeployables,
  listMountDeployables,
  type VehicleRaceId,
  type SiegeKind,
  type RaceVehicles,
  type MountDef,
  type SiegeDef,
} from "./vehicles";

/** Warlords MMO host contract — grudgewarlords.com only */
export {
  WARLORDS_MMO_HOST,
  WARLORDS_MMO_CONTRACT,
  WARLORDS_MMO_ROUTES,
  WARLORDS_MMO_MAP_FAMILIES,
  WARLORDS_MMO_CATALOGS,
  WARLORDS_MMO_KEYS,
  WARLORDS_MMO_NOT_HOST,
  CHARACTER_HEIGHT_M,
  BUILDING_HEIGHT_M,
  HOME_ISLAND_DIAMETER_M,
  catalogUrls,
  isWarlordsMmoPlayPath,
} from "./warlordsMmoDeploy";
