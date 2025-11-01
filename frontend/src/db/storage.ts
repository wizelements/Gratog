import AsyncStorage from '@react-native-async-storage/async-storage';
import { MessageEnvelope } from '../crypto/envelope';

export type MessageStatus = 'draft' | 'outbox' | 'sending' | 'sent' | 'failed' | 'archived';

export interface LocalMessage {
  id: string;
  content: string;
  ciphertext: string;
  nonce: string;
  senderDeviceId: string;
  recipientUsername?: string;
  status: MessageStatus;
  priority: number;
  retryCount: number;
  lastRetryAt?: number;
  serverId?: string;
  envelopes: MessageEnvelope[];
  createdAt: number;
  updatedAt: number;
}

export interface SyncState {
  lastPullCursor: string;
  lastPushAt: number;
}

export interface NetworkMetric {
  networkType: string;
  successCount: number;
  failureCount: number;
  avgLatency: number;
  lastCheck: number;
}

const STORAGE_KEYS = {
  MESSAGES: 'ciphercast_messages',
  SYNC_STATE: 'ciphercast_sync_state',
  NETWORK_METRICS: 'ciphercast_network_metrics',
};

// Message Operations
export async function saveMessage(message: LocalMessage): Promise<void> {
  const messages = await getAllMessages();
  messages.push(message);
  await AsyncStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
}

export async function getAllMessages(): Promise<LocalMessage[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.MESSAGES);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to get messages:', error);
    return [];
  }
}

export async function getMessageById(id: string): Promise<LocalMessage | null> {
  const messages = await getAllMessages();
  return messages.find(m => m.id === id || m.serverId === id) || null;
}

export async function updateMessage(id: string, updates: Partial<LocalMessage>): Promise<void> {
  const messages = await getAllMessages();
  const index = messages.findIndex(m => m.id === id);
  if (index >= 0) {
    messages[index] = { ...messages[index], ...updates, updatedAt: Date.now() };
    await AsyncStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
  }
}

export async function getMessagesByStatus(status: MessageStatus | MessageStatus[]): Promise<LocalMessage[]> {
  const messages = await getAllMessages();
  const statuses = Array.isArray(status) ? status : [status];
  return messages.filter(m => statuses.includes(m.status));
}

export async function deleteMessage(id: string): Promise<void> {
  const messages = await getAllMessages();
  const filtered = messages.filter(m => m.id !== id);
  await AsyncStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(filtered));
}

export async function clearAllMessages(): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify([]));
}

// Sync State Operations
export async function getSyncState(): Promise<SyncState> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.SYNC_STATE);
    return data ? JSON.parse(data) : { lastPullCursor: '0', lastPushAt: 0 };
  } catch (error) {
    return { lastPullCursor: '0', lastPushAt: 0 };
  }
}

export async function updateSyncState(updates: Partial<SyncState>): Promise<void> {
  const current = await getSyncState();
  await AsyncStorage.setItem(
    STORAGE_KEYS.SYNC_STATE,
    JSON.stringify({ ...current, ...updates })
  );
}

// Network Metrics Operations
export async function getNetworkMetrics(): Promise<Record<string, NetworkMetric>> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.NETWORK_METRICS);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    return {};
  }
}

export async function updateNetworkMetric(
  networkType: string,
  success: boolean,
  latency: number
): Promise<void> {
  const metrics = await getNetworkMetrics();
  const current = metrics[networkType] || {
    networkType,
    successCount: 0,
    failureCount: 0,
    avgLatency: 0,
    lastCheck: Date.now(),
  };

  if (success) {
    const totalCount = current.successCount + current.failureCount;
    current.avgLatency = (current.avgLatency * totalCount + latency) / (totalCount + 1);
    current.successCount += 1;
  } else {
    current.failureCount += 1;
  }

  current.lastCheck = Date.now();
  metrics[networkType] = current;

  await AsyncStorage.setItem(STORAGE_KEYS.NETWORK_METRICS, JSON.stringify(metrics));
}

export async function getNetworkMetric(networkType: string): Promise<NetworkMetric | null> {
  const metrics = await getNetworkMetrics();
  return metrics[networkType] || null;
}
