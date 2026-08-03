function updateAuthUI() {
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
    : (fleetUser && fleetUser.grudgeId) || localStorage.getItem('grudge_id') || '';
  const displayName =
    (fleetUser && (fleetUser.username || fleetUser.displayName)) ||
    localStorage.getItem('grudge_username') ||
    (STATE.user && STATE.user.username) || '';
  const loggedIn =
    (typeof GrudgeFleet !== 'undefined' && GrudgeFleet.isLoggedIn && GrudgeFleet.isLoggedIn()) ||
    !!(localStorage.getItem('grudge_auth_token') || localStorage.getItem('grudge_session_token'));
  const chars = (typeof getOwnedCharacters === 'function') ? getOwnedCharacters() : [];
  const charCount = chars.length;
  const ready = typeof isAccessReady === 'function' ? isAccessReady() : false;
  const activeId = typeof getActiveOwnedCharacterId === 'function' ? getActiveOwnedCharacterId() : null;
  const activeChar = chars.find((x) => String(x.id) === String(activeId));
  if (typeof syncTopBar === 'function') {
    syncTopBar({ loggedIn: loggedIn, displayName: displayName, gid: gid, charCount: charCount, ready: ready, chars: chars, activeId: activeId, activeChar: activeChar });
  }
  if (loggedIn) {
    if (dot) dot.classList.add('on');
    if (name) name.textContent = displayName || (charCount ? 'Account' : 'Account (no chars)');
    if (sub) {
      sub.textContent = gid ? (gid.length > 18 ? gid.slice(0, 16) + '…' : gid) : (charCount + ' hero' + (charCount === 1 ? '' : 'es') + ' · era warlords');
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
      topSub.textContent = (s.activeChar.name || 'Hero') + ' · ' +
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
    else if (s.loggedIn) { topScope.textContent = s.charCount ? 'PICK HERO' : 'NO HEROES'; topScope.className = 'topbar-scope'; }
    else { topScope.textContent = 'GUEST'; topScope.className = 'topbar-scope'; }
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
      for (let i = 0; i < s.chars.length; i++) {
        const ch = s.chars[i];
        const o = document.createElement('option');
        o.value = ch.id;
        const race = ch.raceId || ch.race || '';
        const cls = ch.classId || ch.class || '';
        o.textContent = (ch.name || 'Hero') + (race || cls ? (' (' + race + ' ' + cls + ')').trim() : '') + ' · Lv ' + (ch.level || 1);
        sel.appendChild(o);
      }
      const want = s.activeId || prev || '';
      if (want) {
        for (let j = 0; j < sel.options.length; j++) {
          if (sel.options[j].value === String(want)) { sel.value = String(want); break; }
        }
      }
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
