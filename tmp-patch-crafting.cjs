const fs = require('fs');
const path = 'F:/GitHub/GrudgeBuilder/client/public/grudge-crafting.html';
let c = fs.readFileSync(path, 'utf8');

// Fix common mojibake
c = c.replace(/\u00e2\u20ac\u201d/g, '—')
     .replace(/\u00e2\u20ac\u00a6/g, '…')
     .replace(/\u00e2\u20ac\u201c/g, '—')
     .replace(/\u00c2\u00b7/g, '·')
     .replace(/â€”/g, '—')
     .replace(/â€¦/g, '…')
     .replace(/â€“/g, '–')
     .replace(/Â·/g, '·');

const doSignInNew = `/** Build Grudge ID login URL that always returns here with sso_token. */
function buildCraftingLoginUrl(mode) {
  const gateway = (window.GRUDGE_CONFIG && GRUDGE_CONFIG.AUTH_GATEWAY) || 'https://id.grudge-studio.com';
  let ret = window.location.origin + window.location.pathname;
  try {
    const u = new URL(window.location.href);
    ['token', 'sso_token', 'jwt', 'access_token', 'grudge_token', 'launch_token',
      'grudge_id', 'grudgeId', 'username', 'grudge_username'].forEach((k) => u.searchParams.delete(k));
    ret = u.origin + u.pathname + (u.search || '');
  } catch (e) { /* keep ret */ }
  const q = new URLSearchParams();
  q.set('redirect_uri', ret);
  q.set('redirect', ret);
  if (mode === 'register') q.set('mode', 'register');
  return gateway.replace(/\\/$/, '') + '/login?' + q.toString();
}

async function doSignIn() {
  try {
    const hasToken =
      (typeof GrudgeFleet !== 'undefined' && GrudgeFleet.isLoggedIn && GrudgeFleet.isLoggedIn()) ||
      !!(localStorage.getItem('grudge_auth_token') || localStorage.getItem('grudge_session_token'));

    if (hasToken && typeof GrudgeFleet !== 'undefined') {
      try {
        if (typeof GrudgeFleet.syncFromBackend === 'function') await GrudgeFleet.syncFromBackend();
      } catch (e) { /* ignore */ }
      await fetchGrudgeCharacters();
      const chars = getOwnedCharacters();
      if (chars.length === 1 && !getActiveOwnedCharacterId()) {
        try { await selectCharacter(chars[0].id); } catch (e) { console.warn(e); }
      }
      updateAuthUI();
      updateAccessGate();
      if (chars.length > 0) {
        showToast('Signed in — ' + chars.length + ' hero' + (chars.length === 1 ? '' : 'es') + ' loaded', 'success');
        return;
      }
      if (confirm('This Grudge account has no Warlords heroes.\\n\\nOpen character create?')) {
        window.open('https://character.grudge-studio.com/?era=warlords&mode=create&returnTo=' +
          encodeURIComponent(window.location.href), '_blank', 'noopener');
      }
      return;
    }

    showToast('Redirecting to Grudge ID…', 'success');
    if (typeof GrudgeFleet !== 'undefined' && typeof GrudgeFleet.signIn === 'function') {
      try {
        await GrudgeFleet.signIn({
          mode: 'grudge-id',
          returnUrl: window.location.origin + window.location.pathname,
        });
        return;
      } catch (e) {
        console.warn('[doSignIn] fleet.signIn failed, hard redirect', e);
      }
    }
    window.location.href = buildCraftingLoginUrl();
  } catch (e) {
    console.error(e);
    showToast('Sign in failed — opening Grudge ID…', 'error');
    window.location.href = buildCraftingLoginUrl();
  }
}`;

// Replace doSignIn function body block
c = c.replace(
  /async function doSignIn\(\) \{[\s\S]*?\n\}\n\n\/\*\* Alias for older onclick handlers \*\//,
  doSignInNew + '\n\n/** Alias for older onclick handlers */'
);

const doCreateNew = `function doCreateAccount() {
  try {
    showToast('Opening create account…', 'success');
    if (typeof GrudgeFleet !== 'undefined' && typeof GrudgeFleet.createAccount === 'function') {
      try {
        GrudgeFleet.createAccount(window.location.origin + window.location.pathname);
        return;
      } catch (e) { console.warn(e); }
    }
    window.location.href = buildCraftingLoginUrl('register');
  } catch (e) {
    console.error(e);
    window.location.href = buildCraftingLoginUrl('register');
  }
}`;

c = c.replace(
  /function doCreateAccount\(\) \{[\s\S]*?\n\}\n\n\/\*\* Sign out current grudge_id/,
  doCreateNew + '\n\n/** Sign out current grudge_id'
);

