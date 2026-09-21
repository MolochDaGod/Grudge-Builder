# Leviathan cinema SFX pack

User-provided WAV stems for **LeviathanOceanCinema**.

These files were accidentally deployed only with Casting Lab
(`casting.grudge.studio/audio/sfx`, `CastingAbilitiesThreeJS`).
Cinema now serves them same-origin:

```
https://client.grudge-studio.com/audio/sfx/<stem>.wav
```

Player: `client/src/island3d/intro/CinemaCastingSfx.ts`
(local first, then `https://casting.grudge.studio/audio/sfx` as fallback).

Do **not** use `assets.grudge-studio.com/audio/casting/sfx` — those copies
are truncated (~44 KB) and incomplete.

| Role          | File(s)                                      | Cinema beat                     |
|---------------|----------------------------------------------|---------------------------------|
| cast_ramp     | cast-ramp.wav                                | mage channel / dragon charge    |
| cast_chant    | cast-chant.wav                               | ice snake, blizzard, pinata     |
| parry         | parry.wav                                    | mage flee                       |
| parry_magic   | parry-magic.wav                              | wards / shield bounce / shatter |
| impact_magic  | impact-magic-a/b/c.wav                       | beam, pinata, ice hits          |
| burn          | burn.wav (loop)                              | fire beam / hull fire           |
| heal          | heal-a.wav, heal-b.wav                       | reserved                        |
