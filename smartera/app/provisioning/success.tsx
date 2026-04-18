import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useProvisioningContext } from '../../context/ProvisioningContext';

export default function SuccessScreen() {
  const { t } = useTranslation();
  const { state, reset } = useProvisioningContext();

  const handleViewDevice = () => {
    reset();
  };

  const handleAddAnother = () => {
    reset();
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>✅</Text>
      </View>

      <Text style={styles.title}>{t('provisioning.success.title', 'Device Connected!')}</Text>
      <Text style={styles.subtitle}>{t('provisioning.success.subtitle', 'Your device has been successfully set up and is now connected to your network.')}</Text>

      {state.device && (
        <View style={styles.deviceCard}>
          <Text style={styles.deviceLabel}>Device Type</Text>
          <Text style={styles.deviceValue}>{state.device.deviceType}</Text>
          
          <Text style={styles.deviceLabel}>Serial Number</Text>
          <Text style={styles.deviceValue}>{state.device.ssid}</Text>

          {state.selectedSSID && (
            <>
              <Text style={styles.deviceLabel}>Connected to</Text>
              <Text style={styles.deviceValue}>{state.selectedSSID}</Text>
            </>
          )}
        </View>
      )}

      <TouchableOpacity style={styles.primaryButton} onPress={handleViewDevice}>
        <Text style={styles.primaryButtonText}>{t('provisioning.success.viewDevice', 'View Devices')}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={handleAddAnother}>
        <Text style={styles.secondaryButtonText}>{t('provisioning.success.addAnother', 'Add Another Device')}</Text>
      </TouchableOpacity>

      <View style={styles.estimatedTime}>
        <Text style={styles.estimatedTimeText}>
          Setup completed in {state.startedAt ? Math.round((Date.now() - state.startedAt) / 1000) : '?'} seconds
        </Text>
      </View>
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
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F1F1F',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  deviceCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    width: '100%',
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
  primaryButton: {
    backgroundColor: '#5B6EF5',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#5B6EF5',
  },
  secondaryButtonText: {
    color: '#5B6EF5',
    fontSize: 18,
    fontWeight: '600',
  },
  estimatedTime: {
    marginTop: 32,
  },
  estimatedTimeText: {
    color: '#999',
    fontSize: 12,
  },
});