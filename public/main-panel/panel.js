/* Grudge Warlords Main Panel — production hub on grudgewarlords.com */
(function () {
  const FLEET = {
    auth: "https://id.grudge-studio.com",
    gameData: "https://grudge-api-production-0d46.up.railway.app",
    assets: "https://assets.grudge-studio.com",
    os: "https://objectstore.grudge-studio.com/api/v1",
    info: "https://info.grudge-studio.com",
    wcs: "https://wcs.grudge-studio.com",
    weaponSkills: "https://info.grudge-studio.com/WEAPON_SKILLS.html",
    vfx: "https://info.grudge-studio.com/3dfx-viewer.html",
  };
  const TOKEN_KEYS = [
    "grudge_auth_token",
    "grudge_session_token",
    "grudge_studio_session",
    "grudge.token",
    "sso_token",
    "access_token",
    "grudge_token",
  ];
  const TABS = [
    ["equipment", "Equipment"],
    ["skills", "Skills"],
    ["crafting", "Crafting"],
    ["professions", "Professions"],
    ["camps", "Camps"],
    ["boats", "Boats"],
    ["crew", "Crew"],
    ["pit", "Pit"],
    ["connections", "Connections"],
  ];
  const RACES = [
    ["human", "Human", "crusade"],
    ["barbarian", "Barbarian", "crusade"],
    ["elf", "Elf", "fabled"],
    ["dwarf", "Dwarf", "fabled"],
    ["orc", "Orc", "legion"],
    ["undead", "Undead", "legion"],
  ];
  const CLASSES = [
    ["warrior", "Warrior"],
    ["mage", "Mage"],
    ["ranger", "Ranger"],
    ["worge", "Worge"],
    ["raider", "Raider"],
    ["thief", "Thief"],
    ["priest", "Priest"],
    ["verduror", "Verduror"],
  ];
  const HARVEST = [
    ["mining", "Mining", "pickaxe"],
    ["logging", "Logging", "axe"],
    ["skinning", "Skinning", "dagger"],
    ["fishing", "Fishing", "spear"],
    ["herbalism", "Herbalism", "hoe"],
    ["scavenging", "Scavenging", "hammer"],
  ];
  const GEAR_SLOTS = [
    ["head", "Helm"],
    ["shoulder", "Shoulders"],
    ["back", "Back"],
    ["chest", "Chest"],
    ["hands", "Hands"],
    ["waist", "Waist"],
    ["legs", "Legs"],
    ["feet", "Feet"],
    ["main", "Main"],
    ["off", "Off"],
    ["classBadge", "Class"],
    ["weaponSwap", "Swap"],
  ];
  function well(r) {
    const i = 0.08;
    return { x: +(r.x + r.w * i).toFixed(2), y: +(r.y + r.h * i).toFixed(2), w: +(r.w * (1 - 2 * i)).toFixed(2), h: +(r.h * (1 - 2 * i)).toFixed(2) };
  }
  function chrome(base) {
    const off = base.off, head = base.head;
    const waist = { x: base.shoulder.x, y: off.y, w: off.w, h: off.h };
    const classBadge = { x: Math.max(0, head.x - head.w - 1.2), y: head.y, w: head.w, h: head.h };
    const mid = (waist.x + waist.w + off.x) / 2;
    const weaponSwap = { x: mid - off.w / 2, y: off.y, w: off.w, h: off.h };
    const raw = Object.assign({}, base, { waist, classBadge, weaponSwap });
    const out = {};
    for (const k of Object.keys(raw)) out[k] = well(raw[k]);
    return out;
  }
  const SLOTS = {
    human: chrome({ shoulder:{x:13.78,y:20.94,w:10,h:9.62}, back:{x:13.78,y:35.26,w:10,h:9.62}, chest:{x:13.78,y:48.93,w:10,h:9.62}, legs:{x:13.78,y:62.61,w:10,h:9.62}, head:{x:77.33,y:20.94,w:10,h:9.62}, main:{x:77.33,y:35.26,w:10,h:9.62}, hands:{x:77.33,y:48.93,w:10,h:9.62}, feet:{x:77.33,y:62.61,w:10,h:9.62}, off:{x:77.78,y:76.28,w:9.33,h:8.33} }),
    elf: chrome({ shoulder:{x:13.3,y:20.75,w:9.98,h:9.55}, back:{x:13.3,y:35.22,w:9.98,h:9.55}, chest:{x:13.3,y:48.85,w:9.98,h:9.55}, legs:{x:13.3,y:62.68,w:9.98,h:9.55}, head:{x:76.72,y:20.75,w:9.98,h:9.55}, main:{x:76.72,y:35.22,w:9.98,h:9.55}, hands:{x:76.72,y:48.85,w:9.98,h:9.55}, feet:{x:76.72,y:62.68,w:9.98,h:9.55}, off:{x:77.16,y:76.94,w:9.31,h:8.18} }),
    orc: chrome({ shoulder:{x:11.87,y:20.34,w:10.27,h:9.64}, back:{x:11.87,y:35.01,w:10.27,h:9.64}, chest:{x:11.87,y:49.48,w:10.27,h:9.64}, legs:{x:11.87,y:63.52,w:10.27,h:9.64}, head:{x:77.17,y:20.34,w:10.27,h:9.64}, main:{x:77.17,y:35.01,w:10.27,h:9.64}, hands:{x:77.17,y:49.48,w:10.27,h:9.64}, feet:{x:77.17,y:63.52,w:10.27,h:9.64}, off:{x:77.63,y:77.36,w:9.82,h:8.18} }),
    dwarf: chrome({ shoulder:{x:12.84,y:20.84,w:10.14,h:9.6}, back:{x:12.84,y:35.37,w:10.14,h:9.6}, chest:{x:12.84,y:49.05,w:10.14,h:9.6}, legs:{x:12.84,y:62.95,w:10.14,h:9.6}, head:{x:77.25,y:20.84,w:10.14,h:9.6}, main:{x:77.25,y:35.37,w:10.14,h:9.6}, hands:{x:77.25,y:49.05,w:10.14,h:9.6}, feet:{x:77.25,y:62.95,w:10.14,h:9.6}, off:{x:77.7,y:77.05,w:9.68,h:8.21} }),
    barbarian: chrome({ shoulder:{x:13.23,y:20.47,w:10.09,h:9.7}, back:{x:13.23,y:34.54,w:10.09,h:9.7}, chest:{x:13.23,y:48.4,w:10.09,h:9.7}, legs:{x:13.23,y:62.26,w:10.09,h:9.7}, head:{x:77.58,y:20.47,w:10.09,h:9.7}, main:{x:77.58,y:34.54,w:10.09,h:9.7}, hands:{x:77.58,y:48.4,w:10.09,h:9.7}, feet:{x:77.58,y:62.26,w:10.09,h:9.7}, off:{x:78.03,y:75.69,w:9.42,h:8.53} }),
    undead: chrome({ shoulder:{x:12.05,y:20.54,w:10.23,h:9.54}, back:{x:12.05,y:35.06,w:10.23,h:9.54}, chest:{x:12.05,y:49.17,w:10.23,h:9.54}, legs:{x:12.05,y:63.28,w:10.23,h:9.54}, head:{x:77.05,y:20.54,w:10.23,h:9.54}, main:{x:77.05,y:35.06,w:10.23,h:9.54}, hands:{x:77.05,y:49.17,w:10.23,h:9.54}, feet:{x:77.05,y:63.28,w:10.23,h:9.54}, off:{x:77.5,y:76.97,w:9.55,h:8.09} }),
  };

  const state = {
    tab: "equipment",
    race: "human",
    classId: "warrior",
    token: null,
    account: null,
    character: null,
    characters: [],
    weapons: [],
    skills: [],
    recipes: [],
    gear: { head: null, shoulder: null, back: null, chest: null, hands: null, waist: null, legs: null, feet: null, main: null, off: null, main2: null, off2: null, set: 1 },
    bag: [],
    menu: null,
    tip: null,
    status: "loading",
  };

  function qs() { return new URLSearchParams(location.search || ""); }
  function readToken() {
    try {
      for (const k of TOKEN_KEYS) {
        const v = localStorage.getItem(k);
        if (v) return v;
      }
    } catch (e) {}
    return null;
  }
  function writeToken(token, hints) {
    try {
      if (token) TOKEN_KEYS.forEach((k) => localStorage.setItem(k, token));
      if (hints && hints.id) {
        localStorage.setItem("grudge_id", hints.id);
        localStorage.setItem("grudge_user_id", hints.id);
      }
      if (hints && hints.username) localStorage.setItem("grudge_username", hints.username);
    } catch (e) {}
  }
  function pickup() {
    const p = qs();
    const h = new URLSearchParams((location.hash || "").replace(/^#/, ""));
    const g = (k) => p.get(k) || h.get(k);
    const token = g("sso_token") || g("token") || g("jwt") || g("access_token") || g("grudge_token");
    const id = g("grudge_id") || g("grudgeId");
    const username = g("grudge_username") || g("username");
    const charId = g("characterId") || g("char_id");
    if (token) writeToken(token, { id, username });
    if (charId) try { localStorage.setItem("grudge_active_character", charId); } catch (e) {}
    state.token = token || readToken();
    return state.token;
  }
  function authHeaders() {
    const t = state.token || readToken();
    return t ? { Authorization: "Bearer " + t, Accept: "application/json" } : { Accept: "application/json" };
  }
  async function pull(url) {
    try {
      const res = await fetch(url, { headers: authHeaders() });
      const text = await res.text();
      let body = null;
      try { body = text ? JSON.parse(text) : null; } catch (e) { body = text; }
      return { ok: res.ok, status: res.status, body };
    } catch (e) {
      return { ok: false, status: 0, body: String(e) };
    }
  }
  function asset(url) {
    if (!url) return null;
    if (/^(https?:|data:|blob:)/i.test(url)) return url;
    if (url.startsWith("/icons/")) return FLEET.assets + url;
    if (url.startsWith("/")) return url;
    return FLEET.assets + "/" + url.replace(/^\/+/, "");
  }
  function classIcon(id) {
    return "/main-panel/icons/" + id + ".png";
  }
  function raceFrame(id) {
    return "/main-panel/paperdoll/" + id + ".png";
  }
  function iconOf(item) {
    if (!item) return null;
    if (item.icon && String(item.icon).includes("/icons/")) return asset(item.icon);
    return asset(item.iconUrl || item.icon || item.thumbnail_url);
  }
  function el(html) {
    const d = document.createElement("div");
    d.innerHTML = html.trim();
    return d.firstElementChild;
  }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">").replace(/"/g, """);
  }

  function login() {
    const origin = location.origin;
    const callback = origin + "/main-panel/?era=warlords";
    const u = new URL(FLEET.auth + "/login");
    u.searchParams.set("redirect_uri", callback);
    u.searchParams.set("redirect", callback);
    u.searchParams.set("return", callback);
    u.searchParams.set("origin", origin);
    u.searchParams.set("era", "warlords");
    u.searchParams.set("from", "warlords-main-panel");
    location.assign(u.toString());
  }
  function logout() {
    TOKEN_KEYS.forEach((k) => { try { localStorage.removeItem(k); } catch (e) {} });
    state.token = null;
    state.account = null;
    state.character = null;
    render();
  }

  async function loadSession() {
    pickup();
    if (!state.token) {
      state.status = "ready";
      return;
    }
    const me = await pull("/api/auth/me");
    const alt = me.ok ? me : await pull(FLEET.auth + "/api/auth/me");
    const raw = alt.body && (alt.body.user || alt.body.account || alt.body.data || alt.body);
    if (raw && typeof raw === "object") {
      state.account = {
        id: String(raw.id || raw.userId || raw.grudge_id || ""),
        username: String(raw.username || raw.displayName || raw.name || "Warlord"),
        grudgeId: String(raw.grudge_id || raw.grudgeId || raw.id || ""),
      };
      writeToken(state.token, { id: state.account.grudgeId, username: state.account.username });
    }
    const chars = await pull("/api/characters?era=warlords");
    const list = Array.isArray(chars.body)
      ? chars.body
      : (chars.body && (chars.body.characters || chars.body.items)) || [];
    state.characters = list.map((c) => ({
      id: String(c.id || c.characterId || ""),
      name: String(c.name || "Warlord"),
      raceId: String(c.raceId || c.race_id || c.race || "human").toLowerCase(),
      classId: String(c.classId || c.class_id || c.class || "warrior").toLowerCase(),
      equipment: c.equipment || {},
    })).filter((c) => c.id);
    const active = localStorage.getItem("grudge_active_character");
    state.character = state.characters.find((c) => c.id === active) || state.characters[0] || null;
    if (state.character) {
      state.race = RACES.some((r) => r[0] === state.character.raceId) ? state.character.raceId : "human";
      state.classId = CLASSES.some((c) => c[0] === state.character.classId) ? state.character.classId : "warrior";
      applyEquip(state.character.equipment);
    }
    state.status = "ready";
  }

  function applyEquip(eq) {
    if (!eq || typeof eq !== "object") return;
    const map = { helm: "head", helmet: "head", head: "head", shoulders: "shoulder", shoulder: "shoulder", back: "back", cape: "back", chest: "chest", gloves: "hands", hands: "hands", belt: "waist", waist: "waist", legs: "legs", boots: "feet", feet: "feet", mainhand: "main", main: "main", weapon: "main", offhand: "off", off: "off", shield: "off" };
    for (const [k, v] of Object.entries(eq)) {
      const slot = map[String(k).toLowerCase()];
      if (slot && v) state.gear[slot] = String(v);
    }
  }

  async function loadCatalog() {
    const [ws, infoWs, rec] = await Promise.all([
      pull(FLEET.os + "/files/master-weaponSkills.json"),
      pull(FLEET.info + "/api/v1/master-weaponSkills.json"),
      pull(FLEET.os + "/files/recipes.json"),
    ]);
    const skillsBody = (ws.ok && ws.body) || (infoWs.ok && infoWs.body) || {};
    const skills = Array.isArray(skillsBody) ? skillsBody : skillsBody.skills || skillsBody.items || skillsBody.weaponSkills || [];
    state.skills = skills;
    const weapons = [];
    const seen = new Set();
    function addW(w) {
      if (!w) return;
      const id = String(w.id || w.uuid || w.slug || "");
      if (!id || seen.has(id)) return;
      seen.add(id);
      weapons.push({
        id,
        name: String(w.name || w.label || id),
        typeKey: String(w.typeKey || w.weaponType || w.type || w.category || ""),
        icon: w.icon || w.iconUrl,
        iconUrl: w.iconUrl || w.icon,
        lore: String(w.lore || w.description || ""),
        weaponType: String(w.weaponType || ""),
        skillSlots: w.skillSlots || [],
        modelUrl: w.modelUrl || w.glb_url,
      });
    }
    if (skillsBody.weapons) skillsBody.weapons.forEach(addW);
    if (skillsBody.prefabs) skillsBody.prefabs.forEach(addW);
    skills.forEach((s) => {
      if (s.weapon) addW(s.weapon);
      if (s.prefab) addW(s.prefab);
    });
    state.weapons = weapons;
    const recBody = rec.ok ? rec.body : null;
    state.recipes = Array.isArray(recBody) ? recBody : (recBody && (recBody.recipes || recBody.items)) || [];
  }

  function weaponById(id) {
    return state.weapons.find((w) => w.id === id) || null;
  }
  function slotsForWeapon(w) {
    if (w && Array.isArray(w.skillSlots) && w.skillSlots.length) {
      const ids = [];
      w.skillSlots.forEach((b) => (b.skillIds || []).forEach((id) => ids.push(id)));
      return ids.map((id) => state.skills.find((s) => s.id === id || s.uuid === id)).filter(Boolean);
    }
    const tk = (w && (w.typeKey || w.weaponType) || "").toLowerCase();
    return state.skills.filter((s) => {
      const t = String(s.weaponType || s.typeKey || s.category || "").toLowerCase();
      return tk && t && (t === tk || t.includes(tk) || tk.includes(t));
    }).slice(0, 8);
  }
  function skillArt(s) {
    if (!s) return null;
    if (s.icon && String(s.icon).includes("/icons/")) return asset(s.icon);
    return asset(s.icon || s.iconUrl);
  }

  function setTab(id) {
    state.tab = id;
    const u = new URL(location.href);
    u.searchParams.set("era", "warlords");
    u.searchParams.set("tab", id);
    history.replaceState({}, "", u.pathname + u.search);
    render();
  }

  function tipShow(e, title, body) {
    hideTip();
    const n = el('<div class="gmp-tip"><b></b><div></div></div>');
    n.querySelector("b").textContent = title;
    n.querySelector("div").textContent = body || "";
    document.body.appendChild(n);
    const x = Math.min(e.clientX + 12, innerWidth - 300);
    const y = Math.min(e.clientY + 12, innerHeight - 120);
    n.style.left = x + "px";
    n.style.top = y + "px";
    state.tip = n;
  }
  function hideTip() {
    if (state.tip) { state.tip.remove(); state.tip = null; }
  }
  function hideMenu() {
    if (state.menu) { state.menu.remove(); state.menu = null; }
  }

  function equipTo(slot, id) {
    if (slot === "classBadge") {
      state.classId = id;
      render();
      return;
    }
    if (slot === "weaponSwap") {
      state.gear.set = state.gear.set === 1 ? 2 : 1;
      const a = state.gear.main, b = state.gear.off;
      state.gear.main = state.gear.main2;
      state.gear.off = state.gear.off2;
      state.gear.main2 = a;
      state.gear.off2 = b;
      render();
      persist();
      return;
    }
    const w = weaponById(id);
    if (w) {
      const wt = (w.weaponType || "").toUpperCase();
      if (wt === "SHIELD" || wt === "TOME") state.gear.off = id;
      else if (slot === "off") state.gear.off = id;
      else state.gear.main = id;
    } else {
      state.gear[slot] = id;
    }
    render();
    persist();
  }

  async function persist() {
    if (!state.character || !state.token) return;
    const body = {
      raceId: state.race,
      classId: state.classId,
      equipment: {
        head: state.gear.head, shoulder: state.gear.shoulder, back: state.gear.back,
        chest: state.gear.chest, hands: state.gear.hands, waist: state.gear.waist,
        legs: state.gear.legs, feet: state.gear.feet, mainhand: state.gear.main, offhand: state.gear.off,
      },
    };
    try {
      await fetch("/api/characters/" + encodeURIComponent(state.character.id), {
        method: "PATCH",
        headers: Object.assign({ "content-type": "application/json" }, authHeaders()),
        body: JSON.stringify(body),
      });
    } catch (e) {}
  }

  function openSlotMenu(ev, slot) {
    ev.preventDefault();
    hideMenu(); hideTip();
    const items = slot === "classBadge" ? CLASSES.map(([id, label]) => ({ id, name: label, icon: classIcon(id) }))
      : slot === "weaponSwap" ? [{ id: "swap", name: "Swap to weapon set " + (state.gear.set === 1 ? "2" : "1") }]
      : state.weapons.slice(0, 40).map((w) => ({ id: w.id, name: w.name, icon: iconOf(w) }));
    const m = el('<div class="gmp-menu"></div>');
    m.appendChild(el('<button type="button" data-id="">Unequip</button>'));
    items.forEach((it) => {
      const b = el('<button type="button"></button>');
      b.dataset.id = it.id;
      b.textContent = it.name;
      m.appendChild(b);
    });
    m.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      if (slot === "weaponSwap") equipTo("weaponSwap");
      else equipTo(slot, b.dataset.id || null);
      hideMenu();
    });
    document.body.appendChild(m);
    m.style.left = Math.min(ev.clientX, innerWidth - 200) + "px";
    m.style.top = Math.min(ev.clientY, innerHeight - 200) + "px";
    state.menu = m;
  }

  let kitStop = null;
  async function mountKit(canvas, race) {
    if (kitStop) { try { kitStop(); } catch (e) {} kitStop = null; }
    try {
      const THREE = await import("https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.js");
      const { GLTFLoader } = await import("https://cdn.jsdelivr.net/npm/three@0.185.1/examples/jsm/loaders/GLTFLoader.js");
      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      renderer.setClearColor(0x000000, 0);
      const scene = new THREE.Scene();
      const cam = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
      cam.position.set(0, 1.15, 3.4);
      cam.lookAt(0, 0.95, 0);
      scene.add(new THREE.HemisphereLight(0xfff2d8, 0x223344, 1.2));
      const d = new THREE.DirectionalLight(0xffffff, 1.1);
      d.position.set(2, 4, 3);
      scene.add(d);
      const url = FLEET.assets + "/asset-packs/toon-rts-characters/glb/characters/" + race + ".glb";
      const gltf = await new GLTFLoader().loadAsync(url);
      const root = gltf.scene;
      root.rotation.y = 0;
      scene.add(root);
      let mixer = null;
      if (gltf.animations && gltf.animations.length) {
        mixer = new THREE.AnimationMixer(root);
        const idle = gltf.animations.find((a) => /idle/i.test(a.name)) || gltf.animations[0];
        mixer.clipAction(idle).play();
      }
      const clock = new THREE.Clock();
      let live = true;
      function resize() {
        const w = canvas.clientWidth || 200, h = canvas.clientHeight || 280;
        renderer.setSize(w, h, false);
        cam.aspect = w / h;
        cam.updateProjectionMatrix();
      }
      function loop() {
        if (!live) return;
        requestAnimationFrame(loop);
        resize();
        if (mixer) mixer.update(clock.getDelta());
        renderer.render(scene, cam);
      }
      loop();
      kitStop = () => { live = false; renderer.dispose(); };
    } catch (e) {
      canvas.replaceWith(el('<div class="gmp-muted" style="padding:8px;text-align:center">Kit loading…</div>'));
    }
  }

  function dollHTML() {
    const race = state.race;
    const rects = SLOTS[race] || SLOTS.human;
    const slots = GEAR_SLOTS.map(([id, label]) => {
      const r = rects[id];
      if (!r) return "";
      let icon = "";
      let title = label;
      if (id === "classBadge") {
        icon = classIcon(state.classId);
        title = CLASSES.find((c) => c[0] === state.classId)?.[1] || "Class";
      } else if (id === "weaponSwap") {
        title = "Weapon set " + state.gear.set;
      } else {
        const item = weaponById(state.gear[id]);
        if (item) { icon = iconOf(item) || ""; title = item.name; }
      }
      return `<button type="button" class="gmp-slot" data-slot="${id}" title="${esc(title)}"
        style="left:${r.x}%;top:${r.y}%;width:${r.w}%;height:${r.h}%">
        ${icon ? `<img src="${esc(icon)}" alt="">` : ""}
        <span class="lbl">${esc(label)}</span>
      </button>`;
    }).join("");
    return `<div class="gmp-doll" id="gmp-doll">
      <img class="frame" src="${esc(raceFrame(race))}" alt="${esc(race)} paper doll">
      <canvas class="kit3d" id="gmp-kit"></canvas>
      ${slots}
    </div>`;
  }

  function equipmentView() {
    const bag = state.weapons.slice(0, 48);
    return `<div class="gmp-card">${dollHTML()}</div>
      <div class="gmp-card"><h3>Race</h3><div class="gmp-row">${RACES.map(([id, label]) =>
        `<button class="gmp-chip" data-race="${id}" ${id===state.race?"style='border-color:var(--gmp-gold);color:var(--gmp-gold-bright)'":""}>${esc(label)}</button>`).join("")}</div></div>
      <div class="gmp-card"><h3>Class</h3><div class="gmp-row">${CLASSES.map(([id, label]) =>
        `<button class="gmp-chip" data-class="${id}" ${id===state.classId?"style='border-color:var(--gmp-gold);color:var(--gmp-gold-bright)'":""}><img src="${classIcon(id)}" alt="" width="18" height="18" style="vertical-align:middle;margin-right:6px;border-radius:50%">${esc(label)}</button>`).join("")}</div></div>
      <div class="gmp-card"><h3>Bag · WCS prefabs</h3>
        <p class="gmp-muted">LMB drag onto a slot · RMB a slot for the full list. Icons from info.grudge-studio.com /assets.</p>
        <div class="gmp-grid">${bag.map((w) =>
          `<div class="gmp-item" draggable="true" data-id="${esc(w.id)}" title="${esc(w.name)}">${iconOf(w)?`<img src="${esc(iconOf(w))}" alt="">`:esc(w.name.slice(0,2))}</div>`).join("") || '<div class="gmp-muted">Catalog loading…</div>'}</div>
      </div>`;
  }

  function skillsView() {
    const w = weaponById(state.gear.main);
    const bar = slotsForWeapon(w);
    const cls = CLASSES.find((c) => c[0] === state.classId)?.[1] || state.classId;
    return `<div class="gmp-card"><h3>Weapon skills · ${esc(w ? w.name : "Unarmed")}</h3>
      <p class="gmp-muted">Prefab skillSlots first (WCS truth). Fallback is the type tree on <a href="${FLEET.weaponSkills}" style="color:var(--gmp-gold)">WEAPON_SKILLS</a>.</p>
      <div class="gmp-row">${bar.slice(0,8).map((s,i) =>
        `<div class="gmp-skill" title="${esc(s.name||s.id)}">${skillArt(s)?`<img src="${esc(skillArt(s))}" alt="">`:""}<span>${esc(s.name||s.id)}</span><span class="gmp-mono">${i+1} · T${s.tier||s.unlockTier||1}</span></div>`).join("") || '<div class="gmp-muted">No skills on this prefab yet.</div>'}</div>
    </div>
    <div class="gmp-card"><h3>Class · ${esc(cls)}</h3>
      <div class="gmp-row"><img src="${classIcon(state.classId)}" width="48" height="48" style="border-radius:50%;border:1px solid var(--gmp-gold)">
      <div><div>${esc(cls)}</div><div class="gmp-muted">Keys 5–8 are class. Signature lives on the class tree.</div></div></div>
    </div>
    <div class="gmp-card"><h3>3DFX</h3>
      <iframe title="3DFX" src="${FLEET.vfx}?spell=nature_heal" style="width:100%;height:240px;border:0;border-radius:8px;background:#000"></iframe>
    </div>`;
  }

  function craftingView() {
    const u = new URL("/craft/", location.origin);
    u.searchParams.set("era", "warlords");
    u.searchParams.set("hub", "craft-only");
    u.searchParams.set("from", "warlords-main-panel");
    if (state.token) u.searchParams.set("sso_token", state.token);
    if (state.character) u.searchParams.set("characterId", state.character.id);
    u.searchParams.set("race", state.race);
    u.searchParams.set("classId", state.classId);
    return `<iframe class="gmp-iframe" title="Warlords Craft" src="${esc(u.toString())}"></iframe>`;
  }

  function professionsView() {
    return `<div class="gmp-card"><h3>Harvest · every character</h3>
      <p class="gmp-muted">All six harvesting professions are unlocked on every Warlord. Tools ride the hand bone.</p>
      <div class="gmp-row">${HARVEST.map(([id,label,tool]) =>
        `<div class="gmp-skill"><span>${esc(label)}</span><span class="gmp-mono">${esc(tool)}</span></div>`).join("")}</div>
    </div>
    <div class="gmp-card"><h3>Crafting stations</h3>
      <p class="gmp-muted">${state.recipes.length} recipes from ObjectStore. Every character can work every profession.</p>
      <div class="gmp-grid">${state.recipes.slice(0,24).map((r) =>
        `<div class="gmp-item" title="${esc(r.name||r.id)}">${esc((r.name||r.id||"?").toString().slice(0,3))}</div>`).join("")}</div>
    </div>`;
  }

  function simpleList(title, rows, note) {
    return `<div class="gmp-card"><h3>${esc(title)}</h3><p class="gmp-muted">${esc(note)}</p>
      <div>${rows.map((r) => `<div class="gmp-row" style="padding:6px 0;border-bottom:1px solid var(--gmp-border)"><b>${esc(r[0])}</b><span class="gmp-muted">${esc(r[1])}</span></div>`).join("")}</div></div>`;
  }

  function connectionsView() {
    const rows = [
      ["Grudge ID", FLEET.auth],
      ["Game data", FLEET.gameData],
      ["ObjectStore", FLEET.os],
      ["Assets", FLEET.assets],
      ["WCS", FLEET.wcs],
      ["Craft", location.origin + "/craft/?era=warlords"],
      ["Main panel", location.origin + "/main-panel/?era=warlords"],
      ["Weapon skills", FLEET.weaponSkills],
    ];
    return `<div class="gmp-card"><h3>Fleet · one truth</h3>
      ${rows.map(([k,v]) => `<div class="gmp-row" style="justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--gmp-border)"><span>${esc(k)}</span><a href="${esc(v)}" style="color:var(--gmp-gold);font-size:12px">${esc(v.replace(/^https:\/\//,""))}</a></div>`).join("")}
      <p class="gmp-muted" style="margin-top:12px">Account: ${state.account ? esc(state.account.username) : "guest"} · ${state.weapons.length} prefabs · ${state.skills.length} skills · ${state.recipes.length} recipes</p>
    </div>`;
  }

  function viewHTML() {
    switch (state.tab) {
      case "skills": return skillsView();
      case "crafting": return craftingView();
      case "professions": return professionsView();
      case "camps": return simpleList("Camps", [["Wood frame","Modular base from the warlords pack"],["Benches","Stations feed the same recipes as /craft"],["Inside / outside","Three.js entry on the camp builder"]], "Warlords building materials only — no voxel mix.");
      case "boats": return simpleList("Boats", [["Hull","Account-bound"],["Crew hold","Auto-harvest returns to bag/quiver/wood back slots"]], "Boats share the Grudge ID wallet.");
      case "crew": return `<div class="gmp-card"><h3>Crew</h3><p class="gmp-muted">Inspect uses the compact craft widget. Paper doll + tooltips match this hero.</p>
        ${(state.characters.length?state.characters:[{name:"You",raceId:state.race,classId:state.classId}]).map((c)=>
          `<div class="gmp-row" style="padding:8px 0;border-bottom:1px solid var(--gmp-border)">
            <img src="${raceFrame(c.raceId||state.race)}" width="36" height="48" style="object-fit:cover;border-radius:4px">
            <div><b>${esc(c.name)}</b><div class="gmp-mono">${esc(c.raceId||"")} · ${esc(c.classId||"")}</div></div>
          </div>`).join("")}</div>`;
      case "pit": return `<div class="gmp-card"><h3>Grudge Pit</h3><p class="gmp-muted">WASD move, Space strike. Weapon skills 1–4, class 5–8.</p>
        <a class="gmp-chip" href="https://open.grudge-studio.com" style="display:inline-block;text-decoration:none">Open Pit</a></div>`;
      case "connections": return connectionsView();
      default: return equipmentView();
    }
  }

  function bindStage(root) {
    root.querySelectorAll("[data-race]").forEach((b) => b.addEventListener("click", () => { state.race = b.dataset.race; render(); persist(); }));
    root.querySelectorAll("[data-class]").forEach((b) => b.addEventListener("click", () => { state.classId = b.dataset.class; render(); persist(); }));
    root.querySelectorAll(".gmp-slot").forEach((b) => {
      b.addEventListener("click", () => {});
      b.addEventListener("contextmenu", (e) => openSlotMenu(e, b.dataset.slot));
      b.addEventListener("mouseenter", (e) => {
        const slot = b.dataset.slot;
        const item = weaponById(state.gear[slot]);
        const title = slot === "classBadge" ? (CLASSES.find((c)=>c[0]===state.classId)||[])[1] : (item ? item.name : GEAR_SLOTS.find((s)=>s[0]===slot)?.[1]);
        const body = item ? ((item.lore || item.typeKey || "") + (item.skillSlots && item.skillSlots.length ? " · " + item.skillSlots.length + " skill slots" : "")) : "Empty · RMB for options";
        tipShow(e, title || slot, body);
      });
      b.addEventListener("mouseleave", hideTip);
      b.addEventListener("dragover", (e) => { e.preventDefault(); b.classList.add("active"); });
      b.addEventListener("dragleave", () => b.classList.remove("active"));
      b.addEventListener("drop", (e) => {
        e.preventDefault();
        b.classList.remove("active");
        const id = e.dataTransfer.getData("text/id") || e.dataTransfer.getData("text/plain");
        if (id) equipTo(b.dataset.slot, id);
      });
    });
    root.querySelectorAll(".gmp-item[draggable]").forEach((n) => {
      n.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/id", n.dataset.id);
        e.dataTransfer.setData("text/plain", n.dataset.id);
      });
      n.addEventListener("mouseenter", (e) => {
        const w = weaponById(n.dataset.id);
        if (w) tipShow(e, w.name, (w.typeKey || w.weaponType || "") + " · " + (w.lore || "WCS prefab"));
      });
      n.addEventListener("mouseleave", hideTip);
    });
    const kit = root.querySelector("#gmp-kit");
    if (kit && state.tab === "equipment") mountKit(kit, state.race);
  }

  function render() {
    hideTip(); hideMenu();
    const root = document.getElementById("gmp-root");
    if (!root) return;
    const qtab = qs().get("tab");
    if (qtab && TABS.some((t) => t[0] === qtab) && qtab !== state.tab && !root.dataset.locked) {
      state.tab = qtab;
    }
    root.innerHTML = `
      <div class="gmp-top">
        <div class="gmp-brand">Grudge Warlords<small>Main panel · era warlords</small></div>
        <nav class="gmp-tabs">${TABS.map(([id,label]) =>
          `<button type="button" class="gmp-tab${state.tab===id?" active":""}" data-tab="${id}">${label}</button>`).join("")}</nav>
        <div class="gmp-auth">
          ${state.account
            ? `<div class="gmp-mono">${esc(state.account.username)}<br>${esc(state.character?.name || state.account.grudgeId || "")}</div><button type="button" id="gmp-out">Sign out</button>`
            : `<button type="button" id="gmp-in">Sign in with Grudge ID</button>`}
        </div>
      </div>
      <div class="gmp-body">
        <div class="gmp-stage" id="gmp-stage">${viewHTML()}</div>
        <aside class="gmp-side">
          <div class="gmp-card"><h3>Hero</h3>
            <div class="gmp-row">
              <img src="${classIcon(state.classId)}" width="40" height="40" style="border-radius:50%;border:1px solid var(--gmp-gold)">
              <div><b>${esc((RACES.find(r=>r[0]===state.race)||[])[1]||state.race)} ${esc((CLASSES.find(c=>c[0]===state.classId)||[])[1]||"")}</b>
              <div class="gmp-mono">${esc(state.character?.name || "Unbound")}</div></div>
            </div>
          </div>
          <div class="gmp-card"><h3>Loadout</h3>
            ${[["Main", state.gear.main],["Off", state.gear.off],["Helm", state.gear.head],["Chest", state.gear.chest]].map(([k,v]) =>
              `<div class="gmp-row" style="justify-content:space-between"><span class="gmp-muted">${k}</span><span>${esc(weaponById(v)?.name || v || "—")}</span></div>`).join("")}
          </div>
          <div class="gmp-card"><h3>Classic craft</h3>
            <a class="gmp-chip" href="/craft/?era=warlords&classic=1" style="display:inline-block;text-decoration:none">Open suite only</a>
          </div>
        </aside>
      </div>`;
    root.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => setTab(b.dataset.tab)));
    const inn = root.querySelector("#gmp-in");
    const out = root.querySelector("#gmp-out");
    if (inn) inn.addEventListener("click", login);
    if (out) out.addEventListener("click", logout);
    bindStage(root.querySelector("#gmp-stage"));
  }

  function mount() {
    if (document.getElementById("gmp-root")) return;
    pickup();
    const tab = qs().get("tab");
    if (tab && TABS.some((t) => t[0] === tab)) state.tab = tab;
    const root = document.createElement("div");
    root.id = "gmp-root";
    root.className = "gmp-root";
    document.documentElement.style.overflow = "hidden";
    document.body.appendChild(root);
    document.addEventListener("click", (e) => { if (state.menu && !state.menu.contains(e.target)) hideMenu(); });
    render();
    Promise.all([loadSession(), loadCatalog()]).then(() => render());
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();
