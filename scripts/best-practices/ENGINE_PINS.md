# Engine pins (generated)

Generated: 2026-08-01T21:21:56.678Z

## Recommended fleet versions

| Package | Pin | Notes |
|---------|-----|--------|
| node | >=20 (22 LTS preferred) | Railway + Vercel |
| three | ^0.185.1 | Color management, WebGL2 |
| react | ^18.3 | Match react-dom major |
| @react-three/fiber | ^8.18 | React 18 |
| @react-three/drei | ^9.x | Keep with r3f 8 |

## Last download

```json
{
  "version": "0.185.1",
  "dist": {
    "shasum": "63e9e241a17b101e211965121a017b4b4d8054ae",
    "tarball": "https://registry.npmjs.org/three/-/three-0.185.1.tgz",
    "fileCount": 1195,
    "integrity": "sha512-5aojFCXKwnjBRZvUnt3WFfEcvUJgkN5LlijRFN95hMy8WVkG4I0QNcJE+OuWvuJ0bOdStrbfXn0pkd6/QyiAlg==",
    "signatures": [
      {
        "sig": "MEUCIQD83Brjvns+dAJNgU8wr8hDhkZhZZZVUSDZ3xSxBGmMsgIgQPnhKIs3cTy93RyE9AA0OJsOsxTrs5hw+Erw939CekQ=",
        "keyid": "SHA256:DhQ8wR5APBvFHLF/+Tc+AYvPOdTpcIDqOhxsBHRwC7U"
      }
    ],
    "unpackedSize": 23172772
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
