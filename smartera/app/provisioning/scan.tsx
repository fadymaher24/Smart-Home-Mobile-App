import React, { useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useProvisioning } from '../../hooks/useProvisioning';
import { useWifiScan } from '../../hooks/useWifiScan';
import { DiscoveredDevice } from '../../context/ProvisioningContext';
import { router } from 'expo-router';

export default function ScanScreen() {
  const { t } = useTranslation();
  const { devices, isScanning, error, startScan, hasPermission, requestPermission } = useWifiScan();
  const { startProvisioning, selectDevice } = useProvisioning();

  const checkPermissionsAndScan = useCallback(async () => {
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        Alert.alert(
          t('provisioning.scan.permissionRequired'),
          t('provisioning.scan.permissionReason'),
          [{ text: 'OK' }]
        );
        return;
      }
    }
    startScan();
  }, [hasPermission, requestPermission, startScan, t]);

  useEffect(() => {
    checkPermissionsAndScan();
  }, [checkPermissionsAndScan]);

  const handleDeviceSelect = useCallback((device: DiscoveredDevice) => {
    selectDevice(device);
    startProvisioning(device.deviceType);
    router.push('/provisioning/connect' as any);
  }, [selectDevice, startProvisioning]);

  const handleRetry = () => {
    startScan();
  };

  const renderDevice = ({ item }: { item: DiscoveredDevice }) => (
    <TouchableOpacity style={styles.deviceItem} onPress={() => handleDeviceSelect(item)}>
      <View style={styles.deviceInfo}>
        <Text style={styles.deviceName}>{item.ssid}</Text>
        <Text style={styles.deviceMeta}>
          {t('provisioning.scan.deviceType')}: {item.deviceType}
        </Text>
        <Text style={styles.deviceMeta}>
          {t('provisioning.scan.signalStrength')}: {item.signalStrength} dBm
        </Text>
      </View>
      <Text style={styles.deviceArrow}>›</Text>
    </TouchableOpacity>
  );

  if (isScanning) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#5B6EF5" />
        <Text style={styles.scanningText}>{t('provisioning.scan.scanning')}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
          <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (devices.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.noDevicesText}>{t('provisioning.scan.noDevices')}</Text>
        <Text style={styles.hint}>{t('provisioning.scan.noDevicesHint')}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
          <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('provisioning.scan.title')}</Text>
      <Text style={styles.subtitle}>{t('provisioning.scan.scanning')}</Text>
      
      <FlatList
        data={devices}
        keyExtractor={(item) => item.ssid}
        renderItem={renderDevice}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1F1F1F',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  list: {
    paddingBottom: 20,
  },
  deviceItem: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F1F1F',
    marginBottom: 4,
  },
  deviceMeta: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  deviceArrow: {
    fontSize: 24,
    color: '#5B6EF5',
  },
  scanningText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  noDevicesText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F1F1F',
    marginBottom: 8,
  },
  hint: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#E53935',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#5B6EF5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
