/**
 * Stub for broken `text-encoding-utf-8` package (main points at missing file).
 * Modern browsers already have TextEncoder/TextDecoder.
 */
export const TextEncoder =
  typeof globalThis !== 'undefined' && globalThis.TextEncoder
    ? globalThis.TextEncoder
    : class TextEncoder {
        encode(str = '') {
          const utf8 = unescape(encodeURIComponent(String(str)));
          const arr = new Uint8Array(utf8.length);
          for (let i = 0; i < utf8.length; i++) arr[i] = utf8.charCodeAt(i);
          return arr;
        }
      };

export const TextDecoder =
  typeof globalThis !== 'undefined' && globalThis.TextDecoder
    ? globalThis.TextDecoder
    : class TextDecoder {
        decode(buf) {
          const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf || []);
          let s = '';
          for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
          try {
            return decodeURIComponent(escape(s));
          } catch {
            return s;
          }
        }
      };

export default { TextEncoder, TextDecoder };
