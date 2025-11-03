import Constants from 'expo-constants';
import { MessageEnvelope } from '../crypto/envelope';

// Get backend URL from environment
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const API_URL = `${BACKEND_URL}/api`;

export interface Device {
  _id: string;
  identityPubKey: string;
}

export interface ResolveResponse {
  userId: string;
  devices: Device[];
}

export interface Message {
  _id: string;
  senderDeviceId: string;
  kind: string;
  ciphertext: string;
  nonce: string;
  envelopes: MessageEnvelope[];
  createdAt: string;
}

export interface FeedResponse {
  items: Message[];
  nextCursor: string | null;
}

// Register device with KDS
export async function registerDevice(
  userId: string,
  deviceId: string,
  handleHash: string,
  identityPubKey: string
): Promise<{ ok: boolean }> {
  const response = await fetch(`${API_URL}/kds/registerDevice`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, deviceId, handleHash, identityPubKey })
  });
  
  if (!response.ok) {
    throw new Error('Failed to register device');
  }
  
  return response.json();
}

// Resolve devices by handle hash
export async function resolveDevices(handleHash: string): Promise<ResolveResponse> {
  const response = await fetch(`${API_URL}/kds/resolve?handleHash=${encodeURIComponent(handleHash)}`);
  
  if (!response.ok) {
    throw new Error('Failed to resolve devices');
  }
  
  return response.json();
}

// Post a sealed message
export async function postMessage(
  senderDeviceId: string,
  ciphertext: string,
  nonce: string,
  envelopes: MessageEnvelope[]
): Promise<{ id: string }> {
  console.log('postMessage called with:', {
    senderDeviceId,
    ciphertextLength: ciphertext.length,
    nonceLength: nonce.length,
    envelopeCount: envelopes.length,
    apiUrl: `${API_URL}/message`
  });
  
  const payload = {
    senderDeviceId,
    kind: 'sealed',
    ciphertext,
    nonce,
    envelopes
  };
  
  console.log('POST payload:', JSON.stringify(payload, null, 2));
  
  const response = await fetch(`${API_URL}/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  
  console.log('Response status:', response.status);
  const responseText = await response.text();
  console.log('Response text:', responseText);
  
  if (!response.ok) {
    throw new Error(`Failed to post message: ${response.status} - ${responseText}`);
  }
  
  return JSON.parse(responseText);
}

// Get feed
export async function getFeed(cursor?: string): Promise<FeedResponse> {
  const url = cursor 
    ? `${API_URL}/feed?cursor=${encodeURIComponent(cursor)}`
    : `${API_URL}/feed`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error('Failed to get feed');
  }
  
  return response.json();
}
