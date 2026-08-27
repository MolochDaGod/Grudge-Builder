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

export {
  FLEET_AUTH_TOKEN_KEYS as WARLORDS_AUTH_TOKEN_KEYS,
  FLEET_OPEN_TOKEN_KEY,
  FLEET_AUTH_TOKEN_READ_FALLBACK,
} from "./tokenKeys";

/** Warlords era *.grudgewarlords.com product zone */
export {
  WARLORDS_APEX,
  WARLORDS_PLAY_HOST,
  WARLORDS_PLAY_URL,
  WARLORDS_CLIENT_STUDIO,
  WARLORDS_SUBDOMAINS,
  WARLORDS_HOST_PATH,
  WARLORDS_CRAFT_PATH,
  WARLORDS_CRAFT_URL,
  warlordsPlayOrigin,
  warlordsPlayUrl,
  warlordsFoundryUrl,
  warlordsDefaultReturnTo,
  warlordsAirshipUrl,
  warlordsZoneUrl,
  isWarlordsPlayHost,
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
