import { create } from 'zustand';
import { DeviceIdentity, getDeviceIdentity, storeDeviceIdentity, clearDeviceIdentity } from '../services/storage';
import { generateKeyPair, b64, generateHandleHash } from '../crypto/utils';
import { registerDevice } from '../services/api';

interface AuthState {
  identity: DeviceIdentity | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  // Actions
  loadIdentity: () => Promise<void>;
  createIdentity: (username: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  identity: null,
  isLoading: false,
  isAuthenticated: false,
  
  loadIdentity: async () => {
    set({ isLoading: true });
    try {
      const identity = await getDeviceIdentity();
      set({ identity, isAuthenticated: identity !== null, isLoading: false });
    } catch (error) {
      console.error('Failed to load identity:', error);
      set({ identity: null, isAuthenticated: false, isLoading: false });
    }
  },
  
  createIdentity: async (username: string) => {
    set({ isLoading: true });
    try {
      // Generate device keypair
      const keyPair = generateKeyPair();
      
      // Generate IDs
      const deviceId = `dev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const handleHash = generateHandleHash(username);
      
      const identity: DeviceIdentity = {
        secretKey: keyPair.secretKey,
        publicKey: keyPair.publicKey,
        deviceId,
        userId,
        handleHash,
        username
      };
      
      // Register with backend
      await registerDevice(
        userId,
        deviceId,
        handleHash,
        b64.encode(keyPair.publicKey)
      );
      
      // Store locally
      await storeDeviceIdentity(identity);
      
      set({ identity, isAuthenticated: true, isLoading: false });
    } catch (error) {
      console.error('Failed to create identity:', error);
      set({ isLoading: false });
      throw error;
    }
  },
  
  logout: async () => {
    await clearDeviceIdentity();
    set({ identity: null, isAuthenticated: false });
  }
}));