// Inject syncTopBar + rewrite updateAuthUI
const updateAuthNew = `function updateAuthUI() {
  const dot = document.getElementById('acctDot');
  const name = document.getElementById('acctName');
  const sub = document.getElementById('acctSub');
  const btn = document.getElementById('authBtn');
  const btnSignIn = document.getElementById('btnSignIn');
  const btnCreate = document.getElementById('btnCreateAccount');
  const btnSwitch = document.getElementById('btnSwitchAccount');
  const btnOut = document.getElementById('btnSignOut');
  const fleetUser = (typeof GrudgeFleet !== 'undefined' && GrudgeFleet.getUser) ? GrudgeFleet.getUser() : null;
  const gid = (typeof GrudgeFleet !== 'undefined' && GrudgeFleet.getGrudgeId)
    ? GrudgeFleet.getGrudgeId()
    : (fleetUser?.grudgeId || localStorage.getItem('grudge_id') || '');
  const displayName =
    fleetUser?.username || fleetUser?.displayName ||
    localStorage.getItem('grudge_username') || STATE.user?.username || '';
  const loggedIn =
    (typeof GrudgeFleet !== 'undefined' && GrudgeFleet.isLoggedIn && GrudgeFleet.isLoggedIn()) ||
    !!(localStorage.getItem('grudge_auth_token') || localStorage.getItem('grudge_session_token'));
  const chars = (typeof getOwnedCharacters === 'function') ? getOwnedCharacters() : [];
  const charCount = chars.length;
  const ready = typeof isAccessReady === 'function' ? isAccessReady() : false;
  const activeId = typeof getActiveOwnedCharacterId === 'function' ? getActiveOwnedCharacterId() : null;
  const activeChar = chars.find((c) => String(c.id) === String(activeId));

  if (typeof syncTopBar === 'function') {
    syncTopBar({ loggedIn, displayName, gid, charCount, ready, chars, activeId, activeChar });
  }

  if (loggedIn) {
    if (dot) dot.classList.add('on');
    if (name) name.textContent = displayName || (charCount ? 'Account' : 'Account (no chars)');
    if (sub) {
      sub.textContent = gid
        ? (gid.length > 18 ? gid.slice(0, 16) + '…' : gid)
        : (charCount + ' hero' + (charCount === 1 ? '' : 'es') + ' · era warlords');
      sub.title = gid || '';
    }
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Switch';
      btn.title = 'Switch Grudge account';
      btn.onclick = function () { doSwitchAccount(); };
    }
    if (btnSignIn) btnSignIn.hidden = true;
    if (btnCreate) btnCreate.hidden = true;
    if (btnSwitch) btnSwitch.hidden = false;
    if (btnOut) btnOut.hidden = false;
  } else {
    if (dot) dot.classList.remove('on');
    if (name) name.textContent = 'Not signed in';
    if (sub) { sub.textContent = 'Grudge ID required'; sub.title = ''; }
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Sign In';
      btn.title = 'Sign in with Grudge ID';
      btn.onclick = function () { doSignIn(); };
    }
    if (btnSignIn) btnSignIn.hidden = false;
    if (btnCreate) btnCreate.hidden = false;
    if (btnSwitch) btnSwitch.hidden = true;
    if (btnOut) btnOut.hidden = true;
  }
  updateAccessGate();
}

/** Sticky top bar: account name + character dropdown + auth buttons */
function syncTopBar(s) {
  const topDot = document.getElementById('topDot');
  const topName = document.getElementById('topAcctName');
  const topSub = document.getElementById('topAcctSub');
  const topScope = document.getElementById('topScope');
  const sel = document.getElementById('topCharSelect');
  const bIn = document.getElementById('topBtnSignIn');
  const bCreate = document.getElementById('topBtnCreate');
  const bSwitch = document.getElementById('topBtnSwitch');
  const bOut = document.getElementById('topBtnOut');

  if (topDot) topDot.classList.toggle('on', !!s.loggedIn);
  if (topName) topName.textContent = s.loggedIn ? (s.displayName || 'Grudge Account') : 'Not signed in';
  if (topSub) {
    if (!s.loggedIn) topSub.textContent = 'Sign in with Grudge ID to load heroes';
    else if (!s.charCount) topSub.textContent = (s.gid ? String(s.gid).slice(0, 20) + '… · ' : '') + 'No Warlords heroes yet';
    else if (s.activeChar) {
      topSub.textContent =
        (s.activeChar.name || 'Hero') + ' · ' +
        (s.activeChar.raceId || s.activeChar.race || '') + ' ' +
        (s.activeChar.classId || s.activeChar.class || '') +
        ' · bag SHARED · XP PER CHAR';
    } else {
      topSub.textContent = s.charCount + ' hero' + (s.charCount === 1 ? '' : 'es') + ' — select one to craft';
    }
    topSub.title = s.gid || '';
  }
  if (topScope) {
    if (s.ready) { topScope.textContent = 'READY'; topScope.className = 'topbar-scope ok'; }
    else if (s.loggedIn) {
      topScope.textContent = s.charCount ? 'PICK HERO' : 'NO HEROES';
      topScope.className = 'topbar-scope';
    } else { topScope.textContent = 'GUEST'; topScope.className = 'topbar-scope'; }
  }
  if (sel) {
    const prev = sel.value;
    sel.innerHTML = '';
    if (!s.loggedIn) {
      sel.disabled = true;
      sel.innerHTML = '<option value="">Sign in to load characters…</option>';
    } else if (!s.chars || !s.chars.length) {
      sel.disabled = true;
      sel.innerHTML = '<option value="">No Warlords characters — create one</option>';
    } else {
      sel.disabled = false;
      const opt0 = document.createElement('option');
      opt0.value = '';
      opt0.textContent = '— Select character —';
      sel.appendChild(opt0);
      for (const ch of s.chars) {
        const o = document.createElement('option');
        o.value = ch.id;
        const race = ch.raceId || ch.race || '';
        const cls = ch.classId || ch.class || '';
        o.textContent = (ch.name || 'Hero') + (race || cls ? (' (' + race + ' ' + cls + ')').trim() : '') + ' · Lv ' + (ch.level || 1);
        sel.appendChild(o);
      }
      const want = s.activeId || prev || '';
      if (want && [...sel.options].some((o) => o.value === String(want))) sel.value = String(want);
    }
    if (!sel.dataset.bound) {
      sel.dataset.bound = '1';
      sel.addEventListener('change', function () {
        const id = sel.value;
        if (id) selectCharacter(id);
      });
    }
  }
  if (bIn) bIn.hidden = !!s.loggedIn;
  if (bCreate) bCreate.hidden = !!s.loggedIn;
  if (bSwitch) bSwitch.hidden = !s.loggedIn;
  if (bOut) bOut.hidden = !s.loggedIn;
}

function applyCharacterToState_PLACEHOLDER_DO_NOT_USE() {}`;

