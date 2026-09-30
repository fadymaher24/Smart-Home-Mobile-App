import React, { useState } from 'react';
import { ActivityIndicator, Linking, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useProvisioningContext } from '../../context/ProvisioningContext';
import QRScan from '../../screens/tabscreens/QRScan';
import { API_BASE_URL } from '../../utils/api';
import { parseSerialFromQRCode } from '../../utils/wifi';

const SERIAL_PATTERN = /^SP-[A-F0-9]{12}$/;

export default function WifiSetupScreen() {
  const { t } = useTranslation();
  const { token: authToken } = useAuth();
  const { serial: scannedSerial } = useLocalSearchParams<{ serial?: string }>();
  const provisioning = useProvisioningContext();
  const [serial, setSerial] = useState(provisioning.state.device?.serialNumber || (typeof scannedSerial === 'string' ? scannedSerial : ''));
  const [scannerOpen, setScannerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [expired, setExpired] = useState(false);
  const { sessionId, token } = provisioning.state;
  const setupActive = Boolean(sessionId && token && !expired);

  const onQrScanned = (payload: string) => {
    setScannerOpen(false);
    const identity = parseSerialFromQRCode(payload);
    if (identity?.serialNumber) {
      setSerial(identity.serialNumber.toUpperCase());
      setMessage('');
    } else {
      setMessage(t('provisioning.scan.qrInvalid'));
    }
  };

  const createSession = async () => {
    const normalized = serial.trim().toUpperCase();
    if (!SERIAL_PATTERN.test(normalized)) {
      setMessage(t('provisioning.wifiSetup.invalidSerial'));
      return;
    }
    if (!authToken) {
      setMessage(t('provisioning.wifiSetup.onlineFirst'));
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch(`${API_BASE_URL}/provisioning/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ deviceType: 'SMART_PLUG' }),
      });
      const data = await response.json();
      if (!response.ok || !data.id || !data.provisioningToken) {
        throw new Error(data.error || data.message || `HTTP ${response.status}`);
      }
      setExpired(false);
      const expiresAt = new Date(data.expiresAt).getTime();
      provisioning.startSession(data.id, data.provisioningToken,
        Number.isFinite(expiresAt) ? expiresAt : undefined);
      provisioning.selectDevice({ id: normalized, name: 'Smart Plug', serialNumber: normalized, rssi: 0 });
      provisioning.setPhase('credentials_sent');
      setSerial(normalized);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('provisioning.wifiSetup.onlineFirst'));
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (!sessionId || !authToken) return;
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch(`${API_BASE_URL}/provisioning/session/${sessionId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      if (data.status === 'claimed' || data.status === 'registered') {
        if (data.deviceSerialNumber?.toUpperCase() !== serial.trim().toUpperCase()) {
          setMessage(t('provisioning.wifiSetup.wrongDevice'));
          return;
        }
        provisioning.setPhase('claimed');
        router.replace('/provisioning/success' as any);
      } else if (data.status === 'expired' || new Date(data.expiresAt).getTime() <= Date.now()) {
        setExpired(true);
        setMessage(t('provisioning.wifiSetup.expired'));
      } else if (data.status === 'failed') {
        setMessage(t('provisioning.wifiSetup.failed', { reason: data.error || 'Unknown error' }));
      } else {
        setMessage(t('provisioning.wifiSetup.pending'));
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('provisioning.wifiSetup.pending'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('provisioning.wifiSetup.title')}</Text>
      <Text style={styles.hint}>{t('provisioning.wifiSetup.serialHint')}</Text>
      <Text style={styles.label}>{t('provisioning.wifiSetup.serial')}</Text>
      <TextInput style={styles.input} value={serial} onChangeText={setSerial} autoCapitalize="characters"
        autoCorrect={false} editable={!setupActive && !busy} placeholder="SP-B0A7322BCC90" />
      {!setupActive && <>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => setScannerOpen(true)}>
          <Text style={styles.secondaryText}>{t('provisioning.wifiSetup.scan')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryButton} onPress={createSession} disabled={busy}>
          {busy ? <ActivityIndicator color="white" /> : <Text style={styles.primaryText}>{t('provisioning.wifiSetup.start')}</Text>}
        </TouchableOpacity>
      </>}
      {setupActive && <>
        <Text style={styles.step}>{t('provisioning.wifiSetup.step1')}</Text>
        <Text style={styles.step}>{t('provisioning.wifiSetup.step2')}</Text>
        <Text style={styles.step}>{t('provisioning.wifiSetup.step3')}</Text>
        <Text style={styles.label}>{t('provisioning.wifiSetup.token')}</Text>
        <Text selectable style={styles.token}>{token}</Text>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => Linking.openURL('http://192.168.4.1')}>
          <Text style={styles.secondaryText}>{t('provisioning.wifiSetup.openPortal')}</Text>
        </TouchableOpacity>
        <Text style={styles.step}>{t('provisioning.wifiSetup.step4')}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={verify} disabled={busy}>
          {busy ? <ActivityIndicator color="white" /> : <Text style={styles.primaryText}>{t('provisioning.wifiSetup.verify')}</Text>}
        </TouchableOpacity>
      </>}
      {!!message && <Text style={styles.message}>{message}</Text>}
      <Modal visible={scannerOpen} animationType="slide" onRequestClose={() => setScannerOpen(false)}>
        <QRScan onScanned={onQrScanned} onCancel={() => setScannerOpen(false)} />
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '700', color: '#202638', marginBottom: 10 },
  hint: { fontSize: 15, color: '#596273', marginBottom: 18 },
  label: { fontSize: 15, fontWeight: '600', color: '#202638', marginBottom: 8 },
  input: { backgroundColor: 'white', borderRadius: 10, padding: 14, fontSize: 16, marginBottom: 12 },
  step: { fontSize: 16, lineHeight: 24, color: '#202638', marginVertical: 11 },
  token: { fontSize: 18, fontWeight: '600', color: '#202638', backgroundColor: 'white', padding: 14, borderRadius: 10 },
  primaryButton: { backgroundColor: '#5B6EF5', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 16 },
  primaryText: { color: 'white', fontWeight: '700', fontSize: 16 },
  secondaryButton: { borderColor: '#5B6EF5', borderWidth: 1, borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 12 },
  secondaryText: { color: '#5B6EF5', fontWeight: '600', fontSize: 16 },
  message: { color: '#AF3040', marginTop: 18, fontSize: 15 },
});
