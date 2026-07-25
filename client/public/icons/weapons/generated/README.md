# Mesh-true weapon icons

Place pre-baked icons here as `{prefabId}.png` (e.g. `sword_style_copper.png`).

**Policy:** Cool / fancy weapon meshes are fine. The icon **must** be a render of
that actual weapon mesh — not a generic pack plate.

## How to generate

1. **Dev UI (browser):** start client, open `/generate-equipment-icons.html`
2. **Runtime:** `generateEquipmentIconFromUrl(meshUrl, { prefabId })` or
   equip with `applyToWeapon(root, { prefabId })` which caches a product shot
3. **Warm inventory:** `warmGenerateIconsForType('SWORD')` / `warmGenerateAllReadyIcons()`

Session-generated icons live in memory + `sessionStorage` (`eq_icon_{prefabId}`).
Prebake files here win for cold start (no WebGL flash).
