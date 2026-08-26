/**
 * Warlords hub boot — loaded by /craft/?era=warlords
 * Skips when hub=craft-only (iframe inside the panel) or classic=1.
 */
(function bootWarlordsHub() {
  try {
    var q = new URLSearchParams(location.search || "");
    if (q.get("hub") === "craft-only" || q.get("classic") === "1") return;
    if ((q.get("era") || "warlords").toLowerCase() !== "warlords") return;
    if (/\/main-panel\/?$/i.test(location.pathname)) return;
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
