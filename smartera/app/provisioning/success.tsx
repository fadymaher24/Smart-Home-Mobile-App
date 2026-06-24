import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useProvisioning } from '../../hooks/useProvisioning';

const ROOM_OPTIONS = ['Living Room', 'Bedroom', 'Other'];

export default function SuccessScreen() {
  const { t } = useTranslation();
  const { state, finalizeSetup, reset } = useProvisioning();
  const defaultName = useMemo(
    () => state.deviceName || state.device?.name || state.device?.serialNumber || 'Smart Plug',
    [state.device?.name, state.device?.serialNumber, state.deviceName]
  );

  const [deviceName, setDeviceName] = useState(defaultName);
  const [roomName, setRoomName] = useState(state.roomName || 'Living Room');

  const handleFinish = async () => {
    await finalizeSetup({ deviceName, roomName });
    await reset();
    router.replace('/Welcome' as any);
  };

  const handleAddAnother = async () => {
    await finalizeSetup({ deviceName, roomName });
    await reset();
    router.replace('/provisioning/scan' as any);
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>✓</Text>
      </View>
      <Text style={styles.title}>{t('provisioning.success.title')}</Text>
      <Text style={styles.subtitle}>{t('provisioning.success.subtitle')}</Text>

      <Text style={styles.label}>{t('provisioning.success.renameLabel')}</Text>
      <TextInput
        style={styles.input}
        value={deviceName}
        onChangeText={setDeviceName}
        placeholder={t('provisioning.success.renamePlaceholder')}
        placeholderTextColor="#999"
      />

      <Text style={styles.label}>{t('provisioning.success.roomLabel')}</Text>
      <View style={styles.radioContainer}>
        {ROOM_OPTIONS.map(room => {
          const selected = roomName === room;
          return (
            <TouchableOpacity key={room} style={styles.radioRow} onPress={() => setRoomName(room)}>
              <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
                {selected && <View style={styles.radioInner} />}
              </View>
              <Text style={styles.radioText}>{room}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={handleFinish}>
        <Text style={styles.primaryButtonText}>{t('common.done')}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryButton} onPress={handleAddAnother}>
        <Text style={styles.secondaryButtonText}>{t('provisioning.success.addAnother')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 20,
    justifyContent: 'center',
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 18,
  },
  icon: {
    color: '#1B7A35',
    fontSize: 34,
    fontWeight: '700',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1F1F1F',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: '#666',
    textAlign: 'center',
    marginBottom: 22,
  },
  label: {
    color: '#444',
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
  },
  radioContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 18,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#9A9A9A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  radioOuterSelected: {
    borderColor: '#5B6EF5',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#5B6EF5',
  },
  radioText: {
    color: '#1F1F1F',
    fontSize: 15,
  },
  primaryButton: {
    backgroundColor: '#5B6EF5',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#5B6EF5',
    paddingVertical: 15,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#5B6EF5',
    fontSize: 16,
    fontWeight: '600',
  },
});
