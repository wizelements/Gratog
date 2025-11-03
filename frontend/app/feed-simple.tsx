import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../src/store/authStore';
import { Ionicons } from '@expo/vector-icons';
import { getFeed, Message } from '../src/services/api';

export default function FeedSimpleScreen() {
  const router = useRouter();
  const { identity } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMessages();
    // Poll every 5 seconds
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadMessages = async () => {
    try {
      const response = await getFeed();
      setMessages(response.items);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadMessages();
    setIsRefreshing(false);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const hasEnvelope = item.envelopes?.some(
      (env: any) => env.recipientDeviceId === identity?.deviceId
    );

    const isOutgoing = item.senderDeviceId === identity?.deviceId;

    return (
      <TouchableOpacity
        style={[styles.messageCard, isOutgoing && styles.outgoingCard]}
        onPress={() => router.push(`/message-detail/${item._id}`)}
      >
        <View style={styles.messageHeader}>
          <View style={styles.senderInfo}>
            <Ionicons 
              name={isOutgoing ? 'arrow-forward' : 'arrow-back'} 
              size={16} 
              color={isOutgoing ? '#007AFF' : '#666'} 
            />
            <Text style={styles.senderId} numberOfLines={1}>
              {isOutgoing ? 'You' : item.senderDeviceId.substring(0, 12)}
            </Text>
          </View>
          <Text style={styles.timestamp}>
            {new Date(item.createdAt).toLocaleTimeString()}
          </Text>
        </View>

        <View style={styles.ciphertextPreview}>
          <Text style={styles.ciphertextLabel}>Encrypted Message</Text>
          <Text style={styles.ciphertextText} numberOfLines={2}>
            {item.ciphertext.substring(0, 60)}...
          </Text>
        </View>

        {hasEnvelope && (
          <View style={styles.decryptBadge}>
            <Ionicons name="key" size={14} color="#007AFF" />
            <Text style={styles.decryptText}>Tap to decrypt</Text>
          </View>
        )}

        {!hasEnvelope && !isOutgoing && (
          <View style={styles.notForYouBadge}>
            <Ionicons name="lock-closed" size={12} color="#666" />
            <Text style={styles.notForYouText}>Not for you</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading feed...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>CipherCast</Text>
          <View style={styles.networkDot} />
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.push('/compose-direct')}
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

      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item._id}
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
            <Text style={styles.emptySubtext}>Be the first to post an encrypted message!</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
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
    backgroundColor: '#34C759',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
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
  timestamp: {
    color: '#666',
    fontSize: 12,
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
  notForYouBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  notForYouText: {
    color: '#666',
    fontSize: 11,
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
