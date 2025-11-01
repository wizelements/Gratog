import nacl from 'tweetnacl';
import { b64, ecdhSharedSecret, hkdfSha256, aesGcmEncrypt, aesGcmDecrypt } from './utils';

export interface MessageEnvelope {
  recipientDeviceId: string;
  senderEphemeralPubKey: string;
  wrappedCk: string;
  wrappedCkIv: string;
  wrapAlg: string;
}

// Wrap a content key for a recipient
export async function wrapContentKey(
  senderEphemeralSecret: Uint8Array,
  recipientPublicKey: Uint8Array,
  contentKey: Uint8Array,
  recipientDeviceId: string
): Promise<MessageEnvelope> {
  // Derive shared secret using ECDH
  const sharedSecret = ecdhSharedSecret(senderEphemeralSecret, recipientPublicKey);
  
  // Derive KEK (Key Encryption Key) using HKDF
  const context = new TextEncoder().encode('ck-wrap:v1');
  const kek = hkdfSha256(sharedSecret, context, 32);
  
  // Encrypt content key with KEK
  const { ciphertext: wrappedCk, nonce } = await aesGcmEncrypt(kek, contentKey);
  
  // Get sender ephemeral public key
  const senderEphemeralPubKey = nacl.scalarMult.base(senderEphemeralSecret);
  
  return {
    recipientDeviceId,
    senderEphemeralPubKey: b64.encode(senderEphemeralPubKey),
    wrappedCk: b64.encode(wrappedCk),
    wrappedCkIv: b64.encode(nonce),
    wrapAlg: 'X25519+HKDF+AESGCM'
  };
}

// Unwrap a content key from an envelope
export async function unwrapContentKey(
  mySecretKey: Uint8Array,
  envelope: MessageEnvelope
): Promise<Uint8Array> {
  // Decode the envelope
  const senderEphemeralPubKey = b64.decode(envelope.senderEphemeralPubKey);
  const wrappedCk = b64.decode(envelope.wrappedCk);
  const wrappedCkIv = b64.decode(envelope.wrappedCkIv);
  
  // Derive shared secret
  const sharedSecret = ecdhSharedSecret(mySecretKey, senderEphemeralPubKey);
  
  // Derive KEK
  const context = new TextEncoder().encode('ck-wrap:v1');
  const kek = hkdfSha256(sharedSecret, context, 32);
  
  // Decrypt content key
  const contentKey = await aesGcmDecrypt(kek, wrappedCk, wrappedCkIv);
  
  return contentKey;
}
