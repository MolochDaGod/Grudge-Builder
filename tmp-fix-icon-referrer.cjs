/**
 * Fix crafting icons broken on puter.site:
 * assets.grudge-studio.com / info.grudge-studio.com return 403 when
 * Referer is *.puter.site (CDN hotlink WAF). Empty referer = 200.
 * Solution: meta referrer=no-referrer + referrerpolicy on all imgs.
 */
const fs = require('fs');
const path = 'F:/GitHub/GrudgeBuilder/client/public/grudge-crafting.html';
let c = fs.readFileSync(path, 'utf8');
const nl = c.includes('\r\n') ? '\r\n' : '\n';

// 1) Document-wide: never send Referer (fixes CDN 403 from puter.site)
if (!/name=["']referrer["']/.test(c)) {
  c = c.replace('<head>', `<head>${nl}<meta name="referrer" content="no-referrer">`);
  console.log('added meta referrer=no-referrer');
}

// 2) Every static <img> gets referrerpolicy
let imgPatched = 0;
c = c.replace(/<img\b([^>]*?)>/gi, (full, attrs) => {
  if (/referrerpolicy=/i.test(attrs)) return full;
  imgPatched++;
  return `<img referrerpolicy="no-referrer"${attrs}>`;
});
console.log('static img referrerpolicy added:', imgPatched);

// 3) iconImgTag template — add referrerpolicy if missing
if (c.includes('function iconImgTag') && !c.includes('referrerpolicy="no-referrer" src="${safe}"')) {
  c = c.replace(
    'src="${safe}" alt="${alt}"',
    'referrerpolicy="no-referrer" src="${safe}" alt="${alt}"',
  );
  // alternate single-escape forms
  c = c.replace(
    'src="${safe}" alt="${alt}" loading="lazy"',
    'referrerpolicy="no-referrer" src="${safe}" alt="${alt}" loading="lazy"',
  );
  console.log('iconImgTag patched');
}

// 4) Runtime MutationObserver + error recovery (dynamic recipe icons)
if (!c.includes('__grudgeNoReferrerIcons')) {
  const boot = [
    '<script>',
    '(function () {',
    '  window.__grudgeNoReferrerIcons = true;',
    '  // CDN hotlink WAF: Referer from *.puter.site => 403. Never send referrer for images.',
    '  function fix(img) {',
    '    try {',
    "      if (!img || img.tagName !== 'IMG') return;",
    "      img.setAttribute('referrerpolicy', 'no-referrer');",
    "      img.referrerPolicy = 'no-referrer';",
    '    } catch (e) {}',
    '  }',
    "  function scan(root) {",
    "    if (!root) return;",
    "    if (root.tagName === 'IMG') fix(root);",
    "    if (root.querySelectorAll) root.querySelectorAll('img').forEach(fix);",
    '  }',
    '  function bootScan() { scan(document); }',
    "  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootScan);",
    '  else bootScan();',
    '  try {',
    '    var mo = new MutationObserver(function (muts) {',
    '      for (var i = 0; i < muts.length; i++) {',
    '        var nodes = muts[i].addedNodes;',
    '        for (var j = 0; j < nodes.length; j++) scan(nodes[j]);',
    '      }',
    '    });',
    "    mo.observe(document.documentElement || document.body, { childList: true, subtree: true });",
    '  } catch (e) {}',
    "  document.addEventListener('error', function (e) {",
    '    var t = e.target;',
    "    if (!t || t.tagName !== 'IMG') return;",
    '    fix(t);',
    "    var src = t.getAttribute('src') || '';",
    "    if (t.dataset.gfb === '2') { t.style.opacity = '0.4'; return; }",
    "    if (t.dataset.gfb === '1') {",
    "      t.dataset.gfb = '2';",
    "      t.src = 'https://assets.grudge-studio.com/icons/pack/misc/Effect.png';",
    '      return;',
    '    }',
    "    t.dataset.gfb = '1';",
    '    // Retry once with cache-buster after no-referrer (prior 403 may be cached)',
    "    if (/info\\.grudge-studio\\.com\\/icons\\/pack\\//i.test(src)) {",
    "      t.src = src.replace(/https?:\\/\\/info\\.grudge-studio\\.com/i, 'https://assets.grudge-studio.com').split('?')[0] + '?nr=1';",
    "    } else if (/assets\\.grudge-studio\\.com\\/icons\\/skills\\//i.test(src)) {",
    "      t.src = src.replace(/https?:\\/\\/assets\\.grudge-studio\\.com/i, 'https://info.grudge-studio.com').split('?')[0] + '?nr=1';",
    '    } else {',
    "      t.src = src.split('?')[0] + '?nr=1';",
    '    }',
    '  }, true);',
    '})();',
    '</script>',
  ].join(nl);

  // Prefer insert right after early SSO script
  const early = c.indexOf('earlySsoCapture');
  if (early > 0) {
    const close = c.indexOf('</script>', early);
    if (close > 0) {
      c = c.slice(0, close + 9) + nl + boot + c.slice(close + 9);
      console.log('injected no-referrer boot after earlySso');
    } else {
      c = c.replace('</head>', boot + nl + '</head>');
      console.log('injected no-referrer boot before head close');
    }
  } else {
    c = c.replace('</head>', boot + nl + '</head>');
    console.log('injected no-referrer boot before head close');
  }
}

// Version bump
c = c.replace(/VERSION:\s*'5\.\d+\.\d+'/, "VERSION: '5.10.1'");
c = c.replace(/v5\.10(?:\.\d+)?/g, 'v5.10.1');
c = c.replace(/Warlords Profession Suite · v5\.\d+(?:\.\d+)?/g, 'Warlords Profession Suite · v5.10.1');

fs.writeFileSync(path, c, 'utf8');
console.log('meta referrer', /name=["']referrer["']/.test(c));
console.log('referrerpolicy attrs', (c.match(/referrerpolicy=/gi) || []).length);
console.log('runtime fix', c.includes('__grudgeNoReferrerIcons'));
console.log('VERSION', (c.match(/VERSION:\s*'([^']+)'/) || [])[1]);
