import { useState, useCallback, useEffect } from 'react';
import { useProvisioningContext, ProvisioningPhase, DiscoveredDevice } from '../context/ProvisioningContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { API_BASE_URL } from '../utils/api';

interface UseProvisioningReturn {
  state: {
    phase: ProvisioningPhase;
    sessionId: string | null;
    token: string | null;
    device: DiscoveredDevice | null;
    selectedSSID: string | null;
    error: { code: string; message: string; retryable: boolean } | null;
    startedAt: number | null;
  };
  error: { code: string; message: string; retryable: boolean } | null;
  isLoading: boolean;
  startProvisioning: (deviceType: string) => Promise<void>;
  selectDevice: (device: DiscoveredDevice) => void;
  sendCredentials: (ssid: string, password: string) => Promise<void>;
  waitForClaim: () => Promise<void>;
  reset: () => Promise<void>;
  clearError: () => void;
}

export function useProvisioning(): UseProvisioningReturn {
  const context = useProvisioningContext();
  const [isLoading, setIsLoading] = useState(false);

  const startProvisioning = async (deviceType: string) => {
    setIsLoading(true);
    try {
      const token = uuidv4();
      const response = await fetch(`${API_BASE_URL}/provisioning/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`,
        },
        body: JSON.stringify({ deviceType }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to start session');
      }

      const data = await response.json();
      context.startSession(data.id, token);
    } catch (error) {
      context.setError('SESSION_EXPIRED', (error as Error).message, true);
    } finally {
      setIsLoading(false);
    }
  };

  const selectDevice = (device: DiscoveredDevice) => {
    context.selectDevice(device);
  };

  const sendCredentials = async (ssid: string, password: string) => {
    if (!context.state.device) {
      context.setError('UNKNOWN', 'No device selected', false);
      return;
    }

    setIsLoading(true);
    context.setPhase('credentials_sent');

    try {
      // TODO: Send credentials to device AP endpoint
      // This would typically connect to the device's AP and POST to its local server
      // For now, we simulate the flow
      context.setWifi(ssid);
      
      // Simulate delay for credential transfer
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      context.setPhase('wifi_connecting');
    } catch (error) {
      context.setError('CREDENTIALS_REJECTED', (error as Error).message, true);
    } finally {
      setIsLoading(false);
    }
  };

  const waitForClaim = async () => {
    if (!context.state.sessionId) {
      context.setError('UNKNOWN', 'No active session', false);
      return;
    }

    setIsLoading(true);
    context.setPhase('mqtt_connecting');

    try {
      // Poll for session status until claimed or timeout
      const maxAttempts = 60; // 60 seconds max
      let attempts = 0;

      while (attempts < maxAttempts) {
        const response = await fetch(
          `${API_BASE_URL}/provisioning/session/${context.state.sessionId}`,
          {
            headers: {
              'Authorization': `Bearer ${await getAuthToken()}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.status === 'claimed') {
            context.setPhase('claimed');
            setIsLoading(false);
            return;
          }
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }

      context.setError('CLAIM_FAILED', 'Timeout waiting for device claim', true);
    } catch (error) {
      context.setError('CLAIM_FAILED', (error as Error).message, true);
    } finally {
      setIsLoading(false);
    }
  };

  const reset = async () => {
    await context.reset();
  };

  const clearError = () => {
    context.clearError();
  };

  const getAuthToken = async (): Promise<string> => {
    const token = await AsyncStorage.getItem('token');
    return token || '';
  };

  return {
    state: {
      phase: context.state.phase,
      sessionId: context.state.sessionId,
      token: context.state.token,
      device: context.state.device,
      selectedSSID: context.state.selectedSSID,
      error: context.state.error,
      startedAt: context.state.startedAt,
    },
    error: context.state.error,
    isLoading,
    startProvisioning,
    selectDevice,
    sendCredentials,
    waitForClaim,
    reset,
    clearError,
  };
}

export default useProvisioning;
