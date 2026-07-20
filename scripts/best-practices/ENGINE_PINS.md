# Engine pins (generated)

Generated: 2026-07-20T08:02:44.895Z

## Recommended fleet versions

| Package | Pin | Notes |
|---------|-----|--------|
| node | >=20 (22 LTS preferred) | Railway + Vercel |
| three | ^0.170.0 | Color management, WebGL2 |
| react | ^18.3 | Match react-dom major |
| @react-three/fiber | ^8.18 | React 18 |
| @react-three/drei | ^9.x | Keep with r3f 8 |

## Last download

```json
{
  "version": "0.170.0",
  "dist": {
    "shasum": "6087f97aab79e9e9312f9c89fcef6808642dfbb7",
    "tarball": "https://registry.npmjs.org/three/-/three-0.170.0.tgz",
    "fileCount": 1074,
    "integrity": "sha512-FQK+LEpYc0fBD+J8g6oSEyyNzjp+Q7Ks1C568WWaoMRLW+TkNNWmenWeGgJjV105Gd+p/2ql1ZcjYvNiPZBhuQ==",
    "signatures": [
      {
        "sig": "MEUCIQDnJHCNvjQFojmbJ6jXDrs0JyqMFVAPxQyn5VSiCSWv9AIgCGnTimmN6UYBZOVVZextzGlkJk3qBRrkbGl/Rm4pi6o=",
        "keyid": "SHA256:jl3bwswu80PjjokCgh0o2w5c2U4LhQAE57gj9cz1kzA"
      }
    ],
    "unpackedSize": 27476113
  },
  "engines": null
}
```

## Commands

```bash
# Audit current repo
npm run check:best-practices

# Refresh pins + fleet snapshot
npm run download:engine-pins -- --fleet

# Full stack probe (GrudgeBuilder)
npm run probe:stack
```
