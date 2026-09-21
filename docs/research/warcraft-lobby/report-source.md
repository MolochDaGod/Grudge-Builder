# A war council for Grudge Warlords
Audience: Grudge Studio product and engineering. Date: 6 September 2026.
Scope: Warcraft III classic and documented Reforged workflows; adapt their interaction patterns to the existing Grudge browser game, retaining its assets, lore, identity, Vercel frontend and Railway multiplayer.
Assumptions: This is an implementation reference, not a pixel-for-pixel recreation. Warcraft art, logos and sound are not reused. No installed Warcraft client was available.

## Recommendation
Use a persistent lobby that connects account identity, character selection, active sectors, custom games, chat and the map editor. Keep the 3D runtime out of the lobby canvas so account and navigation remain usable when GPU initialization fails.

## What the reference actually supports
Classic Battle.net documentation describes persistent top navigation across the waiting room and chat channels. Its custom-game browser places the game list on the left and the selected map and host information on the right. Hosts choose a name, map, teams and public/private visibility. Adapt the browse–inspect–join sequence, not an undocumented modern pixel layout. [Blizzard, Battle.net Features](https://classic.battle.net/war3/ladder/features.shtml).

Blizzard's editor guide documents Terrain, Trigger, Sound, Object, AI and Asset modules. “Test Map” launches the current map; testing with friends requires saving a map, creating a named custom game, and inviting people through open slots. For Grudge, an editor test must use a validated manifest and version rather than an arbitrary browser file path. [Blizzard, Revisiting the Warcraft III Editor, 27 August 2020](https://news.blizzard.com/en-us/article/23395649/revisiting-the-warcraft-iii-editor).

Legacy channel documentation supports named social channels and clan channels. Chat commands include whisper, ignore and do-not-disturb. These are classic references, not proof that every feature is currently available in Reforged. [Blizzard, Channels](https://classic.battle.net/info/channels.shtml), [Blizzard, Chat Commands](https://classic.battle.net/info/commands.shtml).

Reforged 2.0 documented a frontend redesign, search in Create Game, configurable hotkeys, FPS/ping options and scalable HUD. These improvements support readable controls and optional diagnostics in Grudge. [Blizzard, Patch 2.0.0, 13 November 2024](https://news.blizzard.com/en-us/article/24167122/warcraft-iii-reforged-patch-notes-patch-2-0-0).

## Grudge interaction specification
| Surface | Expected behavior |
|---|---|
| Landing | Explain the world, enter the lobby, retain account and lore access. |
| Lobby | Show verified identity, the owned active character and measured realm status. Distinguish offline, loading, empty and ready. |
| Sectors | Search real catalog names; show actual occupied shards and player counts. No active shard means it can open on entry, not that a populated server exists. |
| Custom game | Name a game, select a supported sector, choose slots and public or invitation-link discovery. Ready states and start permission belong to the server. |
| Room chat | Keep messages scoped to a room; bound message length, rate and history. Leave the composer focus unchanged when members join. |
| Editor | Keep Terrain/Objects/Encounters/Assets/Test discoverable. Validate spawn, collision, references and compatibility before publishing. |
| Deployment desk | Show observed route and asset status, timing and build identity. The AI helper explains supplied evidence; it cannot claim deployments it has not performed. |

## Technical repair findings
The repository paired colyseus.js 0.16.22 with core 0.17.43 and schema3. Colyseus 0.17 uses @colyseus/sdk, schema4 and flat seat reservations. This explains the old client's access to a missing room.name. The migration also changes Room generics and leave close codes. Align the SDK, schema and callback API together. [Colyseus migration guide](https://docs.colyseus.io/migrating/0.17).

Three's current WebGLRenderer requires WebGL2. The reported null precision error occurs during capability initialization; the browser's underlying reason remains unknown. Check the actual play canvas before construction and catch initialization failures. Retrying getContext on the same canvas returns its existing context; a different rendering API needs a fresh canvas. [Three WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html), [MDN canvas getContext](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext).

R3F should own its animation loop; raw Three scenes should use the engine's timer. Avoid per-frame React state changes and dispose only resources that the scene owns. Use fixed simulation steps and interpolate remote snapshots. Rapier alone does not make a multiplayer game authoritative or deterministic. [R3F performance pitfalls](https://r3f.docs.pmnd.rs/advanced/pitfalls), [Three disposal guide](https://threejs.org/manual/en/how-to-dispose-of-objects.html), [Rapier determinism](https://rapier.rs/docs/user_guides/javascript/determinism/).

Keep continuously ticking Colyseus rooms on the existing Railway service. This is a lifecycle recommendation: Vercel now documents WebSocket support, with maximum-duration closures and reconnections that can reach another instance. [Vercel WebSockets](https://vercel.com/docs/functions/websockets).

Keep PostgreSQL as player/account persistence, D1 as the asset index, and R2 as binary storage under the existing repository contract. Preview maps cheaply and stream the selected map's assets. GLTFLoader supports compressed geometry and KTX2 integration; support does not prove that current assets are compressed. [GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html).

## Implementation and acceptance boundaries
This change adds a Grudge lobby, custom-sector staging/chat, route diagnostics, an AI explanation panel, protocol fixes and graphics recovery. It connects to the existing map editor; it does not replace ThreeFlow or implement a new editor toolchain. Invitation links are room discovery links, not signed invitations. Local room chat is bounded in-memory history and expires with the room. Global/party/whisper moderation and durable social history require further product work.

Local protocol tests exercise two clients, chat isolation, host-only start, readiness, shared world seed, schema initial/update callbacks and null-precision preflight. They use test identities and do not prove live Grudge authentication or persistence. The release must also pass two authenticated browser sessions, account switching, reconnect, asset rendering, tutorial completion, sector transfer and a persisted character change.

Existing sector handlers still accept client position and damage messages. Ownership checks do not replace authoritative combat and movement validation. Do not label this a complete or production-certified MMO until those paths and load behavior have been audited and verified. The specific overview500 and Nemesis identity compatibility require live authenticated evidence; suppressing errors is not a repair.

## Evidence gaps and research stop
No live Warcraft menu interaction or current pixel audit was performed; official legacy documentation and dated Reforged notes establish the workflows. Private-game wording differs across older documents, so Grudge uses explicit invitation-link discovery semantics. Search stopped after primary evidence covered menus, discovery, creation, slots, chat, editor testing and consequential stack changes. Additional screenshots would not resolve the remaining Grudge runtime/account checks.

