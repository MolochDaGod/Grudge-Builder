# Three.js Generated GLTF — Era + Game System SSOT (Best Practices + Audit)

**Purpose:** One matrix that tells any agent exactly which era, product, and loader pipeline owns a generated GLTF, plus the non-negotiable rules that every generated artifact must obey.

Load order (always): `grudge-studio` → `threejs-skills` → `grudge-3d-game-packages` → era-specific leaf (`grudge-warlords-assets`, `voxel-era-grudox-client`, `grudge-production-cinema`, etc.).

**Asset CDN paths:** Use `assets.grudge-studio.com` for binary assets (GLB, textures, audio) and `objectstore.grudge-studio.com/api/v1` for JSON catalogs. Legacy hosts (`github.io`, `r2.dev`, `info.grudge-studio.com`) are deprecated.

---

## Era × Game-System Matrix for Generated GLTF

| Era / Product | Typical Generated GLTF | Canonical Pipeline / Loader | Required SSOT Skills | Non-Negotiable Rules | Red Flags (Block Deploy) |
|---------------|------------------------|-----------------------------|----------------------|----------------------|--------------------------|
| **Warlords (grudgewarlords.com, client.grudge-studio.com, forge.grudge-studio.com)** | Toon RTS race kit `{race}.glb` (WK/BRB/ELF/DWF/ORC/UD) | `loadRaceKit` (ObjectStore `js/grudge6-kit.js`) + `grudge6-cdn-ssot` | `grudge-character-correctness`, `grudge6-full-stack`, `grudge-naming-script-law`, `grudge-warlords-assets` | Bip001 skeleton only; one AnimationMixer; `Bip001 L/R Foot + Toe0`; rotation-only tracks on play; SI bone feet; `root.userData.warlordsPlayContract` stamp | Meshy/capsule hero; multi-mixer; pelvis-as-feet; Mixamo position tracks on Bip001; FBX in play path; wrong atlas |
| **Warlords — weapon / anim packs** | Baked JSON clips under `anims/baked/{pack}/{clip}.json` (sword_shield, longbow, magic, …) | `loadRaceKit` + pack swap on Bip001 | `grudge-naming-script-law`, `grudge6-combat-runtime` | Target→source name map; ToeBase→Toe0; Heel→Foot fold; one mixer; strip root motion | Separate mixer per weapon; raw FBX in CDN; missing Toe0 tracks |
| **GRUDOX / VoxGrudge (grudox.grudge-studio.com)** | Explorer / voxel character + props (Mixamo or custom) | `voxel-era-grudox-client` (threejs-rapier-react-three-controller) + glTF convert step | `voxel-era-grudox-client`, `threejs-voxel-games`, `grudge-rapier` | One mixer on explorer skeleton; Rapier CCT; SI scale; no emoji UI | Ammo.js fallback; dual controllers; localStorage heroes |
| **Open / Danger Room (open.grudge-studio.com)** | Island props, nature, harvest nodes, creatures | `grudge-warlords-assets` + D1 catalog + R2 CDN | `grudge-warlords-assets`, `threejs-production-best-practices`, `grudge-d1-r2` | CDN/D1 only; no Meshy; Kenney or stylized packs; `harvest/` + `nature/` paths | Meshy-generated island props; wrong biome catalog |
| **Cinema / Cutscene (island-3d shipwreck, intro)** | Locked-camera cinematic GLB or multi-clip scene | `grudge-production-cinema` + `threejs-cinema` | `grudge-production-cinema`, `threejs-cinema`, `grudge-world-scale` | SI scale (1.8 m human); beat timeline; locked keys; Gerstner water when present | OrbitControls in cinema; non-SI scale; video gate instead of native canvas |
| **Forge / Map Editor (forge.grudge-studio.com)** | `.gfscene` (R3F + Rapier scene export) | `forge-editor` + GLTFExporter or custom serializer | `forge-editor`, `grudge-studio-npm`, `threejs-helpers-physics-terrain` | R3F + Rapier only; `.gfscene` deploy surface; no fourth editor | Orbit in play; raw Three.js scene without Rapier |
| **ThreeFlow (threeflow.vercel.app)** | Warlords scene editor output (Vue + r185) | ThreeFlow handoff `?asset=` | `grudge-warlords-assets` | Elite handoff only; no production player traffic | Treating as primary play editor |
| **Grudge Gladiators (grudge-combat.vercel.app)** | Arena / kitBake test GLB | `grudge-combat-lab` + `/admin` | `grudge-combat-lab`, `grudge-character-correctness` | `/admin` only; laterality box; one mixer | Production hero from combat lab |
| **General Three.js (sandbox, prototype)** | Any GLB from GLTFLoader / GLTFExporter | `threejs-loaders` + `threejs-fundamentals` | `threejs-skills`, `threejs-production-best-practices` | r185+; progressive LOD on heavy assets; dispose; SI when shipping | Old r128 patterns in new deploys; no dispose; alloc in loops |

