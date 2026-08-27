/**
 * Warlords hub boot — loaded by /craft/?era=warlords
 * Always retargets the dead docs.grudge-studio.com Craft Skills Docs link.
 * Skips hub overlay when hub=craft-only (iframe inside the panel) or classic=1.
 */
(function bootWarlordsHub() {
  try {
    function retargetDocs() {
      var nodes = document.querySelectorAll('a[href*="docs.grudge-studio.com"]');
      for (var i = 0; i < nodes.length; i++) {
        nodes[i].setAttribute("href", "/docs/crafting");
        nodes[i].removeAttribute("target");
        nodes[i].removeAttribute("rel");
      }
    }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", retargetDocs);
    } else {
      retargetDocs();
    }

    var q = new URLSearchParams(location.search || "");
    if (q.get("hub") === "craft-only" || q.get("classic") === "1") return;
    if ((q.get("era") || "warlords").toLowerCase() !== "warlords") return;
    if (/\/main-panel\/?$/i.test(location.pathname)) return;
    if (/\/docs\//i.test(location.pathname)) return;
    var s = document.createElement("script");
    s.src = "/main-panel/panel.js";
    s.defer = true;
    s.dataset.mount = "craft";
    document.head.appendChild(s);
    var l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = "/main-panel/panel.css";
    document.head.appendChild(l);
  } catch (e) {}
})();
