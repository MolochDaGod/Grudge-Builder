/**
 * Grudge CDN Worker
 * Serves game assets (images, sprites, audio, models) from Cloudflare R2.
 * Deployed at: assets.grudge-studio.com
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Range',
  'Access-Control-Max-Age': '86400',
};

/** Map common extensions to Content-Type (R2 metadata may already have it) */
function guessContentType(key) {
  const ext = key.split('.').pop()?.toLowerCase();
  const map = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    mp3: 'audio/mpeg',
    ogg: 'audio/ogg',
    wav: 'audio/wav',
    glb: 'model/gltf-binary',
    gltf: 'model/gltf+json',
    vox: 'model/vnd.vox',
    json: 'application/json',
    js: 'application/javascript',
    css: 'text/css',
    html: 'text/html',
    txt: 'text/plain',
  };
  return map[ext] ?? 'application/octet-stream';
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // Only allow GET / HEAD
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method Not Allowed', { status: 405, headers: CORS_HEADERS });
    }

    // Strip leading slash to get R2 object key
    const key = url.pathname.replace(/^\/+/, '');

    if (!key) {
      return new Response('Not Found', { status: 404, headers: CORS_HEADERS });
    }

    try {
      // Support conditional requests via If-None-Match
      const ifNoneMatch = request.headers.get('If-None-Match');
      const object = await env.ASSETS.get(key, {
        onlyIf: ifNoneMatch ? { etagDoesNotMatch: ifNoneMatch } : undefined,
      });

      if (!object) {
        // R2 returns null when key doesn't exist, or 304 when etag matches
        // Distinguish by checking if we had a conditional request
        if (ifNoneMatch) {
          return new Response(null, {
            status: 304,
            headers: { ...CORS_HEADERS, ETag: ifNoneMatch },
          });
        }
        return new Response('Not Found', { status: 404, headers: CORS_HEADERS });
      }

      const headers = new Headers(CORS_HEADERS);
      object.writeHttpMetadata(headers);

      // Ensure content-type is set
      if (!headers.get('Content-Type')) {
        headers.set('Content-Type', guessContentType(key));
      }

      headers.set('ETag', object.httpEtag);
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      headers.set('X-Content-Source', 'grudge-r2');

      return new Response(request.method === 'HEAD' ? null : object.body, {
        status: 200,
        headers,
      });
    } catch (err) {
      console.error('CDN error for key:', key, err);
      return new Response('Internal Server Error', { status: 500, headers: CORS_HEADERS });
    }
  },
};
