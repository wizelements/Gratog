import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { useFeedStore } from '../../src/store/feedStore';
import { unwrapContentKey } from '../../src/crypto/envelope';
import { b64, aesGcmDecrypt } from '../../src/crypto/utils';

export default function MessageScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { identity } = useAuthStore();
  const { messages } = useFeedStore();
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptedText, setDecryptedText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const message = messages.find(m => m._id === id);

  const handleDecrypt = async () => {
    if (!message || !identity) return;

    // Find envelope for our device
    const envelope = message.envelopes.find(
      env => env.recipientDeviceId === identity.deviceId
    );

    if (!envelope) {
      Alert.alert('Error', 'This message is not encrypted for your device');
      return;
    }

    setIsDecrypting(true);
    setError(null);

    try {
      // Unwrap content key
      const contentKey = await unwrapContentKey(identity.secretKey, envelope);

      // Decrypt message
      const ciphertext = b64.decode(message.ciphertext);
      const nonce = b64.decode(message.nonce);
      const plaintext = await aesGcmDecrypt(contentKey, ciphertext, nonce);

      // Decode text
      const text = new TextDecoder().decode(plaintext);
      setDecryptedText(text);
    } catch (err) {
      console.error('Decryption error:', err);
      setError('Failed to decrypt message');
    } finally {
      setIsDecrypting(false);
    }
  };

  if (!message) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Message</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Message not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const hasEnvelope = message.envelopes.some(
    env => env.recipientDeviceId === identity?.deviceId
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Message</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Sender Device</Text>
            <Text style={styles.infoValue} numberOfLines={1}>
              {message.senderDeviceId}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Timestamp</Text>
            <Text style={styles.infoValue}>
              {new Date(message.createdAt).toLocaleString()}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Recipients</Text>
            <Text style={styles.infoValue}>
              {message.envelopes.length} device(s)
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ciphertext</Text>
          <View style={styles.ciphertextBox}>
            <Text style={styles.ciphertextText} selectable>
              {message.ciphertext}
            </Text>
          </View>
        </View>

        {!hasEnvelope && (
          <View style={styles.warningBox}>
            <Ionicons name="information-circle" size={20} color="#FF9500" />
            <Text style={styles.warningText}>
              This message is not encrypted for your device.
              You cannot decrypt it.
            </Text>
          </View>
        )}

        {hasEnvelope && !decryptedText && (
          <TouchableOpacity
            style={[styles.decryptButton, isDecrypting && styles.decryptButtonDisabled]}
            onPress={handleDecrypt}
            disabled={isDecrypting}
          >
            {isDecrypting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="lock-open" size={20} color="#fff" />
                <Text style={styles.decryptButtonText}>Decrypt Message</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="close-circle" size={20} color="#FF3B30" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {decryptedText && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Decrypted Message</Text>
            <View style={styles.plaintextBox}>
              <View style={styles.successBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                <Text style={styles.successText}>Successfully decrypted</Text>
              </View>
              <Text style={styles.plaintextText} selectable>
                {decryptedText}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
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
    padding: 16,
  },
  infoCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoLabel: {
    color: '#888',
    fontSize: 14,
  },
  infoValue: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'monospace',
    flex: 1,
    textAlign: 'right',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  ciphertextBox: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  ciphertextText: {
    color: '#666',
    fontSize: 12,
    fontFamily: 'monospace',
    lineHeight: 18,
  },
  decryptButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  decryptButtonDisabled: {
    opacity: 0.6,
  },
  decryptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  plaintextBox: {
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.3)',
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  successText: {
    color: '#34C759',
    fontSize: 12,
    fontWeight: '600',
  },
  plaintextText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 24,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 149, 0, 0.3)',
  },
  warningText: {
    flex: 1,
    color: '#FF9500',
    fontSize: 14,
    lineHeight: 20,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
