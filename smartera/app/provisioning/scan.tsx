import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { DiscoveredDevice } from '../../context/ProvisioningContext';
import { useProvisioning } from '../../hooks/useProvisioning';

export default function ScanScreen() {
  const { t } = useTranslation();
  const {
    state,
    error,
    isLoading,
    isDiscovering,
    startProvisioning,
    beginBleScan,
    selectDeviceAndConnect,
    clearError,
  } = useProvisioning();
  const [devices, setDevices] = useState<DiscoveredDevice[]>([]);

  const remaining = useMemo(() => {
    const mins = Math.floor(state.remainingSeconds / 60)
      .toString()
      .padStart(1, '0');
    const secs = (state.remainingSeconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  }, [state.remainingSeconds]);

  const handleStart = useCallback(async () => {
    clearError();
    await startProvisioning('SMART_PLUG');
  }, [clearError, startProvisioning]);

  const handleStartScan = useCallback(async () => {
    clearError();
    const found = await beginBleScan();
    setDevices(found);
  }, [beginBleScan, clearError]);

  const handleSelectDevice = useCallback(
    async (device: DiscoveredDevice) => {
      clearError();
      const ok = await selectDeviceAndConnect(device);
      if (ok) {
        router.push('/provisioning/connect' as any);
      }
    },
    [clearError, selectDeviceAndConnect]
  );

  const renderDevice = ({ item }: { item: DiscoveredDevice }) => (
    <TouchableOpacity style={styles.deviceItem} onPress={() => handleSelectDevice(item)}>
      <View style={styles.deviceInfo}>
        <Text style={styles.deviceName}>{item.name}</Text>
        <Text style={styles.deviceMeta}>{item.serialNumber}</Text>
        <Text style={styles.deviceMeta}>RSSI {item.rssi} dBm</Text>
      </View>
      <Text style={styles.deviceArrow}>Connect</Text>
    </TouchableOpacity>
  );

  if (state.phase === 'idle' || state.phase === 'instructions') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{t('provisioning.scan.instructionsTitle')}</Text>
        <Text style={styles.subtitle}>{t('provisioning.scan.instructionsBody')}</Text>
        <View style={styles.timerCard}>
          <Text style={styles.timerLabel}>{t('provisioning.scan.globalTimer')}</Text>
          <Text style={styles.timerValue}>{state.phase === 'idle' ? '3:00' : remaining}</Text>
        </View>
        <TouchableOpacity style={styles.primaryButton} onPress={handleStart} disabled={isLoading}>
          <Text style={styles.primaryButtonText}>{t('provisioning.scan.instructionsCta')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('provisioning.scan.title')}</Text>
      <Text style={styles.subtitle}>{t('provisioning.scan.scanningHint', { timer: remaining })}</Text>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={handleStartScan}
        disabled={isDiscovering || isLoading}
      >
        <Text style={styles.primaryButtonText}>{t('provisioning.scan.scanBle')}</Text>
      </TouchableOpacity>

      {(isDiscovering || isLoading) && (
        <View style={styles.loadingRow}>
          <ActivityIndicator color="#5B6EF5" />
          <Text style={styles.loadingText}>{t('provisioning.scan.scanningBle')}</Text>
        </View>
      )}

      {error && <Text style={styles.errorText}>{error.message}</Text>}

      {devices.length > 0 ? (
        <FlatList
          data={devices}
          keyExtractor={item => item.id}
          renderItem={renderDevice}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <Text style={styles.emptyText}>{t('provisioning.scan.noBleDevices')}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 10,
    color: '#1F1F1F',
  },
  subtitle: {
    fontSize: 15,
    color: '#555',
    marginBottom: 20,
    lineHeight: 22,
  },
  timerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  timerLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  timerValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#5B6EF5',
  },
  primaryButton: {
    backgroundColor: '#5B6EF5',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
  list: {
    paddingBottom: 24,
  },
  deviceItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F1F1F',
    marginBottom: 3,
  },
  deviceMeta: {
    fontSize: 13,
    color: '#666',
  },
  deviceArrow: {
    color: '#5B6EF5',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyText: {
    marginTop: 20,
    color: '#777',
    fontSize: 14,
  },
  errorText: {
    color: '#D32F2F',
    marginBottom: 12,
    fontSize: 14,
  },
});
