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
    const i = 0.04;
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

  const ALLY_CLASS = { human: "warrior", barbarian: "raider", elf: "ranger", dwarf: "priest", orc: "worge", undead: "mage" };
  const SLOT_ARMOR = { head: "Helm", shoulder: "Shoulder", back: "Back", chest: "Chest", hands: "Hands", waist: "Waist", legs: "Legs", feet: "Feet" };
  const TYPEKEY_WS = { swords: "SWORD", greatswords: "GREATSWORD", axes1h: "AXE", greataxes: "GREATAXE", hammers1h: "HAMMER", hammers2h: "HAMMER", fireStaves: "STAFF", frostStaves: "STAFF", natureStaves: "STAFF", holyStaves: "STAFF", arcaneStaves: "STAFF", staves: "STAFF", tomes: "TOME", fireTomes: "TOME", bows: "BOW", crossbows: "CROSSBOW", guns: "GUN", daggers: "DAGGER", spears: "SPEAR", shields: "SHIELD", claws: "CLAW", scythes: "SCYTHE", tools: "TOOL" };
  const SLOT_UI = { primary: "Slot 1 · Standard", secondary: "Slot 2 · Shared", ability: "Slot 3 · Shared", ultimate: "Slot 4 · Signature" };
  const CRAFT_ICONS = "/craft/crafting-icons";
  const PROF_ICON = { mining: "miner.png", logging: "forester.png", skinning: "chef.png", fishing: "chef.png", herbalism: "mystic.png", scavenging: "engineer.png" };

  const state = {
    tab: "equipment",
    race: "human",
    classId: "warrior",
    token: null,
    account: null,
    character: null,
    characters: [],
    weapons: [],
    armor: [],
    skills: [],
    weaponTypes: [],
    classes: {},
    recipes: [],
    mounts: [],
    gear: { head: null, shoulder: null, back: null, chest: null, hands: null, waist: null, legs: null, feet: null, main: null, off: null, main2: null, off2: null, set: 1 },
    bag: [],
    boat: null,
    crew: [],
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
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (ch) {
      if (ch === "&") return String.fromCharCode(38) + "amp;";
      if (ch === "<") return String.fromCharCode(38) + "lt;";
      if (ch === ">") return String.fromCharCode(38) + "gt;";
      return String.fromCharCode(38) + "quot;";
    });
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

  function asList(raw) {
    if (Array.isArray(raw)) return raw;
    if (!raw || typeof raw !== "object") return [];
    for (const k of ["prefabs", "items", "weapons", "armor", "mounts", "recipes", "classes", "weaponTypes"]) {
      if (Array.isArray(raw[k])) return raw[k];
    }
    return [];
  }
  function parseSkill(raw) {
    if (!raw || typeof raw !== "object") return null;
    const id = String(raw.id || raw.uuid || "");
    const name = String(raw.name || "");
    if (!id || !name) return null;
    return {
      id,
      uuid: String(raw.uuid || id),
      name,
      description: String(raw.description || ""),
      icon: raw.icon || null,
      iconUrl: raw.iconUrl || null,
      tier: Number(raw.tier) || 1,
      damage: Number(raw.damage) || 0,
      cooldown: Number(raw.cooldown) || 0,
      castTime: raw.castTime == null || raw.castTime === "" ? null : Number(raw.castTime),
      range: raw.range == null || raw.range === "" ? null : Number(raw.range),
      damageType: String(raw.damageType || "physical"),
      effects: Array.isArray(raw.effects) ? raw.effects.map(String) : [],
    };
  }
  async function loadCatalog() {
    const [ws, infoWs, rec, pref, cls, mnt, arm] = await Promise.all([
      pull(FLEET.os + "/files/master-weaponSkills.json"),
      pull(FLEET.info + "/api/v1/master-weaponSkills.json"),
      pull(FLEET.os + "/master-recipes.json"),
      pull(FLEET.os + "/master-weapon-prefabs.json"),
      pull(FLEET.os + "/classes.json"),
      pull(FLEET.os + "/master-mounts.json"),
      pull(FLEET.os + "/master-armor.json"),
    ]);
    const skillsBody = (infoWs.ok && infoWs.body) || (ws.ok && ws.body) || {};
    const flat = [];
    const types = [];
    (Array.isArray(skillsBody.weaponTypes) ? skillsBody.weaponTypes : []).forEach((row) => {
      const id = String(row.id || "").toUpperCase();
      if (!id) return;
      const slots = (Array.isArray(row.slots) ? row.slots : []).map((sl, i) => {
        const type = String(sl.type || "primary").toLowerCase();
        const skills = (Array.isArray(sl.skills) ? sl.skills : []).map(parseSkill).filter(Boolean);
        skills.forEach((sk) => flat.push(sk));
        return { type, label: String(sl.label || type), uiLabel: SLOT_UI[type] || ("Slot " + (i + 1)), skills, unlockTier: Number(sl.unlockTier) || 1 };
      });
      types.push({ id, name: String(row.name || id), icon: row.icon || null, slots });
    });
    state.weaponTypes = types;
    state.skills = flat.length ? flat : (Array.isArray(skillsBody) ? skillsBody : skillsBody.skills || skillsBody.items || []);
    const weapons = [];
    const seen = new Set();
    function addW(w) {
      if (!w) return;
      const id = String(w.uuid || w.id || w.slug || "");
      if (!id || seen.has(id)) return;
      seen.add(id);
      const assets = (w.assets && typeof w.assets === "object") ? w.assets : {};
      const pack = (w.skills && typeof w.skills === "object") ? w.skills : {};
      const skillSlots = Array.isArray(pack.slots)
        ? pack.slots.map((sl) => ({
            type: String(sl.type || "primary"),
            label: String(sl.label || ""),
            unlockTier: Number(sl.unlockTier) || 0,
            skillIds: Array.isArray(sl.skillIds) ? sl.skillIds.map(String) : [],
            skillUuids: Array.isArray(sl.skillUuids) ? sl.skillUuids.map(String) : [],
          }))
        : [];
      weapons.push({
        id,
        name: String(w.name || w.label || id),
        typeKey: String(w.typeKey || w.category || ""),
        icon: w.icon || assets.iconUrl || w.iconUrl,
        iconUrl: assets.iconUrl || w.iconUrl || w.icon,
        lore: String(w.lore || w.description || ""),
        weaponType: String(w.weaponType || w.type || "").toUpperCase(),
        skillSlots,
        modelUrl: w.modelUrl || assets.modelUrl,
        tier: Number(w.tier) || 0,
      });
    }
    asList(pref.ok ? pref.body : null).forEach(addW);
    if (skillsBody.weapons) skillsBody.weapons.forEach(addW);
    if (skillsBody.prefabs) skillsBody.prefabs.forEach(addW);
    state.weapons = weapons;
    if (!state.gear.main && weapons.length) {
      const starter = weapons.find((w) => w.weaponType === "SWORD")
        || weapons.find((w) => w.typeKey === "swords")
        || weapons[0];
      if (starter) state.gear.main = starter.id;
    }
    let recBody = rec.ok ? rec.body : null;
    state.recipes = asList(recBody);
    if (!state.recipes.length) {
      const rec2 = await pull(FLEET.os + "/files/recipes.json");
      recBody = rec2.ok ? rec2.body : null;
      state.recipes = asList(recBody);
    }
    const classPack = (cls.ok && cls.body && cls.body.classes) || {};
    const cmap = {};
    Object.keys(classPack).forEach((id) => {
      const row = classPack[id] || {};
      const abilities = (Array.isArray(row.abilities) ? row.abilities : []).map((a, i) => {
        if (!a) return null;
        if (typeof a === "string") return { id: id + "-" + i, name: a, description: "", iconUrl: null, type: "physical", damage: null, cooldown: null, role: "ability" };
        return {
          id: String(a.id || id + "-" + i),
          name: String(a.name || "Ability"),
          description: String(a.description || ""),
          icon: a.icon || null,
          iconUrl: a.iconUrl || a.icon || null,
          type: String(a.type || "physical"),
          damage: a.damage == null ? null : Number(a.damage),
          cooldown: a.cooldown == null ? null : Number(a.cooldown),
          role: "ability",
        };
      }).filter(Boolean);
      const sig = row.signatureAbility;
      if (sig && typeof sig === "object") {
        abilities.push({
          id: String(sig.id || id + "-sig"),
          name: String(sig.name || "Signature"),
          description: String(sig.description || ""),
          icon: sig.icon || null,
          iconUrl: sig.iconUrl || sig.icon || null,
          type: String(sig.type || "buff"),
          damage: sig.damage == null ? null : Number(sig.damage),
          cooldown: sig.cooldown == null ? null : Number(sig.cooldown),
          role: "signature",
        });
      }
      cmap[id] = {
        id,
        label: String(row.name || id),
        description: String(row.description || ""),
        iconUrl: row.iconUrl || row.icon || classIcon(id),
        abilities,
      };
    });
    state.classes = cmap;
    state.mounts = asList(mnt.ok ? mnt.body : null).map((m) => ({
      id: String(m.uuid || m.id || ""),
      label: String(m.name || "Hull"),
      crew: Number(m.crew || m.capacity) || 2,
      speed: Number(m.speed) || 1,
      iconUrl: m.iconUrl || null,
      description: String(m.description || ""),
    })).filter((m) => m.id);
    if (!state.boat && state.mounts.length) {
      state.boat = (state.mounts.find((m) => /boat|ship|raft|skiff|hull/i.test(m.label)) || state.mounts[0]).id;
    }
    const armor = [];
    asList(arm.ok ? arm.body : null).forEach((a) => {
      const slotType = String(a.slotType || a.slot || a.type || "");
      const slot = Object.keys(SLOT_ARMOR).find((k) => SLOT_ARMOR[k].toLowerCase() === slotType.toLowerCase() || slotType.toLowerCase().startsWith(SLOT_ARMOR[k].toLowerCase()));
      if (!slot) return;
      const id = String(a.uuid || a.id || "");
      if (!id) return;
      armor.push({
        id,
        name: String(a.name || a.baseName || "Armor"),
        slot,
        slotType,
        material: String(a.material || ""),
        iconUrl: a.iconUrl || (a.assets && a.assets.iconUrl) || a.icon,
        lore: String(a.description || ""),
        tier: Number(a.tier) || 1,
      });
    });
    state.armor = armor;
  }

  function weaponById(id) {
    return state.weapons.find((w) => w.id === id) || null;
  }
  function armorById(id) {
    return state.armor.find((a) => a.id === id) || null;
  }
  function gearItem(slot) {
    const id = state.gear[slot];
    if (!id) return null;
    return weaponById(id) || armorById(id);
  }
  function skillArt(s) {
    if (!s) return null;
    const raw = (s.icon && String(s.icon).includes("/icons/") ? s.icon : null)
      || (s.iconUrl && String(s.iconUrl).includes("/icons/") ? s.iconUrl : null)
      || s.iconUrl
      || s.icon;
    const u = String(raw || "");
    if (!u) return classIcon(state.classId);
    if (/^(https?:|data:|blob:)/i.test(u) || u.includes("/") || /\.(png|webp|jpe?g|svg|gif)$/i.test(u)) return asset(u);
    return classIcon(state.classId);
  }
  function skillTreeFor(w) {
    if (!w) return null;
    const wt = String(w.weaponType || "").toUpperCase();
    const mapped = TYPEKEY_WS[w.typeKey] || wt;
    return state.weaponTypes.find((t) => t.id === mapped) || state.weaponTypes.find((t) => t.id === wt) || null;
  }
  function slotsForWeapon(w) {
    const tree = skillTreeFor(w);
    if (tree) {
      const out = [];
      tree.slots.forEach((sl) => {
        if (sl.skills[0]) out.push(Object.assign({ slotLabel: sl.uiLabel }, sl.skills[0]));
      });
      if (out.length) return out;
    }
    if (w && Array.isArray(w.skillSlots) && w.skillSlots.length) {
      const ids = [];
      w.skillSlots.forEach((b) => (b.skillIds || []).forEach((id) => ids.push(id)));
      return ids.map((id) => state.skills.find((s) => s.id === id || s.uuid === id)).filter(Boolean);
    }
    return [];
  }
  function classRow(id) {
    return state.classes[id] || { id, label: (CLASSES.find((c) => c[0] === id) || [id, id])[1], description: "", abilities: [], iconUrl: classIcon(id) };
  }
  function raceLabel(id) {
    return (RACES.find((r) => r[0] === id) || [id, id])[1];
  }
  function classLabel(id) {
    return classRow(id).label;
  }
  function factionOf(race) {
    const f = (RACES.find((r) => r[0] === race) || [0, 0, "crusade"])[2];
    return f === "crusade" ? "The Crusade" : f === "fabled" ? "The Fabled" : "The Legion";
  }
  function profRank(race, prof, self) {
    if (self) return 1;
    const seed = [...(race + "-" + prof)].reduce((n, c) => n + c.charCodeAt(0), 0);
    return 2 + (seed % 5);
  }
  function crewPool() {
    const hands = RACES.map(([id, label]) => ({
      id: "hand-" + id,
      name: label + " hand",
      role: "Hand",
      race: id,
      classId: ALLY_CLASS[id] || "warrior",
      self: false,
    }));
    const chars = state.characters.map((c) => ({
      id: "char-" + c.id,
      name: c.name,
      role: "Warlord",
      race: c.raceId || state.race,
      classId: c.classId || state.classId,
      self: false,
    }));
    return hands.concat(chars);
  }
  function inspectHTML(opts) {
    const race = opts.race || state.race;
    const classId = opts.classId || state.classId;
    const self = !!opts.self;
    const size = opts.size || "panel";
    const w = weaponById(opts.main || state.gear.main);
    const cls = classRow(classId);
    const skills = (cls.abilities || []).slice(0, size === "crew" ? 2 : 4);
    const kicker = (self ? "Warlord" : "Faction unit") + " · " + factionOf(race);
    const profs = HARVEST.map(([id, label]) => {
      const rank = profRank(race, id, self);
      const pct = Math.min(92, 18 + rank * 14);
      const icon = CRAFT_ICONS + "/" + (PROF_ICON[id] || "management.png");
      return `<div class="gmp-prof"><img src="${esc(icon)}" alt=""><div class="min-w-0" style="flex:1;min-width:0">
        <div class="pl">${esc(label)}<span>Lv ${rank}</span></div>
        <div class="gmp-xp"><i style="width:${pct}%"></i></div></div></div>`;
    }).join("");
    const sk = skills.map((sk) => {
      const ic = skillArt(sk) || classIcon(classId);
      return `<li>${ic ? `<img src="${esc(ic)}" alt="">` : ""}<span>${esc(sk.name)}</span></li>`;
    }).join("");
    const openLabel = self ? "Open crafting" : "Inspect in panel";
    return `<article class="gmp-inspect ${esc(size)}" data-npc="${self ? "false" : "true"}" data-race="${esc(race)}" data-class="${esc(classId)}">
      <header class="ban">
        <img class="bust" src="${esc(raceFrame(race))}" alt="">
        <div style="min-width:0;flex:1">
          <div class="kicker">${esc(kicker)}</div>
          <div class="iname">${esc(raceLabel(race))} ${esc(classLabel(classId))}</div>
          <div class="isub">${esc(w ? w.name : "Unarmed")} · ${esc(opts.name || (self ? (state.character && state.character.name) || "You" : ""))}</div>
        </div>
        <img class="mark" src="${CRAFT_ICONS}/eagle-shield.png" alt="">
      </header>
      <div class="gmp-profs">${profs}</div>
      ${size === "crew" ? "" : `<ul class="gmp-iskills">${sk}</ul>`}
      <button type="button" class="gmp-iopen" data-inspect="${self ? "craft" : "equip"}" data-race="${esc(race)}" data-class="${esc(classId)}">${esc(openLabel)}</button>
    </article>`;
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
    const isWeapon = slot === "main" || slot === "off";
    const armorSlot = SLOT_ARMOR[slot];
    let items = [];
    if (slot === "classBadge") items = CLASSES.map(([id, label]) => ({ id, name: label, icon: classIcon(id), kind: "class" }));
    else if (slot === "weaponSwap") items = [{ id: "swap", name: "Swap to weapon set " + (state.gear.set === 1 ? "2" : "1"), kind: "set" }];
    else if (armorSlot) items = state.armor.filter((a) => a.slot === slot).slice(0, 80).map((a) => ({ id: a.id, name: a.name, icon: asset(a.iconUrl), kind: a.material || "armor" }));
    else {
      let list = state.weapons;
      if (slot === "off") list = list.filter((w) => /SHIELD|TOME|DAGGER|CLAW/i.test(w.weaponType || "") || /shield|tome|dagger|claw/i.test(w.typeKey || ""));
      items = list.slice(0, 80).map((w) => ({ id: w.id, name: w.name, icon: iconOf(w), kind: w.weaponType || w.typeKey || "weapon" }));
    }
    const m = el('<div class="gmp-menu"></div>');
    const title = el('<div class="gmp-mono" style="padding:6px 10px"></div>');
    title.textContent = (GEAR_SLOTS.find((x) => x[0] === slot) || [slot, slot])[1] + " · " + items.length;
    m.appendChild(title);
    if (items.length > 8) {
      const inp = el('<input type="search" placeholder="Filter…">');
      inp.addEventListener("input", () => {
        const q = inp.value.trim().toLowerCase();
        m.querySelectorAll("button[data-id]").forEach((b) => {
          const hit = !q || (b.dataset.name || "").toLowerCase().includes(q) || (b.dataset.kind || "").toLowerCase().includes(q);
          b.style.display = hit ? "" : "none";
        });
      });
      m.appendChild(inp);
    }
    const unequip = el('<button type="button" data-id="">Unequip</button>');
    unequip.dataset.name = "unequip";
    m.appendChild(unequip);
    items.forEach((it) => {
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.id = it.id;
      b.dataset.name = it.name;
      b.dataset.kind = it.kind || "";
      if (it.icon) {
        const img = document.createElement("img");
        img.src = it.icon;
        img.alt = "";
        b.appendChild(img);
      }
      const span = document.createElement("span");
      span.textContent = it.name;
      b.appendChild(span);
      if (it.kind) {
        const k = document.createElement("span");
        k.className = "kind";
        k.textContent = it.kind;
        b.appendChild(k);
      }
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
    const pad = 8;
    const r = m.getBoundingClientRect();
    m.style.left = Math.min(Math.max(pad, ev.clientX), innerWidth - r.width - pad) + "px";
    m.style.top = Math.min(Math.max(pad, ev.clientY), innerHeight - r.height - pad) + "px";
    state.menu = m;
    const inp = m.querySelector("input");
    if (inp) inp.focus();
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
      if (canvas && canvas.style) canvas.style.display = "none";
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
    return `<div class="gmp-equip">
        ${dollHTML()}
        <div>${inspectHTML({ self: true, size: "panel", name: (state.character && state.character.name) || "You" })}</div>
      </div>
      <div class="gmp-card"><h3>Race</h3><div class="gmp-row">${RACES.map(([id, label]) =>
        `<button class="gmp-chip" data-race="${id}" ${id===state.race?"style='border-color:var(--gmp-gold);color:var(--gmp-gold-bright)'":""}>${esc(label)}</button>`).join("")}</div></div>
      <div class="gmp-card"><h3>Class</h3><div class="gmp-row">${CLASSES.map(([id, label]) =>
        `<button class="gmp-chip" data-class="${id}" ${id===state.classId?"style='border-color:var(--gmp-gold);color:var(--gmp-gold-bright)'":""}><img src="${classIcon(id)}" alt="" width="18" height="18" style="vertical-align:middle;margin-right:6px;border-radius:50%">${esc(label)}</button>`).join("")}</div></div>
      <div class="gmp-card"><h3>Bag · WCS prefabs</h3>
        <p class="gmp-muted">Click a slot or right-click for the list. Drag a prefab onto the doll. Icons from info.grudge-studio.com /assets.</p>
        <div class="gmp-grid">${bag.map((w) =>
          `<div class="gmp-item" draggable="true" data-id="${esc(w.id)}" data-kind="weapon" title="${esc(w.name)}">${iconOf(w)?`<img src="${esc(iconOf(w))}" alt="">`:esc(w.name.slice(0,2))}</div>`).join("") || '<div class="gmp-muted">Catalog loading…</div>'}</div>
      </div>`;
  }

  function skillCell(s, key, source) {
    if (!s) return `<div class="gmp-skill"><b class="key">${esc(key)}</b><span class="gmp-muted">Empty</span></div>`;
    const ic = skillArt(s) || classIcon(state.classId);
    return `<div class="gmp-skill" title="${esc(s.name)} · ${esc(source)}">${ic?`<img src="${esc(ic)}" alt="">`:""}<span>${esc(s.name)}</span><b class="key">${esc(key)} · ${esc(source)}</b></div>`;
  }
  function skillRowHTML(sk) {
    const ic = skillArt(sk);
    const cd = sk.cooldown ? sk.cooldown + "s" : "—";
    const cast = sk.castTime ? sk.castTime + "s" : "Instant";
    const rng = sk.range ? sk.range + "m" : "—";
    return `<div class="gmp-skrow">
      ${ic?`<img src="${esc(ic)}" alt="">`:"<span></span>"}
      <div style="min-width:0;flex:1">
        <div><b>${esc(sk.name)}</b> <span class="gmp-mono">T${sk.tier||1}</span></div>
        <div class="gmp-muted">${esc(sk.description || "")}</div>
        <div class="meta"><div>DMG <span>${sk.damage || "—"}</span></div><div>CD <span>${esc(cd)}</span></div><div>Cast <span>${esc(cast)}</span></div><div>Range <span>${esc(rng)}</span></div></div>
      </div>
    </div>`;
  }
  function skillsView() {
    const w = weaponById(state.gear.main);
    const tree = skillTreeFor(w);
    const cls = classRow(state.classId);
    const wbar = (tree ? tree.slots.map((sl) => sl.skills[0] || null) : slotsForWeapon(w)).slice(0, 4);
    while (wbar.length < 4) wbar.push(null);
    const cbar = (cls.abilities || []).slice(0, 4);
    while (cbar.length < 4) cbar.push(null);
    const keys = ["1","2","3","4","5","6","7","8"];
    const bar = wbar.map((s, i) => skillCell(s, keys[i], "weapon")).join("") + cbar.map((s, i) => skillCell(s, keys[i+4], s && s.role === "signature" ? "signature" : "class")).join("");
    const treeHTML = tree
      ? `<div class="gmp-tree">${tree.slots.map((sl) =>
          `<section class="gmp-slot-col"><h4>${esc(sl.uiLabel)}</h4>${(sl.skills.slice(0,6).map(skillRowHTML).join("")) || '<div class="gmp-muted">Empty slot</div>'}</section>`
        ).join("")}</div>`
      : '<p class="gmp-muted">No WCS tree on this prefab yet — equip a catalog weapon.</p>';
    const classTree = (cls.abilities || []).length
      ? `<div class="gmp-tree">${["ability","signature"].map((role) => {
          const list = cls.abilities.filter((a) => (role === "signature" ? a.role === "signature" : a.role !== "signature"));
          if (!list.length) return "";
          return `<section class="gmp-slot-col"><h4>${role === "signature" ? "Signature" : "Class abilities"}</h4>${list.map(skillRowHTML).join("")}</section>`;
        }).join("")}</div>`
      : '<p class="gmp-muted">No class tree on this warlord yet.</p>';
    return `<div class="gmp-card"><h3>Hotbar · ${esc(w ? w.name : "Unarmed")}</h3>
      <p class="gmp-muted">Keys 1–4 are the equipped prefab. Keys 5–8 are class. Trees from info.grudge-studio.com weapon skills.</p>
      <div class="gmp-bar">${bar}</div>
    </div>
    <div class="gmp-card"><h3>Weapon tree · ${esc(tree ? tree.name : (w && w.weaponType) || "—")}</h3>${treeHTML}</div>
    <div class="gmp-card"><h3>Class tree · ${esc(cls.label)}</h3>
      <div class="gmp-row" style="margin-bottom:10px"><img src="${classIcon(state.classId)}" width="40" height="40" style="border-radius:50%;border:1px solid var(--gmp-gold)">
      <div><div>${esc(cls.label)}</div><div class="gmp-muted">${esc(cls.description || "Class pack")}</div></div></div>
      ${classTree}
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
      <p class="gmp-muted">${state.recipes.length} recipes from ObjectStore. Every character can work every profession. <a href="/docs/crafting" style="color:var(--gmp-gold)">Craft skills docs</a>.</p>
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
      ["Craft skills docs", location.origin + "/docs/crafting"],
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
      case "boats": {
        const hulls = state.mounts.slice().sort((a, b) => {
          const aw = /boat|ship|raft|skiff|row/i.test(a.label) ? 0 : 1;
          const bw = /boat|ship|raft|skiff|row/i.test(b.label) ? 0 : 1;
          return aw - bw;
        });
        return `<div class="gmp-card"><h3>Hulls</h3>
          <p class="gmp-muted">ObjectStore mounts. Crew rides the selected hull. Watercraft first.</p>
          <div class="gmp-hulls">${hulls.map((h) => {
            const ic = asset(h.iconUrl);
            const on = state.boat === h.id;
            return `<button type="button" class="gmp-hull${on?" on":""}" data-boat="${esc(h.id)}">
              <div class="gmp-row">${ic?`<img class="icon" src="${esc(ic)}" alt="">`:""}<div>
                <div style="font-weight:600">${esc(h.label)}</div>
                <div class="gmp-mono">${/boat|ship|raft|skiff|row/i.test(h.label) ? "hull" : "mount"} · crew ${h.crew} · speed ${h.speed}</div>
              </div></div>
              <p class="gmp-muted" style="margin:8px 0 0">${esc(h.description)}</p>
            </button>`;
          }).join("") || '<p class="gmp-muted">No hulls in the catalog yet.</p>'}</div>
        </div>`;
      }
      case "crew": {
        const pool = crewPool();
        return `<div class="gmp-card"><h3>Crew</h3>
          <p class="gmp-muted">Each race-hand carries the compact inspect card. Board them onto the selected hull. Click a card to wear that loadout.</p>
          <div class="gmp-crewgrid">${pool.map((c) => {
            const aboard = state.crew.includes(c.id);
            return `<div class="gmp-crewcard${aboard?" on":""}">
              <div class="pick" data-wear-race="${esc(c.race)}" data-wear-class="${esc(c.classId)}">
                ${inspectHTML({ race: c.race, classId: c.classId, self: false, size: "crew", name: c.name, main: state.gear.main })}
              </div>
              <button type="button" class="gmp-chip" data-crew="${esc(c.id)}" style="align-self:center">${aboard ? "Leave" : "Board"}</button>
            </div>`;
          }).join("")}</div>
          <p class="gmp-muted" style="margin-top:10px">Self loadout is ${esc(raceLabel(state.race))} ${esc(classLabel(state.classId))}${state.boat ? " · hull " + esc((state.mounts.find((m)=>m.id===state.boat)||{}).label || "") : ""}.</p>
        </div>`;
      }
      case "pit": return `<div class="gmp-card"><h3>Grudge Pit</h3><p class="gmp-muted">WASD move, Space strike. Weapon skills 1–4, class 5–8.</p>
        <a class="gmp-chip" href="https://open.grudge-studio.com" style="display:inline-block;text-decoration:none">Open Pit</a></div>`;
      case "connections": return connectionsView();
      default: return equipmentView();
    }
  }

  function bindStage(root) {
    root.querySelectorAll(".gmp-chip[data-race]").forEach((b) => b.addEventListener("click", () => { state.race = b.dataset.race; render(); persist(); }));
    root.querySelectorAll(".gmp-chip[data-class]").forEach((b) => b.addEventListener("click", () => { state.classId = b.dataset.class; render(); persist(); }));
    root.querySelectorAll(".gmp-slot").forEach((b) => {
      b.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); openSlotMenu(e, b.dataset.slot); });
      b.addEventListener("contextmenu", (e) => openSlotMenu(e, b.dataset.slot));
      b.addEventListener("mouseenter", (e) => {
        const slot = b.dataset.slot;
        const item = gearItem(slot);
        const title = slot === "classBadge" ? classLabel(state.classId) : (item ? item.name : (GEAR_SLOTS.find((x)=>x[0]===slot)||[])[1]);
        const body = item ? ((item.lore || item.typeKey || item.material || "") + (item.skillSlots && item.skillSlots.length ? " · " + item.skillSlots.length + " skill slots" : "")) : "Empty · click for options";
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
        const w = weaponById(n.dataset.id) || armorById(n.dataset.id);
        if (w) tipShow(e, w.name, (w.typeKey || w.weaponType || w.material || "") + " · " + (w.lore || "WCS prefab"));
      });
      n.addEventListener("mouseleave", hideTip);
    });
    root.querySelectorAll("[data-boat]").forEach((b) => b.addEventListener("click", () => {
      state.boat = b.dataset.boat;
      try { localStorage.setItem("gmp_boat", state.boat); } catch (e) {}
      render();
    }));
    root.querySelectorAll("[data-crew]").forEach((b) => b.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = b.dataset.crew;
      if (state.crew.includes(id)) state.crew = state.crew.filter((x) => x !== id);
      else state.crew = state.crew.concat([id]);
      render();
    }));
    root.querySelectorAll("[data-wear-race]").forEach((b) => b.addEventListener("click", () => {
      if (b.dataset.wearRace) state.race = b.dataset.wearRace;
      if (b.dataset.wearClass) state.classId = b.dataset.wearClass;
      setTab("equipment");
      persist();
    }));
    root.querySelectorAll("[data-inspect]").forEach((b) => b.addEventListener("click", (e) => {
      e.stopPropagation();
      if (b.dataset.race) state.race = b.dataset.race;
      if (b.dataset.class) state.classId = b.dataset.class;
      setTab(b.dataset.inspect === "craft" ? "crafting" : "equipment");
      persist();
    }));
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
          <div class="gmp-card" style="padding:8px">${inspectHTML({ self: true, size: "crew", name: (state.character && state.character.name) || "You" })}</div>
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
    try { state.boat = localStorage.getItem("gmp_boat") || state.boat; } catch (e) {}
    render();
    Promise.all([loadSession(), loadCatalog()]).then(() => render());
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();
