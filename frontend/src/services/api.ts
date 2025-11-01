import Constants from 'expo-constants';
import { MessageEnvelope } from '../crypto/envelope';

// Use relative URL for API calls - Kubernetes routes /api/* to port 8001
const API_URL = '/api';

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
  const response = await fetch(`${API_URL}/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      senderDeviceId,
      kind: 'sealed',
      ciphertext,
      nonce,
      envelopes
    })
  });
  
  if (!response.ok) {
    throw new Error('Failed to post message');
  }
  
  return response.json();
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
