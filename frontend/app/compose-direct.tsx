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
import nacl from 'tweetnacl';
import { b64, aesGcmEncrypt, generateHandleHash } from '../src/crypto/utils';
import { wrapContentKey } from '../src/crypto/envelope';
import { resolveDevices, postMessage } from '../src/services/api';

export default function ComposeDirectScreen() {
  const router = useRouter();
  const { identity } = useAuthStore();
  const [recipientUsername, setRecipientUsername] = useState('');
  const [messageText, setMessageText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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

    setIsLoading(true);
    try {
      console.log('Sending message to:', recipientUsername);
      
      // Resolve recipient devices
      const handleHash = generateHandleHash(recipientUsername.trim());
      console.log('Handle hash:', handleHash);
      
      const resolved = await resolveDevices(handleHash);
      console.log('Resolved devices:', resolved);

      if (!resolved.devices || resolved.devices.length === 0) {
        Alert.alert('Error', `Recipient "${recipientUsername}" not found. Make sure they have registered.`);
        setIsLoading(false);
        return;
      }

      // Generate content key
      const contentKey = nacl.randomBytes(32);
      
      // Encrypt message
      const plaintext = new TextEncoder().encode(messageText);
      const { ciphertext, nonce } = await aesGcmEncrypt(contentKey, plaintext);
      console.log('Message encrypted');

      // Generate ephemeral keypair for this message
      const ephemeral = nacl.box.keyPair();

      // Create envelopes for all recipient devices
      const envelopes = await Promise.all(
        resolved.devices.map(device =>
          wrapContentKey(
            ephemeral.secretKey,
            b64.decode(device.identityPubKey),
            contentKey,
            device._id
          )
        )
      );
      console.log('Created envelopes for', envelopes.length, 'devices');

      // Post message
      const result = await postMessage(
        identity.deviceId,
        b64.encode(ciphertext),
        b64.encode(nonce),
        envelopes
      );
      console.log('Message posted:', result.id);

      Alert.alert('Success', 'Message sent successfully!');
      setRecipientUsername('');
      setMessageText('');
      
      // Go back to feed
      router.back();
    } catch (error) {
      console.error('Send message error:', error);
      Alert.alert('Error', `Failed to send message: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Message</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <ScrollView style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>To (Username)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter recipient username"
              placeholderTextColor="#666"
              value={recipientUsername}
              onChangeText={setRecipientUsername}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
            <Text style={styles.hint}>Enter the exact username of the recipient</Text>
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
              editable={!isLoading}
            />
          </View>

          <View style={styles.infoBox}>
            <Ionicons name="lock-closed" size={16} color="#007AFF" />
            <Text style={styles.infoText}>
              Your message will be encrypted end-to-end. Only {recipientUsername || 'the recipient'} can decrypt it.
              Everyone else will see only ciphertext in the public feed.
            </Text>
          </View>
        </ScrollView>

        <TouchableOpacity
          style={[styles.sendButton, isLoading && styles.sendButtonDisabled]}
          onPress={handleSendMessage}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="send" size={20} color="#fff" />
              <Text style={styles.sendButtonText}>Send Encrypted</Text>
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
  hint: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
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
