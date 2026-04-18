import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useProvisioning } from '../../hooks/useProvisioning';
import { ProvisioningPhase, ProvisioningErrorCode } from '../../context/ProvisioningContext';
import { router } from 'expo-router';
import ErrorScreen from './_ErrorScreen';

const PHASE_LABELS: Record<ProvisioningPhase, string> = {
  idle: 'provisioning.progress.discovering',
  scanning: 'provisioning.progress.discovering',
  device_selected: 'provisioning.progress.discovering',
  ap_connected: 'provisioning.progress.connecting',
  credentials_sent: 'provisioning.progress.sendingCredentials',
  wifi_connecting: 'provisioning.progress.connectingWifi',
  mqtt_connecting: 'provisioning.progress.connectingMqtt',
  claimed: 'provisioning.progress.complete',
  complete: 'provisioning.progress.complete',
  error: 'provisioning.error.title',
};

const PHASE_PROGRESS: Record<ProvisioningPhase, number> = {
  idle: 0,
  scanning: 10,
  device_selected: 20,
  ap_connected: 30,
  credentials_sent: 40,
  wifi_connecting: 60,
  mqtt_connecting: 80,
  claimed: 95,
  complete: 100,
  error: 0,
};

export default function ProgressScreen() {
  const { t } = useTranslation();
  const { state, error, clearError, reset } = useProvisioning();
  const [timeoutReached, setTimeoutReached] = useState(false);

  useEffect(() => {
    if (state.phase === 'mqtt_connecting') {
      const timeout = setTimeout(() => {
        setTimeoutReached(true);
      }, 60000);

      return () => clearTimeout(timeout);
    }
  }, [state.phase]);

  useEffect(() => {
    if (state.phase === 'claimed' || state.phase === 'complete') {
      setTimeout(() => {
        router.replace('/provisioning/success' as any);
      }, 1000);
    }
  }, [state.phase]);

  useEffect(() => {
    if (state.startedAt) {
      const elapsed = Date.now() - state.startedAt;
      if (elapsed > 10 * 60 * 1000) {
        setTimeoutReached(true);
      }
    }
  }, [state.startedAt, state.phase]);

  if (timeoutReached || error) {
    return (
      <ErrorScreen
        errorCode={error?.code as ProvisioningErrorCode | undefined}
        errorMessage={error?.message || (timeoutReached ? t('provisioning.error.sessionExpired', 'Setup session timed out') : undefined)}
        onRetry={() => {
          clearError();
          setTimeoutReached(false);
          router.replace('/provisioning/scan' as any);
        }}
        onGoHome={() => {
          clearError();
          reset();
          router.replace('/provisioning/index' as any);
        }}
      />
    );
  }

  const progress = PHASE_PROGRESS[state.phase] || 0;
  const phaseLabel = PHASE_LABELS[state.phase] || 'provisioning.progress.discovering';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('provisioning.progress.title')}</Text>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>{progress}%</Text>
      </View>

      <View style={styles.phaseContainer}>
        <ActivityIndicator size="large" color="#5B6EF5" />
        <Text style={styles.phaseLabel}>{t(phaseLabel)}</Text>
      </View>

      {state.device && (
        <View style={styles.deviceInfo}>
          <Text style={styles.deviceLabel}>Device: {state.device.ssid}</Text>
          {state.selectedSSID && (
            <Text style={styles.networkLabel}>Network: {state.selectedSSID}</Text>
          )}
        </View>
      )}

      <Text style={styles.timeoutHint}>
        {t('provisioning.progress.hint', 'This usually takes 30-60 seconds')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 32,
    color: '#1F1F1F',
    textAlign: 'center',
  },
  progressContainer: {
    width: '100%',
    marginBottom: 32,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#5B6EF5',
  },
  progressText: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
  },
  phaseContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  phaseLabel: {
    marginTop: 16,
    fontSize: 18,
    color: '#1F1F1F',
    textAlign: 'center',
  },
  deviceInfo: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#FFF',
    borderRadius: 12,
    width: '100%',
  },
  deviceLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  networkLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  timeoutHint: {
    marginTop: 32,
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});