# Ocean water mirror (Captain-of-the-Seas / Water Pro adjacent)

**SSOT:** single Gerstner ocean mesh (`WaterMaterial` / `PirateLobbyOcean`)  
**Polish stack:** `OceanReflectionRig` + procedural maps + `UnderwaterPost`

## What we mirrored (P0–P1)

| Feature | Source idea | Ours |
|---------|-------------|------|
| Dual-pass reflection | Reflector / mirror camera | `OceanReflectionRig` → `uReflectionMap` |
| Refraction (scene under surface) | refractionMap | same rig → `uRefractionMap` |
| Normal scroll | waterNormal.png | procedural canvas normal |
| Foam texture | waterFoam.png | procedural foam map + crest foam |
| Caustics | waterCaustics.png | procedural caustics in shallow band |
| Underwater fog + tint | underwater mode | `UnderwaterPost` (FogExp2 + CSS overlay) |
| Tide Y | game day | existing `getTideHeight` |

## Done since first pass

| Feature | Status |
|---------|--------|
| Boat wake ribbon | `BoatWakeSystem` on lobby ship when boarded + moving |
| Ocean quality preset | off / low / high via Play Settings (`setOceanQuality`) |
| Dual-pass skip on low | `setupOceanPolish` honors quality |
| Settings UI craftpix | `UiKitSettingsPanel` + action-bar gear |

## Not mirrored (by design)

- Full Captain of the Seas game (ships/cannons/quests)
- FFT / WebGPU Water Pro (commercial / different stack)
- Second water mesh or R3F Water

## Files

- `client/src/island3d/terrain/WaterMaterial.ts` — maps + fresnel mix
- `client/src/island3d/terrain/PirateLobbyOcean.ts` — same map uniforms
- `client/src/island3d/terrain/OceanReflectionRig.ts` — dual FBO
- `client/src/island3d/terrain/UnderwaterPost.ts` — submerge grade
- `Island3DEngine.setupOceanPolish()` — wired for procedural + lobby oceans

## Perf notes

- RT size 512² (reflection + refraction)
- Far camera: reflection every N frames
- Ocean hidden during RT passes
- Disable via disposing rig if mobile preset needs it later

## Verify in play

1. Open home-island / lobby — sky should read in water reflections near horizon  
2. Dive (swim below water level) — blue fog + screen tint  
3. No double ocean / no terrain “second water”  
4. Tide still moves plane Y  
