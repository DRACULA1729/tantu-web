// Share-by-URL: the source is encoded in the location hash as #code=<base64url(utf8(source))>.
// THIS FORMAT IS THE CONTRACT the docs site's "Try it ▶" links build against — keep it stable.

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  const bin = atob(b64 + pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export function encodeSource(source: string): string {
  return toBase64Url(new TextEncoder().encode(source));
}

export function decodeSource(encoded: string): string {
  return new TextDecoder().decode(fromBase64Url(encoded));
}

/** Read #code=… from the current URL, or null if absent/malformed. */
export function readHashSource(): string | null {
  const hash = location.hash.replace(/^#/, "");
  const params = new URLSearchParams(hash);
  const code = params.get("code");
  if (!code) return null;
  try {
    return decodeSource(code);
  } catch {
    return null;
  }
}

/** Build a shareable URL (absolute) for the given source. */
export function shareURL(source: string): string {
  const url = new URL(location.href);
  url.hash = "code=" + encodeSource(source);
  return url.href;
}
