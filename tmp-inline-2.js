
(function () {
  window.__grudgeNoReferrerIcons = true;
  // CDN hotlink WAF: Referer from *.puter.site => 403. Never send referrer for images.
  function fix(img) {
    try {
      if (!img || img.tagName !== 'IMG') return;
      img.setAttribute('referrerpolicy', 'no-referrer');
      img.referrerPolicy = 'no-referrer';
    } catch (e) {}
  }
  function scan(root) {
    if (!root) return;
    if (root.tagName === 'IMG') fix(root);
    if (root.querySelectorAll) root.querySelectorAll('img').forEach(fix);
  }
  function bootScan() { scan(document); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootScan);
  else bootScan();
  try {
    var mo = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var nodes = muts[i].addedNodes;
        for (var j = 0; j < nodes.length; j++) scan(nodes[j]);
      }
    });
    mo.observe(document.documentElement || document.body, { childList: true, subtree: true });
  } catch (e) {}
  document.addEventListener('error', function (e) {
    var t = e.target;
    if (!t || t.tagName !== 'IMG') return;
    fix(t);
    var src = t.getAttribute('src') || '';
    if (t.dataset.gfb === '2') { t.style.opacity = '0.4'; return; }
    if (t.dataset.gfb === '1') {
      t.dataset.gfb = '2';
      t.src = 'https://assets.grudge-studio.com/icons/pack/misc/Effect.png';
      return;
    }
    t.dataset.gfb = '1';
    // Retry once with cache-buster after no-referrer (prior 403 may be cached)
    if (/info\.grudge-studio\.com\/icons\/pack\//i.test(src)) {
      t.src = src.replace(/https?:\/\/info\.grudge-studio\.com/i, 'https://assets.grudge-studio.com').split('?')[0] + '?nr=1';
    } else if (/assets\.grudge-studio\.com\/icons\/skills\//i.test(src)) {
      t.src = src.replace(/https?:\/\/assets\.grudge-studio\.com/i, 'https://info.grudge-studio.com').split('?')[0] + '?nr=1';
    } else {
      t.src = src.split('?')[0] + '?nr=1';
    }
  }, true);
})();
