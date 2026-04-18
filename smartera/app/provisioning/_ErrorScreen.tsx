import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { ProvisioningErrorCode } from '../../context/ProvisioningContext';

interface ErrorScreenProps {
  errorCode?: string;
  errorMessage?: string;
  onRetry?: () => void;
  onGoHome?: () => void;
}

const ERROR_MESSAGES: Record<ProvisioningErrorCode, { title: string; message: string; retryable: boolean }> = {
  SCAN_FAILED: {
    title: 'provisioning.error.scanFailedTitle',
    message: 'provisioning.error.scanFailed',
    retryable: true,
  },
  AP_CONNECTION_FAILED: {
    title: 'provisioning.error.apFailedTitle',
    message: 'provisioning.error.apFailedMsg',
    retryable: true,
  },
  AP_TIMEOUT: {
    title: 'provisioning.error.apTimeoutTitle',
    message: 'provisioning.error.apTimeoutMsg',
    retryable: true,
  },
  CREDENTIALS_REJECTED: {
    title: 'provisioning.error.credInvalidTitle',
    message: 'provisioning.error.credInvalidMsg',
    retryable: false,
  },
  WIFI_AUTH_FAILED: {
    title: 'provisioning.error.wifiAuthTitle',
    message: 'provisioning.error.wifiAuth',
    retryable: true,
  },
  WIFI_NOT_FOUND: {
    title: 'provisioning.error.wifiNotFoundTitle',
    message: 'provisioning.error.wifiNotFound',
    retryable: true,
  },
  WIFI_TIMEOUT: {
    title: 'provisioning.error.wifiTimeoutTitle',
    message: 'provisioning.error.wifiTimeout',
    retryable: true,
  },
  WIFI_SIGNAL_WEAK: {
    title: 'provisioning.error.signalWeakTitle',
    message: 'provisioning.error.signalWeakMsg',
    retryable: true,
  },
  MQTT_CONNECTION_FAILED: {
    title: 'provisioning.error.mqttFailedTitle',
    message: 'provisioning.error.mqttFailed',
    retryable: true,
  },
  CLAIM_FAILED: {
    title: 'provisioning.error.claimFailedTitle',
    message: 'provisioning.error.claimFailed',
    retryable: true,
  },
  SESSION_EXPIRED: {
    title: 'provisioning.error.sessionExpiredTitle',
    message: 'provisioning.error.sessionExpired',
    retryable: false,
  },
  UNKNOWN: {
    title: 'provisioning.error.title',
    message: 'provisioning.error.generic',
    retryable: true,
  },
};

export default function ErrorScreen({ errorCode, errorMessage, onRetry, onGoHome }: ErrorScreenProps) {
  const { t } = useTranslation();
  const router = useRouter();

  const errorInfo = errorCode ? ERROR_MESSAGES[errorCode as ProvisioningErrorCode] : null;
  const title = errorInfo
    ? t(errorInfo.title)
    : t('provisioning.error.title', 'Setup Failed');
  const message = errorMessage || (errorInfo ? t(errorInfo.message) : t('provisioning.error.generic', 'Something went wrong during setup'));
  const retryable = errorInfo?.retryable ?? true;

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>!</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {errorCode && (
        <Text style={styles.errorCode}>Error: {errorCode}</Text>
      )}
      <View style={styles.actions}>
        {retryable && onRetry && (
          <TouchableOpacity style={[styles.button, styles.retryButton]} onPress={onRetry}>
            <Text style={styles.buttonText}>{t('provisioning.error.retry', 'Try Again')}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.button, styles.homeButton]}
          onPress={onGoHome || (() => router.back())}
        >
          <Text style={styles.buttonText}>{t('provisioning.error.startOver', 'Start Over')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#d32f2f',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 24,
  },
  errorCode: {
    fontSize: 12,
    color: '#999',
    marginBottom: 24,
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  button: {
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    width: '100%',
  },
  retryButton: {
    backgroundColor: '#5B6EF5',
  },
  homeButton: {
    backgroundColor: '#757575',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});