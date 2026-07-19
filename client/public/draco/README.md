# Draco decoders (optional local path)

`SharedGltfPipeline` prefers `/draco/` then falls back to Google CDN:

`https://www.gstatic.com/draco/versioned/decoders/1.5.7/`

To self-host (better offline / CSP):

```bash
# from repo root
mkdir -p client/public/draco
curl -L -o client/public/draco/draco_decoder.js \
  https://www.gstatic.com/draco/versioned/decoders/1.5.7/draco_decoder.js
curl -L -o client/public/draco/draco_wasm_wrapper.js \
  https://www.gstatic.com/draco/versioned/decoders/1.5.7/draco_wasm_wrapper.js
curl -L -o client/public/draco/draco_decoder.wasm \
  https://www.gstatic.com/draco/versioned/decoders/1.5.7/draco_decoder.wasm
```