// Only replace updateAuthUI through end of function before applyCharacterToState
c = c.replace(
  /function updateAuthUI\(\) \{[\s\S]*?\n\}\n\nfunction applyCharacterToState/,
  updateAuthNew.replace(/\nfunction applyCharacterToState_PLACEHOLDER_DO_NOT_USE\(\) \{\}\n?/, '') + '\n\nfunction applyCharacterToState'
);

// Patch checkAuth for auto-select + topbar
c = c.replace(
  `async function checkAuth() {
  try {
    updateAccessGate();
    const embedded = window.parent !== window;
    // init picks up ?sso_token= (preferred) / ?grudge_token= and loads Railway JWT
    await GrudgeFleet.init({ mode: embedded ? 'embedded' : 'standalone' });
    // Restore existing JWT only — do NOT silent-mint puter guests (empty roster trap)
    if (!GrudgeFleet.isLoggedIn()) {
      await GrudgeFleet.ensureSession({ allowPuterGuest: false });
    }
    if (GrudgeFleet.isLoggedIn()) await GrudgeFleet.syncFromBackend();
    await refreshFleetState();
    // After SSO: only enter suite when an owned character is selected
    if (GrudgeFleet.isLoggedIn()) {
      if (typeof renderAll === 'function') renderAll();
      const n = (GrudgeFleet.getCharacters() || []).length;
      if (isAccessReady()) {
        try {
          if (typeof navigate === 'function') navigate('dashboard');
        } catch { /* panel optional */ }
        showToast('Ready — crafting as active character', 'success');
      } else if (n > 0) {
        showToast('Select a character to unlock crafting', 'error');
      } else {
        showToast('Signed in — no Warlords characters on this account yet', 'error');
      }
    }
    updateAccessGate();`,
  `async function checkAuth() {
  try {
    updateAccessGate();
    updateAuthUI();
    const embedded = window.parent !== window;
    // init picks up ?sso_token= (earlySsoCapture already wrote JWT to localStorage)
    await GrudgeFleet.init({ mode: embedded ? 'embedded' : 'standalone' });
    try {
      const pending = sessionStorage.getItem('grudge_pending_launch_token');
      if (pending && !GrudgeFleet.isLoggedIn() && typeof GrudgeFleet.bridgeGrudgeLaunchToken === 'function') {
        await GrudgeFleet.bridgeGrudgeLaunchToken(pending);
        sessionStorage.removeItem('grudge_pending_launch_token');
      }
    } catch (e) { /* optional */ }
    if (!GrudgeFleet.isLoggedIn()) {
      await GrudgeFleet.ensureSession({ allowPuterGuest: false });
    }
    if (GrudgeFleet.isLoggedIn()) await GrudgeFleet.syncFromBackend();
    await refreshFleetState();
    const chars = getOwnedCharacters();
    if (GrudgeFleet.isLoggedIn() && chars.length === 1 && !getActiveOwnedCharacterId()) {
      try { await selectCharacter(chars[0].id); } catch (e) { console.warn(e); }
    }
    if (GrudgeFleet.isLoggedIn()) {
      if (typeof renderAll === 'function') renderAll();
      const n = getOwnedCharacters().length;
      updateAuthUI();
      if (isAccessReady()) {
        try {
          if (typeof navigate === 'function') navigate('dashboard');
        } catch { /* panel optional */ }
        const ac = getOwnedCharacters().find((x) => String(x.id) === String(getActiveOwnedCharacterId()));
        showToast('Ready — ' + (ac?.name || 'hero') + ' active · bag SHARED · XP PER CHAR', 'success');
      } else if (n > 0) {
        showToast('Select a character in the top bar to craft', 'error');
        try { navigate('account'); } catch (e) { /* ok */ }
      } else {
        showToast('Signed in — create a Warlords hero, then refresh', 'error');
      }
    }
    updateAuthUI();
    updateAccessGate();`
);

