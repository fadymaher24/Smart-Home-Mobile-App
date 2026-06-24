import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useProvisioning } from '../../hooks/useProvisioning';

export default function ConnectScreen() {
  const { t } = useTranslation();
  const { state, sendCredentials, isLoading, error, clearError } = useProvisioning();

  const initialSsid = useMemo(() => {
    const preferred24 = state.availableNetworks.find(network => network.band === '2.4GHz');
    return preferred24?.ssid || state.availableNetworks[0]?.ssid || state.selectedSSID || '';
  }, [state.availableNetworks, state.selectedSSID]);

  const [ssid, setSsid] = useState(initialSsid);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  if (!state.device) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{t('provisioning.connect.noDeviceTitle')}</Text>
        <Text style={styles.subtitle}>{t('provisioning.connect.noDeviceText')}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace('/provisioning/scan' as any)}>
          <Text style={styles.primaryButtonText}>{t('common.back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleSelectNetwork = (networkSsid: string) => {
    setSsid(networkSsid);
  };

  const handleConnect = async () => {
    if (!ssid.trim() || password.trim().length < 8) {
      setLocalError(t('provisioning.error.passwordTooShort'));
      return;
    }

    clearError();
    setLocalError(null);

    try {
      await sendCredentials(ssid.trim(), password);
      router.replace('/provisioning/progress' as any);
    } catch (e) {
      setLocalError((e as Error).message || t('provisioning.connect.connectionFailed'));
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t('provisioning.connect.selectWifi')}</Text>
        <Text style={styles.subtitle}>{state.device.name}</Text>

        {state.availableNetworks.length > 0 && (
          <View style={styles.networkList}>
            {state.availableNetworks.slice(0, 8).map(network => {
              const selected = network.ssid === ssid;
              return (
                <TouchableOpacity
                  key={`${network.ssid}-${network.band}`}
                  style={[styles.networkItem, selected && styles.networkItemSelected]}
                  onPress={() => handleSelectNetwork(network.ssid)}
                >
                  <View>
                    <Text style={[styles.networkName, selected && styles.networkNameSelected]}>{network.ssid}</Text>
                    <Text style={styles.networkMeta}>
                      {network.band} | RSSI {network.rssi}
                    </Text>
                  </View>
                  {network.band === '2.4GHz' && <Text style={styles.recommended}>{t('provisioning.connect.recommended')}</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <Text style={styles.label}>{t('provisioning.connect.wifiAccount')}</Text>
        <TextInput
          style={styles.input}
          value={ssid}
          onChangeText={setSsid}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder={t('provisioning.connect.ssidPlaceholder')}
          placeholderTextColor="#999"
        />

        <Text style={styles.label}>{t('provisioning.connect.enterPassword')}</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={t('provisioning.connect.passwordPlaceholder')}
            placeholderTextColor="#999"
          />
          <TouchableOpacity style={styles.toggleButton} onPress={() => setShowPassword(prev => !prev)}>
            <Text style={styles.toggleText}>{showPassword ? t('provisioning.connect.hidePassword') : t('provisioning.connect.showPassword')}</Text>
          </TouchableOpacity>
        </View>

        {(localError || error?.message) && <Text style={styles.errorText}>{localError || error?.message}</Text>}

        <TouchableOpacity style={[styles.primaryButton, isLoading && styles.buttonDisabled]} onPress={handleConnect} disabled={isLoading}>
          <Text style={styles.primaryButtonText}>{t('common.continue')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1F1F1F',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 18,
  },
  networkList: {
    marginBottom: 18,
  },
  networkItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  networkItemSelected: {
    borderWidth: 1,
    borderColor: '#5B6EF5',
  },
  networkName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F1F1F',
  },
  networkNameSelected: {
    color: '#3348E0',
  },
  networkMeta: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
  },
  recommended: {
    fontSize: 12,
    color: '#1B7A35',
    fontWeight: '600',
  },
  label: {
    fontSize: 14,
    color: '#444',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: 14,
    fontSize: 16,
    marginBottom: 14,
  },
  passwordContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  passwordInput: {
    flex: 1,
    padding: 14,
    fontSize: 16,
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  toggleText: {
    color: '#5B6EF5',
    fontWeight: '600',
    fontSize: 12,
  },
  errorText: {
    color: '#D32F2F',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#5B6EF5',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
