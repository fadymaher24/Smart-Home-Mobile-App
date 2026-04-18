import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { I18nManager } from 'react-native';
import i18n from '../services/i18n';

export default function RootLayout() {
  useEffect(() => {
    // Configure RTL for Arabic
    const isRTL = i18n.language === 'ar';
    if (I18nManager.isRTL !== isRTL) {
      I18nManager.allowRTL(isRTL);
      I18nManager.forceRTL(isRTL);
      // Note: App needs to restart for RTL changes to take effect
      // In production, you might want to show a restart prompt
    }
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="Welcome" />
      <Stack.Screen name="provisioning/index" options={{ title: 'Add Device' }} />
      <Stack.Screen name="provisioning/scan" options={{ title: 'Discover Devices' }} />
      <Stack.Screen name="provisioning/connect" options={{ title: 'Connect to Device' }} />
      <Stack.Screen name="provisioning/progress" options={{ title: 'Setting Up Device' }} />
      <Stack.Screen name="provisioning/success" options={{ title: 'Device Added' }} />
    </Stack>
  );
}