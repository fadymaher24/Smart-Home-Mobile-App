import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DiscoveredDevice,
  ProvisioningPhase,
  WifiNetworkOption,
  useProvisioningContext,
} from '../context/ProvisioningContext';
import bleProvisioningService from '../services/bleProvisioningService';
import { API_BASE_URL } from '../utils/api';
import realtimeService from '../services/realtimeService';
import { createLogger } from '../utils/logger';

const CLOUD_VERIFY_TIMEOUT_MS = 60_000;
const BLE_CONNECT_MAX_ATTEMPTS = 2;
const provisioningLogger = createLogger('ProvisioningFlow');

interface UseProvisioningReturn {
  state: {
    phase: ProvisioningPhase;
    sessionId: string | null;
    token: string | null;
    device: DiscoveredDevice | null;
    selectedSSID: string | null;
    availableNetworks: WifiNetworkOption[];
    error: { code: string; message: string; retryable: boolean } | null;
    startedAt: number | null;
    deadlineAt: number | null;
    remainingSeconds: number;
    deviceName: string;
    roomName: string;
  };
  error: { code: string; message: string; retryable: boolean } | null;
  isLoading: boolean;
  isDiscovering: boolean;
  startProvisioning: (deviceType: string) => Promise<void>;
  beginBleScan: () => Promise<DiscoveredDevice[]>;
  selectDeviceAndConnect: (device: DiscoveredDevice) => Promise<boolean>;
  sendCredentials: (ssid: string, password: string) => Promise<void>;
  finalizeSetup: (input: { deviceName: string; roomName: string }) => Promise<void>;
  reset: () => Promise<void>;
  clearError: () => void;
}

const getAuthToken = async (): Promise<string> => {
  const token = await AsyncStorage.getItem('token');
  return token || '';
};

const toWifiOptions = (
  list: Array<{ ssid: string; rssi: number; band: '2.4GHz' | '5GHz' | 'unknown'; security?: string }>
): WifiNetworkOption[] => {
  return list
    .map(network => ({
      ssid: network.ssid,
      rssi: network.rssi,
      band: network.band,
      security: network.security,
    }))
    .sort((a, b) => {
      if (a.band === '2.4GHz' && b.band !== '2.4GHz') {
        return -1;
      }
      if (a.band !== '2.4GHz' && b.band === '2.4GHz') {
        return 1;
      }
      return b.rssi - a.rssi;
    });
};

