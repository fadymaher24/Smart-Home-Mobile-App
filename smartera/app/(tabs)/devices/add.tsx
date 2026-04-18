import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

export default function AddDeviceScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="hardware-chip-outline" size={64} color="#1976d2" />
        <Text style={styles.title}>{t('provisioning.title', 'Add New Device')}</Text>
        <Text style={styles.subtitle}>
          {t('provisioning.subtitle', 'Set up a new smart device for your home')}
        </Text>
      </View>

      <View style={styles.options}>
        <TouchableOpacity
          style={styles.optionCard}
          onPress={() => router.push('/provisioning/scan')}
          testID="add-device-wifi"
        >
          <Ionicons name="wifi" size={32} color="#1976d2" />
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>
              {t('provisioning.wifiScan', 'WiFi Scan')}
            </Text>
            <Text style={styles.optionDescription}>
              {t('provisioning.wifiScanDesc', 'Discover and set up a new device on your WiFi network')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.optionCard}
          onPress={() => router.push('/provisioning/index')}
          testID="add-device-manual"
        >
          <Ionicons name="qr-code-outline" size={32} color="#1976d2" />
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>
              {t('provisioning.manualEntry', 'Manual Setup')}
            </Text>
            <Text style={styles.optionDescription}>
              {t('provisioning.manualEntryDesc', 'Enter device serial number and WiFi credentials manually')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  options: {
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  optionText: {
    flex: 1,
    marginLeft: 12,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  optionDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
});