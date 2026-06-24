import React, { useEffect, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useProvisioning } from '../../hooks/useProvisioning';
import { ProvisioningPhase } from '../../context/ProvisioningContext';
import ErrorScreen from './_ErrorScreen';

const PHASE_PROGRESS: Record<ProvisioningPhase, number> = {
  idle: 0,
  instructions: 5,
  ble_scanning: 15,
  ble_device_found: 25,
  ble_connecting: 35,
  ble_connected: 45,
  wifi_scan_requested: 55,
  wifi_scan_results: 60,
  credentials_sent: 72,
  wifi_connecting: 82,
  cloud_verifying: 92,
  claimed: 98,
  complete: 100,
  timeout: 0,
  error: 0,
};

const PHASE_TEXT: Partial<Record<ProvisioningPhase, string>> = {
  credentials_sent: 'provisioning.progress.sendingCredentials',
  wifi_connecting: 'provisioning.progress.connectingWifi',
  cloud_verifying: 'provisioning.progress.connectingCloud',
  claimed: 'provisioning.progress.complete',
};

export default function ProgressScreen() {
  const { t } = useTranslation();
  const { state, error, clearError, reset } = useProvisioning();

  const progress = PHASE_PROGRESS[state.phase] || 0;
  const phaseText = t(PHASE_TEXT[state.phase] || 'provisioning.progress.connecting');

  const remaining = useMemo(() => {
    const mins = Math.floor(state.remainingSeconds / 60);
    const secs = (state.remainingSeconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  }, [state.remainingSeconds]);

  useEffect(() => {
    if (state.phase === 'claimed' || state.phase === 'complete') {
      router.replace('/provisioning/success' as any);
    }
  }, [state.phase]);

  if (state.phase === 'claimed' || state.phase === 'complete') {
    return null;
  }

  if (state.phase === 'timeout' || error) {
    return (
      <ErrorScreen
        errorCode={error?.code}
        errorMessage={error?.message || t('provisioning.error.sessionExpired')}
        onRetry={() => {
          clearError();
          router.replace('/provisioning/scan' as any);
        }}
        onGoHome={async () => {
          clearError();
          await reset();
          router.replace('/provisioning/scan' as any);
        }}
      />
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('provisioning.progress.title')}</Text>
      <Text style={styles.subtitle}>{t('provisioning.progress.remaining', { timer: remaining })}</Text>

      <View style={styles.ringContainer}>
        <View style={styles.ring}>
          <Text style={styles.ringText}>{progress}%</Text>
        </View>
      </View>

      <View style={styles.progressRow}>
        <View style={styles.barBg}>
          <View style={[styles.barFg, { width: `${progress}%` }]} />
        </View>
      </View>

      <View style={styles.phaseRow}>
        <ActivityIndicator color="#5B6EF5" />
        <Text style={styles.phaseText}>{phaseText}</Text>
      </View>

      {!!state.device && (
        <View style={styles.detailCard}>
          <Text style={styles.detailText}>{state.device.name}</Text>
          <Text style={styles.detailSub}>{state.selectedSSID || t('provisioning.progress.pendingNetwork')}</Text>
        </View>
      )}

      <TouchableOpacity style={styles.cancelButton} onPress={async () => {
        await reset();
        router.replace('/provisioning/scan' as any);
      }}>
        <Text style={styles.cancelText}>{t('provisioning.progress.cancelSetup')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1F1F1F',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  ringContainer: {
    marginBottom: 20,
  },
  ring: {
    width: 132,
    height: 132,
    borderRadius: 66,
    borderWidth: 8,
    borderColor: '#CBD3FF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  ringText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#5B6EF5',
  },
  progressRow: {
    width: '100%',
    marginBottom: 20,
  },
  barBg: {
    height: 8,
    borderRadius: 8,
    backgroundColor: '#E3E3E3',
    overflow: 'hidden',
  },
  barFg: {
    height: '100%',
    backgroundColor: '#5B6EF5',
  },
  phaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  phaseText: {
    color: '#1F1F1F',
    fontSize: 16,
  },
  detailCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
  },
  detailText: {
    color: '#1F1F1F',
    fontWeight: '600',
    marginBottom: 3,
  },
  detailSub: {
    color: '#666',
    fontSize: 13,
  },
  cancelButton: {
    marginTop: 22,
  },
  cancelText: {
    color: '#666',
    textDecorationLine: 'underline',
  },
});
