import nacl from 'tweetnacl';
import { sha256 } from '@noble/hashes/sha2.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { Buffer } from 'buffer';
import 'react-native-get-random-values';

// Base64 encoding/decoding utilities
export const b64 = {
  encode: (bytes: Uint8Array): string => {
    return Buffer.from(bytes).toString('base64');
  },
  decode: (b64: string): Uint8Array => {
    return new Uint8Array(Buffer.from(b64, 'base64'));
  }
};

// HKDF wrapper
export function hkdfSha256(
  ikm: Uint8Array,
  info: Uint8Array,
  length: number = 32,
  salt?: Uint8Array
): Uint8Array {
  return hkdf(sha256, ikm, salt ?? new Uint8Array(32), info, length);
}

// ECDH using X25519 (tweetnacl's scalarMult)
export function ecdhSharedSecret(
  secretKey: Uint8Array,
  publicKey: Uint8Array
): Uint8Array {
  return nacl.scalarMult(secretKey, publicKey);
}

// Generate X25519 keypair
export function generateKeyPair() {
  return nacl.box.keyPair();
}

// AES-GCM encryption/decryption using Web Crypto API
export async function aesGcmEncrypt(
  key: Uint8Array,
  plaintext: Uint8Array
): Promise<{ ciphertext: Uint8Array; nonce: Uint8Array }> {
  // Generate random 12-byte nonce
  const nonce = nacl.randomBytes(12);
  
  // Use crypto.subtle for AES-GCM
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    cryptoKey,
    plaintext
  );
  
  return {
    ciphertext: new Uint8Array(ciphertext),
    nonce
  };
}

export async function aesGcmDecrypt(
  key: Uint8Array,
  ciphertext: Uint8Array,
  nonce: Uint8Array
): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );
  
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: nonce },
    cryptoKey,
    ciphertext
  );
  
  return new Uint8Array(plaintext);
}

// Generate handle hash from username
export function generateHandleHash(username: string): string {
  const salt = 'ciphercast-v1';
  const hash = sha256(new TextEncoder().encode(username + salt));
  return b64.encode(hash);
}

// Generate safety words from public key for verification
export function generateSafetyWords(publicKey: Uint8Array): string[] {
  const wordList = [
    'alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot',
    'golf', 'hotel', 'india', 'juliet', 'kilo', 'lima',
    'mike', 'november', 'oscar', 'papa', 'quebec', 'romeo',
    'sierra', 'tango', 'uniform', 'victor', 'whiskey', 'xray',
    'yankee', 'zulu', 'able', 'baker', 'dog', 'easy',
    'fox', 'george', 'how', 'item', 'jig', 'king'
  ];
  
  const hash = sha256(publicKey);
  const words: string[] = [];
  
  for (let i = 0; i < 6; i++) {
    const index = hash[i] % wordList.length;
    words.push(wordList[index]);
  }
  
  return words;
}