export function useProvisioning(): UseProvisioningReturn {
  const context = useProvisioningContext();
  const [isLoading, setIsLoading] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(180);
  const cloudWatcherRef = useRef<(() => void) | null>(null);

  const emitTelemetry = useCallback(
    async (event: string, data: Record<string, unknown>) => {
      provisioningLogger.info(event, data);
      try {
        const authToken = await getAuthToken();
        if (!authToken) {
          return;
        }

        await fetch(`${API_BASE_URL}/provisioning/telemetry`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            event,
            ts: new Date().toISOString(),
            sessionId: context.state.sessionId,
            deviceSerial: context.state.device?.serialNumber,
            data,
          }),
        });
      } catch {
        // Telemetry endpoint is optional; local log is primary fallback.
      }
    },
    [context.state.device?.serialNumber, context.state.sessionId]
  );

  useEffect(() => {
    if (!context.state.deadlineAt) {
      setRemainingSeconds(180);
      return;
    }

    const updateRemaining = () => {
      const left = Math.max(0, Math.ceil((context.state.deadlineAt! - Date.now()) / 1000));
      setRemainingSeconds(left);
      if (
        left === 0 &&
        context.state.phase !== 'claimed' &&
        context.state.phase !== 'complete' &&
        context.state.phase !== 'timeout'
      ) {
        context.setError('SESSION_EXPIRED', 'Pairing timed out after 3 minutes. Please restart setup.', true);
        context.setPhase('timeout');
      }
    };

    updateRemaining();
    const timer = setInterval(updateRemaining, 1000);
    return () => clearInterval(timer);
  }, [context, context.state.deadlineAt, context.state.phase]);

  useEffect(() => {
    return () => {
      if (cloudWatcherRef.current) {
        cloudWatcherRef.current();
        cloudWatcherRef.current = null;
      }
    };
  }, []);

  const startProvisioning = useCallback(async (deviceType: string) => {
    setIsLoading(true);
    context.clearError();
    try {
      const authToken = await getAuthToken();
      const response = await fetch(`${API_BASE_URL}/provisioning/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ deviceType }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message || 'Failed to start provisioning session.');
      }

      const data = await response.json();
      const provisioningToken = data?.provisioningToken;
      if (!provisioningToken) {
        throw new Error('Provisioning session did not include a device token.');
      }

      context.startSession(data.id, provisioningToken);
    } catch (error) {
      context.setError('SESSION_EXPIRED', (error as Error).message, true);
    } finally {
      setIsLoading(false);
    }
  }, [context]);

  const beginBleScan = useCallback(async () => {
    setIsDiscovering(true);
    context.clearError();
    context.setPhase('ble_scanning');
    const started = Date.now();
    try {
      const plugs = await bleProvisioningService.discoverPlugs();
      const mapped: DiscoveredDevice[] = plugs.map(plug => ({
        id: plug.id,
        name: plug.name,
        serialNumber: plug.serialNumber,
        rssi: plug.rssi,
      }));

      if (mapped.length === 0) {
        context.setError('SCAN_FAILED', 'No nearby plug found. Put your plug into pairing mode and retry.', true);
        await emitTelemetry('scan_completed', {
          success: false,
          durationMs: Date.now() - started,
          foundCount: 0,
        });
        return [];
      }

      context.setPhase('ble_device_found');
      await emitTelemetry('scan_completed', {
        success: true,
        durationMs: Date.now() - started,
        foundCount: mapped.length,
      });
      return mapped;
    } catch (error) {
      context.setError('SCAN_FAILED', (error as Error).message, true);
      await emitTelemetry('scan_completed', {
        success: false,
        durationMs: Date.now() - started,
        error: (error as Error).message,
      });
      return [];
    } finally {
      setIsDiscovering(false);
    }
  }, [context, emitTelemetry]);

  const selectDeviceAndConnect = useCallback(async (device: DiscoveredDevice) => {
    setIsLoading(true);
    context.clearError();
    context.selectDevice(device);
    context.setPhase('ble_connecting');
    const started = Date.now();
    let attempts = 0;

    try {
      let networks: WifiNetworkOption[] = [];
      while (attempts < BLE_CONNECT_MAX_ATTEMPTS) {
        attempts += 1;
        try {
          context.setPhase('ble_connected');
          context.setPhase('wifi_scan_requested');
          const scanResult = await bleProvisioningService.scanWifiNetworks(device.serialNumber, device.id);
          networks = toWifiOptions(scanResult);
          break;
        } catch (error) {
          if (attempts >= BLE_CONNECT_MAX_ATTEMPTS) {
            throw error;
          }
        }
      }

      context.setNetworks(networks);
      context.setPhase('wifi_scan_results');
      await emitTelemetry('ble_connect', {
        success: true,
        attempts,
        retries: Math.max(0, attempts - 1),
        durationMs: Date.now() - started,
        networkCount: networks.length,
      });
      return true;
    } catch (error) {
      context.setError('BLE_CONNECT_FAILED', (error as Error).message, true);
      await emitTelemetry('ble_connect', {
        success: false,
        attempts,
        retries: Math.max(0, attempts - 1),
        durationMs: Date.now() - started,
        error: (error as Error).message,
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [context, emitTelemetry]);

  const verifyCloud = useCallback(async () => {
    if (!context.state.sessionId) {
      throw new Error('No active provisioning session.');
    }

    const authToken = await getAuthToken();
    const startedAt = Date.now();

    while (Date.now() - startedAt < CLOUD_VERIFY_TIMEOUT_MS) {
      const response = await fetch(`${API_BASE_URL}/provisioning/session/${context.state.sessionId}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data?.status === 'claimed' || data?.status === 'registered') {
          context.setPhase('claimed');
          return;
        }
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new Error('Device did not finish cloud registration in time.');
  }, [context]);

  const subscribeCloudStatus = useCallback(async () => {
    const authToken = await getAuthToken();

    try {
      await realtimeService.connect(authToken);
    } catch {
      return;
    }

    const unsubscribeClaimed = realtimeService.subscribe('provisioning-claimed', payload => {
      if (payload?.sessionId === context.state.sessionId) {
        context.setPhase('claimed');
      }
    });

    const unsubscribePhase = realtimeService.subscribe('provisioning-phase', payload => {
      if (payload?.sessionId === context.state.sessionId && payload?.status === 'claimed') {
        context.setPhase('claimed');
      }
    });

    const unsubscribeTelemetry = realtimeService.subscribe('telemetry', payload => {
      const serial = context.state.device?.serialNumber;
      if (!serial) {
        return;
      }
      if (payload?.serialNumber === serial || payload?.deviceId === serial) {
        context.setPhase('claimed');
      }
    });

    const unsubscribeStatus = realtimeService.subscribe('device-status', payload => {
      const serial = context.state.device?.serialNumber;
      if (!serial) {
        return;
      }
      if ((payload?.serialNumber === serial || payload?.deviceId === serial) && payload?.isOnline) {
        context.setPhase('claimed');
      }
    });

    cloudWatcherRef.current = () => {
      unsubscribeClaimed();
      unsubscribePhase();
      unsubscribeTelemetry();
      unsubscribeStatus();
      realtimeService.disconnect();
    };
  }, [context]);

  const sendCredentials = useCallback(async (ssid: string, password: string) => {
    if (!context.state.device) {
      context.setError('UNKNOWN', 'No device selected.', false);
      return;
    }

    setIsLoading(true);
    context.clearError();
    context.setWifi(ssid);
    context.setPhase('credentials_sent');
    const claimStart = Date.now();

    try {
      await bleProvisioningService.provisionDevice({
        serialNumber: context.state.device.serialNumber,
        deviceId: context.state.device.id,
        ssid,
        password,
        token: context.state.token || undefined,
      });

      context.setPhase('wifi_connecting');
      await subscribeCloudStatus();
      context.setPhase('cloud_verifying');
      await verifyCloud();
      await emitTelemetry('claim_latency', {
        success: true,
        durationMs: Date.now() - claimStart,
      });
    } catch (error) {
      context.setError('CLOUD_VERIFICATION_FAILED', (error as Error).message, true);
      await emitTelemetry('claim_latency', {
        success: false,
        durationMs: Date.now() - claimStart,
        error: (error as Error).message,
      });
    } finally {
      if (cloudWatcherRef.current) {
        cloudWatcherRef.current();
        cloudWatcherRef.current = null;
      }
      setIsLoading(false);
    }
  }, [context, subscribeCloudStatus, verifyCloud, emitTelemetry]);

  const finalizeSetup = useCallback(async (input: { deviceName: string; roomName: string }) => {
    context.setMetadata({ deviceName: input.deviceName.trim(), roomName: input.roomName });
    context.setPhase('complete');
  }, [context]);

  const reset = useCallback(async () => {
    if (cloudWatcherRef.current) {
      cloudWatcherRef.current();
      cloudWatcherRef.current = null;
    }
    await context.reset();
    setRemainingSeconds(180);
  }, [context]);

  const state = useMemo(
    () => ({
      phase: context.state.phase,
      sessionId: context.state.sessionId,
      token: context.state.token,
      device: context.state.device,
      selectedSSID: context.state.selectedSSID,
      availableNetworks: context.state.availableNetworks,
      error: context.state.error,
      startedAt: context.state.startedAt,
      deadlineAt: context.state.deadlineAt,
      remainingSeconds,
      deviceName: context.state.deviceName,
      roomName: context.state.roomName,
    }),
    [context.state, remainingSeconds]
  );

  return {
    state,
    error: context.state.error,
    isLoading,
    isDiscovering,
    startProvisioning,
    beginBleScan,
    selectDeviceAndConnect,
    sendCredentials,
    finalizeSetup,
    reset,
    clearError: context.clearError,
  };
}

export default useProvisioning;
