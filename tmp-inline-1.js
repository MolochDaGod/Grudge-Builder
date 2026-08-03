
(function earlySsoCapture() {
  try {
    var p = new URLSearchParams(location.search || '');
    var h = new URLSearchParams((location.hash || '').replace(/^#/, ''));
    function g(k) { return p.get(k) || h.get(k) || null; }
    var token = g('sso_token') || g('token') || g('jwt') || g('access_token');
    var launch = g('grudge_token') || g('launch_token');
    var gid = g('grudge_id') || g('grudgeId') || g('user_id');
    var un = g('grudge_username') || g('username');
    var charId = g('characterId') || g('char_id') || g('charId');
    if (token) {
      localStorage.setItem('grudge_auth_token', token);
      localStorage.setItem('grudge_session_token', token);
      localStorage.setItem('grudge_studio_session', token);
    }
    if (gid) {
      localStorage.setItem('grudge_id', gid);
      localStorage.setItem('grudge_account_id', gid);
      localStorage.setItem('grudge_user_id', gid);
    }
    if (un) localStorage.setItem('grudge_username', un);
    if (charId) {
      localStorage.setItem('grudge_active_character', charId);
      localStorage.setItem('grudge.activeCharId', charId);
      try {
        var aid = localStorage.getItem('grudge_account_id') || 'guest';
        localStorage.setItem('gruda_active_character_' + aid, charId);
      } catch (e) {}
    }
    // Stash launch token for fleet bridge
    if (launch && !token) {
      try { sessionStorage.setItem('grudge_pending_launch_token', launch); } catch (e) {}
    }
    window.__GRUDGE_EARLY_SSO = !!(token || launch);
  } catch (e) { console.warn('[earlySso]', e); }
})();
