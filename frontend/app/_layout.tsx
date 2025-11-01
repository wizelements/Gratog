import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-get-random-values';
import { Buffer } from 'buffer';
import { syncEngine } from '../src/sync/engine-simple';

// Polyfills
if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer;
}

export default function RootLayout() {
  useEffect(() => {
    // Initialize sync engine
    (async () => {
      try {
        await syncEngine.start();
        console.log('[App] Sync engine initialized');
      } catch (error) {
        console.error('[App] Initialization error:', error);
      }
    })();

    // Cleanup on unmount
    return () => {
      syncEngine.stop();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#000' },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="feed" />
        <Stack.Screen name="compose" />
        <Stack.Screen name="compose-offline" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="message/[id]" />
      </Stack>
    </GestureHandlerRootView>
  );
}
