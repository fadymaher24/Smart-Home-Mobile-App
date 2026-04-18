import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useProvisioning } from '../../hooks/useProvisioning';
import { router } from 'expo-router';

export default function ConnectScreen() {
  const { t } = useTranslation();
  const { state, sendCredentials, error, clearError } = useProvisioning();
  const [ssid, setSsid] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Show message ifno device selected (direct navigation)
  if (!state.device) {
    return (
      <View style={styles.container}>
        <View style={styles.noDeviceContainer}>
          <Text style={styles.noDeviceTitle}>{t('provisioning.connect.noDeviceTitle') || 'No Device Selected'}</Text>
          <Text style={styles.noDeviceText}>{t('provisioning.connect.noDeviceText') || 'Please select a device from the scan screen first.'}</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.push('/provisioning/scan' as any)}>
            <Text style={styles.backButtonText}>{t('common.back') || 'Back to Scan'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleConnect = async () => {
    if (!ssid.trim()) {
      return;
    }

    setIsConnecting(true);
    clearError();
    setLocalError(null);

    try {
      await sendCredentials(ssid, password);
      router.push('/provisioning/progress' as any);
    } catch (err) {
      setLocalError((err as Error).message || t('provisioning.connect.connectionFailed'));
    } finally {
      setIsConnecting(false);
    }
  };

  const handleRetry = () => {
    clearError();
    setLocalError(null);
    handleConnect();
  };

  const handleSkip = () => {
    // Manual SSID entry for iOS users
    router.push('/provisioning/progress' as any);
  };

  if (isConnecting) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#5B6EF5" />
        <Text style={styles.connectingText}>{t('provisioning.connect.connectingWifi')}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{t('provisioning.connect.title')}</Text>

        {state.device && (
          <View style={styles.deviceCard}>
            <Text style={styles.deviceLabel}>{t('provisioning.scan.deviceType')}</Text>
            <Text style={styles.deviceValue}>{state.device.deviceType}</Text>
            <Text style={styles.deviceLabel}>{t('provisioning.scan.serialNumber')}</Text>
            <Text style={styles.deviceValue}>{state.device.ssid}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.label}>{t('provisioning.connect.selectWifi')}</Text>
          <TextInput
            style={styles.input}
            value={ssid}
            onChangeText={setSsid}
            placeholder="WiFi Network Name"
            placeholderTextColor="#999"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{t('provisioning.connect.enterPassword')}</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              value={password}
              onChangeText={setPassword}
              placeholder={t('provisioning.connect.passwordPlaceholder')}
              placeholderTextColor="#999"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Text style={styles.eyeText}>
                {showPassword ? '🙈' : '👁️'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {(localError || error) && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{localError || error?.message}</Text>
            {(error?.retryable ?? localError) && (
              <TouchableOpacity onPress={handleRetry}>
                <Text style={styles.retryText}>{t('common.retry')}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, (!ssid.trim() || !password.trim()) && styles.buttonDisabled]}
          onPress={handleConnect}
          disabled={!ssid.trim() || !password.trim() || isConnecting}
        >
          <Text style={styles.buttonText}>{t('common.continue')}</Text>
        </TouchableOpacity>

        {Platform.OS === 'ios' && (
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipText}>Skip WiFi Scan (iOS)</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
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
    marginBottom: 24,
    color: '#1F1F1F',
  },
  deviceCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  deviceLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  deviceValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F1F1F',
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1F1F1F',
  },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
  },
  eyeButton: {
    padding: 16,
  },
  eyeText: {
    fontSize: 20,
  },
  button: {
    backgroundColor: '#5B6EF5',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonDisabled: {
    backgroundColor: '#BDBDBD',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  skipButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  skipText: {
    color: '#5B6EF5',
    fontSize: 16,
  },
  connectingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  errorText: {
    color: '#E53935',
    fontSize: 14,
  },
  retryText: {
    color: '#5B6EF5',
    fontSize: 14,
    marginTop: 8,
    fontWeight: '600',
  },
  noDeviceContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noDeviceTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F1F1F',
    marginBottom: 12,
  },
  noDeviceText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#5B6EF5',
    borderRadius: 12,
    padding: 16,
    paddingHorizontal: 32,
  },
  backButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});