/**
 * wartrailer hub — section cards + live play deep links.
 * Stills + WebMs on assets.grudge-studio.com CDN (R2).
 */
const CDN = 'https://assets.grudge-studio.com';
const R = `${CDN}/videos/trailers/renders`;
const V = `${CDN}/videos/trailers/sections`;

function section(order, id, title, tagline, play, stillName) {
  return {
    order,
    id,
    title,
    tagline,
    still: `${V}/${id}-poster.jpg`,
    stillFallback: `${R}/${stillName}`,
    play,
    video: `${V}/${id}-flyby.webm`,
  };
}

/** Live flyby — always trailer+flyby so client skips foundry create gate. */
function zonePlay(sector) {
  return `https://client.grudge-studio.com/play?sector=${sector}&mode=zone&worldSeed=grudge-world-1&trailer=1&flyby=1&guest=1`;
}

const SECTIONS = [
  section(0, 'tutorial_shipwreck', 'Shipwreck Wake', 'You wash ashore.', 'https://client.grudge-studio.com/island-3d?mode=tutorial&trailer=1&flyby=1&guest=1', 'beach_shore.jpg'),
  section(1, 'world_map_overview', 'World Map — Nine Sectors', 'Nine realms. One war.', 'https://client.grudge-studio.com/world-map', 'style_sheet.jpg'),
  section(2, 'home_island', 'Home Island', 'Build your camp.', 'https://client.grudge-studio.com/play?mode=procedural&trailer=1&flyby=1&guest=1', 'beach_shore.jpg'),
  section(3, 'lobby_open_world', 'Open World Lobby', 'Capture. Sail. Board.', 'https://client.grudge-studio.com/play?mode=lobby&trailer=1&flyby=1&guest=1', 'beach_shore.jpg'),
  section(4, 'haven_shore', 'Haven Shore', 'Safe tropical start.', zonePlay('haven_shore'), 'beach_shore.jpg'),
  section(5, 'stormbreak_reef', 'Stormbreak Reef', 'Perpetual storms.', zonePlay('stormbreak_reef'), 'deep_forest.jpg'),
  section(6, 'frostbite_expanse', 'Frostbite Expanse', 'Frozen northern shelf.', zonePlay('frostbite_expanse'), 'winter_snow.jpg'),
  section(7, 'thornwood_wilds', 'Thornwood Wilds', 'Ancient forest.', zonePlay('thornwood_wilds'), 'deep_forest.jpg'),
  section(8, 'convergence_nexus', 'Convergence Nexus', 'Where factions clash.', zonePlay('convergence_nexus'), 'style_sheet.jpg'),
  section(9, 'ashen_wastes', 'Ashen Wastes', 'Glass and bone.', zonePlay('ashen_wastes'), 'volcanic.jpg'),
  section(10, 'ember_depths', 'Ember Depths', 'Volcanic Legion birth.', zonePlay('ember_depths'), 'volcanic.jpg'),
  section(11, 'abyssal_trench', 'Abyssal Trench', 'Deepest waters.', zonePlay('abyssal_trench'), 'deep_forest.jpg'),
  section(12, 'ethereal_falls', 'Ethereal Falls', 'First God tears.', zonePlay('ethereal_falls'), 'winter_snow.jpg'),
];

function card(s) {
  return `
  <article data-id="${s.id}">
    <div class="media">
      <span class="badge">§ ${s.order}</span>
      <img class="kenburns" src="${s.still}" alt="${s.title}" data-video="${s.video}"
        onerror="this.onerror=null;this.src='${s.stillFallback}'" />
    </div>
    <div class="body">
      <h3>${s.title}</h3>
      <p>${s.tagline}</p>
      <div class="actions">
        <a class="play" href="${s.play}" target="_blank" rel="noopener">Live flyby</a>
        <a href="${s.video}">WebM slot</a>
        <a class="primary" href="${s.play}">Record segment</a>
      </div>
    </div>
  </article>`;
}

function assetRow(s) {
  return `<tr>
    <td>${s.order}. ${s.title}</td>
    <td><code>${s.still}</code> · <code>${s.video}</code></td>
    <td><a href="${s.play}">Record</a></td>
  </tr>`;
}

document.getElementById('sectionGrid').innerHTML = SECTIONS.map(card).join('');
document.getElementById('assetTable').innerHTML = SECTIONS.map(assetRow).join('');

// Promote to <video> when CDN WebM exists
SECTIONS.forEach(async (s) => {
  try {
    const r = await fetch(s.video, { method: 'HEAD' });
    if (!r.ok) return;
    const el = document.querySelector(`article[data-id="${s.id}"] .media`);
    if (!el) return;
    el.innerHTML = `<span class="badge">§ ${s.order} live</span><video src="${s.video}" muted loop playsinline controls poster="${s.still}"></video>`;
  } catch {
    /* keep still */
  }
});
