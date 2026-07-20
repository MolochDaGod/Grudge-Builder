/**
 * wartrailer hub — section cards from cut list + live play deep links.
 */
const SECTIONS = [
  { order: 0, id: 'tutorial_shipwreck', title: 'Shipwreck Wake', tagline: 'You wash ashore.', still: 'assets/renders/2.jpg', play: 'https://client.grudge-studio.com/play?mode=tutorial&trailer=1', video: 'videos/tutorial_shipwreck-flyby.webm' },
  { order: 1, id: 'world_map_overview', title: 'World Map — Nine Sectors', tagline: 'Nine realms. One war.', still: 'assets/renders/4.jpg', play: 'https://client.grudge-studio.com/world-map', video: 'videos/world_map_overview-flyby.webm' },
  { order: 2, id: 'home_island', title: 'Home Island', tagline: 'Build your camp.', still: 'assets/renders/2.jpg', play: 'https://client.grudge-studio.com/play?mode=procedural&trailer=1', video: 'videos/home_island-flyby.webm' },
  { order: 3, id: 'lobby_open_world', title: 'Open World Lobby', tagline: 'Capture. Sail. Board.', still: 'assets/renders/2.jpg', play: 'https://client.grudge-studio.com/play?mode=lobby&trailer=1', video: 'videos/lobby_open_world-flyby.webm' },
  { order: 4, id: 'haven_shore', title: 'Haven Shore', tagline: 'Safe tropical start.', still: 'assets/renders/2.jpg', play: 'https://client.grudge-studio.com/play?sector=haven_shore&mode=zone&worldSeed=grudge-world-1&trailer=1', video: 'videos/haven_shore-flyby.webm' },
  { order: 5, id: 'stormbreak_reef', title: 'Stormbreak Reef', tagline: 'Perpetual storms.', still: 'assets/renders/5.jpg', play: 'https://client.grudge-studio.com/play?sector=stormbreak_reef&mode=zone&worldSeed=grudge-world-1&trailer=1', video: 'videos/stormbreak_reef-flyby.webm' },
  { order: 6, id: 'frostbite_expanse', title: 'Frostbite Expanse', tagline: 'Frozen northern shelf.', still: 'assets/renders/3.jpg', play: 'https://client.grudge-studio.com/play?sector=frostbite_expanse&mode=zone&worldSeed=grudge-world-1&trailer=1', video: 'videos/frostbite_expanse-flyby.webm' },
  { order: 7, id: 'thornwood_wilds', title: 'Thornwood Wilds', tagline: 'Ancient forest.', still: 'assets/renders/5.jpg', play: 'https://client.grudge-studio.com/play?sector=thornwood_wilds&mode=zone&worldSeed=grudge-world-1&trailer=1', video: 'videos/thornwood_wilds-flyby.webm' },
  { order: 8, id: 'convergence_nexus', title: 'Convergence Nexus', tagline: 'Where factions clash.', still: 'assets/renders/4.jpg', play: 'https://client.grudge-studio.com/play?sector=convergence_nexus&mode=zone&worldSeed=grudge-world-1&trailer=1', video: 'videos/convergence_nexus-flyby.webm' },
  { order: 9, id: 'ashen_wastes', title: 'Ashen Wastes', tagline: 'Glass and bone.', still: 'assets/renders/1.jpg', play: 'https://client.grudge-studio.com/play?sector=ashen_wastes&mode=zone&worldSeed=grudge-world-1&trailer=1', video: 'videos/ashen_wastes-flyby.webm' },
  { order: 10, id: 'ember_depths', title: 'Ember Depths', tagline: 'Volcanic Legion birth.', still: 'assets/renders/1.jpg', play: 'https://client.grudge-studio.com/play?sector=ember_depths&mode=zone&worldSeed=grudge-world-1&trailer=1', video: 'videos/ember_depths-flyby.webm' },
  { order: 11, id: 'abyssal_trench', title: 'Abyssal Trench', tagline: 'Deepest waters.', still: 'assets/renders/5.jpg', play: 'https://client.grudge-studio.com/play?sector=abyssal_trench&mode=zone&worldSeed=grudge-world-1&trailer=1', video: 'videos/abyssal_trench-flyby.webm' },
  { order: 12, id: 'ethereal_falls', title: 'Ethereal Falls', tagline: 'First God tears.', still: 'assets/renders/3.jpg', play: 'https://client.grudge-studio.com/play?sector=ethereal_falls&mode=zone&worldSeed=grudge-world-1&trailer=1', video: 'videos/ethereal_falls-flyby.webm' },
];

function card(s) {
  const hasVideo = false; // filled when WebM exists on CDN
  return `
  <article data-id="${s.id}">
    <div class="media">
      <span class="badge">§ ${s.order}</span>
      ${hasVideo
        ? `<video src="${s.video}" muted loop playsinline autoplay></video>`
        : `<img class="kenburns" src="${s.still}" alt="${s.title}" />`}
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

// Probe which WebMs exist (same origin)
SECTIONS.forEach(async (s) => {
  try {
    const r = await fetch(s.video, { method: 'HEAD' });
    if (r.ok) {
      const el = document.querySelector(`article[data-id="${s.id}"] .media`);
      if (el) {
        el.innerHTML = `<span class="badge">§ ${s.order} live</span><video src="${s.video}" muted loop playsinline controls></video>`;
      }
    }
  } catch { /* still image */ }
});
