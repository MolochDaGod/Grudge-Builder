
  window.GRUDGE_CONFIG = {
    // Auth SSOT = id only (never auth.* / never apex as login host)
    AUTH_GATEWAY: 'https://id.grudge-studio.com',
    IDENTITY_API: 'https://id.grudge-studio.com',
    // Railway Postgres — SAME DB as Warlords / GCS account characters (never Puter KV as SSOT)
    GAME_DATA: 'https://grudge-api-production-0d46.up.railway.app',
    // Definitions: info.grudge-studio.com is live SSOT (objectstore recipe paths 404)
    INFO_URL: 'https://info.grudge-studio.com/api/v1',
    OBJECTSTORE_URL: 'https://info.grudge-studio.com/api/v1',
    // Icons: pack weapons on assets CDN (reliable); skills on info
    ASSETS: 'https://assets.grudge-studio.com',
    INFO_ORIGIN: 'https://info.grudge-studio.com',
    VERSION: '5.10.1',
    WCS_URL: 'https://wcs.grudge-studio.com',
    // Full suite also embeds from main-panel Quick Craft tab
    MAIN_PANEL_URL: 'https://ui.grudge-studio.com/main-panel.html?era=warlords&tab=craft',
    // Local skill-tree.html / weaponmastery.html are NOT deployed on puter.site (404).
    // Use production Warlords pages with SSO hash handoff.
    SKILL_TREE_URL: 'https://grudgewarlords.com/skill-tree.html',
    WEAPON_MASTERY_URL: 'https://grudgewarlords.com/weaponmastery.html',
    // Inventory is account-shared on Railway; progress is per character UUID on Railway
    INVENTORY_SCOPE: 'account',
    PROGRESS_SCOPE: 'character',
    PLAYER_STATE_SSOT: 'railway',
    // Browse definitions without login; only craft/gather mutates require Grudge ID
    REQUIRE_LOGIN_TO_BROWSE: false,
  };
