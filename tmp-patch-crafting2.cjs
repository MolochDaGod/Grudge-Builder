const fs = require('fs');
const path = 'F:/GitHub/GrudgeBuilder/client/public/grudge-crafting.html';
let c = fs.readFileSync(path, 'utf8');
const nl = c.includes('\r\n') ? '\r\n' : '\n';

function replaceFunc(src, startMarker, endMarker, replacement) {
  const a = src.indexOf(startMarker);
  if (a < 0) {
    console.log('MISSING start', startMarker.slice(0, 50));
    return src;
  }
  const b = src.indexOf(endMarker, a + startMarker.length);
  if (b < 0) {
    console.log('MISSING end', endMarker.slice(0, 50));
    return src;
  }
  console.log('OK replace', startMarker.slice(0, 28), 'len', b - a);
  return src.slice(0, a) + replacement + src.slice(b);
}

const doSignInNew = [
  '/** Build Grudge ID login URL that always returns here with sso_token. */',
  'function buildCraftingLoginUrl(mode) {',
  "  const gateway = (window.GRUDGE_CONFIG && GRUDGE_CONFIG.AUTH_GATEWAY) || 'https://id.grudge-studio.com';",
  '  let ret = window.location.origin + window.location.pathname;',
  '  try {',
  '    const u = new URL(window.location.href);',
  "    ['token','sso_token','jwt','access_token','grudge_token','launch_token','grudge_id','grudgeId','username','grudge_username'].forEach((k) => u.searchParams.delete(k));",
  "    ret = u.origin + u.pathname + (u.search || '');",
  '  } catch (e) {}',
  '  const q = new URLSearchParams();',
  "  q.set('redirect_uri', ret);",
  "  q.set('redirect', ret);",
  "  if (mode === 'register') q.set('mode', 'register');",
  "  return gateway.replace(/\\/$/, '') + '/login?' + q.toString();",
  '}',
  '',
  'async function doSignIn() {',
  '  try {',
  '    const hasToken =',
  "      (typeof GrudgeFleet !== 'undefined' && GrudgeFleet.isLoggedIn && GrudgeFleet.isLoggedIn()) ||",
  "      !!(localStorage.getItem('grudge_auth_token') || localStorage.getItem('grudge_session_token'));",
  '',
  "    if (hasToken && typeof GrudgeFleet !== 'undefined') {",
  "      try { if (typeof GrudgeFleet.syncFromBackend === 'function') await GrudgeFleet.syncFromBackend(); } catch (e) {}",
  '      await fetchGrudgeCharacters();',
  '      const chars = getOwnedCharacters();',
  '      if (chars.length === 1 && !getActiveOwnedCharacterId()) {',
  '        try { await selectCharacter(chars[0].id); } catch (e) { console.warn(e); }',
  '      }',
  '      updateAuthUI();',
  '      updateAccessGate();',
  '      if (chars.length > 0) {',
  "        showToast('Signed in — ' + chars.length + ' hero' + (chars.length === 1 ? '' : 'es') + ' loaded', 'success');",
  '        return;',
  '      }',
  "      if (confirm('This Grudge account has no Warlords heroes.\\n\\nOpen character create?')) {",
  "        window.open('https://character.grudge-studio.com/?era=warlords&mode=create&returnTo=' + encodeURIComponent(window.location.href), '_blank', 'noopener');",
  '      }',
  '      return;',
  '    }',
  '',
  "    showToast('Redirecting to Grudge ID…', 'success');",
  "    if (typeof GrudgeFleet !== 'undefined' && typeof GrudgeFleet.signIn === 'function') {",
  '      try {',
  "        await GrudgeFleet.signIn({ mode: 'grudge-id', returnUrl: window.location.origin + window.location.pathname });",
  '        return;',
  "      } catch (e) { console.warn('[doSignIn] fleet.signIn failed', e); }",
  '    }',
  '    window.location.href = buildCraftingLoginUrl();',
  '  } catch (e) {',
  '    console.error(e);',
  "    showToast('Sign in failed — opening Grudge ID…', 'error');",
  '    window.location.href = buildCraftingLoginUrl();',
  '  }',
  '}',
].join(nl);

c = replaceFunc(
  c,
  'async function doSignIn() {',
  '/** Alias for older onclick handlers */',
  doSignInNew + nl + nl + '/** Alias for older onclick handlers */',
);

const doCreateNew = [
  'function doCreateAccount() {',
  '  try {',
  "    showToast('Opening create account…', 'success');",
  "    if (typeof GrudgeFleet !== 'undefined' && typeof GrudgeFleet.createAccount === 'function') {",
  '      try {',
  '        GrudgeFleet.createAccount(window.location.origin + window.location.pathname);',
  '        return;',
  '      } catch (e) { console.warn(e); }',
  '    }',
  "    window.location.href = buildCraftingLoginUrl('register');",
  '  } catch (e) {',
  '    console.error(e);',
  "    window.location.href = buildCraftingLoginUrl('register');",
  '  }',
  '}',
].join(nl);

c = replaceFunc(
  c,
  'function doCreateAccount() {',
  '/** Sign out current grudge_id',
  doCreateNew + nl + nl + '/** Sign out current grudge_id',
);

let snippet = fs.readFileSync('F:/GitHub/GrudgeBuilder/tmp-auth-ui-snippet.js', 'utf8');
snippet = snippet.replace(/\r?\n/g, nl).replace(/^\uFEFF/, '');
c = replaceFunc(
  c,
  'function updateAuthUI() {',
  'function applyCharacterToState(',
  snippet + nl + 'function applyCharacterToState(',
);

// Auto-select after refreshFleetState in checkAuth
const marker = 'await refreshFleetState();';
const ca = c.indexOf('async function checkAuth()');
const mi = c.indexOf(marker, ca);
if (mi > 0 && !c.includes('charsBoot')) {
  const inject =
    marker +
    nl +
    '    const charsBoot = getOwnedCharacters();' +
    nl +
    '    if (GrudgeFleet.isLoggedIn() && charsBoot.length === 1 && !getActiveOwnedCharacterId()) {' +
    nl +
    '      try { await selectCharacter(charsBoot[0].id); } catch (e) { console.warn(e); }' +
    nl +
    '    }' +
    nl +
    '    updateAuthUI();';
  c = c.slice(0, mi) + inject + c.slice(mi + marker.length);
  console.log('injected auto-select');
}

// selectCharacter toast -> also updateAuthUI
c = c.replace(
  /showToast\(c \? `\$\{c\.name\} selected[^`]*` : 'Character selected!', 'success'\);/g,
  "updateAuthUI();\r\n  showToast(c ? (c.name + ' selected — professions for this hero') : 'Character selected!', 'success');",
);

// Soft banner text
c = c.replace(
  'Browse recipes freely. Sign in with Grudge ID to craft and sync bag/XP.',
  'Recipes free. Sign in → pick a character (top bar). Bag & recipes SHARED; profession XP is PER CHARACTER.',
);

// Ensure VERSION
c = c.replace(/VERSION:\s*'5\.\d+\.\d+'/, "VERSION: '5.10.0'");

fs.writeFileSync(path, c, 'utf8');
console.log('has buildCraftingLoginUrl', c.includes('buildCraftingLoginUrl'));
console.log('has syncTopBar', c.includes('function syncTopBar'));
console.log('has topCharSelect', c.includes('id="topCharSelect"'));
console.log('has earlySso', c.includes('earlySsoCapture'));
console.log('VERSION', (c.match(/VERSION:\s*'([^']+)'/) || [])[1]);