---

## Universal Best-Practice Rules for Every Generated GLTF (Fleet-Wide)

1. **Scale** — SI units only. Human ≈ 1.8 m. Never ship 100× giants or cm-scale heroes.
2. **Skeleton & Mixer** — One `AnimationMixer` per character. Bip001 (Warlords) or explorer skeleton (GRUDOX). No multi-mixer, no `skeleton.pose()` on live play.
3. **Naming (Warlords)** — Follow `grudge-naming-script-law` exactly: `Bip001 L/R Foot`, `Bip001 L/R Toe0`, Heel→Foot fold, ToeBase→Toe0, target→source in `retargetClip`.
4. **Grounding** — Bone structural box → feet min.y. Never pelvis, never unskinned mesh AABB, never hands.
5. **Tracks** — Rotation-only (`quaternion`) for grounded play. Strip root-motion position tracks. Root motion only for non-grounded or cutscene.
6. **Assets** — Warlords/GRUDOX/Open: CDN + D1 catalog only (`grudge-warlords-assets`). No Meshy, no capsule, no localStorage-only heroes.
7. **Optimization** — `gltf-transform` (draco/meshopt + webp/ktx2) before R2 upload. LOD variants for heavy multipacks. Validate with `gltf-transform validate`.
8. **Metadata** — Stamp `root.userData` with era contract (`warlordsPlayContract`, `grudoxEra`, `cinemaBeatTimeline`, etc.).
9. **Deploy Gate** — Every play hero must pass the play-kit doctor (`npm run play-kit:doctor` or equivalent) before `vercel --prod` or Railway deploy.
10. **No Phantom Systems** — Never invent a second loader, second physics engine, or second bag DB. Extend the SSOT listed above.

---

## Audit Findings (Common Violations in Generated GLTF)

| Violation | Symptom | Fix (SSOT Reference) |
|-----------|---------|----------------------|
| Meshy / capsule hero | Yellow kit, wrong scale, no Bip001 | Delete; use `loadRaceKit` Toon RTS GLB only |
| Multi-mixer or second AnimationMixer | Jitter, wrong gait, arm collapse | One mixer on kit root; `safeSkeletonUpdate` |
| Pelvis-as-feet / wrong ground | Floating or sunk character | Bone structural box → `Bip001 L/R Foot` min.y |
| Mixamo position tracks on Bip001 | Root slides or warps on play | `stripPositionTracks` after retarget |
| Missing Toe0 in retarget map | Feet fold or float on attack | Add `ToeBase → Toe0`; fold if kit has none |
| Heel bone invented | Extra bone, laterality fail | Fold `LFoot_Heel → Bip001 L Foot` |
| Wrong atlas / texture 404 | Yellow or missing parts | Use `textures/grudge6/{biome}/*_Standard*.webp` from CDN |
| OrbitControls in combat / play TPS | Camera fights controller | TPS writer only; Orbit edit-only |
| Raw FBX or Metaverse kit in play path | Load fails or wrong skeleton | Convert via `grudge-asset-convert`; play path = Toon RTS GLB only |
| No `warlordsPlayContract` stamp | Deploy gate fails (503) | Stamp after `loadRaceKit`; fix kit/clip URL if health 503 |
| LocalStorage-only characters | No Grudge ID handoff | Railway + D1 character API only |

---

## Recommendation for Future Generated GLTF Pipelines

- Every new generator (Blender script, Unity exporter, web editor, AI image→3D) must output a manifest entry that declares `era`, `gameSystem`, `skeleton`, `mixerCount`, `groundMethod`, and `contractStamp`.
- Before any deploy, run the era-specific doctor script and the universal best-practice checklist above.
- If a generated GLTF cannot be mapped to one row in the matrix, it is not yet a completed system — do not ship.

This document is the single source of truth for “which era owns this GLTF and what rules must it obey.” Update only when a new era or game system is officially added to the fleet topology.
