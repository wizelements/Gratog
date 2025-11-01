import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../src/store/authStore';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { syncEngine } from '../src/sync/engine-simple';
import { getAllMessages, LocalMessage, getMessagesByStatus } from '../src/db/storage';

export default function FeedScreen() {
  const router = useRouter();
  const { identity } = useAuthStore();
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline'>('online');
  const [outboxCount, setOutboxCount] = useState(0);

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 3000);
    
    const unsubscribe = NetInfo.addEventListener(state => {
      setNetworkStatus(state.isConnected ? 'online' : 'offline');
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  const loadMessages = async () => {
    try {
      const allMessages = await getAllMessages();
      const outbox = await getMessagesByStatus(['outbox', 'failed', 'sending']);
      setMessages(allMessages.sort((a, b) => b.createdAt - a.createdAt));
      setOutboxCount(outbox.length);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await syncEngine.manualSync();
      await loadMessages();
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return '#34C759';
      case 'sending': return '#007AFF';
      case 'outbox': return '#FF9500';
      case 'failed': return '#FF3B30';
      case 'draft': return '#666';
      default: return '#888';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return 'checkmark-circle';
      case 'sending': return 'sync';
      case 'outbox': return 'time';
      case 'failed': return 'alert-circle';
      case 'draft': return 'document';
      default: return 'help-circle';
    }
  };

  const renderMessage = ({ item }: { item: LocalMessage }) => {
    const hasEnvelope = item.envelopes?.some(
      (env: any) => env.recipientDeviceId === identity?.deviceId
    );

    const isOutgoing = item.senderDeviceId === identity?.deviceId;

    return (
      <TouchableOpacity
        style={[styles.messageCard, isOutgoing && styles.outgoingCard]}
        onPress={() => {
          if (item.serverId) {
            router.push(`/message/${item.serverId}`);
          }
        }}
      >
        <View style={styles.messageHeader}>
          <View style={styles.senderInfo}>
            <Ionicons 
              name={isOutgoing ? 'arrow-forward' : 'arrow-back'} 
              size={16} 
              color={isOutgoing ? '#007AFF' : '#666'} 
            />
            <Text style={styles.senderId} numberOfLines={1}>
              {isOutgoing ? `You → ${item.recipientUsername || 'Unknown'}` : item.senderDeviceId.substring(0, 12)}
            </Text>
            {isOutgoing && (
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                <Ionicons name={getStatusIcon(item.status) as any} size={12} color="#fff" />
              </View>
            )}
          </View>
          <Text style={styles.timestamp}>
            {new Date(item.createdAt).toLocaleTimeString()}
          </Text>
        </View>

        {item.content ? (
          <Text style={styles.messageContent} numberOfLines={2}>
            {item.content}
          </Text>
        ) : (
          <View style={styles.ciphertextPreview}>
            <Text style={styles.ciphertextLabel}>Encrypted Message</Text>
            <Text style={styles.ciphertextText} numberOfLines={2}>
              {item.ciphertext.substring(0, 40)}...
            </Text>
          </View>
        )}

        {hasEnvelope && !item.content && (
          <View style={styles.decryptBadge}>
            <Ionicons name="key" size={14} color="#007AFF" />
            <Text style={styles.decryptText}>Tap to decrypt</Text>
          </View>
        )}

        {item.priority > 70 && (
          <View style={styles.priorityBadge}>
            <Ionicons name="flash" size={12} color="#FF9500" />
            <Text style={styles.priorityText}>High Priority</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>CipherCast</Text>
          <View style={[styles.networkDot, networkStatus === 'online' ? styles.online : styles.offline]} />
        </View>
        <View style={styles.headerActions}>
          {outboxCount > 0 && (
            <View style={styles.outboxBadge}>
              <Text style={styles.outboxText}>{outboxCount}</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.push('/compose-offline')}
          >
            <Ionicons name="create-outline" size={24} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.push('/settings')}
          >
            <Ionicons name="settings-outline" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>

      {networkStatus === 'offline' && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline" size={16} color="#FF9500" />
          <Text style={styles.offlineText}>
            Offline mode - Messages will sync when connected
          </Text>
        </View>
      )}

      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#007AFF"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color="#333" />
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>
              {networkStatus === 'offline' ? 'Connect to sync messages' : 'Be the first to post!'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  networkDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  online: {
    backgroundColor: '#34C759',
  },
  offline: {
    backgroundColor: '#FF9500',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
  },
  outboxBadge: {
    backgroundColor: '#FF9500',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 20,
    alignItems: 'center',
  },
  outboxText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 149, 0, 0.3)',
  },
  offlineText: {
    color: '#FF9500',
    fontSize: 13,
  },
  list: {
    padding: 16,
  },
  messageCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  outgoingCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  senderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  senderId: {
    color: '#888',
    fontSize: 14,
    fontFamily: 'monospace',
    flex: 1,
  },
  statusBadge: {
    borderRadius: 10,
    padding: 4,
  },
  timestamp: {
    color: '#666',
    fontSize: 12,
  },
  messageContent: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 8,
  },
  ciphertextPreview: {
    marginBottom: 12,
  },
  ciphertextLabel: {
    color: '#666',
    fontSize: 12,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  ciphertextText: {
    color: '#444',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  decryptBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  decryptText: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: '600',
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  priorityText: {
    color: '#FF9500',
    fontSize: 11,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    color: '#666',
    fontSize: 14,
    marginTop: 4,
  },
});
