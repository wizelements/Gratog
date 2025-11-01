import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../src/store/authStore';
import { b64, generateSafetyWords } from '../src/crypto/utils';
import { getMessagesByStatus, getNetworkMetric, clearAllMessages } from '../src/db/storage';
import NetInfo from '@react-native-community/netinfo';
import { syncEngine } from '../src/sync/engine-simple';

export default function SettingsScreen() {
  const router = useRouter();
  const { identity, logout } = useAuthStore();
  const [showPublicKey, setShowPublicKey] = useState(false);
  const [networkType, setNetworkType] = useState('unknown');
  const [metrics, setMetrics] = useState<any>(null);
  const [messageStats, setMessageStats] = useState({
    total: 0,
    sent: 0,
    outbox: 0,
    failed: 0,
  });
  const [autoSync, setAutoSync] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    // Load network info
    const state = await NetInfo.fetch();
    const type = state.type || 'unknown';
    setNetworkType(type);
    
    // Load metrics
    const metric = await getNetworkMetric(type);
    if (metric) {
      setMetrics({
        successCount: metric.successCount,
        failureCount: metric.failureCount,
        avgLatency: metric.avgLatency,
        successRate: metric.successCount / (metric.successCount + metric.failureCount) * 100,
      });
    }

    // Load message stats
    const allMessages = await getMessagesByStatus(['sent', 'outbox', 'failed', 'draft', 'sending']);
    const sent = allMessages.filter(m => m.status === 'sent').length;
    const outbox = allMessages.filter(m => m.status === 'outbox' || m.status === 'sending').length;
    const failed = allMessages.filter(m => m.status === 'failed').length;
    setMessageStats({ total: allMessages.length, sent, outbox, failed });
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Offline messages will remain on device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/onboarding');
          },
        },
      ]
    );
  };

  const handleClearDatabase = () => {
    Alert.alert(
      'Clear Local Data',
      'This will delete all offline messages.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearAllMessages();
            Alert.alert('Success', 'Local data cleared');
            loadData();
          },
        },
      ]
    );
  };

  const handleManualSync = async () => {
    try {
      await syncEngine.manualSync();
      Alert.alert('Success', '✓ Manual sync complete');
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Sync failed');
    }
  };

  if (!identity) {
    return null;
  }

  const safetyWords = generateSafetyWords(identity.publicKey);
  const publicKeyB64 = b64.encode(identity.publicKey);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Username</Text>
              <Text style={styles.infoValue}>{identity.username}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Device ID</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {identity.deviceId.substring(0, 20)}...
              </Text>
            </View>
          </View>
        </View>

        {/* Sync Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Offline & Sync</Text>
          <View style={styles.card}>
            <View style={styles.statRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{messageStats.total}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{messageStats.sent}</Text>
                <Text style={styles.statLabel}>Sent</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, styles.warningValue]}>{messageStats.outbox}</Text>
                <Text style={styles.statLabel}>Queued</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, styles.errorValue]}>{messageStats.failed}</Text>
                <Text style={styles.statLabel}>Failed</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.actionButton} onPress={handleManualSync}>
              <Ionicons name="sync" size={20} color="#007AFF" />
              <Text style={styles.actionText}>Manual Sync</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Auto-Sync</Text>
              <Switch
                value={autoSync}
                onValueChange={setAutoSync}
                trackColor={{ false: '#333', true: '#007AFF' }}
              />
            </View>
          </View>
        </View>

        {/* Network Metrics */}
        {metrics && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Network ({networkType})</Text>
            <View style={styles.card}>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Success Rate</Text>
                <Text style={styles.metricValue}>{metrics.successRate.toFixed(1)}%</Text>
              </View>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Avg Latency</Text>
                <Text style={styles.metricValue}>{metrics.avgLatency.toFixed(0)}ms</Text>
              </View>
            </View>
          </View>
        )}

        {/* Device Verification */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          <View style={styles.card}>
            <Text style={styles.label}>Safety Words</Text>
            <View style={styles.safetyWordsContainer}>
              {safetyWords.map((word, index) => (
                <View key={index} style={styles.safetyWordBox}>
                  <Text style={styles.safetyWord}>{word}</Text>
                </View>
              ))}
            </View>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => setShowPublicKey(!showPublicKey)}
            >
              <Text style={styles.toggleButtonText}>
                {showPublicKey ? 'Hide' : 'Show'} Public Key
              </Text>
              <Ionicons
                name={showPublicKey ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#007AFF"
              />
            </TouchableOpacity>

            {showPublicKey && (
              <View style={styles.publicKeyBox}>
                <Text style={styles.publicKeyText} selectable>
                  {publicKeyB64}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Danger Zone</Text>
          <TouchableOpacity style={styles.dangerButton} onPress={handleClearDatabase}>
            <Ionicons name="trash-outline" size={20} color="#FF3B30" />
            <Text style={styles.dangerButtonText}>Clear Local Data</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    color: '#888',
    fontSize: 16,
  },
  infoValue: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'monospace',
    flex: 1,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: '#333',
    marginVertical: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
  },
  warningValue: {
    color: '#FF9500',
  },
  errorValue: {
    color: '#FF3B30',
  },
  statLabel: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  actionText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  settingLabel: {
    color: '#fff',
    fontSize: 16,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  metricLabel: {
    color: '#888',
    fontSize: 14,
  },
  metricValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  label: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  safetyWordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  safetyWordBox: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  safetyWord: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  toggleButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  toggleButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
  publicKeyBox: {
    backgroundColor: '#0a0a0a',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  publicKeyText: {
    color: '#666',
    fontSize: 12,
    fontFamily: 'monospace',
    lineHeight: 18,
  },
  dangerButton: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  dangerButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  logoutButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
});
