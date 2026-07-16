/**
 * WebCrypto-based password hashing using PBKDF2.
 * Fully compatible with Cloudflare Workers runtime (no Node.js APIs needed).
 *
 * Format: "pbkdf2:v1:<iterations>:<salt_b64>:<hash_b64>"
 * bcrypt hashes (starting with $2b$) are detected and rejected with false.
 */

const ITERATIONS = 100_000;
const HASH_ALGORITHM = 'SHA-256';
const KEY_LENGTH = 32; // bytes

function bufferToBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function base64ToBuffer(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

async function deriveKey(password: string, salt: Uint8Array): Promise<ArrayBuffer> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  return crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: HASH_ALGORITHM },
    keyMaterial,
    KEY_LENGTH * 8
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hashBuf = await deriveKey(password, salt);
  const saltB64 = bufferToBase64(salt.buffer);
  const hashB64 = bufferToBase64(hashBuf);
  return `pbkdf2:v1:${ITERATIONS}:${saltB64}:${hashB64}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  // Reject old bcrypt hashes - they cannot be verified in CF Workers
  if (stored.startsWith('$2b$') || stored.startsWith('$2a$')) {
    return false;
  }

  const parts = stored.split(':');
  if (parts.length !== 5 || parts[0] !== 'pbkdf2') return false;

  const iterations = parseInt(parts[2], 10);
  const salt = base64ToBuffer(parts[3]);
  const expectedHash = parts[4];

  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const hashBuf = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: HASH_ALGORITHM },
    keyMaterial,
    KEY_LENGTH * 8
  );
  const actualHash = bufferToBase64(hashBuf);

  // Constant-time comparison via HMAC to prevent timing attacks
  const enc2 = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc2.encode('compare'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const [sigA, sigB] = await Promise.all([
    crypto.subtle.sign('HMAC', key, enc2.encode(expectedHash)),
    crypto.subtle.sign('HMAC', key, enc2.encode(actualHash)),
  ]);
  const a = new Uint8Array(sigA);
  const b = new Uint8Array(sigB);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
