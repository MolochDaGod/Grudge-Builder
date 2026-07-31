/**
 * Canonical weapon skill UI — loads master-weaponSkills.json (slot 1 primary/LMB,
 * slots 2–4 secondary / ability / ultimate with tier unlocks).
 *
 * Off-hand rules:
 *   SHIELD + TOME — toggle F replaces mainhand slots 1–3 only; slots 4–5 stay on main weapon
 *   All weapons share: 1=standard attack, 2–3=shared type pools, 4=signature, 5=passives
 */
(function (global) {
  const CDN = 'https://assets.grudge-studio.com';

  const CATEGORY_TO_TYPE = {
    swords: 'SWORD',
    greatswords: 'GREATSWORD',
    axes1h: 'AXE',
    greataxes: 'GREATAXE',
    daggers: 'DAGGER',
    bows: 'BOW',
    crossbows: 'CROSSBOW',
    guns: 'GUN',
    hammers1h: 'HAMMER',
    hammers2h: 'HAMMER',
    spears: 'SPEAR',
    shields: 'SHIELD',
    firestaves: 'STAFF',
    froststaves: 'STAFF',
    holystaves: 'STAFF',
    lightningstaves: 'STAFF',
    naturestaves: 'STAFF',
    staves: 'STAFF',
    staff: 'STAFF',
    'offhand-tome': 'TOME',
    tomes: 'TOME',
    tome: 'TOME',
    wands: 'WAND',
    wand: 'WAND',
    scythes: 'SCYTHE',
    scythe: 'SCYTHE',
    maces: 'MACE',
    tools: 'TOOL',
  };

  const ONE_HAND_TYPES = new Set(['SWORD', 'AXE', 'DAGGER', 'HAMMER', 'MACE', 'GUN', 'WAND']);
  const OFFHAND_MODIFIER_TYPES = new Set(['SHIELD', 'TOME']);
  const SHIELD_TYPE_KEYWORDS = {
    buckler: /buckler|wraithfang/i,
    tower: /bulwark|tower|grudge/i,
    spiked: /crimson|spike|emberclad/i,
    magic: /oathbreaker|magic|runic|arcane/i,
    relic: /relic|bastion|kinrend/i,
    kite: /kite|aegis|ward/i,
  };
  const SCHOOL_TO_MODE_FALLBACK = {
    fire: 'elemental',
    frost: 'elemental',
    lightning: 'elemental',
    nature: 'elemental',
    holy: 'heal',
    arcane: 'ranged',
  };

  const OFFHAND_TOGGLE_KEY = 'F';
  const OFFHAND_INJECT_SLOTS = ['primary', 'secondary', 'ability'];

  const SLOT_TYPES = ['primary', 'secondary', 'ability', 'ultimate'];
  const SLOT_HOTKEYS = ['1', '2', '3', '4', '5'];
  const SLOT_UI_LABELS = {
    primary: 'Slot 1 · Standard Attack',
    secondary: 'Slot 2 · Shared',
    ability: 'Slot 3 · Shared',
    ultimate: 'Slot 4 · Signature',
    passive: 'Slot 5 · Passives',
  };

  const T0_SLOT_UI_LABELS = {
    primary: 'Slot 1 · Starter Attack',
    secondary: 'Slot 2 · Starter Style',
    ability: 'Slot 3 · Choose One',
  };

  let catalog = null;
  let catalogById = {};
  let weaponsCatalog = null;
  let t0WeaponsData = null;
  /** @type {Record<string, object[]>} */
  let variantsByType = {};

  /** weapon type id → weapons.json category keys (for named variant lookup) */
  const TYPE_TO_CATEGORIES = {
    SWORD: ['swords'],
    AXE: ['axes1h'],
    GREATSWORD: ['greatswords'],
    GREATAXE: ['greataxes'],
    DAGGER: ['daggers'],
    BOW: ['bows'],
    CROSSBOW: ['crossbows'],
    GUN: ['guns'],
    HAMMER: ['hammers1h', 'hammers2h'],
    SPEAR: ['spears'],
    STAFF: ['fireStaves', 'frostStaves', 'holyStaves', 'lightningStaves', 'natureStaves', 'arcaneStaves'],
    WAND: ['wands'],
    MACE: ['maces'],
    SCYTHE: ['scythes'],
    TOOL: ['tools'],
    SHIELD: ['shields'],
    TOME: ['fireTomes', 'frostTomes', 'natureTomes', 'holyTomes', 'arcaneTomes', 'lightningTomes'],
  };

  function esc(s) {
    return s
      ? String(s)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
      : '';
  }

  function defaultAsset(url) {
    if (!url) return url;
    if (/^(https?:|data:|blob:)/i.test(url)) return url;
    if (url.startsWith('/icons/')) return `${CDN}${url}`;
    return url;
  }

  function normalizeCategory(raw) {
    return String(raw || '').toLowerCase().replace(/\s+/g, '');
  }

  function categoryToTypeId(category) {
    const key = normalizeCategory(category);
    if (CATEGORY_TO_TYPE[key]) return CATEGORY_TO_TYPE[key];
    if (key.endsWith('s')) {
      const singular = key.slice(0, -1);
      if (CATEGORY_TO_TYPE[singular]) return CATEGORY_TO_TYPE[singular];
    }
    return key ? key.toUpperCase() : null;
  }

  function resolveTypeFromWeapon(weapon) {
    if (!weapon) return null;
    return categoryToTypeId(weapon.category || weapon.weaponType || weapon.subType || weapon._weaponKey);
  }

  function isOffhandItem(weapon) {
    if (!weapon) return false;
    const cat = normalizeCategory(weapon.category || weapon.type);
    return cat === 'shields' || cat === 'offhand-tome' || cat === 'tomes' || cat === 'tome';
  }

  function isOneHandMainhand(weapon) {
    const typeId = resolveTypeFromWeapon(weapon);
    if (!typeId) return false;
    if (weapon?.subCategory === '2h') return false;
    return ONE_HAND_TYPES.has(typeId);
  }

  function resolveShieldType(shield) {
    if (!shield) return 'kite';
    const text = `${shield.name || ''} ${shield.id || ''} ${shield.description || ''}`;
    for (const [type, re] of Object.entries(SHIELD_TYPE_KEYWORDS)) {
      if (re.test(text)) return type;
    }
    if (shield.shieldType) return shield.shieldType;
    return 'kite';
  }

  function resolveTomeCouplingMode(tome) {
    if (!tome) return 'elemental';
    const school = (tome.school || tome.element || '').toLowerCase();
    const tomeDef = getTypeDef('TOME');
    const map = tomeDef?.mechanic?.schoolToMode || SCHOOL_TO_MODE_FALLBACK;
    if (school && map[school]) return map[school];
    const text = `${tome.name || ''}`.toLowerCase();
    if (/holy|light|divine|genesis/.test(text)) return 'heal';
    if (/arcane|spell|grimoire/.test(text)) return 'ranged';
    if (/verdant|growth|nature|buff/.test(text)) return 'buff';
    if (/fire|frost|ice|lightning|inferno|glacier/.test(text)) return 'elemental';
    return 'elemental';
  }

  function cloneTypeDef(base) {
    if (!base) return null;
    return JSON.parse(JSON.stringify(base));
  }

  function getShieldVariant(shieldType) {
    const def = getTypeDef('SHIELD');
    return def?.shieldTypes?.[shieldType] || def?.shieldTypes?.kite || null;
  }

  function getTomeCoupling(couplingMode) {
    const def = getTypeDef('TOME');
    return def?.couplingModes?.[couplingMode] || def?.couplingModes?.elemental || null;
  }

  function getOffhandModifierSlots(offhand, mainhand) {
    if (!offhand) return null;
    const offType = resolveTypeFromWeapon(offhand);
    if (offType === 'SHIELD') {
      const shieldType = resolveShieldType(offhand);
      const variant = getShieldVariant(shieldType);
      if (!variant) return null;
      return { kind: 'shield', title: variant.name || shieldType, slots: variant.slots, meta: { shieldType } };
    }
    if (offType === 'TOME') {
      if (!isOneHandMainhand(mainhand)) return null;
      const mode = resolveTomeCouplingMode(offhand);
      const coupling = getTomeCoupling(mode);
      if (!coupling) return null;
      return { kind: 'tome', title: coupling.name, slots: coupling.slots, meta: { mode } };
    }
    return null;
  }

  function buildFiveSlotFromRawSlots(rawSlots, variant) {
    const byType = Object.fromEntries((rawSlots || []).map((s) => [s.type, s]));
    const next = [];
    if (byType.primary) {
      next.push({
        ...byType.primary,
        label: SLOT_UI_LABELS.primary,
        skills: pickStandardAttack(byType.primary.skills, variant),
      });
    }
    if (byType.secondary) {
      next.push({ ...byType.secondary, label: SLOT_UI_LABELS.secondary, skills: [...(byType.secondary.skills || [])] });
    }
    if (byType.ability) {
      next.push({ ...byType.ability, label: SLOT_UI_LABELS.ability, skills: [...(byType.ability.skills || [])] });
    }
    if (byType.ultimate) {
      next.push({
        ...byType.ultimate,
        label: SLOT_UI_LABELS.ultimate,
        skills: pickSignature(byType.ultimate.skills, variant),
      });
    }
    return next;
  }

  /** Merge mainhand five-slot + optional F-toggle off-hand override (slots 1–3 only) */
  function resolveEffectiveLoadout(mainhand, offhand, opts = {}) {
    const playerTier = opts.playerTier ?? mainhand?.tier ?? 1;
    const offhandToggleActive = opts.offhandToggleActive ?? opts.blockActive ?? false;
    const mainTypeId = resolveTypeFromWeapon(mainhand);
    const baseDef = getTypeDef(mainTypeId);
    const mainVariant = opts.mainVariant || null;
    let mainDef = applyVariantToTypeDef(cloneTypeDef(baseDef), mainVariant);

    if (!mainDef) {
      return { typeDef: null, mainTypeId, modifiers: [], banner: null, offhandToggleActive };
    }

    const modifiers = [];
    let banner = null;

    if (offhand && isOffhandItem(offhand) && offhandToggleActive) {
      const source = getOffhandModifierSlots(offhand, mainhand);
      if (source) {
        const offSlots = buildFiveSlotFromRawSlots(source.slots, offhand);
        modifiers.push({ kind: source.kind, ...source.meta, source });
        banner = {
          kind: source.kind,
          title: `${OFFHAND_TOGGLE_KEY} · ${source.title}`,
          detail:
            'Off-hand replaces slots 1–3. Slot 4 (signature) and slot 5 (passives) stay on your main weapon.',
        };
        for (const slotType of OFFHAND_INJECT_SLOTS) {
          const modSlot = offSlots.find((s) => s.type === slotType);
          const baseSlot = mainDef.slots?.find((s) => s.type === slotType);
          if (modSlot && baseSlot) {
            baseSlot.skills = modSlot.skills.map((sk) => ({
              ...sk,
              _modifier: source.kind,
              _offhandToggle: OFFHAND_TOGGLE_KEY,
            }));
            baseSlot.label = `${SLOT_UI_LABELS[slotType]} · ${OFFHAND_TOGGLE_KEY}`;
          }
        }
      }
    }

    return { typeDef: mainDef, mainTypeId, modifiers, banner, playerTier, offhandToggleActive };
  }

  async function loadCatalog(apiBases) {
    const bases = Array.isArray(apiBases) ? apiBases : ['./api/v1'];
    for (const base of bases) {
      try {
        const res = await fetch(`${base.replace(/\/$/, '')}/master-weaponSkills.json`);
        if (!res.ok) continue;
        catalog = await res.json();
        catalogById = {};
        (catalog.weaponTypes || []).forEach((wt) => {
          catalogById[wt.id] = wt;
        });
        return catalog;
      } catch {
        /* try next */
      }
    }
    catalog = null;
    catalogById = {};
    return null;
  }

  function parseAbilityName(str) {
    if (!str) return null;
    return String(str).replace(/\s*\([^)]*\)\s*/g, ' ').trim().split(/\s{2,}/)[0].trim() || null;
  }

  function normalizeSkillKey(name) {
    return String(name || '')
      .toLowerCase()
      .replace(/['']/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function skillNameMatches(skillName, allowedKeys) {
    const key = normalizeSkillKey(skillName);
    if (!key) return false;
    for (const allowed of allowedKeys) {
      if (key === allowed) return true;
      if (key.includes(allowed) || allowed.includes(key)) return true;
    }
    return false;
  }

  function collectVariantSkillKeys(variant) {
    const keys = new Set();
    const add = (raw) => {
      const name = parseAbilityName(raw);
      if (name) keys.add(normalizeSkillKey(name));
    };
    if (variant.basicAbility) add(variant.basicAbility);
    (variant.abilities || []).forEach(add);
    if (variant.signatureAbility) add(variant.signatureAbility);
    return keys;
  }

  function normalizeWeaponVariant(item, isT0) {
    return {
      id: item.id,
      name: item.name,
      lore: item.lore || item.description || '',
      tier: isT0 ? 0 : 1,
      tierLabel: isT0 ? 'T0 Starter' : 'Named',
      icon: item.spritePath || item.iconUrl || null,
      category: item.category,
      stats: item.stats || null,
      basicAbility: item.basicAbility || null,
      abilities: item.abilities || [],
      signatureAbility: item.signatureAbility || null,
      passives: item.passives || [],
      craftingRecipe: item.craftingRecipe || null,
      usedInT1Crafting: item.usedInT1Crafting !== false,
      weaponSkills: item.weaponSkills || null,
      skills: item.skills || null,
      slotPattern: item.slotPattern || item.skills?.slotPattern || null,
      isT0: !!isT0,
    };
  }

  function isStarterPattern(typeDef) {
    const p = typeDef?.slotPattern;
    return p === 'three-slot-starter' || p === 'gather-starter';
  }

  function slotsFromT0Variant(variant) {
    const raw = variant?.skills?.slots;
    if (!raw?.length) return null;
    return raw.map((slot) => ({
      type: slot.type,
      label: slot.label,
      unlockTier: slot.unlockTier ?? 0,
      fixed: slot.fixed,
      choice: slot.choice,
      skills: slot.skills?.length
        ? slot.skills
        : (slot.skillIds || []).map((id) => ({ id, name: id, tier: 0 })),
    }));
  }

  function buildVariantsIndex(t0Payload) {
    variantsByType = {};

    for (const w of t0Payload?.weapons || []) {
      const typeId = categoryToTypeId(w.category);
      if (!typeId) continue;
      if (!variantsByType[typeId]) variantsByType[typeId] = [];
      variantsByType[typeId].push(normalizeWeaponVariant(w, true));
    }

    if (weaponsCatalog?.categories) {
      for (const [catKey, cat] of Object.entries(weaponsCatalog.categories)) {
        const typeId = categoryToTypeId(catKey);
        if (!typeId || OFFHAND_MODIFIER_TYPES.has(typeId)) continue;
        for (const item of cat.items || []) {
          if (!variantsByType[typeId]) variantsByType[typeId] = [];
          variantsByType[typeId].push(normalizeWeaponVariant({ ...item, category: catKey }, false));
        }
      }
    }

    // Apprentice Wand (WAND T0) is the generic mage starter before T1 staff specialization
    const wandT0 = (variantsByType.WAND || []).find((v) => v.isT0);
    if (wandT0 && variantsByType.STAFF && !variantsByType.STAFF.some((v) => v.id === wandT0.id)) {
      variantsByType.STAFF.unshift({ ...wandT0, lore: wandT0.lore + ' (generic mage starter — branches into elemental staves at T1)' });
    }

    for (const typeId of Object.keys(variantsByType)) {
      variantsByType[typeId].sort((a, b) => {
        if (a.isT0 !== b.isT0) return a.isT0 ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
    }
  }

  async function loadWeaponsCatalog(apiBases) {
    const bases = Array.isArray(apiBases) ? apiBases : ['./api/v1'];
    weaponsCatalog = null;
    t0WeaponsData = null;

    for (const base of bases) {
      const b = base.replace(/\/$/, '');
      try {
        if (!weaponsCatalog) {
          const res = await fetch(`${b}/weapons.json`);
          if (res.ok) weaponsCatalog = await res.json();
        }
        if (!t0WeaponsData) {
          const res = await fetch(`${b}/t0-weapons.json`);
          if (res.ok) t0WeaponsData = await res.json();
        }
        if (weaponsCatalog && t0WeaponsData) break;
      } catch {
        /* try next source */
      }
    }

    buildVariantsIndex(t0WeaponsData);
    return { weapons: weaponsCatalog, t0: t0WeaponsData, variantsByType };
  }

  function listVariantsForType(typeId) {
    return variantsByType[typeId] || [];
  }

  function getVariant(typeId, variantId) {
    if (!variantId) return null;
    return (variantsByType[typeId] || []).find((v) => v.id === variantId) || null;
  }

  function getDefaultVariantId(typeId, preferT0 = false) {
    const list = listVariantsForType(typeId);
    if (!list.length) return null;
    if (preferT0) {
      const t0 = list.find((v) => v.isT0);
      if (t0) return t0.id;
    }
    return list[0].id;
  }

  function pickStandardAttack(primarySkills, variant) {
    const pool = primarySkills || [];
    if (!pool.length) return [];
    if (variant?.basicAbility) {
      const key = normalizeSkillKey(parseAbilityName(variant.basicAbility));
      const matched = pool.find((sk) => skillNameMatches(sk.name, [key]));
      if (matched) return [matched];
    }
    const tier1 = pool.find((sk) => sk.tier <= 1) || pool[0];
    return tier1 ? [tier1] : [];
  }

  function pickSignature(ultimateSkills, variant) {
    const pool = ultimateSkills || [];
    if (!pool.length) return [];
    const sigRaw = variant?.signatureAbility || variant?.signature;
    if (sigRaw) {
      const sigKey = normalizeSkillKey(parseAbilityName(sigRaw));
      const sigSlug = sigKey.replace(/\s+/g, '_');
      const exact = pool.find((sk) => normalizeSkillKey(sk.name) === sigKey);
      if (exact) return [exact];
      const idMatch = pool.find((sk) => sk.id?.endsWith(`_${sigSlug}`));
      if (idMatch) return [idMatch];
      const matched = pool.find((sk) => skillNameMatches(sk.name, [sigKey]));
      if (matched) return [matched];
    }
    const first = pool.find((sk) => sk.tier <= 1) || pool[0];
    return first ? [first] : [];
  }

  /** 5-slot pattern: 1=standard attack, 2–3=shared type pools, 4=signature, 5=passives */
  function applyVariantToTypeDef(typeDef, variant) {
    if (!typeDef) return null;
    const cloned = cloneTypeDef(typeDef);
    if (!variant) return cloned;

    cloned._variant = variant;
    cloned._passives = variant.passives || [];
    const byType = Object.fromEntries((cloned.slots || []).map((s) => [s.type, s]));

    if (variant.isT0) {
      const fromWeapon = slotsFromT0Variant(variant);
      if (fromWeapon?.length >= 3) {
        cloned.slots = fromWeapon;
        cloned.slotPattern = variant.slotPattern || variant.skills?.slotPattern || 'three-slot-starter';
        cloned._passives = [];
        return cloned;
      }
      const starter = cloned.starterSlots || [];
      if (starter.length >= 3) {
        cloned.slots = JSON.parse(JSON.stringify(starter));
        cloned.slotPattern = variant.slotPattern || 'three-slot-starter';
        cloned._passives = [];
        return cloned;
      }
      cloned.slotPattern = 'three-slot-starter';
      cloned.slots = [
        {
          ...(byType.primary || { type: 'primary' }),
          label: T0_SLOT_UI_LABELS.primary,
          unlockTier: 0,
          fixed: true,
          skills: pickStandardAttack(byType.primary?.skills, variant),
        },
      ];
      cloned._passives = [];
      return cloned;
    }

    cloned.slotPattern = 'five-slot';

    const nextSlots = [];
    if (byType.primary) {
      nextSlots.push({
        ...byType.primary,
        label: SLOT_UI_LABELS.primary,
        skills: pickStandardAttack(byType.primary.skills, variant),
      });
    }
    if (byType.secondary) {
      nextSlots.push({
        ...byType.secondary,
        label: SLOT_UI_LABELS.secondary,
        skills: [...(byType.secondary.skills || [])],
      });
    }
    if (byType.ability) {
      nextSlots.push({
        ...byType.ability,
        label: SLOT_UI_LABELS.ability,
        skills: [...(byType.ability.skills || [])],
      });
    }
    if (byType.ultimate) {
      nextSlots.push({
        ...byType.ultimate,
        label: SLOT_UI_LABELS.ultimate,
        skills: pickSignature(byType.ultimate.skills, variant),
      });
    }

    cloned.slots = nextSlots;
    return cloned;
  }

  function renderWeaponVariantBar(typeId, opts = {}) {
    const variants = listVariantsForType(typeId);
    if (!variants.length) {
      return '<div class="wst-variant-empty">No named variants loaded for this weapon type. (Need weapons.json + t0-weapons.json)</div>';
    }

    const selected = opts.variantId || variants[0].id;
    const asset = opts.asset || defaultAsset;
    const typeDef = getTypeDef(typeId);
    const fallbackIcon = typeDef?.icon ? asset(typeDef.icon) : '';

    let html = '<div class="wst-variant-section">';
    html += '<span class="wst-variant-label">Weapon sub-type:</span>';
    html += '<div class="wst-variant-bar">';

    for (const v of variants) {
      const active = v.id === selected ? ' active' : '';
      const tierTag = v.isT0 ? ' <span class="wst-tier-tag">T0</span>' : '';
      const iconSrc = v.icon ? asset(v.icon) : fallbackIcon;
      const iconHtml = iconSrc
        ? `<img class="wst-variant-icon" src="${esc(iconSrc)}" alt="" onerror="this.style.display='none'">`
        : '';
      html += `<button type="button" class="wst-variant-btn${active}" data-wst-weapon-variant="${esc(v.id)}" title="${esc(v.lore || v.name)}">${iconHtml}<span class="wst-variant-name">${esc(v.name)}</span>${tierTag}</button>`;
    }

    html += '</div></div>';
    return html;
  }

  function renderWeaponInfoHeader(typeDef, variant, opts = {}) {
    if (!variant) return '';
    const asset = opts.asset || defaultAsset;
    const icon = variant.icon ? asset(variant.icon) : asset(typeDef?.icon);
    const tierBadge = variant.isT0
      ? '<span class="wst-weapon-tier t0">T0 Starter</span>'
      : '<span class="wst-weapon-tier">Named Weapon</span>';

    let statsHtml = '';
    const stats = variant.stats;
    if (stats) {
      const entries = [];
      if (stats.damageBase != null) entries.push(['DMG', stats.damageBase]);
      else if (stats.damage != null) entries.push(['DMG', stats.damage]);
      if (stats.critBase != null) entries.push(['CRIT', stats.critBase + '%']);
      else if (stats.crit != null) entries.push(['CRIT', stats.crit + '%']);
      if (stats.defenseBase != null) entries.push(['DEF', stats.defenseBase]);
      else if (stats.defense != null) entries.push(['DEF', stats.defense]);
      statsHtml = `<div class="wst-weapon-stats">${entries
        .map(([k, v]) => `<span class="wst-stat"><b>${esc(k)}</b> ${esc(String(v))}</span>`)
        .join('')}</div>`;
    }

    return `<div class="wst-weapon-header">
      ${icon ? `<img class="wst-weapon-icon" src="${esc(icon)}" alt="" onerror="this.style.display='none'">` : ''}
      <div class="wst-weapon-meta">
        <div class="wst-weapon-title">${esc(variant.name)} ${tierBadge}</div>
        <div class="wst-weapon-lore">${esc(variant.lore)}</div>
        ${statsHtml}
      </div>
    </div>`;
  }

  function renderPassiveColumn(variant, opts = {}) {
    const passives = variant?.passives || [];
    if (!passives.length) return '';

    const parsed = passives.map((p) => {
      const name = parseAbilityName(p);
      const desc = p.includes('(') ? p.slice(p.indexOf('(') + 1).replace(/\)$/, '') : '';
      return { name: name || p, desc };
    });

    let html = '<div class="wst-passive-column"><div class="slot-header" data-type="passive">PASSIVES<span class="unlock-tag">Choose 1 of ' + parsed.length + '</span></div>';
    for (const p of parsed) {
      html += `<div class="skill-card" data-slot="passive">
        <div class="skill-icon-row"><span class="skill-name">${esc(p.name)}</span></div>
        ${p.desc ? `<div class="skill-desc">${esc(p.desc)}</div>` : ''}
      </div>`;
    }
    html += '</div>';
    return html;
  }

  function setCatalog(data) {
    catalog = data;
    catalogById = {};
    (catalog?.weaponTypes || []).forEach((wt) => {
      catalogById[wt.id] = wt;
    });
  }

  function getTypeDef(typeId) {
    return typeId ? catalogById[typeId] || null : null;
  }

  function listTypeIds() {
    return (catalog?.weaponTypes || []).map((w) => w.id);
  }

  function listPlayableTypeIds() {
    return listTypeIds().filter((id) => !OFFHAND_MODIFIER_TYPES.has(id));
  }

  function defaultSelections(typeDef, playerTier, variant) {
    const sel = { primary: null, secondary: null, ability: null, ultimate: null };
    if (!typeDef) return sel;
    if (variant?.skills?.defaultSelections && isStarterPattern(typeDef)) {
      const ds = variant.skills.defaultSelections;
      sel.primary = ds.primary || null;
      sel.secondary = ds.secondary || null;
      sel.ability = ds.ability || null;
      return sel;
    }
    const slotTypes = isStarterPattern(typeDef) ? ['primary', 'secondary', 'ability'] : SLOT_TYPES;
    slotTypes.forEach((slotType) => {
      const slot = typeDef.slots?.find((s) => s.type === slotType);
      if (!slot || playerTier < (slot.unlockTier ?? 1)) return;
      const unlocked = slot.skills.filter((sk) => playerTier >= sk.tier);
      if (unlocked.length) sel[slotType] = unlocked[0].id;
    });
    if (isStarterPattern(typeDef)) {
      ['primary', 'secondary', 'ability'].forEach((slotType) => {
        if (!sel[slotType]) {
          const slot = typeDef.slots?.find((s) => s.type === slotType);
          if (slot?.skills?.[0]) sel[slotType] = slot.skills[0].id;
        }
      });
    }
    return sel;
  }

  function getT0AutoSelections(typeDef) {
    return defaultSelections(typeDef, 0);
  }

  function findSkill(typeDef, slotType, skillId) {
    const slot = typeDef?.slots?.find((s) => s.type === slotType);
    return slot?.skills?.find((s) => s.id === skillId) || null;
  }

  function renderModifierBanner(banner) {
    if (!banner) return '';
    const cls = banner.kind === 'shield' ? 'wst-banner-shield' : 'wst-banner-tome';
    return `<div class="wst-modifier-banner ${cls}">
      <strong>${esc(banner.title)}</strong>
      <span>${esc(banner.detail)}</span>
    </div>`;
  }

  function renderSkillCard(skill, slotType, opts) {
    const asset = opts.asset || defaultAsset;
    const isSelected = opts.selectedSkills?.[slotType] === skill.id;
    const isSlotUnlocked = opts.playerTier >= (opts.slotUnlockTier || 1);
    const isSkillUnlocked = isSlotUnlocked && opts.playerTier >= skill.tier;
    const locked = !isSkillUnlocked;

    const dmgText =
      skill.damage < 0
        ? `<span class="value heal">Heal ${Math.abs(skill.damage)}</span>`
        : skill.damage > 0
          ? `<span class="value dmg">${skill.damage}</span>`
          : `<span class="value" style="color:var(--text-muted)">—</span>`;

    const castText = skill.castTime ? `${skill.castTime}s` : 'Instant';
    const rangeText = skill.range ? `${skill.range}m` : '—';
    const dmgTypeClass = skill.damageType || 'physical';
    const icon = asset(skill.icon);

    const modTag =
      skill._modifier === 'shield'
        ? '<span class="meta-tag shield-mod">While Blocking</span>'
        : skill._modifier === 'tome'
          ? '<span class="meta-tag tome-mod">Tome Coupled</span>'
          : '';

    const isFixedSlot = opts.slotFixed && !opts.slotChoice;
    const clickAttr =
      locked || (isFixedSlot && opts.selectedSkills?.[slotType] === skill.id)
        ? isFixedSlot && !locked
          ? ` data-wst-select="${esc(slotType)}" data-wst-skill="${esc(skill.id)}" data-wst-fixed="1"`
          : locked
            ? ''
            : ` data-wst-select="${esc(slotType)}" data-wst-skill="${esc(skill.id)}"`
        : ` data-wst-select="${esc(slotType)}" data-wst-skill="${esc(skill.id)}"`;

    const fixedTag = isFixedSlot ? '<span class="meta-tag starter-fixed">Fixed</span>' : '';

    return `<div class="skill-card${isSelected ? ' selected' : ''}${locked ? ' locked' : ''}" data-slot="${esc(slotType)}"${clickAttr}>
      ${isSelected ? '<div class="selected-check">✓</div>' : ''}
      <div class="skill-icon-row">
        <div class="skill-icon"><img src="${esc(icon)}" alt="${esc(skill.name)}" loading="lazy" onerror="this.style.display='none'"></div>
        <span class="skill-name">${esc(skill.name)}</span>
        <span class="skill-tier-tag">T${skill.tier}</span>
      </div>
      <div class="skill-desc">${esc(skill.description)}</div>
      <div class="skill-stats">
        <div class="skill-stat"><span class="label">DMG</span> ${dmgText}</div>
        <div class="skill-stat"><span class="label">CD</span> <span class="value cd">${skill.cooldown > 0 ? skill.cooldown + 's' : '—'}</span></div>
        <div class="skill-stat"><span class="label">Cast</span> <span class="value cast">${castText}</span></div>
        <div class="skill-stat"><span class="label">Range</span> <span class="value range">${rangeText}</span></div>
      </div>
      <div class="skill-meta">
        ${fixedTag}
        ${modTag}
        ${skill.damageType ? `<span class="meta-tag ${esc(dmgTypeClass)}">${esc(skill.damageType)}</span>` : ''}
        ${skill.projectile ? `<span class="meta-tag proj">${esc(skill.projectile)}</span>` : ''}
        ${skill.physics ? `<span class="meta-tag phys">${esc(skill.physics)}</span>` : ''}
      </div>
      <div class="skill-effects">${(skill.effects || []).map((e) => `<span class="effect-tag">${esc(e)}</span>`).join('')}</div>
    </div>`;
  }

  function renderT0CraftBanner(variant) {
    if (!variant?.isT0) return '';
    const recipe = variant.craftingRecipe;
    const mats = (recipe?.materials || [])
      .map((m) => `${m.quantity}× ${m.id}`)
      .join(' · ');
    const station = recipe?.station || 'Anywhere';
    return `<div class="wst-t0-craft-banner">
      <strong>T0 Starter — no tier upgrades</strong>
      <span>Craft a <strong>T1</strong> weapon of this style using this starter${mats ? ` + <em>${esc(mats)}</em>` : ''} at <em>${esc(station)}</em>.</span>
      <span class="wst-t0-note">Slots 1–2 auto-assigned · slot 3 choose one · all skills are T0 only · craft T1 to unlock the five-slot loadout</span>
    </div>`;
  }

  function renderActionBarHTML(typeDef, opts) {
    const asset = opts.asset || defaultAsset;
    const playerTier = opts.playerTier ?? 1;
    const selected = opts.selectedSkills || defaultSelections(typeDef, playerTier);
    if (!typeDef) return '';

    const starter = isStarterPattern(typeDef);
    const barSlots = starter ? ['primary', 'secondary', 'ability'] : SLOT_TYPES;

    let html = '';
    barSlots.forEach((slotType, i) => {
      const slot = typeDef.slots.find((s) => s.type === slotType);
      const isUnlocked = slot && playerTier >= slot.unlockTier;
      const selectedId = selected[slotType];
      const skill = selectedId ? findSkill(typeDef, slotType, selectedId) : null;
      const icon = skill ? asset(skill.icon) : '';

      html += `<div class="action-slot" data-type="${esc(slotType)}" style="${isUnlocked ? '' : 'opacity:0.4'}">
        <div class="slot-num">${i + 1}</div>
        ${skill
          ? `<img src="${esc(icon)}" alt="${esc(skill.name)}" onerror="this.style.display='none'">`
          : `<span style="color:var(--text-muted);font-size:1.5em;">${isUnlocked ? '—' : '🔒'}</span>`}
        <div class="slot-label">${esc((starter ? T0_SLOT_UI_LABELS : SLOT_UI_LABELS)[slotType] || slotType)}</div>
      </div>`;
    });

    if (starter) return html;

    const passives = typeDef._passives || typeDef._variant?.passives || [];
    const passiveLabel = passives.length
      ? parseAbilityName(passives[0]) || 'Passive'
      : '—';
    html += `<div class="action-slot" data-type="passive" style="${passives.length ? '' : 'opacity:0.35;border-color:var(--stone)'}">
      <div class="slot-num">5</div>
      <span style="color:var(--text-muted);font-size:0.75em;text-align:center;padding:4px;line-height:1.2;">${esc(passiveLabel)}</span>
      <div class="slot-label">${esc(SLOT_UI_LABELS.passive)}</div>
    </div>`;

    return html;
  }

  function renderSlotColumnsHTML(typeDef, opts) {
    const playerTier = opts.playerTier ?? 1;
    const selected = opts.selectedSkills || {};
    if (!typeDef) {
      return '<div class="wst-empty">No weapon skill data for this type.</div>';
    }

    let html = '';
    typeDef.slots.forEach((slot) => {
      const isSlotUnlocked = playerTier >= slot.unlockTier;
      const autoTag =
        slot.autoAssigned || (isStarterPattern(typeDef) && slot.fixed && !slot.choice)
          ? '<span class="unlock-tag">Auto</span>'
          : '';
      const choiceTag = slot.choice ? '<span class="unlock-tag">Choose 1</span>' : '';
      const unlockTag = isStarterPattern(typeDef)
        ? autoTag || choiceTag || '<span class="unlock-tag">T0</span>'
        : `<span class="unlock-tag">${isSlotUnlocked ? '✓ Unlocked' : `Requires Tier ${slot.unlockTier}`}</span>`;

      html += `<div class="slot-column">
        <div class="slot-header" data-type="${esc(slot.type)}">
          ${esc(slot.label || slot.type)}
          ${unlockTag}
        </div>`;

      slot.skills.forEach((skill) => {
        html += renderSkillCard(skill, slot.type, {
          asset: opts.asset,
          playerTier,
          selectedSkills: selected,
          slotUnlockTier: slot.unlockTier ?? 0,
          slotFixed: !!(slot.fixed || slot.autoAssigned) && !slot.choice,
          slotChoice: !!slot.choice,
        });
      });

      if (!isStarterPattern(typeDef)) {
        html += `<div class="wst-slot-placeholder">Higher tier options unlock as your weapon tier increases…</div>`;
      }
      html += `</div>`;
    });
    return html;
  }

  /** Render offhand modifier browser (SHIELD types or TOME coupling modes) — five-slot subset for F toggle */
  function renderOffhandModifierColumns(typeId, opts = {}) {
    const def = getTypeDef(typeId);
    if (!def) return '<div class="wst-empty">Off-hand data not loaded.</div>';

    const asset = opts.asset || defaultAsset;
    const playerTier = opts.playerTier ?? 3;
    const selectedKey = opts.variantKey || (typeId === 'SHIELD' ? 'kite' : 'elemental');
    const toggleOn = opts.offhandToggleActive === true;

    if (!toggleOn) {
      return `<div class="wst-modifier-intro">Press <strong>${OFFHAND_TOGGLE_KEY}</strong> (or use the toggle above) to preview off-hand skills. When inactive, your <strong>main weapon</strong> slots 1–3 are used.</div>`;
    }

    if (playerTier === 0 && def.starterSlots?.length) {
      const pseudo = { slots: JSON.parse(JSON.stringify(def.starterSlots)), slotPattern: 'three-slot-starter', _passives: [] };
      const intro = `<div class="wst-modifier-intro"><strong>T0 ${esc(def.name)}</strong> — starter cantrips (slots 1–3). Craft T1 tomes from Novice Tome + materials.</div>`;
      return `${intro}${renderSlotColumnsHTML(pseudo, { asset, playerTier: 0, selectedSkills: defaultSelections(pseudo, 0) })}`;
    }

    let rawSlots = null;
    let title = '';
    if (typeId === 'SHIELD') {
      const variant = def.shieldTypes?.[selectedKey];
      if (!variant) return '<div class="wst-empty">Unknown shield type.</div>';
      rawSlots = variant.slots;
      title = variant.name;
    } else if (typeId === 'TOME') {
      const coupling = def.couplingModes?.[selectedKey];
      if (!coupling) return '<div class="wst-empty">Unknown tome coupling mode.</div>';
      rawSlots = coupling.slots;
      title = coupling.name;
    }

    const injectSlots = buildFiveSlotFromRawSlots(rawSlots, null).filter((s) =>
      OFFHAND_INJECT_SLOTS.includes(s.type),
    );
    const pseudo = { slots: injectSlots, _passives: [] };
    const intro = `<div class="wst-modifier-intro"><strong>${OFFHAND_TOGGLE_KEY} active · ${esc(title)}</strong> — injects into <strong>mainhand slots 1–3</strong>. Slots <strong>4–5</strong> remain your main weapon signature + passives when paired.</div>`;
    return `${intro}${renderSlotColumnsHTML(pseudo, { asset, playerTier, selectedSkills: {} })}`;
  }

  /** Paired loadout controls — preview mainhand + shield/tome with F toggle */
  function renderPairedLoadoutBar(opts = {}) {
    const offhand = opts.pairedOffhand || 'none';
    const toggleOn = opts.offhandToggleActive === true;
    const shieldKey = opts.shieldKey || 'kite';
    const tomeKey = opts.tomeKey || 'elemental';

    let html = '<div class="wst-paired-bar">';
    html += '<span class="wst-variant-label">Paired off-hand:</span>';
    html += '<div class="wst-variant-bar">';
    for (const [id, label] of [
      ['none', 'None'],
      ['shield', 'Shield'],
      ['tome', 'Tome (1H)'],
    ]) {
      html += `<button type="button" class="wst-variant-btn${offhand === id ? ' active' : ''}" data-wst-paired="${esc(id)}">${esc(label)}</button>`;
    }
    html += '</div>';

    if (offhand === 'shield') {
      const def = getTypeDef('SHIELD');
      html += '<div class="wst-variant-bar wst-paired-sub">';
      for (const [key, variant] of Object.entries(def?.shieldTypes || {})) {
        html += `<button type="button" class="wst-variant-btn${key === shieldKey ? ' active' : ''}" data-wst-paired-shield="${esc(key)}">${esc(variant.name)}</button>`;
      }
      html += '</div>';
    }
    if (offhand === 'tome') {
      const def = getTypeDef('TOME');
      html += '<div class="wst-variant-bar wst-paired-sub">';
      for (const [key, mode] of Object.entries(def?.couplingModes || {})) {
        html += `<button type="button" class="wst-variant-btn${key === tomeKey ? ' active' : ''}" data-wst-paired-tome="${esc(key)}">${esc(mode.name)}</button>`;
      }
      html += '</div>';
    }

    if (offhand !== 'none') {
      html += `<label class="wst-paired-toggle"><input type="checkbox" id="pairedOffhandToggle" ${toggleOn ? 'checked' : ''}>
        <kbd>${OFFHAND_TOGGLE_KEY}</kbd> active — off-hand replaces slots 1–3</label>`;
    }
    html += '</div>';
    return html;
  }

  function buildPairedOffhandItem(mode, opts = {}) {
    if (mode === 'shield') {
      const key = opts.shieldKey || 'kite';
      const def = getShieldVariant(key);
      return { name: def?.name || 'Shield', category: 'shields', id: `preview-shield-${key}`, shieldType: key };
    }
    if (mode === 'tome') {
      const key = opts.tomeKey || 'elemental';
      const def = getTomeCoupling(key);
      const schoolMap = { elemental: 'fire', heal: 'holy', buff: 'nature', ranged: 'arcane' };
      return { name: def?.name || 'Tome', category: 'fireTomes', id: `preview-tome-${key}`, school: schoolMap[key] || 'fire' };
    }
    return null;
  }

  function renderOffhandVariantBar(typeId, opts = {}) {
    const def = getTypeDef(typeId);
    if (!def) return '';

    const selected = opts.variantKey || '';
    let html = '<div class="wst-variant-bar">';

    if (typeId === 'SHIELD') {
      for (const [key, variant] of Object.entries(def.shieldTypes || {})) {
        html += `<button type="button" class="wst-variant-btn${key === selected ? ' active' : ''}" data-wst-variant="${esc(key)}">${esc(variant.name)}</button>`;
      }
    } else if (typeId === 'TOME') {
      for (const [key, mode] of Object.entries(def.couplingModes || {})) {
        html += `<button type="button" class="wst-variant-btn${key === selected ? ' active' : ''}" data-wst-variant="${esc(key)}">${esc(mode.name)}</button>`;
      }
    }

    html += '</div>';
    return html;
  }

  /** Compact panel for main-panel.html Skills tab */
  function renderEquippedWeaponPanel(mainhand, opts) {
    const asset = opts.asset || defaultAsset;
    const offhand = opts.offhand || null;
    const playerTier = opts.playerTier ?? mainhand?.tier ?? 1;
    const loadout = resolveEffectiveLoadout(mainhand, offhand, {
      playerTier,
      offhandToggleActive: opts.offhandToggleActive ?? opts.blockActive ?? false,
    });
    const { typeDef, mainTypeId, banner } = loadout;

    if (!typeDef) {
      return `<div class="wst-empty">No canonical skill set for <strong>${esc(mainhand?.category || 'unknown')}</strong>.
        <br><span style="font-size:10px;color:var(--dim)">Expected type <code>${esc(mainTypeId || '?')}</code> in master-weaponSkills.json</span></div>`;
    }

    const selected = opts.selectedSkills || defaultSelections(typeDef, playerTier);
    const icon = mainhand.iconUrl ? asset(mainhand.iconUrl) : asset(typeDef.icon);

    let html = `<div class="wst-header">
      ${icon ? `<img class="wst-icon" src="${esc(icon)}" alt="" onerror="this.style.display='none'">` : ''}
      <div>
        <div class="wst-title">${esc(mainhand.name)}</div>
        <div class="wst-lore">${esc(mainhand.lore || mainhand.description || '')}</div>
        <div class="wst-meta"><span style="color:var(--gold)">${esc(typeDef.name)} · T${playerTier}</span></div>
      </div>
    </div>`;

    if (offhand) {
      html += `<div class="wst-offhand-chip">Off-hand: <strong>${esc(offhand.name)}</strong></div>`;
    }
    html += renderModifierBanner(banner);
    html += `<div class="wst-action-bar-compact">${renderActionBarHTML(typeDef, { asset, playerTier, selectedSkills: selected })}</div>`;
    html += `<div class="slot-columns wst-compact-cols">${renderSlotColumnsHTML(typeDef, { asset, playerTier, selectedSkills: selected })}</div>`;
    html += `<div style="margin-top:10px;font-size:9px;color:var(--dim);text-align:center">
      1=standard · 2–3=shared · 4=signature · 5=passives · ${OFFHAND_TOGGLE_KEY}=off-hand slots 1–3 (shield/tome) ·
      <a href="./WEAPON_SKILLS.html" style="color:var(--gold)">Full browser</a></div>`;
    return html;
  }

  function getHotbarSkills(mainhand, playerTier, opts = {}) {
    const offhand = opts.offhand || null;
    const loadout = resolveEffectiveLoadout(mainhand, offhand, {
      playerTier,
      offhandToggleActive: opts.offhandToggleActive ?? opts.blockActive ?? false,
    });
    const typeDef = loadout.typeDef;
    if (!typeDef) return [];
    const selected = defaultSelections(typeDef, playerTier);
    const asset = opts.asset || defaultAsset;
    return SLOT_TYPES.map((slotType, i) => {
      const skill = findSkill(typeDef, slotType, selected[slotType]);
      return {
        key: SLOT_HOTKEYS[i],
        slotType,
        skill,
        icon: skill ? asset(skill.icon) : null,
        label: skill?.name || SLOT_UI_LABELS[slotType],
        modifier: skill?._modifier || null,
      };
    });
  }

  global.WeaponSkillTree = {
    CDN,
    CATEGORY_TO_TYPE,
    TYPE_TO_CATEGORIES,
    ONE_HAND_TYPES,
    OFFHAND_MODIFIER_TYPES,
    OFFHAND_TOGGLE_KEY,
    OFFHAND_INJECT_SLOTS,
    SLOT_TYPES,
    T0_SLOT_UI_LABELS,
    isStarterPattern,
    buildFiveSlotFromRawSlots,
    getOffhandModifierSlots,
    loadCatalog,
    loadWeaponsCatalog,
    setCatalog,
    getTypeDef,
    listTypeIds,
    listPlayableTypeIds,
    listVariantsForType,
    getVariant,
    getDefaultVariantId,
    applyVariantToTypeDef,
    categoryToTypeId,
    resolveTypeFromWeapon,
    isOffhandItem,
    isOneHandMainhand,
    resolveShieldType,
    resolveTomeCouplingMode,
    resolveEffectiveLoadout,
    defaultSelections,
    findSkill,
    parseAbilityName,
    renderActionBarHTML,
    renderSlotColumnsHTML,
    renderWeaponVariantBar,
    renderWeaponInfoHeader,
    renderT0CraftBanner,
    renderPassiveColumn,
    renderOffhandModifierColumns,
    renderOffhandVariantBar,
    renderPairedLoadoutBar,
    buildPairedOffhandItem,
    renderModifierBanner,
    renderEquippedWeaponPanel,
    getHotbarSkills,
    esc,
    defaultAsset,
  };
})(typeof window !== 'undefined' ? window : globalThis);