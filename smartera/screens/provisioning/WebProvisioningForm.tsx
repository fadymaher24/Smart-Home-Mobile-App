import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { apiRequest } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

export default function WebProvisioningForm() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const [serialNumber, setSerialNumber] = useState('');
  const [ssid, setSSID] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!serialNumber.trim() || !ssid.trim() || !password.trim()) {
      setError(t('provisioning.error.allFieldsRequired', 'All fields are required'));
      return;
    }

    if (password.length < 8) {
      setError(t('provisioning.error.passwordTooShort', 'Password must be at least 8 characters'));
      return;
    }

    if (!token) {
      setError('You must be logged in to provision a device');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await apiRequest('/provisioning/pending', 'POST', {
        deviceSerialNumber: serialNumber.trim(),
        ssid: ssid.trim(),
        password: password.trim(),
      }, token);

      Alert.alert(
        t('provisioning.success.title', 'Credentials Stored'),
        t('provisioning.success.credentialsStored', 'WiFi credentials stored. Power on your device to complete provisioning.'),
        [{ text: t('common.ok', 'OK') }]
      );

      setSerialNumber('');
      setSSID('');
      setPassword('');
    } catch (err: any) {
      const message = err?.message || t('provisioning.error.storeFailed', 'Failed to store credentials');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (Platform.OS !== 'web') {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('provisioning.web.title', 'Add Device via Serial Number')}</Text>
      <Text style={styles.subtitle}>
        {t('provisioning.web.subtitle', 'Enter your device serial number and WiFi credentials for web-based provisioning')}
      </Text>

      <View style={styles.form}>
        <Text style={styles.label}>{t('provisioning.web.serialNumber', 'Device Serial Number')}</Text>
        <TextInput
          style={styles.input}
          value={serialNumber}
          onChangeText={setSerialNumber}
          placeholder={t('provisioning.web.serialPlaceholder', 'e.g., SmartPlug-B0A732001234')}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.label}>{t('provisioning.selectWifi', 'WiFi Network Name (SSID)')}</Text>
        <TextInput
          style={styles.input}
          value={ssid}
          onChangeText={setSSID}
          placeholder={t('provisioning.web.ssidPlaceholder', 'Enter your WiFi network name')}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.label}>{t('provisioning.enterPassword', 'WiFi Password')}</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder={t('provisioning.web.passwordPlaceholder', 'Enter your WiFi password')}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? t('provisioning.web.submitting', 'Submitting...') : t('provisioning.web.submit', 'Store Credentials')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#fafafa',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#1976d2',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#90caf9',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});