// Also fix checkAuth with mojibake variants if first replace failed
if (!c.includes('earlySsoCapture already wrote JWT')) {
  c = c.replace(
    /async function checkAuth\(\) \{[\s\S]*?updateAccessGate\(\);\n    \/\/ Keep UI in sync when character changes/,
    `async function checkAuth() {
  try {
    updateAccessGate();
    updateAuthUI();
    const embedded = window.parent !== window;
    await GrudgeFleet.init({ mode: embedded ? 'embedded' : 'standalone' });
    try {
      const pending = sessionStorage.getItem('grudge_pending_launch_token');
      if (pending && !GrudgeFleet.isLoggedIn() && typeof GrudgeFleet.bridgeGrudgeLaunchToken === 'function') {
        await GrudgeFleet.bridgeGrudgeLaunchToken(pending);
        sessionStorage.removeItem('grudge_pending_launch_token');
      }
    } catch (e) {}
    if (!GrudgeFleet.isLoggedIn()) {
      await GrudgeFleet.ensureSession({ allowPuterGuest: false });
    }
    if (GrudgeFleet.isLoggedIn()) await GrudgeFleet.syncFromBackend();
    await refreshFleetState();
    const chars0 = getOwnedCharacters();
    if (GrudgeFleet.isLoggedIn() && chars0.length === 1 && !getActiveOwnedCharacterId()) {
      try { await selectCharacter(chars0[0].id); } catch (e) {}
    }
    if (GrudgeFleet.isLoggedIn()) {
      if (typeof renderAll === 'function') renderAll();
      const n = getOwnedCharacters().length;
      updateAuthUI();
      if (isAccessReady()) {
        try { if (typeof navigate === 'function') navigate('dashboard'); } catch (e) {}
        showToast('Ready — crafting as active character · bag SHARED', 'success');
      } else if (n > 0) {
        showToast('Select a character in the top bar to craft', 'error');
        try { navigate('account'); } catch (e) {}
      } else {
        showToast('Signed in — no Warlords characters on this account yet', 'error');
      }
    }
    updateAuthUI();
    updateAccessGate();
    // Keep UI in sync when character changes`
  );
}

// Ensure VERSION 5.10.0
c = c.replace(/VERSION:\s*'5\.9\.\d+'/, "VERSION: '5.10.0'");

// Soft-auth banner message clarify
c = c.replace(
  'Browse recipes freely. Sign in with Grudge ID to craft and sync bag/XP.',
  'Recipes free. Sign in → pick a character (top bar). Bag & recipes shared; profession XP is per character.'
);

// selectCharacter should refresh top bar
if (!c.includes('updateAuthUI();') || true) {
  c = c.replace(
    /showToast\(c \? `\$\{c\.name\} selected[^\`]*` : 'Character selected!', 'success'\);/,
    `updateAuthUI();\n  showToast(c ? c.name + ' selected — professions for this hero' : 'Character selected!', 'success');`
  );
}

fs.writeFileSync(path, c, 'utf8');
console.log('patched', path, 'len', c.length);
console.log('has buildCraftingLoginUrl', c.includes('buildCraftingLoginUrl'));
console.log('has syncTopBar', c.includes('function syncTopBar'));
console.log('has topbar html', c.includes('id="topCharSelect"'));
console.log('VERSION', (c.match(/VERSION:\s*'([^']+)'/)||[])[1]);
