import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useProvisioning } from '../../hooks/useProvisioning';
import WebProvisioningForm from '../../screens/provisioning/WebProvisioningForm';

export default function ProvisioningIndex() {
  const router = useRouter();
  const { state } = useProvisioning();

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    if (state.phase === 'idle' || state.phase === 'instructions' || state.phase === 'error' || state.phase === 'timeout') {
      router.replace('./scan');
    } else if (state.phase === 'ble_scanning' || state.phase === 'ble_device_found' || state.phase === 'ble_connecting') {
      router.replace('./scan');
    } else if (state.phase === 'ble_connected' || state.phase === 'wifi_scan_requested' || state.phase === 'wifi_scan_results') {
      router.replace('./connect');
    } else if (state.phase === 'credentials_sent' || state.phase === 'wifi_connecting' || state.phase === 'cloud_verifying') {
      router.replace('./progress');
    } else if (state.phase === 'claimed' || state.phase === 'complete') {
      router.replace('./success');
    } else {
      router.replace('./connect');
    }
  }, [router, state.phase]);

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <WebProvisioningForm />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#1976d2" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});
