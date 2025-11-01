import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../src/store/authStore';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import nacl from 'tweetnacl';
import { b64, aesGcmEncrypt, generateHandleHash } from '../src/crypto/utils';
import { wrapContentKey } from '../src/crypto/envelope';
import { resolveDevices } from '../src/services/api';
import { saveMessage, LocalMessage } from '../src/db/storage';
import { calculatePriority } from '../src/sync/priority';
import { syncEngine } from '../src/sync/engine-simple';

export default function ComposeOfflineScreen() {
  const router = useRouter();
  const { identity } = useAuthStore();
  const [recipientUsername, setRecipientUsername] = useState('');
  const [messageText, setMessageText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline'>('online');

  React.useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setNetworkStatus(state.isConnected ? 'online' : 'offline');
    });
    return unsubscribe;
  }, []);

  const handleSendMessage = async () => {
    if (!recipientUsername.trim()) {
      Alert.alert('Error', 'Please enter recipient username');
      return;
    }

    if (!messageText.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }

    if (!identity) {
      Alert.alert('Error', 'Not authenticated');
      return;
    }

    setIsProcessing(true);
    try {
      // Calculate priority
      const priority = calculatePriority(messageText);

      // Generate content key
      const contentKey = nacl.randomBytes(32);
      
      // Encrypt message
      const plaintext = new TextEncoder().encode(messageText);
      const { ciphertext, nonce } = await aesGcmEncrypt(contentKey, plaintext);

      // Try to resolve recipient online first
      let envelopes: any[] = [];
      let status: 'outbox' | 'draft' = 'draft';

      if (networkStatus === 'online') {
        try {
          const handleHash = generateHandleHash(recipientUsername.trim());
          const resolved = await resolveDevices(handleHash);

          if (resolved.devices && resolved.devices.length > 0) {
            // Generate ephemeral keypair
            const ephemeral = nacl.box.keyPair();

            // Create envelopes for all recipient devices
            envelopes = await Promise.all(
              resolved.devices.map(device =>
                wrapContentKey(
                  ephemeral.secretKey,
                  b64.decode(device.identityPubKey),
                  contentKey,
                  device._id
                )
              )
            );

            status = 'outbox'; // Ready to send
          }
        } catch (error) {
          console.warn('Failed to resolve recipient online, saving as draft:', error);
        }
      }

      // Save to local database
      const newMessage: LocalMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content: messageText,
        ciphertext: b64.encode(ciphertext),
        nonce: b64.encode(nonce),
        senderDeviceId: identity.deviceId,
        recipientUsername: recipientUsername.trim(),
        status,
        priority,
        retryCount: 0,
        envelopes,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await saveMessage(newMessage);

      if (networkStatus === 'online' && status === 'outbox') {
        Alert.alert('Success', '✓ Message queued for sending');
        // Trigger immediate sync
        setTimeout(() => {
          syncEngine.manualSync().catch(console.error);
        }, 500);
      } else {
        Alert.alert('Saved Offline', '📱 Message saved. Will send when connected.');
      }

      setRecipientUsername('');
      setMessageText('');
      router.back();
    } catch (error) {
      console.error('Send message error:', error);
      Alert.alert('Error', 'Failed to save message');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Compose Message</Text>
        <View style={styles.networkBadge}>
          <View style={[styles.networkDot, networkStatus === 'online' ? styles.online : styles.offline]} />
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <ScrollView style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Recipient Username</Text>
            <TextInput
              style={styles.input}
              placeholder="username"
              placeholderTextColor="#666"
              value={recipientUsername}
              onChangeText={setRecipientUsername}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isProcessing}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Message</Text>
            <TextInput
              style={[styles.input, styles.messageInput]}
              placeholder="Type your encrypted message..."
              placeholderTextColor="#666"
              value={messageText}
              onChangeText={setMessageText}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              editable={!isProcessing}
            />
          </View>

          <View style={styles.infoBox}>
            <Ionicons name={networkStatus === 'online' ? 'cloud' : 'cloud-offline'} size={16} color="#007AFF" />
            <Text style={styles.infoText}>
              {networkStatus === 'online' 
                ? '✓ Online - will send immediately' 
                : '📱 Offline - will queue and send when connected'}
            </Text>
          </View>
        </ScrollView>

        <TouchableOpacity
          style={[styles.sendButton, isProcessing && styles.sendButtonDisabled]}
          onPress={handleSendMessage}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name={networkStatus === 'online' ? 'send' : 'save'} size={20} color="#fff" />
              <Text style={styles.sendButtonText}>
                {networkStatus === 'online' ? 'Send Encrypted' : 'Save Offline'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </KeyboardAvoidingView>
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
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  networkBadge: {
    padding: 8,
  },
  networkDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  online: {
    backgroundColor: '#34C759',
  },
  offline: {
    backgroundColor: '#FF9500',
  },
  content: {
    flex: 1,
  },
  form: {
    flex: 1,
    padding: 16,
  },
  field: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#333',
  },
  messageInput: {
    minHeight: 120,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  infoText: {
    flex: 1,
    color: '#007AFF',
    fontSize: 13,
    lineHeight: 18,
  },
  sendButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
