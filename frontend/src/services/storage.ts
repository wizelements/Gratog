import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { b64 } from '../crypto/utils';

// Platform-aware keychain replacement
let Keychain: any = null;

if (Platform.OS !== 'web') {
  try {
    Keychain = require('react-native-keychain');
  } catch (e) {
    console.warn('Keychain not available, using AsyncStorage fallback');
  }
}

const KEY_DEVICE_IDENTITY = 'device_identity';

export interface DeviceIdentity {
  secretKey: Uint8Array;
  publicKey: Uint8Array;
  deviceId: string;
  userId: string;
  handleHash: string;
  username: string;
}

// Store device identity securely
export async function storeDeviceIdentity(identity: DeviceIdentity): Promise<void> {
  const data = JSON.stringify({
    secretKey: b64.encode(identity.secretKey),
    publicKey: b64.encode(identity.publicKey),
    deviceId: identity.deviceId,
    userId: identity.userId,
    handleHash: identity.handleHash,
    username: identity.username
  });
  
  if (Keychain && Platform.OS !== 'web') {
    // Use secure keychain on native
    await Keychain.setGenericPassword(KEY_DEVICE_IDENTITY, data, {
      service: 'ciphercast',
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED
    });
  } else {
    // Fallback to AsyncStorage on web
    await AsyncStorage.setItem(KEY_DEVICE_IDENTITY, data);
  }
}

// Retrieve device identity
export async function getDeviceIdentity(): Promise<DeviceIdentity | null> {
  try {
    let data: string | null = null;
    
    if (Keychain && Platform.OS !== 'web') {
      const credentials = await Keychain.getGenericPassword({
        service: 'ciphercast'
      });
      
      if (credentials) {
        data = credentials.password;
      }
    } else {
      data = await AsyncStorage.getItem(KEY_DEVICE_IDENTITY);
    }
    
    if (!data) {
      return null;
    }
    
    const parsed = JSON.parse(data);
    
    return {
      secretKey: b64.decode(parsed.secretKey),
      publicKey: b64.decode(parsed.publicKey),
      deviceId: parsed.deviceId,
      userId: parsed.userId,
      handleHash: parsed.handleHash,
      username: parsed.username
    };
  } catch (error) {
    console.error('Failed to get device identity:', error);
    return null;
  }
}

// Clear device identity
export async function clearDeviceIdentity(): Promise<void> {
  if (Keychain && Platform.OS !== 'web') {
    await Keychain.resetGenericPassword({ service: 'ciphercast' });
  } else {
    await AsyncStorage.removeItem(KEY_DEVICE_IDENTITY);
  }
}

// Check if device is registered
export async function isDeviceRegistered(): Promise<boolean> {
  const identity = await getDeviceIdentity();
  return identity !== null;
}
