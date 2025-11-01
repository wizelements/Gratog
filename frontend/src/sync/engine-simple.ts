import { getFeed, postMessage } from '../services/api';
import NetInfo from '@react-native-community/netinfo';
import {
  getAllMessages,
  getMessagesByStatus,
  updateMessage,
  getSyncState,
  updateSyncState,
  updateNetworkMetric,
  saveMessage,
  LocalMessage,
} from '../db/storage';

type NetworkType = 'wifi' | 'cellular' | 'p2p' | 'offline' | 'unknown';

class AdaptiveSyncEngine {
  private isSyncing: boolean = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private networkType: NetworkType = 'unknown';
  private isStarted: boolean = false;

  async start() {
    if (this.isStarted) return;
    this.isStarted = true;
    
    console.log('[Sync] Starting adaptive sync engine');
    
    // Monitor network changes
    NetInfo.addEventListener(state => {
      this.handleNetworkChange(state);
    });
    
    // Initial network check
    const state = await NetInfo.fetch();
    this.handleNetworkChange(state);
    
    // Start periodic sync
    this.scheduleSync();
  }

  async stop() {
    this.isStarted = false;
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  private handleNetworkChange(state: any) {
    const wasOffline = this.networkType === 'offline';
    
    if (state.isConnected) {
      this.networkType = state.type === 'wifi' ? 'wifi' : 'cellular';
      
      // If we just came back online, trigger immediate sync
      if (wasOffline) {
        console.log('[Sync] Network restored, triggering sync');
        setTimeout(() => {
          this.sync().catch(err => console.error('[Sync] Error:', err));
        }, 1000);
      }
    } else {
      this.networkType = 'offline';
      console.log('[Sync] Network offline');
    }
    
    // Reschedule with new interval
    this.scheduleSync();
  }

  private scheduleSync() {
    // Adaptive interval based on network type
    const intervals = {
      wifi: 5000,      // 5s on WiFi
      cellular: 15000, // 15s on cellular
      p2p: 30000,      // 30s on P2P
      offline: 60000,  // 60s when offline (for quick reconnect detection)
      unknown: 10000   // 10s when unknown
    };

    const interval = intervals[this.networkType];
    
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      if (this.networkType !== 'offline') {
        this.sync().catch(err => console.error('[Sync] Error:', err));
      }
    }, interval);
  }

  async sync() {
    if (this.isSyncing || this.networkType === 'offline') {
      return;
    }

    this.isSyncing = true;
    const startTime = Date.now();

    try {
      // Push outbox first (send pending messages)
      await this.pushOutbox();
      
      // Then pull new messages
      await this.pullMessages();
      
      // Record success metrics
      const latency = Date.now() - startTime;
      await updateNetworkMetric(this.networkType, true, latency);
      
      console.log(`[Sync] Complete in ${latency}ms`);
    } catch (error) {
      console.error('[Sync] Failed:', error);
      await updateNetworkMetric(this.networkType, false, 0);
    } finally {
      this.isSyncing = false;
    }
  }

  private async pushOutbox() {
    const outboxMessages = await getMessagesByStatus(['outbox', 'failed']);
    
    // Sort by priority (high to low)
    outboxMessages.sort((a, b) => b.priority - a.priority);

    console.log(`[Sync] Pushing ${outboxMessages.length} messages`);

    for (const message of outboxMessages) {
      try {
        // Update status to sending
        await updateMessage(message.id, { status: 'sending' });

        // Send to server
        const response = await postMessage(
          message.senderDeviceId,
          message.ciphertext,
          message.nonce,
          message.envelopes
        );

        // Mark as sent
        await updateMessage(message.id, {
          status: 'sent',
          serverId: response.id,
        });
        
        console.log(`[Sync] Sent message ${message.id} -> ${response.id}`);
      } catch (error) {
        console.error(`[Sync] Failed to send message ${message.id}:`, error);
        
        const newRetryCount = message.retryCount + 1;
        const newPriority = Math.min(100, message.priority + 20);
        
        await updateMessage(message.id, {
          status: 'failed',
          retryCount: newRetryCount,
          lastRetryAt: Date.now(),
          priority: newRetryCount < 3 ? newPriority : message.priority,
        });
      }
    }
  }

  private async pullMessages() {
    try {
      const syncState = await getSyncState();
      const cursor = syncState.lastPullCursor !== '0' ? syncState.lastPullCursor : undefined;
      
      const response = await getFeed(cursor);
      
      if (response.items.length === 0) {
        return;
      }

      console.log(`[Sync] Pulled ${response.items.length} messages`);

      const existingMessages = await getAllMessages();
      const existingServerIds = new Set(existingMessages.map(m => m.serverId).filter(Boolean));

      for (const item of response.items) {
        // Skip if already exists
        if (existingServerIds.has(item._id)) {
          continue;
        }

        // Create new message
        const newMessage: LocalMessage = {
          id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          content: '', // Will decrypt later
          ciphertext: item.ciphertext,
          nonce: item.nonce,
          senderDeviceId: item.senderDeviceId,
          status: 'sent',
          priority: 0,
          retryCount: 0,
          serverId: item._id,
          envelopes: item.envelopes,
          createdAt: new Date(item.createdAt).getTime(),
          updatedAt: Date.now(),
        };

        await saveMessage(newMessage);
      }

      // Update cursor
      if (response.nextCursor) {
        await updateSyncState({ lastPullCursor: response.nextCursor });
      }
    } catch (error) {
      console.error('[Sync] Pull failed:', error);
      throw error;
    }
  }

  async manualSync() {
    console.log('[Sync] Manual sync triggered');
    return this.sync();
  }
}

export const syncEngine = new AdaptiveSyncEngine();
